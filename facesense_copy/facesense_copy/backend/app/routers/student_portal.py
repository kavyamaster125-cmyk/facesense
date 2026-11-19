from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional
from pydantic import BaseModel

from app.database import get_db
from app.core.logger import logger
from app.services.audit_service import log_audit
from app.models.all_models import (
    Student, Faculty, Subject, FacultySubject, FeedbackCycle,
    FeedbackResponse, StudentFeedbackStatus
)
from app.services.face_recognition_service import verify_student_face
from app.services.liveness_service import evaluate_liveness
from app.services.reward_service import evaluate_student_reward

router = APIRouter(prefix="/api", tags=["Student Portal"])


class FeedbackSubmissionPayload(BaseModel):
    feedback_cycle_id: int
    student_id: int
    faculty_id: int
    subject_id: int
    star_rating: Optional[int] = 5
    swipe_response: Optional[str] = "AGREE"
    slider_value: Optional[int] = 80
    mcq_option: Optional[str] = "No major improvement required"
    suggestion_text: Optional[str] = None
    focus_score: Optional[float] = 85.0


class SingleFacultyResponseInput(BaseModel):
    faculty_id: int
    subject_id: int
    star_rating: Optional[int] = 5
    swipe_response: Optional[str] = "AGREE"
    slider_value: Optional[int] = 80
    mcq_option: Optional[str] = "No major improvement required"
    suggestion_text: Optional[str] = None


class BatchFeedbackSubmissionPayload(BaseModel):
    feedback_cycle_id: int
    student_id: int
    focus_score: Optional[float] = 85.0
    liveness_passed: Optional[bool] = True
    responses: list[SingleFacultyResponseInput]



@router.post("/face/verify")
async def verify_face(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Step 1 of Student Portal: Verify student face & liveness from camera capture.
    """
    client_ip = request.client.host if request.client else "unknown"
    image_bytes = await file.read()
    if not image_bytes:
        logger.warning(f"Empty biometric frame received from {client_ip}")
        raise HTTPException(status_code=400, detail="Empty frame received.")

    logger.info(f"Processing face biometric verification from {client_ip} ({len(image_bytes)} bytes)")

    # 1. Evaluate Liveness
    liveness_passed, liveness_score, liveness_msg = evaluate_liveness(image_bytes)

    # 2. Face Match
    match_res = verify_student_face(image_bytes, db)

    match_res["liveness_passed"] = liveness_passed
    match_res["liveness_score"] = liveness_score

    if not liveness_passed:
        match_res["authenticated"] = False
        match_res["message"] = f"Liveness verification failed: {liveness_msg}"
        log_audit(
            db=db,
            action="FACE_LIVENESS_FAILED",
            role="STUDENT",
            ip_address=client_ip,
            status="FAILED",
            details=f"Score: {liveness_score:.2f}, msg: {liveness_msg}"
        )
    elif match_res.get("authenticated"):
        stu_id = match_res.get("student_id")
        stu_name = match_res.get("full_name")
        logger.info(f"Biometric face login SUCCESS for student #{stu_id} ({stu_name}) from {client_ip}")
        log_audit(
            db=db,
            action="FACE_LOGIN_SUCCESS",
            user_email=match_res.get("enrollment_no"),
            role="STUDENT",
            resource=f"student:{stu_id}",
            ip_address=client_ip,
            status="SUCCESS",
            details=f"Distance: {match_res.get('confidence', 0):.4f}"
        )
    else:
        logger.warning(f"Face verification unrecognized or distance above threshold from {client_ip}")
        log_audit(
            db=db,
            action="FACE_LOGIN_UNKNOWN",
            role="STUDENT",
            ip_address=client_ip,
            status="FAILED",
            details=match_res.get("message")
        )

    return match_res


@router.get("/student/{student_id}/profile")
def get_student_profile(student_id: int, db: Session = Depends(get_db)):
    """Returns verified student profile metadata."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    return {
        "student_id": student.id,
        "enrollment_no": student.enrollment_no,
        "full_name": student.full_name,
        "department": student.department,
        "semester": student.semester,
        "division": student.division,
        "attendance_percentage": student.attendance_percentage or 0,
        "cpi": student.cpi or 0.0
    }


