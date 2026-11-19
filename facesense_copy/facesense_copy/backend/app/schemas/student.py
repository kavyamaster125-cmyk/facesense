from pydantic import BaseModel, ConfigDict


class StudentCreate(BaseModel):
    enrollment_no: str
    full_name: str
    department: str
    semester: int
    attendance_percentage: float = 0.0
    cpi: float = 0.0


class StudentResponse(StudentCreate):
    id: int
    is_registered: bool

    model_config = ConfigDict(from_attributes=True)