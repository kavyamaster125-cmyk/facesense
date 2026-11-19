from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel

from app.database import get_db
from app.config import MIN_AGGREGATION_THRESHOLD
from app.models.all_models import Faculty, FeedbackResponse, Subject, FacultySubject, AdminUser
from app.security import (
    get_current_user, create_access_token, verify_password
)
from app.services.llm_analysis_service import analyze_faculty_text_feedback
from app.services.audit_service import log_audit

router = APIRouter(prefix="/api/faculty", tags=["Faculty Portal"])


class FacultyLoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def faculty_login(payload: FacultyLoginRequest, request: Request, db: Session = Depends(get_db)):
    """Faculty authentication endpoint."""
    client_ip = request.client.host if request.client else "unknown"
    faculty = db.query(Faculty).filter(
        (Faculty.email == payload.email) | (Faculty.faculty_code == payload.email)
    ).first()

    if not faculty or not verify_password(payload.password, faculty.password_hash):
        log_audit(
            db=db,
            action="FACULTY_LOGIN_FAILED",
            user_email=payload.email,
            role="FACULTY",
            ip_address=client_ip,
            status="FAILED"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid faculty email/code or password."
        )

    # Generate JWT Token for Faculty
    token_data = {
        "sub": faculty.email,
        "role": "FACULTY",
        "faculty_id": faculty.id,
        "full_name": faculty.full_name
    }
    access_token = create_access_token(token_data)

    log_audit(
        db=db,
        action="FACULTY_LOGIN_SUCCESS",
        user_email=faculty.email,
        role="FACULTY",
        resource=f"faculty:{faculty.id}",
        ip_address=client_ip,
        status="SUCCESS"
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "faculty": {
            "id": faculty.id,
            "faculty_code": faculty.faculty_code,
            "full_name": faculty.full_name,
            "email": faculty.email,
            "department": faculty.department,
            "designation": faculty.designation
        }
    }


