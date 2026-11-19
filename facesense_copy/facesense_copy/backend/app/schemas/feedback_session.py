from datetime import date
from pydantic import BaseModel, ConfigDict


class FeedbackSessionCreate(BaseModel):
    session_name: str
    semester: int
    academic_year: str
    start_date: date
    end_date: date
    status: str


class FeedbackSessionResponse(FeedbackSessionCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)