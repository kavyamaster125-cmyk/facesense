from sqlalchemy import (
    Column,
    BigInteger,
    Integer,
    Text,
    ForeignKey,
    TIMESTAMP
)
from sqlalchemy.sql import func

from app.database import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    session_id = Column(BigInteger, ForeignKey("feedback_sessions.id"))
    student_id = Column(
    BigInteger,
    ForeignKey("students.id")
)
    faculty_id = Column(BigInteger, ForeignKey("faculty.id"))
    subject_id = Column(BigInteger, ForeignKey("subjects.id"))

    teaching_rating = Column(Integer)
    communication_rating = Column(Integer)
    punctuality_rating = Column(Integer)
    behaviour_rating = Column(Integer)
    knowledge_rating = Column(Integer)

    comments = Column(Text)

    created_at = Column(TIMESTAMP, server_default=func.now())