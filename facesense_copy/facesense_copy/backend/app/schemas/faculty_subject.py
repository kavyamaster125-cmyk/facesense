from pydantic import BaseModel, ConfigDict


class FacultySubjectCreate(BaseModel):
    faculty_id: int
    subject_id: int
    semester: int
    division: str
    academic_year: str


class FacultySubjectResponse(FacultySubjectCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)