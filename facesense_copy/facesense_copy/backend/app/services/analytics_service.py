from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.student import Student
from app.models.feedback import Feedback
from app.models.faculty import Faculty
from app.models.subject import Subject
from sqlalchemy import func
from app.models.faculty import Faculty
from app.models.feedback import Feedback
def lowest_faculty(db: Session):

    data = (
        db.query(
            Faculty.full_name.label("faculty_name"),

            func.avg(
                (
                    Feedback.teaching_rating +
                    Feedback.communication_rating +
                    Feedback.punctuality_rating +
                    Feedback.behaviour_rating +
                    Feedback.knowledge_rating
                ) / 5.0
            ).label("average_rating"),

            func.count(Feedback.id).label("total_feedback")

        )
        .join(
            Feedback,
            Feedback.faculty_id == Faculty.id
        )
        .group_by(
            Faculty.id,
            Faculty.full_name
        )
        .order_by(
            func.avg(
                (
                    Feedback.teaching_rating +
                    Feedback.communication_rating +
                    Feedback.punctuality_rating +
                    Feedback.behaviour_rating +
                    Feedback.knowledge_rating
                ) / 5.0
            ).asc()
        )
        .limit(5)
        .all()
    )

    return [
        {
            "faculty_name": row.faculty_name,
            "average_rating": round(float(row.average_rating), 2),
            "total_feedback": row.total_feedback
        }
        for row in data
    ]
def top_faculty(db: Session):

    data = (
        db.query(
            Faculty.full_name.label("faculty_name"),

            func.avg(
                (
                    Feedback.teaching_rating +
                    Feedback.communication_rating +
                    Feedback.punctuality_rating +
                    Feedback.behaviour_rating +
                    Feedback.knowledge_rating
                ) / 5.0
            ).label("average_rating"),

            func.count(Feedback.id).label("total_feedback")

        )
        .join(
            Feedback,
            Feedback.faculty_id == Faculty.id
        )
        .group_by(
            Faculty.id,
            Faculty.full_name
        )
        .order_by(
            func.avg(
                (
                    Feedback.teaching_rating +
                    Feedback.communication_rating +
                    Feedback.punctuality_rating +
                    Feedback.behaviour_rating +
                    Feedback.knowledge_rating
                ) / 5.0
            ).desc()
        )
        .limit(5)
        .all()
    )

    return [
        {
            "faculty_name": row.faculty_name,
            "average_rating": round(float(row.average_rating), 2),
            "total_feedback": row.total_feedback
        }
        for row in data
    ]
def subject_analytics(db: Session):

    data = (
        db.query(
            Subject.subject_name,

            func.avg(
                (
                    Feedback.teaching_rating +
                    Feedback.communication_rating +
                    Feedback.punctuality_rating +
                    Feedback.behaviour_rating +
                    Feedback.knowledge_rating
                ) / 5.0
            ).label("avg_rating"),

            func.count(Feedback.id).label("total_feedback")
        )
        .join(
            Feedback,
            Feedback.subject_id == Subject.id
        )
        .group_by(Subject.subject_name)
        .all()
    )

    result = []

    for row in data:
        result.append({
            "subject_name": row.subject_name,
            "average_rating": round(float(row.avg_rating), 2),
            "total_feedback": row.total_feedback
        })

    return result

def faculty_analytics(db: Session):

    data = (
        db.query(
            Faculty.full_name,

            func.avg(
                (
                    Feedback.teaching_rating +
                    Feedback.communication_rating +
                    Feedback.punctuality_rating +
                    Feedback.behaviour_rating +
                    Feedback.knowledge_rating
                ) / 5.0
            ).label("avg_rating"),

            func.count(Feedback.id).label("total_feedback")

        )
        .join(
            Feedback,
            Feedback.faculty_id == Faculty.id
        )
        .group_by(
            Faculty.full_name
        )
        .all()
    )

    result = []

    for row in data:

        result.append({
            "faculty_name": row.full_name,
            "average_rating": round(float(row.avg_rating), 2),
            "total_feedback": row.total_feedback
        })

    return result

def dashboard_analytics(db: Session):

    total_students = db.query(Student).count()

    feedback_students = (
        db.query(func.count(func.distinct(Feedback.student_id)))
        .scalar()
    )

    pending = total_students - feedback_students

    percentage = 0

    if total_students > 0:
        percentage = round(
            (feedback_students / total_students) * 100,
            2
        )

    return {
        "total_students": total_students,
        "feedback_submitted": feedback_students,
        "pending_feedback": pending,
        "completion_percentage": percentage
    }