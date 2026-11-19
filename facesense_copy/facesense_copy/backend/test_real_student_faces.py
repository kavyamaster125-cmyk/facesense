import os
import cv2
import json
import numpy as np
from app.database import SessionLocal
from app.models.all_models import Student, FaceEmbedding
from app.services.face_recognition_service import verify_student_face, register_student_face, cosine_similarity, extract_face_embedding

def test_real_saved_faces():
    print("=== TESTING REAL SAVED STUDENT FACE PHOTOS FROM DISK ===")
    db = SessionLocal()

    faces_dir = os.path.join(os.path.dirname(__file__), "uploads", "faces")
    files = [f for f in os.listdir(faces_dir) if f.startswith("student_") and f.endswith(".jpg")]
    print(f"Found {len(files)} real student face image files in '{faces_dir}': {files}")

    # Register embeddings for all real saved student face photos
    for fname in files:
        stu_id = int(fname.replace("student_", "").replace(".jpg", ""))
        fpath = os.path.join(faces_dir, fname)
        with open(fpath, "rb") as f:
            img_bytes = f.read()

        stu = db.query(Student).filter(Student.id == stu_id).first()
        if not stu:
            print(f"Student ID {stu_id} not found in DB, skipping.")
            continue

        ok, msg, _ = register_student_face(stu_id, img_bytes, db)
        print(f"  [REGISTERED] Student ID {stu_id} ({stu.full_name}): {ok}")

    print("\n=== TESTING LIVE VERIFICATION FOR REAL STUDENT FACES ===")
    success_count = 0
    total_count = 0

    for fname in files:
        stu_id = int(fname.replace("student_", "").replace(".jpg", ""))
        stu = db.query(Student).filter(Student.id == stu_id).first()
        if not stu:
            continue

        fpath = os.path.join(faces_dir, fname)
        with open(fpath, "rb") as f:
            img_bytes = f.read()

        total_count += 1
        res = verify_student_face(img_bytes, db)
        print(f"Scan Face for '{stu.full_name}' (ID: {stu.id}) -> Authenticated={res['authenticated']} | Matched ID={res.get('student_id')} | Sim={res.get('similarity')}")

        if res['authenticated'] is True and res['student_id'] == stu.id:
            success_count += 1
        else:
            print(f"  FAILED MATCH: Expected ID {stu.id}, got {res.get('student_id')} with Sim {res.get('similarity')}")

    print(f"\nFinal Result: {success_count}/{total_count} real student face photos successfully matched!")

if __name__ == "__main__":
    test_real_saved_faces()
