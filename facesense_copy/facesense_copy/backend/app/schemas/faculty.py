from pydantic import BaseModel, ConfigDict
from typing import Optional


class FacultyCreate(BaseModel):
    faculty_code: Optional[str] = None
    full_name: str
    email: Optional[str] = None
    department: str
    designation: Optional[str] = "Assistant Professor"
    password: Optional[str] = "faculty123"


class FacultyUpdate(BaseModel):
    faculty_code: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    password: Optional[str] = None


class FacultyResponse(BaseModel):
    id: int
    faculty_code: str
    full_name: str
    email: str
    department: str
    designation: str

    model_config = ConfigDict(from_attributes=True)
