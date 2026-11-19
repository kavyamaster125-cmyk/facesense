from pydantic import BaseModel


class FeedbackCreate(BaseModel):

    session_id: int
    student_id: int

    faculty_id: int
    subject_id: int

    teaching_rating: int
    communication_rating: int
    punctuality_rating: int
    behaviour_rating: int
    knowledge_rating: int

    comments: str | None = None