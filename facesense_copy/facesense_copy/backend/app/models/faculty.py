from sqlalchemy import Column, BigInteger, String, TIMESTAMP
from sqlalchemy.sql import func

from app.database import Base


class Faculty(Base):
    __tablename__ = "faculty"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)

    full_name = Column(String(100), nullable=False)
    department = Column(String(50), nullable=False)
    designation = Column(String(50))

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())