@router.get("/student/{student_id}/eligible-faculty")
def get_eligible_faculty(student_id: int, db: Session = Depends(get_db)):
    """
    Retrieves active feedback cycle and eligible faculty/subjects for the student.
    Filter out subjects/faculty for which feedback has already been submitted in this cycle.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Get active feedback cycle for student's semester or general active cycle
    active_cycle = db.query(FeedbackCycle).filter(
        FeedbackCycle.is_active == True,
        FeedbackCycle.semester == student.semester
    ).first()
    if not active_cycle:
        active_cycle = db.query(FeedbackCycle).filter(FeedbackCycle.is_active == True).first()

    if not active_cycle:
        return {
            "student_id": student_id,
            "enrollment_no": student.enrollment_no,
            "full_name": student.full_name,
            "semester": student.semester,
            "attendance_percentage": student.attendance_percentage or 0,
            "cpi": student.cpi or 0.0,
            "session_name": "No Active Session",
            "cycle_id": None,
            "subjects": []
        }

    # Fetch faculty assigned to student's department/semester
    assignments = (
        db.query(FacultySubject, Faculty, Subject)
        .join(Faculty, FacultySubject.faculty_id == Faculty.id)
        .join(Subject, FacultySubject.subject_id == Subject.id)
        .filter(Subject.semester == student.semester)
        .all()
    )

    eligible_list = []
    for fs, fac, subj in assignments:
        # Check database for duplicate submission
        already_submitted = db.query(FeedbackResponse).filter(
            FeedbackResponse.student_id == student_id,
            FeedbackResponse.faculty_id == fac.id,
            FeedbackResponse.subject_id == subj.id,
            FeedbackResponse.feedback_cycle_id == active_cycle.id
        ).first() is not None

        eligible_list.append({
            "subject_id": subj.id,
            "subject_code": subj.subject_code,
            "subject_name": subj.subject_name,
            "faculty_id": fac.id,
            "faculty_name": fac.full_name,
            "designation": fac.designation,
            "already_submitted": already_submitted
        })

    return {
        "student_id": student.id,
        "enrollment_no": student.enrollment_no,
        "full_name": student.full_name,
        "semester": student.semester,
        "attendance_percentage": student.attendance_percentage or 0,
        "cpi": student.cpi or 0.0,
        "session_name": active_cycle.session_name,
        "cycle_id": active_cycle.id,
        "subjects": eligible_list
    }


@router.post("/feedback/submit")
def submit_feedback(payload: FeedbackSubmissionPayload, request: Request, db: Session = Depends(get_db)):
    """
    Submits confidential feedback response.
    Enforces duplicate prevention at database level constraint.
    Calculates focus score & evaluates reward eligibility.
    """
    client_ip = request.client.host if request.client else "unknown"
    # Attendance eligibility check
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    if student.attendance_percentage <= 75:
        log_audit(
            db=db,
            action="FEEDBACK_REJECTED_ATTENDANCE",
            role="STUDENT",
            resource=f"student:{payload.student_id}",
            ip_address=client_ip,
            status="FAILED",
            details=f"Attendance: {student.attendance_percentage}%"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Attendance must be strictly greater than 75% to submit feedback."
        )

    # 1. Database-level Duplicate Submission Prevention Check
    existing = db.query(FeedbackResponse).filter(
        FeedbackResponse.student_id == payload.student_id,
        FeedbackResponse.faculty_id == payload.faculty_id,
        FeedbackResponse.subject_id == payload.subject_id,
        FeedbackResponse.feedback_cycle_id == payload.feedback_cycle_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Duplicate submission! You have already submitted feedback for this faculty/subject in the current cycle."
        )

    # 2. Insert Feedback Response Record
    response_entry = FeedbackResponse(
        feedback_cycle_id=payload.feedback_cycle_id,
        student_id=payload.student_id,
        faculty_id=payload.faculty_id,
        subject_id=payload.subject_id,
        star_rating=payload.star_rating,
        swipe_response=payload.swipe_response,
        slider_value=payload.slider_value,
        mcq_option=payload.mcq_option,
        suggestion_text=payload.suggestion_text,
        focus_score=payload.focus_score or 85.0,
        liveness_passed=True
    )

    try:
        db.add(response_entry)

        # Check total assigned faculty/subjects vs submitted count
        assignments = (
            db.query(FacultySubject, Subject)
            .join(Subject, FacultySubject.subject_id == Subject.id)
            .filter(Subject.semester == student.semester)
            .all()
        )
        total_assigned = len(assignments)

        submitted_count = db.query(FeedbackResponse).filter(
            FeedbackResponse.student_id == payload.student_id,
            FeedbackResponse.feedback_cycle_id == payload.feedback_cycle_id
        ).count() + 1  # include this new one

        all_completed = (submitted_count >= total_assigned) and (total_assigned > 0)

        # Record overall student status
        status_entry = db.query(StudentFeedbackStatus).filter(
            StudentFeedbackStatus.student_id == payload.student_id,
            StudentFeedbackStatus.session_id == payload.feedback_cycle_id
        ).first()

        if not status_entry:
            status_entry = StudentFeedbackStatus(
                student_id=payload.student_id,
                session_id=payload.feedback_cycle_id,
                submitted=all_completed
            )
            db.add(status_entry)
        else:
            status_entry.submitted = all_completed

        db.commit()

        log_audit(
            db=db,
            action="FEEDBACK_SUBMITTED",
            user_email=student.enrollment_no,
            role="STUDENT",
            resource=f"student:{payload.student_id},faculty:{payload.faculty_id},session:{payload.feedback_cycle_id}",
            ip_address=client_ip,
            status="SUCCESS",
            details=f"All completed: {all_completed}"
        )
    except IntegrityError:
        db.rollback()
        log_audit(
            db=db,
            action="FEEDBACK_SUBMIT_DUPLICATE",
            user_email=student.enrollment_no,
            role="STUDENT",
            resource=f"student:{payload.student_id}",
            ip_address=client_ip,
            status="FAILED"
        )
        raise HTTPException(
            status_code=409,
            detail="Duplicate feedback attempt blocked by database constraint."
        )

    # 3. Evaluate Reward Eligibility ONLY IF all assigned subjects are completed
    if all_completed:
        reward_result = evaluate_student_reward(
            student_id=payload.student_id,
            feedback_cycle_id=payload.feedback_cycle_id,
            focus_score=payload.focus_score or 85.0,
            liveness_passed=True,
            db=db
        )
    else:
        remaining = max(0, total_assigned - submitted_count)
        reward_result = {
            "granted": False,
            "reward_type": None,
            "coupon_code": None,
            "message": f"Feedback recorded! Complete remaining {remaining} assigned course{'s' if remaining != 1 else ''} to evaluate your CPI reward coupon."
        }

    return {
        "success": True,
        "message": "Feedback submitted successfully! Thank you for your confidential input.",
        "reward": reward_result,
        "all_completed": all_completed
    }


@router.post("/feedback/submit-batch")
def submit_batch_feedback(payload: BatchFeedbackSubmissionPayload, request: Request, db: Session = Depends(get_db)):
    """
    Question-Centric Feedback Submission Endpoint.
    Submits feedback responses (partial or full batch) in a single atomic transaction.
    Enforces duplicate submission prevention at database constraint level.
    Evaluates CPI reward eligibility ONLY ONCE ALL assigned subjects for the session are completed.
    """
    client_ip = request.client.host if request.client else "unknown"
    if not payload.responses:
        raise HTTPException(status_code=400, detail="No faculty responses provided in feedback submission.")

    # Attendance eligibility check
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    if student.attendance_percentage <= 75:
        log_audit(
            db=db,
            action="FEEDBACK_BATCH_REJECTED_ATTENDANCE",
            user_email=student.enrollment_no,
            role="STUDENT",
            resource=f"student:{payload.student_id}",
            ip_address=client_ip,
            status="FAILED",
            details=f"Attendance: {student.attendance_percentage}%"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Attendance must be strictly greater than 75% to submit feedback."
        )

    # 1. Check for any existing duplicate submissions in this feedback cycle
    for item in payload.responses:
        existing = db.query(FeedbackResponse).filter(
            FeedbackResponse.student_id == payload.student_id,
            FeedbackResponse.faculty_id == item.faculty_id,
            FeedbackResponse.subject_id == item.subject_id,
            FeedbackResponse.feedback_cycle_id == payload.feedback_cycle_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail="Duplicate submission! You have already submitted feedback for one or more faculty members in this cycle."
            )

    # 2. Insert all feedback responses atomically
    try:
        for item in payload.responses:
            response_entry = FeedbackResponse(
                feedback_cycle_id=payload.feedback_cycle_id,
                student_id=payload.student_id,
                faculty_id=item.faculty_id,
                subject_id=item.subject_id,
                star_rating=item.star_rating,
                swipe_response=item.swipe_response,
                slider_value=item.slider_value,
                mcq_option=item.mcq_option,
                suggestion_text=item.suggestion_text,
                focus_score=payload.focus_score or 85.0,
                liveness_passed=payload.liveness_passed if payload.liveness_passed is not None else True
            )
            db.add(response_entry)

        # Check total assigned vs total submitted for session completion
        assignments = (
            db.query(FacultySubject, Subject)
            .join(Subject, FacultySubject.subject_id == Subject.id)
            .filter(Subject.semester == student.semester)
            .all()
        )
        total_assigned = len(assignments)

        submitted_count = db.query(FeedbackResponse).filter(
            FeedbackResponse.student_id == payload.student_id,
            FeedbackResponse.feedback_cycle_id == payload.feedback_cycle_id
        ).count() + len(payload.responses)

        all_completed = (submitted_count >= total_assigned) and (total_assigned > 0)

        # Update overall student status in StudentFeedbackStatus
        status_entry = db.query(StudentFeedbackStatus).filter(
            StudentFeedbackStatus.student_id == payload.student_id,
            StudentFeedbackStatus.session_id == payload.feedback_cycle_id
        ).first()

        if not status_entry:
            status_entry = StudentFeedbackStatus(
                student_id=payload.student_id,
                session_id=payload.feedback_cycle_id,
                submitted=all_completed
            )
            db.add(status_entry)
        else:
            status_entry.submitted = all_completed

        db.commit()

        log_audit(
            db=db,
            action="FEEDBACK_BATCH_SUBMITTED",
            user_email=student.enrollment_no,
            role="STUDENT",
            resource=f"student:{payload.student_id},session:{payload.feedback_cycle_id}",
            ip_address=client_ip,
            status="SUCCESS",
            details=f"Responses: {len(payload.responses)}, all_completed: {all_completed}"
        )
    except IntegrityError as e:
        db.rollback()
        log_audit(
            db=db,
            action="FEEDBACK_BATCH_DUPLICATE",
            user_email=student.enrollment_no,
            role="STUDENT",
            resource=f"student:{payload.student_id}",
            ip_address=client_ip,
            status="FAILED"
        )
        raise HTTPException(
            status_code=409,
            detail="Duplicate feedback attempt blocked by database constraint."
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error in batch feedback submission from {client_ip}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to record feedback submission: {str(e)}")

    # 3. Evaluate Reward Eligibility ONLY IF all assigned subjects are completed
    if all_completed:
        reward_result = evaluate_student_reward(
            student_id=payload.student_id,
            feedback_cycle_id=payload.feedback_cycle_id,
            focus_score=payload.focus_score or 85.0,
            liveness_passed=payload.liveness_passed if payload.liveness_passed is not None else True,
            db=db
        )
    else:
        remaining = max(0, total_assigned - submitted_count)
        reward_result = {
            "granted": False,
            "reward_type": None,
            "coupon_code": None,
            "message": f"Feedback submitted successfully! Complete remaining {remaining} assigned course{'s' if remaining != 1 else ''} to evaluate your CPI reward coupon."
        }

    return {
        "success": True,
        "message": f"Feedback successfully submitted for {len(payload.responses)} assigned faculty member{'s' if len(payload.responses) != 1 else ''}!",
        "submitted_count": len(payload.responses),
        "reward": reward_result,
        "all_completed": all_completed,
        "remaining_count": max(0, total_assigned - submitted_count)
    }

