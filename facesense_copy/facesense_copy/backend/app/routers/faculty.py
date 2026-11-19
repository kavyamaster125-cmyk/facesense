from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.faculty import FacultyCreate, FacultyResponse
from app.services import faculty_service

router = APIRouter(
    prefix="/faculty",
    tags=["Faculty"]
)


@router.post("/", response_model=FacultyResponse)
def create_faculty(faculty: FacultyCreate, db: Session = Depends(get_db)):
    return faculty_service.create_faculty(db, faculty)


@router.get("/", response_model=list[FacultyResponse])
def get_faculty(db: Session = Depends(get_db)):
    return faculty_service.get_all_faculty(db)


@router.get("/{faculty_id}", response_model=FacultyResponse)
def get_faculty_by_id(faculty_id: int, db: Session = Depends(get_db)):
    return faculty_service.get_faculty_by_id(db, faculty_id)


@router.put("/{faculty_id}", response_model=FacultyResponse)
def update_faculty(faculty_id: int, faculty: FacultyCreate, db: Session = Depends(get_db)):
    return faculty_service.update_faculty(db, faculty_id, faculty)


@router.delete("/{faculty_id}")
def delete_faculty(faculty_id: int, db: Session = Depends(get_db)):
    return faculty_service.delete_faculty(db, faculty_id)