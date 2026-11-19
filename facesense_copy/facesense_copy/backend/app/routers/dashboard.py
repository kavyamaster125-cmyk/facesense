from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.dashboard import StudentDashboardResponse
from app.services.dashboard_service import get_student_dashboard

router = APIRouter(
    prefix="/dashboard",
    tags=["Student Dashboard"]
)


@router.get(
    "/student/{student_id}",
    response_model=StudentDashboardResponse
)
def dashboard(
    student_id: int,
    db: Session = Depends(get_db)
):
    return get_student_dashboard(student_id, db)