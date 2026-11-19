from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import time
import os

from app.database import get_db
from app.core.logger import logger, audit_logger
from app.services.audit_service import log_audit, get_audit_logs
from app.models.all_models import (
    AdminUser, Student, Faculty, Department, AcademicClass, Subject,
    FacultySubject, FeedbackCycle, FeedbackQuestion, RewardRule,
    RewardClaim, SystemSetting, AuditLog, FeedbackResponse, FaceEmbedding,
    StudentFeedbackStatus
)
from app.security import (
    create_access_token, verify_password, hash_password, require_role, get_current_user
)
from app.services.face_recognition_service import register_student_face

router = APIRouter(prefix="/api/admin", tags=["Admin Portal"])


# ------------------------------ Pydantic Schemas ------------------------------ #

class AdminLoginPayload(BaseModel):
    email: str
    password: str

class StudentInput(BaseModel):
    enrollment_no: str
    full_name: str
    email: Optional[str] = None
    department: str
    semester: int
    division: Optional[str] = "A"
    attendance_percentage: Optional[float] = 0
    cpi: Optional[float] = 0.0

class FacultyInput(BaseModel):
    faculty_code: Optional[str] = None
    full_name: str
    email: Optional[str] = None
    department: str
    designation: Optional[str] = "Assistant Professor"
    password: Optional[str] = "faculty123"

class FacultyUpdate(BaseModel):
    faculty_code: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    password: Optional[str] = None

class SubjectInput(BaseModel):
    subject_code: str
    subject_name: str
    department: Optional[str] = "Computer Engineering"
    semester: int

class SubjectUpdate(BaseModel):
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[int] = None

class AssignmentInput(BaseModel):
    faculty_id: int
    subject_id: int
    division: Optional[str] = "A"
    semester: int
    academic_year: Optional[str] = "2025-2026"

class CycleInput(BaseModel):
    session_name: str
    semester: int
    academic_year: str
    start_date: str
    end_date: str
    status: Optional[str] = "ACTIVE"

class RewardRuleInput(BaseModel):
    is_enabled: bool
    min_focus_score: float
    min_liveness_confidence: float
    reward_probability: float
    reward_type: str
    available_quantity: int


# ------------------------------ Authentication ------------------------------ #

@router.post("/login")
def admin_login(payload: AdminLoginPayload, request: Request, db: Session = Depends(get_db)):
    """Super Admin Login."""
    client_ip = request.client.host if request.client else "unknown"
    user = db.query(AdminUser).filter(AdminUser.email == payload.email).first()

    if not user or not verify_password(payload.password, user.password_hash):
        log_audit(
            db=db,
            action="ADMIN_LOGIN_FAILED",
            user_email=payload.email,
            role="SUPER_ADMIN",
            ip_address=client_ip,
            status="FAILED"
        )
        raise HTTPException(status_code=401, detail="Invalid admin email or password.")

    token = create_access_token({
        "sub": user.email,
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name
    })

    log_audit(
        db=db,
        action="ADMIN_LOGIN_SUCCESS",
        user_email=user.email,
        role=user.role,
        ip_address=client_ip,
        status="SUCCESS"
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role
        }
    }


# ------------------------------ System Overview Analytics ------------------------------ #

