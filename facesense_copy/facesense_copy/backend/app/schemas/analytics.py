from pydantic import BaseModel
from typing import List

class FacultyAnalytics(BaseModel):
    faculty_name: str
    average_rating: float
    total_feedback: int

class DashboardAnalyticsResponse(BaseModel):
    total_students: int
    feedback_submitted: int
    pending_feedback: int
    completion_percentage: float

class SubjectAnalytics(BaseModel):
    subject_name: str
    average_rating: float
    total_feedback: int
class LowestFacultyResponse(BaseModel):
    faculty_name: str
    average_rating: float
    total_feedback: int
    
class TopFacultyResponse(BaseModel):
    faculty_name: str
    average_rating: float
    total_feedback: int