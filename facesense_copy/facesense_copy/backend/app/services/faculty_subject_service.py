from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.faculty import Faculty
from app.models.subject import Subject
from app.models.faculty_subject import FacultySubject
from app.schemas.faculty_subject import FacultySubjectCreate


def assign_subject(db: Session, data: FacultySubjectCreate):

    faculty = db.query(Faculty).filter(Faculty.id == data.faculty_id).first()

    if not faculty:
        raise HTTPException(404, "Faculty not found")

    subject = db.query(Subject).filter(Subject.id == data.subject_id).first()

    if not subject:
        raise HTTPException(404, "Subject not found")

    existing = (
    db.query(FacultySubject)
    .filter(
        FacultySubject.faculty_id == data.faculty_id,
        FacultySubject.subject_id == data.subject_id,
        FacultySubject.semester == data.semester,
        FacultySubject.division == data.division,
        FacultySubject.academic_year == data.academic_year
    )
    .first()
)

    if existing:
        raise HTTPException(
            400,
            "This subject is already assigned to this faculty."
        )

    assignment = FacultySubject(
    faculty_id=data.faculty_id,
    subject_id=data.subject_id,
    semester=data.semester,
    division=data.division,
    academic_year=data.academic_year
)

    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return assignment


def get_assignments(db: Session):
    return db.query(FacultySubject).all()


def delete_assignment(db: Session, assignment_id: int):

    assignment = (
        db.query(FacultySubject)
        .filter(FacultySubject.id == assignment_id)
        .first()
    )

    if not assignment:
        raise HTTPException(404, "Assignment not found")

    db.delete(assignment)
    db.commit()

    return {"message": "Assignment deleted successfully"}