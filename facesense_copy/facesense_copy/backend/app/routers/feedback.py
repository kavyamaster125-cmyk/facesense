from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.feedback import FeedbackCreate
from app.services.feedback_service import submit_feedback

router = APIRouter(
    prefix="/feedback",
    tags=["Feedback"]
)


@router.post("/submit")
def submit(
    data: FeedbackCreate,
    db: Session = Depends(get_db)
):
    return submit_feedback(data, db)