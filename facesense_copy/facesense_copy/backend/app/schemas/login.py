from pydantic import BaseModel


class FaceLoginResponse(BaseModel):
    authenticated: bool
    student_id: int | None = None
    enrollment_no: str | None = None
    full_name: str | None = None
    similarity: float | None = None
    message: str