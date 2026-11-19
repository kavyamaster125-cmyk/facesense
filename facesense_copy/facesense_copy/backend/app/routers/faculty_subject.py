from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.faculty_subject import (
    FacultySubjectCreate,
    FacultySubjectResponse
)
from app.services import faculty_subject_service

router = APIRouter(
    prefix="/faculty-subjects",
    tags=["Faculty Subject Assignment"]
)


@router.post("/", response_model=FacultySubjectResponse)
def assign_subject(
    data: FacultySubjectCreate,
    db: Session = Depends(get_db)
):
    return faculty_subject_service.assign_subject(db, data)


@router.get("/", response_model=list[FacultySubjectResponse])
def get_assignments(db: Session = Depends(get_db)):
    return faculty_subject_service.get_assignments(db)


@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db)
):
    return faculty_subject_service.delete_assignment(db, assignment_id)