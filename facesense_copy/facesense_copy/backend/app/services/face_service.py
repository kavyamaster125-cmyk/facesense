import os
import cv2
import numpy as np

from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from app.models.student import Student
from app.ai.utils import load_face_model

UPLOAD_FOLDER = "app/uploads/faces"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def register_face(student_id: int, file: UploadFile, db: Session):

    # Find student
    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found."
        )

    # Save image using enrollment number
    filename = f"{student.enrollment_no}.jpg"
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    with open(filepath, "wb") as f:
        f.write(file.file.read())

    # Load image
    image = cv2.imread(filepath)

    if image is None:
        raise HTTPException(
            status_code=400,
            detail="Unable to read uploaded image."
        )

    # Detect face
    app = load_face_model()

    faces = app.get(image)

    if len(faces) == 0:
        raise HTTPException(
            status_code=400,
            detail="No face detected."
        )

    face = faces[0]

    # Get ArcFace embedding
    embedding = face.normed_embedding.tolist()

    # Save to database
    student.face_image_path = filepath
    student.face_embedding = embedding
    student.is_registered = True

    db.commit()
    db.refresh(student)

    return {
        "message": "Face registered successfully.",
        "student_id": student.id,
        "enrollment_no": student.enrollment_no
    }