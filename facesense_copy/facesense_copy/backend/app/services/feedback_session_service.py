from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.feedback_session import FeedbackSession
from app.schemas.feedback_session import FeedbackSessionCreate


def create_session(db: Session, data: FeedbackSessionCreate):

    session = FeedbackSession(**data.model_dump())

    db.add(session)
    db.commit()
    db.refresh(session)

    return session


def get_sessions(db: Session):
    return db.query(FeedbackSession).all()


def get_session(db: Session, session_id: int):

    session = (
        db.query(FeedbackSession)
        .filter(FeedbackSession.id == session_id)
        .first()
    )

    if not session:
        raise HTTPException(404, "Session not found")

    return session


def update_session(db: Session, session_id: int, data: FeedbackSessionCreate):

    session = (
        db.query(FeedbackSession)
        .filter(FeedbackSession.id == session_id)
        .first()
    )

    if not session:
        raise HTTPException(404, "Session not found")

    session.session_name = data.session_name
    session.semester = data.semester
    session.academic_year = data.academic_year
    session.start_date = data.start_date
    session.end_date = data.end_date
    session.status = data.status

    db.commit()
    db.refresh(session)

    return session


def delete_session(db: Session, session_id: int):

    session = (
        db.query(FeedbackSession)
        .filter(FeedbackSession.id == session_id)
        .first()
    )

    if not session:
        raise HTTPException(404, "Session not found")

    db.delete(session)
    db.commit()

    return {"message": "Session deleted successfully"}