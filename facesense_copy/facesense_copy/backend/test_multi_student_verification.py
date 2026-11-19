import cv2
import numpy as np
import requests
from app.database import SessionLocal
from app.models.all_models import FaceEmbedding, Student

BASE_URL = "http://127.0.0.1:8000"

def create_distinct_student_face(student_idx: int, bg_type: str = "classroom"):
    img = np.zeros((400, 400, 3), dtype=np.uint8)

    # Backgrounds
    if bg_type == "classroom":
        img[:, :] = (235, 235, 235)  # Classroom Whiteboard
        cv2.rectangle(img, (20, 20), (380, 70), (190, 190, 190), -1)
    elif bg_type == "lab":
        img[:, :] = (130, 70, 40)   # Lab Blue Wall
        cv2.rectangle(img, (10, 10), (110, 130), (30, 30, 30), -1)
    else:
        img[:, :] = (50, 100, 50)   # Library Green Wall

    # 5 Distinct Student Facial Attributes
    profiles = [
        {"skin": (180, 140, 110), "hair": (10, 10, 10), "eye_y": 155, "face_w": 50, "glasses": False},
        {"skin": (140, 110, 80),  "hair": (80, 40, 10), "eye_y": 170, "face_w": 60, "glasses": True},
        {"skin": (210, 175, 145), "hair": (30, 30, 80), "eye_y": 150, "face_w": 45, "glasses": False},
        {"skin": (160, 125, 95),  "hair": (20, 80, 20), "eye_y": 165, "face_w": 55, "glasses": False},
        {"skin": (120, 90, 60),   "hair": (100, 100, 10), "eye_y": 160, "face_w": 52, "glasses": True},
    ]

    p = profiles[student_idx % len(profiles)]

    # Hair
    cv2.ellipse(img, (200, 160), (110, 110), 0, 0, 360, p["hair"], -1)
    # Face Oval
    cv2.ellipse(img, (200, 200), (p["face_w"], 70), 0, 0, 360, p["skin"], -1)
    # Eyes
    cv2.circle(img, (160, p["eye_y"]), 8, (255, 255, 255), -1)
    cv2.circle(img, (240, p["eye_y"]), 8, (255, 255, 255), -1)
    cv2.circle(img, (160, p["eye_y"]), 3, (0, 0, 0), -1)
    cv2.circle(img, (240, p["eye_y"]), 3, (0, 0, 0), -1)

    if p["glasses"]:
        cv2.rectangle(img, (145, p["eye_y"] - 10), (175, p["eye_y"] + 10), (200, 200, 200), 2)
        cv2.rectangle(img, (225, p["eye_y"] - 10), (255, p["eye_y"] + 10), (200, 200, 200), 2)
        cv2.line(img, (175, p["eye_y"]), (225, p["eye_y"]), (200, 200, 200), 2)

    # Nose
    cv2.line(img, (200, 180), (200, 220), (60, 40, 20), 3)
    # Mouth
    cv2.ellipse(img, (200, 250), (25, 12), 0, 0, 180, (30, 30, 150), 3)

    _, enc = cv2.imencode(".jpg", img)
    return enc.tobytes()

def test_multi_student_verification():
    print("=== TESTING MULTI-STUDENT FACE REGISTRATION & VERIFICATION ===")
    db = SessionLocal()
    db.query(FaceEmbedding).delete()
    db.commit()

    r_admin = requests.post(f"{BASE_URL}/api/admin/login", json={"email":"admin@college.edu", "password":"admin123"})
    assert r_admin.status_code == 200
    headers = {"Authorization": f"Bearer {r_admin.json()['access_token']}"}

    students = requests.get(f"{BASE_URL}/api/admin/students", headers=headers).json()
    assert len(students) >= 5, "Requires at least 5 students in DB"

    test_students = students[:5]

    print("\nStep 1: Registering Faces for 5 Students in Classroom Background...")
    for idx, stu in enumerate(test_students):
        face_bytes = create_distinct_student_face(idx, bg_type="classroom")
        r_reg = requests.post(
            f"{BASE_URL}/api/admin/face/register/{stu['id']}",
            files={"file": (f"stu_{stu['id']}_class.jpg", face_bytes, "image/jpeg")},
            headers=headers
        )
        assert r_reg.status_code == 200, f"Failed to register Student {stu['full_name']}: {r_reg.text}"
        print(f"  [OK] Registered Student {idx+1}: {stu['full_name']} (ID: {stu['id']})")

    print("\nStep 2: Testing Live Face Verification for Each Student in Computer Lab Background...")
    for idx, stu in enumerate(test_students):
        # Scan face in LAB background
        face_bytes_lab = create_distinct_student_face(idx, bg_type="lab")
        r_ver = requests.post(f"{BASE_URL}/api/face/verify", files={"file": (f"stu_{stu['id']}_lab.jpg", face_bytes_lab, "image/jpeg")})
        assert r_ver.status_code == 200
        res = r_ver.json()
        print(f"  Scan Student {idx+1} ({stu['full_name']}) in Lab -> Authenticated: {res['authenticated']} | Matched ID: {res.get('student_id')} | Sim: {res.get('similarity')}")
        assert res["authenticated"] is True, f"Student {stu['full_name']} failed verification!"
        assert res["student_id"] == stu["id"], f"Expected Student ID {stu['id']}, got {res.get('student_id')}"

    print("\nStep 3: Testing Unregistered Face Scan -> Must be Rejected...")
    unregistered_face = create_distinct_student_face(99, bg_type="library")
    r_unreg = requests.post(f"{BASE_URL}/api/face/verify", files={"file": ("unreg.jpg", unregistered_face, "image/jpeg")})
    res_unreg = r_unreg.json()
    print(f"  Scan Unregistered Face -> Authenticated: {res_unreg['authenticated']} | Message: {res_unreg['message']}")
    assert res_unreg["authenticated"] is False
    assert res_unreg["student_id"] is None

    print("\n>>> 100% MULTI-STUDENT FACE VERIFICATION PASSED PERFECTLY! <<<")

if __name__ == "__main__":
    test_multi_student_verification()
