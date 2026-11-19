from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.subject import SubjectCreate, SubjectResponse
from app.services import subject_service

router = APIRouter(
    prefix="/subjects",
    tags=["Subjects"]
)


@router.post("/", response_model=SubjectResponse)
def create_subject(subject: SubjectCreate, db: Session = Depends(get_db)):
    return subject_service.create_subject(db, subject)


@router.get("/", response_model=list[SubjectResponse])
def get_subjects(db: Session = Depends(get_db)):
    return subject_service.get_all_subjects(db)


@router.get("/{subject_id}", response_model=SubjectResponse)
def get_subject(subject_id: int, db: Session = Depends(get_db)):
    return subject_service.get_subject_by_id(db, subject_id)


@router.put("/{subject_id}", response_model=SubjectResponse)
def update_subject(subject_id: int, subject: SubjectCreate, db: Session = Depends(get_db)):
    return subject_service.update_subject(db, subject_id, subject)


@router.delete("/{subject_id}")
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    return subject_service.delete_subject(db, subject_id)