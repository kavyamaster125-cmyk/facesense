from pydantic import BaseModel


class FaceRegisterResponse(BaseModel):
    message: str
    student_id: int
    enrollment_no: str