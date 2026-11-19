from pydantic import BaseModel, ConfigDict
from typing import Optional


class SubjectCreate(BaseModel):
    subject_code: str
    subject_name: str
    department: Optional[str] = "Computer Engineering"
    semester: int


class SubjectUpdate(BaseModel):
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[int] = None


class SubjectResponse(BaseModel):
    id: int
    subject_code: str
    subject_name: str
    department: str
    semester: int

    model_config = ConfigDict(from_attributes=True)
