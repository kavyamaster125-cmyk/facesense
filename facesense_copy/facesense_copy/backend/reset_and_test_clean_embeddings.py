import cv2
import numpy as np
import requests
from app.database import SessionLocal
from app.models.all_models import FaceEmbedding, Student

BASE_URL = "http://127.0.0.1:8000"

def generate_student_face_image(skin_tone=(170, 140, 110), hair_color=(15, 15, 15), eye_y=160, bg_type="classroom"):
    img = np.zeros((400, 400, 3), dtype=np.uint8)

    if bg_type == "classroom":
        img[:, :] = (230, 230, 230)  # Whiteboard classroom background
        cv2.rectangle(img, (10, 10), (390, 80), (180, 180, 180), -1)  # Board frame
        cv2.line(img, (0, 90), (400, 90), (100, 100, 100), 2)
    else:  # Computer Lab
        img[:, :] = (120, 60, 40)  # Dark blue lab wall
        cv2.rectangle(img, (10, 10), (100, 120), (30, 30, 30), -1)  # Lab Monitor 1
        cv2.rectangle(img, (300, 10), (390, 120), (30, 30, 30), -1) # Lab Monitor 2

    # Hair
    cv2.ellipse(img, (200, 160), (110, 110), 0, 0, 360, hair_color, -1)
    # Face Oval
    cv2.circle(img, (200, 200), 90, skin_tone, -1)
    # Eyes
    cv2.circle(img, (160, eye_y), 10, (255, 255, 255), -1)
    cv2.circle(img, (240, eye_y), 10, (255, 255, 255), -1)
    cv2.circle(img, (160, eye_y), 4, (0, 0, 0), -1)
    cv2.circle(img, (240, eye_y), 4, (0, 0, 0), -1)
    # Nose
    cv2.line(img, (200, 180), (200, 220), (80, 60, 40), 3)
    # Mouth
    cv2.ellipse(img, (200, 255), (25, 12), 0, 0, 180, (40, 40, 160), 3)

    _, enc = cv2.imencode(".jpg", img)
    return enc.tobytes()

def run_clean_verification_test():
    print("=== CLEANING DATABASE & TESTING CLASSROOM vs LAB BACKGROUND INVARIANCE ===")
    db = SessionLocal()
    db.query(FaceEmbedding).delete()
    db.commit()
    print("Old face embeddings cleared from database.")

    # Admin Login
    r_admin = requests.post(f"{BASE_URL}/api/admin/login", json={"email":"admin@college.edu", "password":"admin123"})
    assert r_admin.status_code == 200
    token = r_admin.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    students = requests.get(f"{BASE_URL}/api/admin/students", headers=headers).json()
    stu_a = students[0]
    stu_b = students[1]

    print(f"Testing Student A: '{stu_a['full_name']}' (ID: {stu_a['id']})")
    print(f"Testing Student B: '{stu_b['full_name']}' (ID: {stu_b['id']})")

    # 1. Student A registers face in CLASSROOM (Whiteboard background)
    face_a_classroom = generate_student_face_image(skin_tone=(190, 150, 120), hair_color=(10, 10, 10), eye_y=160, bg_type="classroom")
    r_reg_a = requests.post(
        f"{BASE_URL}/api/admin/face/register/{stu_a['id']}",
        files={"file": ("face_a_class.jpg", face_a_classroom, "image/jpeg")},
        headers=headers
    )
    assert r_reg_a.status_code == 200, f"Register A failed: {r_reg_a.text}"
    print(f"Student A registered face in CLASSROOM background: SUCCESS")

    # 2. Student B registers face in CLASSROOM
    face_b_classroom = generate_student_face_image(skin_tone=(130, 100, 70), hair_color=(80, 40, 10), eye_y=175, bg_type="classroom")
    r_reg_b = requests.post(
        f"{BASE_URL}/api/admin/face/register/{stu_b['id']}",
        files={"file": ("face_b_class.jpg", face_b_classroom, "image/jpeg")},
        headers=headers
    )
    assert r_reg_b.status_code == 200, f"Register B failed: {r_reg_b.text}"
    print(f"Student B registered face in CLASSROOM background: SUCCESS")

    # 3. Student A logs in from COMPUTER LAB (Dark monitors & blue wall background)
    face_a_lab = generate_student_face_image(skin_tone=(190, 150, 120), hair_color=(10, 10, 10), eye_y=160, bg_type="lab")
    r_verify_a = requests.post(f"{BASE_URL}/api/face/verify", files={"file": ("face_a_lab.jpg", face_a_lab, "image/jpeg")})
    res_a = r_verify_a.json()
    print("Scan Student A (Registered in Classroom, Login in Computer Lab) Result:", res_a)
    assert res_a["authenticated"] is True, f"Student A failed to log in from Computer Lab: {res_a}"
    assert res_a["student_id"] == stu_a["id"]
    print("PASS 1: Student A registered in Classroom successfully logged in from Computer Lab!")

    # 4. Student B logs in from COMPUTER LAB
    face_b_lab = generate_student_face_image(skin_tone=(130, 100, 70), hair_color=(80, 40, 10), eye_y=175, bg_type="lab")
    r_verify_b = requests.post(f"{BASE_URL}/api/face/verify", files={"file": ("face_b_lab.jpg", face_b_lab, "image/jpeg")})
    res_b = r_verify_b.json()
    print("Scan Student B (Registered in Classroom, Login in Computer Lab) Result:", res_b)
    assert res_b["authenticated"] is True, f"Student B failed to log in from Computer Lab: {res_b}"
    assert res_b["student_id"] == stu_b["id"]
    print("PASS 2: Student B registered in Classroom successfully logged in from Computer Lab!")

    # 5. Unregistered Person C logs in from COMPUTER LAB -> MUST BE REJECTED
    face_c_lab = generate_student_face_image(skin_tone=(220, 180, 150), hair_color=(200, 200, 200), eye_y=145, bg_type="lab")
    r_verify_c = requests.post(f"{BASE_URL}/api/face/verify", files={"file": ("face_c_lab.jpg", face_c_lab, "image/jpeg")})
    res_c = r_verify_c.json()
    print("Scan Unregistered Person C Result:", res_c)
    assert res_c["authenticated"] is False
    print("PASS 3: Unregistered Person C correctly REJECTED!")

    print("\n>>> ALL CLASSROOM VS COMPUTER LAB BACKGROUND INVARIANCE TESTS PASSED 100%! <<<")

if __name__ == "__main__":
    run_clean_verification_test()
