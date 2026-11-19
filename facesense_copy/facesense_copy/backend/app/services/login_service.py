import cv2
import numpy as np

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.models.student import Student
from app.ai.utils import load_face_model
from app.ai.face_matcher import cosine_similarity


def face_login(file: UploadFile, db: Session):

    # Read uploaded image
    image_bytes = file.file.read()

    image_array = np.frombuffer(image_bytes, dtype=np.uint8)

    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        return {
            "authenticated": False,
            "student_id": None,
            "enrollment_no": None,
            "full_name": None,
            "similarity": None,
            "message": "Unable to read uploaded image."
        }

    # Load AI model
    app = load_face_model()

    # Detect face
    faces = app.get(image)

    if len(faces) == 0:
        return {
            "authenticated": False,
            "student_id": None,
            "enrollment_no": None,
            "full_name": None,
            "similarity": None,
            "message": "No face detected."
        }

    current_embedding = faces[0].normed_embedding.tolist()

    students = (
        db.query(Student)
        .filter(Student.is_registered == True)
        .all()
    )

    best_student = None
    best_similarity = -1

    for student in students:

        if student.face_embedding is None:
            continue

        similarity = cosine_similarity(
            current_embedding,
            student.face_embedding
        )

        if similarity > best_similarity:
            best_similarity = similarity
            best_student = student

    THRESHOLD = 0.60

    if best_student and best_similarity >= THRESHOLD:

        return {
            "authenticated": True,
            "student_id": best_student.id,
            "enrollment_no": best_student.enrollment_no,
            "full_name": best_student.full_name,
            "similarity": round(best_similarity, 4),
            "message": "Login Successful"
        }

    return {
        "authenticated": False,
        "student_id": None,
        "enrollment_no": None,
        "full_name": None,
        "similarity": None,
        "message": "Face not recognized."
    }