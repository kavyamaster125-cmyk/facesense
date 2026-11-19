from pydantic import BaseModel
from typing import List


class SubjectFaculty(BaseModel):
    subject_id: int
    subject_name: str
    faculty_id: int
    faculty_name: str


class StudentDashboardResponse(BaseModel):
    student_id: int
    full_name: str
    semester: int
    session_name: str
    subjects: List[SubjectFaculty]