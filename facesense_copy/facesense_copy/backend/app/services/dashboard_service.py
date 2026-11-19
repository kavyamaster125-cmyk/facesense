from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.student import Student
from app.models.feedback_session import FeedbackSession
from app.models.feedback import Feedback
from app.models.faculty_subject import FacultySubject
from app.models.faculty import Faculty
from app.models.subject import Subject


def get_student_dashboard(student_id: int, db: Session):

    # Student
    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found."
        )

    # Active Session
    session = (
    db.query(FeedbackSession)
    .filter(FeedbackSession.status == "active")
    .first()
)

    if not session:
        raise HTTPException(
            status_code=404,
            detail="No active feedback session."
        )

    # Already Submitted?
    already = (
        db.query(Feedback)
        .filter(
            Feedback.student_id == student.id,
            Feedback.session_id == session.id
        )
        .first()
    )

    if already:
        return {
            "student_id": student.id,
            "full_name": student.full_name,
            "semester": student.semester,
            "session_name": session.session_name,
            "subjects": []
        }

    assignments = (
        db.query(FacultySubject)
        .filter(
            FacultySubject.semester == student.semester
        )
        .all()
    )

    subject_list = []

    for item in assignments:

        faculty = (
            db.query(Faculty)
            .filter(Faculty.id == item.faculty_id)
            .first()
        )

        subject = (
            db.query(Subject)
            .filter(Subject.id == item.subject_id)
            .first()
        )

        subject_list.append({
            "subject_id": subject.id,
            "subject_name": subject.subject_name,
            "faculty_id": faculty.id,
            "faculty_name": faculty.full_name
        })

    return {
        "student_id": student.id,
        "full_name": student.full_name,
        "semester": student.semester,
        "session_name": session.session_name,
        "subjects": subject_list
    }