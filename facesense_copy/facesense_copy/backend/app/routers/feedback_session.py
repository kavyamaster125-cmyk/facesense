from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.feedback_session import (
    FeedbackSessionCreate,
    FeedbackSessionResponse
)
from app.services import feedback_session_service

router = APIRouter(
    prefix="/feedback-sessions",
    tags=["Feedback Sessions"]
)


@router.post("/", response_model=FeedbackSessionResponse)
def create_session(
    data: FeedbackSessionCreate,
    db: Session = Depends(get_db)
):
    return feedback_session_service.create_session(db, data)


@router.get("/", response_model=list[FeedbackSessionResponse])
def get_sessions(db: Session = Depends(get_db)):
    return feedback_session_service.get_sessions(db)


@router.get("/{session_id}", response_model=FeedbackSessionResponse)
def get_session(session_id: int, db: Session = Depends(get_db)):
    return feedback_session_service.get_session(db, session_id)


@router.put("/{session_id}", response_model=FeedbackSessionResponse)
def update_session(
    session_id: int,
    data: FeedbackSessionCreate,
    db: Session = Depends(get_db)
):
    return feedback_session_service.update_session(db, session_id, data)


@router.delete("/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    return feedback_session_service.delete_session(db, session_id)