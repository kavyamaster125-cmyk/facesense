from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.admin_auth import AdminLogin, Token
from app.services.admin_auth_service import login_admin

router = APIRouter(
    prefix="/admin",
    tags=["Admin Authentication"]
)


@router.post(
    "/login",
    response_model=Token
)
def login(
    data: AdminLogin,
    db: Session = Depends(get_db)
):
    return login_admin(data, db)