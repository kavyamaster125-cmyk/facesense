from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.feedback import Feedback
from app.models.feedback_session import FeedbackSession


def submit_feedback(data, db: Session):

    # Check active session
    session = (
        db.query(FeedbackSession)
        .filter(
            FeedbackSession.id == data.session_id,
            FeedbackSession.status == "active"
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="No active feedback session."
        )

    # Prevent duplicate feedback
    existing = (
        db.query(Feedback)
        .filter(
            Feedback.student_id == data.student_id,
            Feedback.session_id == data.session_id,
            Feedback.faculty_id == data.faculty_id,
            Feedback.subject_id == data.subject_id
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Feedback already submitted."
        )

    feedback = Feedback(
        session_id=data.session_id,
        student_id=data.student_id,
        faculty_id=data.faculty_id,
        subject_id=data.subject_id,

        teaching_rating=data.teaching_rating,
        communication_rating=data.communication_rating,
        punctuality_rating=data.punctuality_rating,
        behaviour_rating=data.behaviour_rating,
        knowledge_rating=data.knowledge_rating,

        comments=data.comments
    )

    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    return {
        "message": "Feedback submitted successfully.",
        "feedback_id": feedback.id
    }