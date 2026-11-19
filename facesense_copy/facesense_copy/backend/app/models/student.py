from sqlalchemy import Column, BigInteger, String, Integer, Boolean, Text, TIMESTAMP
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)

    enrollment_no = Column(String(20), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    department = Column(String(50), nullable=False)
    semester = Column(Integer, nullable=False)

    face_image_path = Column(Text)
    face_embedding = Column(Vector(512))

    attendance_percentage = Column(Float, default=0.0)
    cpi = Column(Float, default=0.0)

    is_registered = Column(Boolean, default=False)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())