from sqlalchemy import Column, BigInteger, String, Integer, TIMESTAMP
from sqlalchemy.sql import func

from app.database import Base


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)

    subject_code = Column(String(20), unique=True, nullable=False)
    subject_name = Column(String(100), nullable=False)
    semester = Column(Integer, nullable=False)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())