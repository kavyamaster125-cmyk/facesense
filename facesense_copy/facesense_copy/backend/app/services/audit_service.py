from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.all_models import AuditLog
from app.core.logger import logger, audit_logger


def log_audit(
    db: Session,
    action: str,
    user_email: Optional[str] = None,
    role: Optional[str] = None,
    resource: Optional[str] = None,
    ip_address: Optional[str] = None,
    status: str = "SUCCESS",
    details: Optional[str] = None
) -> Optional[AuditLog]:
    """
    Persists an audit event to the database audit_logs table and logs to file.
    Designed with fault tolerance to never crash primary transactions.
    """
    log_msg = f"[AUDIT] action={action} user={user_email or 'anonymous'} role={role or 'N/A'} resource={resource or 'N/A'} ip={ip_address or 'unknown'} status={status}"
    if details:
        log_msg += f" details={details}"

    # Log to disk and console
    if status == "SUCCESS":
        audit_logger.info(log_msg)
    else:
        audit_logger.warning(log_msg)

    # Persist to database
    try:
        entry = AuditLog(
            user_email=user_email,
            role=role,
            action=action,
            resource=resource,
            ip_address=ip_address,
            status=status
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to persist audit log to database: {e}", exc_info=True)
        return None


def get_audit_logs(
    db: Session,
    limit: int = 50,
    offset: int = 0,
    action: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None
) -> Dict[str, Any]:
    """Retrieves paginated audit logs for the Super Admin dashboard."""
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)
    if role:
        query = query.filter(AuditLog.role == role)
    if status:
        query = query.filter(AuditLog.status == status)

    total = query.count()
    items = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            {
                "id": item.id,
                "user_email": item.user_email,
                "role": item.role,
                "action": item.action,
                "resource": item.resource,
                "ip_address": item.ip_address,
                "status": item.status,
                "timestamp": item.timestamp.isoformat() if item.timestamp else None
            }
            for item in items
        ]
    }
