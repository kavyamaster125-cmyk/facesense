from sqlalchemy import (
    Column,
    BigInteger,
    Boolean,
    ForeignKey,
    TIMESTAMP
)
from sqlalchemy.sql import func

from app.database import Base


class StudentFeedbackStatus(Base):
    __tablename__ = "student_feedback_status"

    id = Column(BigInteger, primary_key=True)

    student_id = Column(BigInteger, ForeignKey("students.id"))
    session_id = Column(BigInteger, ForeignKey("feedback_sessions.id"))

    submitted = Column(Boolean, default=False)

    submitted_at = Column(TIMESTAMP, server_default=func.now())