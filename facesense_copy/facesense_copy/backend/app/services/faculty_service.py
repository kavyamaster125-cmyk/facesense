from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.faculty import Faculty
from app.schemas.faculty import FacultyCreate, FacultyUpdate


def create_faculty(db: Session, faculty: FacultyCreate):
    data = faculty.model_dump()
    new_faculty = Faculty(**data)
    db.add(new_faculty)
    db.commit()
    db.refresh(new_faculty)
    return new_faculty


def get_all_faculty(db: Session):
    return db.query(Faculty).all()


def get_faculty_by_id(db: Session, faculty_id: int):
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()

    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found.")

    return faculty


def update_faculty(db: Session, faculty_id: int, data: FacultyUpdate):
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()

    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found.")

    if hasattr(data, "faculty_code") and data.faculty_code:
        faculty.faculty_code = data.faculty_code
    if data.full_name:
        faculty.full_name = data.full_name
    if hasattr(data, "email") and data.email:
        faculty.email = data.email
    if data.department:
        faculty.department = data.department
    if data.designation:
        faculty.designation = data.designation

    db.commit()
    db.refresh(faculty)

    return faculty


def delete_faculty(db: Session, faculty_id: int):
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()

    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found.")

    db.delete(faculty)
    db.commit()

    return {"message": "Faculty deleted successfully."}
