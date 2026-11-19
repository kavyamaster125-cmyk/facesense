from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.student import Student
from app.schemas.student import StudentCreate


def create_student(db: Session, student: StudentCreate):

    existing_student = (
        db.query(Student)
        .filter(Student.enrollment_no == student.enrollment_no)
        .first()
    )

    if existing_student:
        raise HTTPException(
            status_code=400,
            detail="Enrollment number already exists."
        )

    new_student = Student(
        enrollment_no=student.enrollment_no,
        full_name=student.full_name,
        department=student.department,
        semester=student.semester
    )

    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    return new_student


def get_all_students(db: Session):
    return db.query(Student).all()


def get_student_by_id(db: Session, student_id: int):

    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found."
        )

    return student


def update_student(db: Session, student_id: int, data: StudentCreate):

    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found."
        )

    student.enrollment_no = data.enrollment_no
    student.full_name = data.full_name
    student.department = data.department
    student.semester = data.semester

    db.commit()
    db.refresh(student)

    return student


def delete_student(db: Session, student_id: int):

    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found."
        )

    db.delete(student)
    db.commit()

    return {"message": "Student deleted successfully"}