@router.get("/analytics", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def get_system_analytics(db: Session = Depends(get_db)):
    """Returns system-wide dashboard metrics."""
    total_students = db.query(Student).count()
    registered_faces = db.query(Student).filter(Student.is_registered == True).count()
    total_faculty = db.query(Faculty).count()
    total_subjects = db.query(Subject).count()
    total_responses = db.query(FeedbackResponse).count()

    active_cycle = db.query(FeedbackCycle).filter(FeedbackCycle.is_active == True).first()

    return {
        "total_students": total_students,
        "registered_faces": registered_faces,
        "total_faculty": total_faculty,
        "total_subjects": total_subjects,
        "total_feedback_submitted": total_responses,
        "active_cycle_name": active_cycle.session_name if active_cycle else "None",
        "overall_response_rate": round((total_responses / max(1, total_students * 3)) * 100, 1)
    }


@router.get("/analytics/faculty", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def get_faculty_analytics_summary(db: Session = Depends(get_db)):
    """Computes AI-analyzed feedback ratings per faculty."""
    all_faculty = db.query(Faculty).all()
    results = []
    for fac in all_faculty:
        responses = db.query(FeedbackResponse).filter(FeedbackResponse.faculty_id == fac.id).all()
        if len(responses) > 0:
            avg_rating = round(sum(r.star_rating for r in responses) / len(responses), 2)
            total_fb = len(responses)
        else:
            avg_rating = 4.5
            total_fb = 0

        results.append({
            "faculty_id": fac.id,
            "faculty_name": fac.full_name,
            "average_rating": avg_rating,
            "total_feedback": total_fb,
            "department": fac.department
        })
    results.sort(key=lambda x: x["average_rating"], reverse=True)
    return results


@router.get("/analytics/subjects", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def get_subject_analytics_summary(db: Session = Depends(get_db)):
    """Computes feedback ratings per subject."""
    all_subjects = db.query(Subject).all()
    results = []
    for subj in all_subjects:
        responses = db.query(FeedbackResponse).filter(FeedbackResponse.subject_id == subj.id).all()
        if len(responses) > 0:
            avg_rating = round(sum(r.star_rating for r in responses) / len(responses), 2)
            total_fb = len(responses)
        else:
            avg_rating = 4.4
            total_fb = 0

        results.append({
            "subject_id": subj.id,
            "subject_name": subj.subject_name,
            "average_rating": avg_rating,
            "total_feedback": total_fb,
            "department": subj.department
        })
    results.sort(key=lambda x: x["average_rating"], reverse=True)
    return results



# ------------------------------ Student Management ------------------------------ #

@router.get("/students", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def list_students(db: Session = Depends(get_db)):
    return db.query(Student).order_by(Student.id.desc()).all()


@router.post("/students", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def create_student(payload: StudentInput, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    existing = db.query(Student).filter(Student.enrollment_no == payload.enrollment_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student enrollment number already exists.")

    new_stu = Student(
        enrollment_no=payload.enrollment_no,
        full_name=payload.full_name,
        email=payload.email,
        department=payload.department,
        semester=payload.semester,
        division=payload.division or "A",
        attendance_percentage=payload.attendance_percentage or 0,
        cpi=payload.cpi or 0.0
    )
    db.add(new_stu)
    db.commit()
    db.refresh(new_stu)

    log_audit(
        db=db,
        action="STUDENT_CREATED",
        role="SUPER_ADMIN",
        resource=f"student:{new_stu.id}",
        ip_address=client_ip,
        status="SUCCESS",
        details=f"{new_stu.full_name} ({new_stu.enrollment_no})"
    )
    return new_stu


@router.put("/students/{student_id}", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def update_student(student_id: int, payload: StudentInput, db: Session = Depends(get_db)):
    stu = db.query(Student).filter(Student.id == student_id).first()
    if not stu:
        raise HTTPException(status_code=404, detail="Student not found.")
    # Check enrollment_no uniqueness if changed
    if payload.enrollment_no != stu.enrollment_no:
        existing = db.query(Student).filter(Student.enrollment_no == payload.enrollment_no).first()
        if existing:
            raise HTTPException(status_code=400, detail="Another student with this enrollment number already exists.")
    stu.enrollment_no = payload.enrollment_no
    stu.full_name = payload.full_name
    stu.email = payload.email
    stu.department = payload.department
    stu.semester = payload.semester
    stu.division = payload.division or "A"
    stu.attendance_percentage = payload.attendance_percentage or 0
    stu.cpi = payload.cpi or 0.0
    db.commit()
    db.refresh(stu)
    return stu


from sqlalchemy import text

@router.delete("/students/{student_id}", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def delete_student(student_id: int, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    stu = db.query(Student).filter(Student.id == student_id).first()
    if not stu:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Delete all child references safely
    try:
        db.execute(text("DELETE FROM student_feedback_status WHERE student_id = :sid"), {"sid": student_id})
        db.execute(text("DELETE FROM face_embeddings WHERE student_id = :sid"), {"sid": student_id})
        db.execute(text("DELETE FROM feedback_responses WHERE student_id = :sid"), {"sid": student_id})
        db.execute(text("DELETE FROM reward_claims WHERE student_id = :sid"), {"sid": student_id})
    except Exception as e:
        logger.warning(f"Child cleanup note during student deletion: {e}")

    # Delete uploaded face image file if present
    if stu.face_image_path:
        try:
            rel_path = stu.face_image_path.lstrip("/")
            full_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), rel_path)
            if os.path.exists(full_path):
                os.remove(full_path)
        except Exception:
            pass

    stu_name = stu.full_name
    db.delete(stu)
    db.commit()

    log_audit(
        db=db,
        action="STUDENT_DELETED",
        role="SUPER_ADMIN",
        resource=f"student:{student_id}",
        ip_address=client_ip,
        status="SUCCESS",
        details=stu_name
    )
    return {"message": f"Student {stu_name} deleted successfully."}



@router.post("/face/register/{student_id}", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
async def register_student_face_endpoint(
    student_id: int,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Enrolls student face embedding from camera capture or uploaded image file."""
    client_ip = request.client.host if request.client else "unknown"
    image_bytes = await file.read()
    success, msg, face_path = register_student_face(student_id, image_bytes, db)
    if not success:
        log_audit(
            db=db,
            action="FACE_ENROLL_FAILED",
            role="SUPER_ADMIN",
            resource=f"student:{student_id}",
            ip_address=client_ip,
            status="FAILED",
            details=msg
        )
        raise HTTPException(status_code=400, detail=msg)

    log_audit(
        db=db,
        action="FACE_ENROLL_SUCCESS",
        role="SUPER_ADMIN",
        resource=f"student:{student_id}",
        ip_address=client_ip,
        status="SUCCESS",
        details=f"Saved to {face_path}"
    )
    return {"message": msg, "student_id": student_id, "face_image_path": face_path}



# ------------------------------ Faculty Management ------------------------------ #

@router.get("/faculty", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def list_faculty(db: Session = Depends(get_db)):
    return db.query(Faculty).order_by(Faculty.id.desc()).all()


@router.post("/faculty", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def create_faculty(payload: FacultyInput, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    code = (payload.faculty_code or "").strip()
    if not code:
        name_parts = payload.full_name.strip().split()
        initials = "".join([p[0].upper() for p in name_parts]) if name_parts else "FAC"
        code = f"FAC_{initials}_{int(time.time()) % 10000}"

    email = (payload.email or "").strip()
    if not email:
        clean_name = payload.full_name.lower().replace(" ", ".")
        email = f"{clean_name}@scet.ac.in"

    existing = db.query(Faculty).filter(
        (Faculty.email == email) | (Faculty.faculty_code == code)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Faculty with this email or code already exists.")

    pwd_hash = hash_password(payload.password or "faculty123")
    fac = Faculty(
        faculty_code=code,
        full_name=payload.full_name.strip(),
        email=email,
        department=payload.department.strip(),
        designation=payload.designation or "Assistant Professor",
        password_hash=pwd_hash
    )
    db.add(fac)
    db.commit()
    db.refresh(fac)

    log_audit(
        db=db,
        action="FACULTY_CREATED",
        role="SUPER_ADMIN",
        resource=f"faculty:{fac.id}",
        ip_address=client_ip,
        status="SUCCESS",
        details=f"{fac.full_name} ({fac.faculty_code})"
    )
    return fac


@router.put("/faculty/{faculty_id}", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def update_faculty(faculty_id: int, payload: FacultyUpdate, db: Session = Depends(get_db)):
    fac = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty not found.")

    if payload.email and payload.email.strip() and payload.email.strip() != fac.email:
        existing = db.query(Faculty).filter(Faculty.email == payload.email.strip()).first()
        if existing:
            raise HTTPException(status_code=400, detail="Another faculty with this email already exists.")
        fac.email = payload.email.strip()

    if payload.faculty_code and payload.faculty_code.strip() and payload.faculty_code.strip() != fac.faculty_code:
        existing = db.query(Faculty).filter(Faculty.faculty_code == payload.faculty_code.strip()).first()
        if existing:
            raise HTTPException(status_code=400, detail="Another faculty with this code already exists.")
        fac.faculty_code = payload.faculty_code.strip()

    if payload.full_name and payload.full_name.strip():
        fac.full_name = payload.full_name.strip()
    if payload.department and payload.department.strip():
        fac.department = payload.department.strip()
    if payload.designation and payload.designation.strip():
        fac.designation = payload.designation.strip()
    if payload.password and payload.password.strip():
        fac.password_hash = hash_password(payload.password.strip())

    db.commit()
    db.refresh(fac)
    return fac


@router.delete("/faculty/{faculty_id}", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def delete_faculty(faculty_id: int, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    fac = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty not found.")
    fac_name = fac.full_name
    db.query(FacultySubject).filter(FacultySubject.faculty_id == faculty_id).delete()
    db.query(FeedbackResponse).filter(FeedbackResponse.faculty_id == faculty_id).delete()
    db.delete(fac)
    db.commit()

    log_audit(
        db=db,
        action="FACULTY_DELETED",
        role="SUPER_ADMIN",
        resource=f"faculty:{faculty_id}",
        ip_address=client_ip,
        status="SUCCESS",
        details=fac_name
    )
    return {"message": "Faculty deleted successfully."}


# ------------------------------ Subject & Assignments ------------------------------ #

@router.get("/subjects", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def list_subjects(db: Session = Depends(get_db)):
    return db.query(Subject).all()


@router.post("/subjects", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def create_subject(payload: SubjectInput, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    code = payload.subject_code.strip()
    existing = db.query(Subject).filter(Subject.subject_code == code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Another subject with this code already exists.")

    subj = Subject(
        subject_code=code,
        subject_name=payload.subject_name.strip(),
        department=(payload.department or "Computer Engineering").strip(),
        semester=payload.semester
    )
    db.add(subj)
    db.commit()
    db.refresh(subj)

    log_audit(
        db=db,
        action="SUBJECT_CREATED",
        role="SUPER_ADMIN",
        resource=f"subject:{subj.id}",
        ip_address=client_ip,
        status="SUCCESS",
        details=f"{subj.subject_name} ({subj.subject_code})"
    )
    return subj


@router.put("/subjects/{subject_id}", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def update_subject(subject_id: int, payload: SubjectUpdate, db: Session = Depends(get_db)):
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found.")

    if payload.subject_code and payload.subject_code.strip() and payload.subject_code.strip() != subj.subject_code:
        existing = db.query(Subject).filter(Subject.subject_code == payload.subject_code.strip()).first()
        if existing:
            raise HTTPException(status_code=400, detail="Another subject with this code already exists.")
        subj.subject_code = payload.subject_code.strip()

    if payload.subject_name and payload.subject_name.strip():
        subj.subject_name = payload.subject_name.strip()
    if payload.department and payload.department.strip():
        subj.department = payload.department.strip()
    if payload.semester is not None:
        subj.semester = payload.semester

    db.commit()
    db.refresh(subj)
    return subj


@router.delete("/subjects/{subject_id}", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def delete_subject(subject_id: int, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Subject not found.")
    subj_code = subj.subject_code
    db.query(FacultySubject).filter(FacultySubject.subject_id == subject_id).delete()
    db.query(FeedbackResponse).filter(FeedbackResponse.subject_id == subject_id).delete()
    db.delete(subj)
    db.commit()

    log_audit(
        db=db,
        action="SUBJECT_DELETED",
        role="SUPER_ADMIN",
        resource=f"subject:{subject_id}",
        ip_address=client_ip,
        status="SUCCESS",
        details=subj_code
    )
    return {"message": "Subject deleted successfully."}


@router.get("/faculty-subjects", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def list_assignments(db: Session = Depends(get_db)):
    results = (
        db.query(FacultySubject, Faculty, Subject)
        .join(Faculty, FacultySubject.faculty_id == Faculty.id)
        .join(Subject, FacultySubject.subject_id == Subject.id)
        .all()
    )
    return [
        {
            "id": fs.id,
            "faculty_id": fac.id,
            "faculty_name": fac.full_name,
            "subject_id": subj.id,
            "subject_code": subj.subject_code,
            "subject_name": subj.subject_name,
            "division": fs.division,
            "semester": fs.semester,
            "academic_year": fs.academic_year
        }
        for fs, fac, subj in results
    ]


@router.post("/faculty-subjects", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def create_assignment(payload: AssignmentInput, db: Session = Depends(get_db)):
    assign = FacultySubject(
        faculty_id=payload.faculty_id,
        subject_id=payload.subject_id,
        division=payload.division or "A",
        semester=payload.semester,
        academic_year=payload.academic_year or "2025-2026"
    )
    db.add(assign)
    db.commit()
    db.refresh(assign)
    return assign


@router.delete("/faculty-subjects/{id}", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def delete_assignment(id: int, db: Session = Depends(get_db)):
    assign = db.query(FacultySubject).filter(FacultySubject.id == id).first()
    if not assign:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    db.delete(assign)
    db.commit()
    return {"message": "Assignment deleted successfully."}


# ------------------------------ Feedback Cycles & Rules ------------------------------ #

@router.get("/feedback-sessions", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def list_cycles(db: Session = Depends(get_db)):
    return db.query(FeedbackCycle).all()


@router.post("/feedback-sessions", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def create_cycle(payload: CycleInput, db: Session = Depends(get_db)):
    """Creates a new feedback session/cycle."""
    from datetime import date as date_type
    cycle = FeedbackCycle(
        session_name=payload.session_name,
        semester=payload.semester,
        academic_year=payload.academic_year,
        start_date=date_type.fromisoformat(payload.start_date) if isinstance(payload.start_date, str) else payload.start_date,
        end_date=date_type.fromisoformat(payload.end_date) if isinstance(payload.end_date, str) else payload.end_date,
        status="ACTIVE",
        is_active=True
    )
    db.add(cycle)
    db.commit()
    db.refresh(cycle)
    return cycle


@router.put("/feedback-sessions/{session_id}", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def update_cycle(session_id: int, payload: CycleInput, db: Session = Depends(get_db)):
    """Updates an existing feedback session/cycle."""
    from datetime import date as date_type
    cycle = db.query(FeedbackCycle).filter(FeedbackCycle.id == session_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Feedback session not found.")
    cycle.session_name = payload.session_name
    cycle.semester = payload.semester
    cycle.academic_year = payload.academic_year
    cycle.start_date = date_type.fromisoformat(payload.start_date) if isinstance(payload.start_date, str) else payload.start_date
    cycle.end_date = date_type.fromisoformat(payload.end_date) if isinstance(payload.end_date, str) else payload.end_date
    cycle.is_active = True  # Can be extended with status field
    db.commit()
    db.refresh(cycle)
    return cycle


@router.delete("/feedback-sessions/{id}", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def delete_cycle(id: int, db: Session = Depends(get_db)):
    cycle = db.query(FeedbackCycle).filter(FeedbackCycle.id == id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Feedback cycle not found.")
    db.query(FeedbackResponse).filter(FeedbackResponse.feedback_cycle_id == id).delete()
    db.query(RewardClaim).filter(RewardClaim.feedback_cycle_id == id).delete()
    db.delete(cycle)
    db.commit()
    return {"message": "Feedback cycle deleted successfully."}



@router.post("/rewards/rules", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def update_reward_rule(payload: RewardRuleInput, db: Session = Depends(get_db)):
    rule = db.query(RewardRule).first()
    if not rule:
        rule = RewardRule()
        db.add(rule)

    rule.is_enabled = payload.is_enabled
    rule.min_focus_score = payload.min_focus_score
    rule.min_liveness_confidence = payload.min_liveness_confidence
    rule.reward_probability = payload.reward_probability
    rule.reward_type = payload.reward_type
    rule.available_quantity = payload.available_quantity
    db.commit()

    return {"message": "Reward rules updated successfully."}


@router.get("/rewards/rules", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def get_reward_rule(db: Session = Depends(get_db)):
    rule = db.query(RewardRule).first()
    if not rule:
        rule = RewardRule()
        db.add(rule)
        db.commit()
        db.refresh(rule)
    return rule


# ------------------------------ Feedback Tracking (Anonymous) ------------------------------ #

@router.get("/feedback-tracking/{session_id}", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def get_feedback_tracking(session_id: int, db: Session = Depends(get_db)):
    """Returns submission status per student for a session. CRITICAL: No ratings or feedback content exposed."""
    from app.models.all_models import StudentFeedbackStatus
    
    cycle = db.query(FeedbackCycle).filter(FeedbackCycle.id == session_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Feedback session not found.")
    
    # Get all students for this semester
    students = db.query(Student).filter(Student.semester == cycle.semester).order_by(Student.full_name).all()
    
    tracking = []
    for stu in students:
        status_entry = db.query(StudentFeedbackStatus).filter(
            StudentFeedbackStatus.student_id == stu.id,
            StudentFeedbackStatus.session_id == session_id,
            StudentFeedbackStatus.submitted == True
        ).first()
        tracking.append({
            "student_id": stu.id,
            "name": stu.full_name,
            "enrollment_no": stu.enrollment_no,
            "has_submitted": status_entry is not None
        })
    
    return tracking


@router.delete("/feedback/{session_id}/{student_id}", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def delete_student_feedback(session_id: int, student_id: int, request: Request, db: Session = Depends(get_db)):
    """
    Super Admin endpoint to delete all feedback records, status, and reward claims
    submitted by a specific student for a specific session.
    Safe transaction commit/rollback via SQLAlchemy.
    """
    client_ip = request.client.host if request.client else "unknown"
    try:
        # Delete feedback responses for session and student
        del_resp = db.query(FeedbackResponse).filter(
            FeedbackResponse.feedback_cycle_id == session_id,
            FeedbackResponse.student_id == student_id
        ).delete(synchronize_session=False)

        # Delete student feedback status for session
        del_status = db.query(StudentFeedbackStatus).filter(
            StudentFeedbackStatus.session_id == session_id,
            StudentFeedbackStatus.student_id == student_id
        ).delete(synchronize_session=False)

        # Delete reward claims for session
        del_claims = db.query(RewardClaim).filter(
            RewardClaim.feedback_cycle_id == session_id,
            RewardClaim.student_id == student_id
        ).delete(synchronize_session=False)

        db.commit()

        log_audit(
            db=db,
            action="FEEDBACK_DELETED",
            user_email="admin",
            role="SUPER_ADMIN",
            resource=f"student:{student_id},session:{session_id}",
            ip_address=client_ip,
            status="SUCCESS",
            details=f"Deleted {del_resp} responses, {del_status} status rows, {del_claims} claims"
        )

        return {"message": f"Successfully deleted feedback records for student ID {student_id} in session {session_id}."}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting feedback for student {student_id} session {session_id}: {e}", exc_info=True)
        log_audit(
            db=db,
            action="FEEDBACK_DELETED",
            user_email="admin",
            role="SUPER_ADMIN",
            resource=f"student:{student_id},session:{session_id}",
            ip_address=client_ip,
            status="FAILED",
            details=str(e)
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete student feedback: {str(e)}"
        )


# ------------------------------ Audit & System Logs ------------------------------ #

@router.get("/audit-logs", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def get_audit_logs_endpoint(
    limit: int = 50,
    offset: int = 0,
    action: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Returns paginated audit log entries for Super Admin monitoring."""
    return get_audit_logs(db=db, limit=limit, offset=offset, action=action, role=role, status=status)


@router.get("/system-logs", dependencies=[Depends(require_role(["SUPER_ADMIN"]))])
def get_system_logs_endpoint(
    log_type: str = "app",
    lines: int = 100
):
    """
    Returns the tail of backend log files (app, error, access).
    Restricted to Super Admin role.
    """
    from app.core.logger import APP_LOG_PATH, ERROR_LOG_PATH, ACCESS_LOG_PATH

    path_map = {
        "app": APP_LOG_PATH,
        "error": ERROR_LOG_PATH,
        "access": ACCESS_LOG_PATH
    }

    target_path = path_map.get(log_type, APP_LOG_PATH)
    if not os.path.exists(target_path):
        return {
            "log_type": log_type,
            "lines": [],
            "message": f"Log file {os.path.basename(target_path)} is empty or not created yet."
        }

    try:
        with open(target_path, "r", encoding="utf-8", errors="replace") as f:
            all_lines = f.readlines()
            recent_lines = all_lines[-lines:] if len(all_lines) > lines else all_lines
            return {
                "log_type": log_type,
                "total_lines": len(all_lines),
                "returned_lines": len(recent_lines),
                "lines": [l.rstrip("\r\n") for l in recent_lines]
            }
    except Exception as e:
        logger.error(f"Error reading system log {target_path}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Could not read log file: {str(e)}")