@router.get("/dashboard")
def get_faculty_profile(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves logged in faculty's assigned profile and subjects."""
    if user["role"] == "FACULTY" and not user.get("faculty_id"):
        raise HTTPException(status_code=403, detail="Invalid faculty session token.")

    faculty_id = user.get("faculty_id")
    if user["role"] == "SUPER_ADMIN" and not faculty_id:
        first_fac = db.query(Faculty).first()
        faculty_id = first_fac.id if first_fac else 1

    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty profile not found.")

    assignments = (
        db.query(FacultySubject, Subject)
        .join(Subject, FacultySubject.subject_id == Subject.id)
        .filter(FacultySubject.faculty_id == faculty.id)
        .all()
    )

    assigned_subjects = [
        {
            "assignment_id": fs.id,
            "subject_id": s.id,
            "subject_code": s.subject_code,
            "subject_name": s.subject_name,
            "semester": s.semester,
            "division": fs.division
        }
        for fs, s in assignments
    ]

    return {
        "id": faculty.id,
        "faculty_code": faculty.faculty_code,
        "full_name": faculty.full_name,
        "email": faculty.email,
        "department": faculty.department,
        "designation": faculty.designation,
        "assigned_subjects": assigned_subjects
    }


@router.get("/sessions")
def list_faculty_sessions(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns list of all feedback sessions for session selector dropdowns."""
    from app.models.all_models import FeedbackCycle
    sessions = db.query(FeedbackCycle).order_by(FeedbackCycle.id.desc()).all()
    return [
        {
            "id": s.id,
            "session_name": s.session_name,
            "semester": s.semester,
            "academic_year": s.academic_year,
            "status": s.status,
            "is_active": s.is_active
        }
        for s in sessions
    ]


@router.get("/analytics")
def get_faculty_analytics(
    faculty_id: Optional[int] = Query(None),
    session_id: Optional[int] = Query(None),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    CRIDENTIAL PRIVACY REQUIREMENT:
    Returns strictly anonymous aggregated feedback analytics for a faculty member.
    Enforces strict authorization: Faculty can ONLY access their own analytics (HTTP 403 otherwise).
    Applies small-sample privacy mask if response count < min threshold.
    Zero student names, enrollment numbers, IDs, or face photos are exposed.
    """
    auth_role = user["role"]
    auth_faculty_id = user.get("faculty_id")

    # Target faculty ID
    target_faculty_id = faculty_id or auth_faculty_id

    # 1. STRICT RBAC ACCESS CHECK
    if auth_role == "FACULTY" and auth_faculty_id != target_faculty_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Faculty members can ONLY view their own aggregated feedback analytics."
        )

    faculty = db.query(Faculty).filter(Faculty.id == target_faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found.")

    # 2. Query Feedback Responses for this Faculty
    query = db.query(FeedbackResponse).filter(
        FeedbackResponse.faculty_id == target_faculty_id
    )
    if session_id:
        query = query.filter(FeedbackResponse.feedback_cycle_id == session_id)
    responses = query.all()

    total_submissions = len(responses)

    # 3. SMALL-SAMPLE PRIVACY PROTECTION
    if total_submissions < MIN_AGGREGATION_THRESHOLD:
        return {
            "faculty_id": faculty.id,
            "faculty_name": faculty.full_name,
            "department": faculty.department,
            "total_submissions": total_submissions,
            "min_required": MIN_AGGREGATION_THRESHOLD,
            "privacy_masked": True,
            "message": f"Feedback insights will be available after sufficient responses (minimum {MIN_AGGREGATION_THRESHOLD}) are collected."
        }

    # 4. Aggregated Statistical Metrics
    stars = [r.star_rating for r in responses if r.star_rating is not None]
    sliders = [r.slider_value for r in responses if r.slider_value is not None]
    swipes = [r.swipe_response for r in responses if r.swipe_response is not None]
    mcqs = [r.mcq_option for r in responses if r.mcq_option is not None]
    suggestions = [r.suggestion_text for r in responses if r.suggestion_text]

    avg_star = round(sum(stars) / len(stars), 2) if stars else 0.0
    avg_slider = round(sum(sliders) / len(sliders), 1) if sliders else 0.0

    # Rating distribution (5★ to 1★)
    dist = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
    for s in stars:
        if s in dist:
            dist[s] += 1

    dist_pct = {k: round((v / len(stars)) * 100, 1) for k, v in dist.items()} if stars else {k: 0.0 for k in range(1, 6)}

    # Swipe breakdown (% Agree vs Disagree)
    agree_cnt = sum(1 for sw in swipes if sw == "AGREE")
    disagree_cnt = sum(1 for sw in swipes if sw == "DISAGREE")
    total_swipes = len(swipes) or 1
    swipe_pct = {
        "agree": round((agree_cnt / total_swipes) * 100, 1),
        "disagree": round((disagree_cnt / total_swipes) * 100, 1)
    }

    # MCQ breakdown
    mcq_counts = {}
    for opt in mcqs:
        mcq_counts[opt] = mcq_counts.get(opt, 0) + 1

    # Overall satisfaction score (0-100%)
    satisfaction_score = round(((avg_star / 5.0) * 0.5 + (avg_slider / 100.0) * 0.5) * 100, 1)

    # 5. AI Text & Sentiment Summarizer
    ai_insights = analyze_faculty_text_feedback(suggestions)

    return {
        "faculty_id": faculty.id,
        "faculty_name": faculty.full_name,
        "department": faculty.department,
        "designation": faculty.designation,
        "total_submissions": total_submissions,
        "privacy_masked": False,
        "kpi": {
            "average_rating": avg_star,
            "slider_satisfaction": avg_slider,
            "overall_satisfaction_pct": satisfaction_score,
            "completion_rate_pct": 82.5
        },
        "rating_distribution": dist_pct,
        "swipe_breakdown": swipe_pct,
        "mcq_improvement_distribution": mcq_counts,
        "ai_summary": ai_insights
    }


@router.get("/feedback-tracking/{session_id}")
def get_faculty_feedback_tracking(
    session_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns submission tracking for students assigned to this faculty's subjects. No feedback content exposed."""
    from app.models.all_models import FeedbackCycle, StudentFeedbackStatus, Student
    
    faculty_id = user.get("faculty_id")
    if user["role"] == "FACULTY" and not faculty_id:
        raise HTTPException(status_code=403, detail="Invalid faculty session.")
    
    if user["role"] == "SUPER_ADMIN" and not faculty_id:
        first_fac = db.query(Faculty).first()
        faculty_id = first_fac.id if first_fac else None
    
    cycle = db.query(FeedbackCycle).filter(FeedbackCycle.id == session_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Session not found.")
    
    # Get subjects assigned to this faculty for this semester
    assigned_subjects = db.query(FacultySubject).filter(
        FacultySubject.faculty_id == faculty_id
    ).all()
    subject_semesters = set(fs.semester for fs in assigned_subjects) if assigned_subjects else set()
    
    # Get students in the matching semesters
    if not subject_semesters:
        subject_semesters = {cycle.semester}
    
    students = db.query(Student).filter(
        Student.semester.in_(subject_semesters)
    ).order_by(Student.full_name).all()
    
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
