from sqlalchemy import Column, BigInteger, String, Integer, Date, TIMESTAMP
from sqlalchemy.sql import func

from app.database import Base


class FeedbackSession(Base):
    __tablename__ = "feedback_sessions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    session_name = Column(String(100), nullable=False)
    semester = Column(Integer, nullable=False)

    academic_year = Column(String(20), nullable=False)

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    status = Column(String(20), default="CLOSED")

    created_at = Column(TIMESTAMP, server_default=func.now())