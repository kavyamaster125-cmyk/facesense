from sqlalchemy import (
    Column,
    BigInteger,
    Integer,
    String,
    ForeignKey,
    TIMESTAMP
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class FacultySubject(Base):
    __tablename__ = "faculty_subjects"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    faculty_id = Column(BigInteger, ForeignKey("faculty.id"))
    subject_id = Column(BigInteger, ForeignKey("subjects.id"))

    semester = Column(Integer, nullable=False)
    division = Column(String(10), nullable=False)
    academic_year = Column(String(20), nullable=False)

    created_at = Column(TIMESTAMP, server_default=func.now())

    faculty = relationship("Faculty")
    subject = relationship("Subject")