import requests
import cv2
import numpy as np

BASE_URL = "http://127.0.0.1:8000"

def create_face_image(hair_color=(20, 20, 20), skin_tone=(160, 130, 100), eye_y=160):
    img = np.zeros((400, 400, 3), dtype=np.uint8) + 210
    # Hair
    cv2.ellipse(img, (200, 160), (110, 110), 0, 0, 360, hair_color, -1)
    # Face
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

def test_full_face_pipeline():
    print("=== TESTING INSIGHTFACE ARCFACE BIOMETRIC DISCRIMINATION & RECOGNITION ===")

    # Admin Login
    r_admin = requests.post(f"{BASE_URL}/api/admin/login", json={"email":"admin@college.edu", "password":"admin123"})
    assert r_admin.status_code == 200
    token = r_admin.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    students = requests.get(f"{BASE_URL}/api/admin/students", headers=headers).json()
    stu_a = students[0]
    stu_b = students[1]
    stu_c = students[2]

    print(f"Testing 3 Students: A='{stu_a['full_name']}' (ID: {stu_a['id']}), B='{stu_b['full_name']}' (ID: {stu_b['id']}), C='{stu_c['full_name']}' (ID: {stu_c['id']})")

    # Generate 3 distinct face images
    face_a_bytes = create_face_image(hair_color=(10, 10, 10), skin_tone=(180, 140, 110), eye_y=160)
    face_b_bytes = create_face_image(hair_color=(80, 40, 10), skin_tone=(140, 110, 80), eye_y=175)
    face_c_bytes = create_face_image(hair_color=(200, 200, 200), skin_tone=(210, 170, 140), eye_y=150)

    # 1. Register Face A for Student A
    r_reg_a = requests.post(
        f"{BASE_URL}/api/admin/face/register/{stu_a['id']}",
        files={"file": ("face_a.jpg", face_a_bytes, "image/jpeg")},
        headers=headers
    )
    assert r_reg_a.status_code == 200, f"Register A failed: {r_reg_a.text}"

    # 2. Register Face B for Student B
    r_reg_b = requests.post(
        f"{BASE_URL}/api/admin/face/register/{stu_b['id']}",
        files={"file": ("face_b.jpg", face_b_bytes, "image/jpeg")},
        headers=headers
    )
    assert r_reg_b.status_code == 200, f"Register B failed: {r_reg_b.text}"

    # 3. Test Scan Face A -> MUST match Student A
    r_verify_a = requests.post(f"{BASE_URL}/api/face/verify", files={"file": ("scan_a.jpg", face_a_bytes, "image/jpeg")})
    res_a = r_verify_a.json()
    print("Scan Face A Result:", res_a)
    assert res_a["authenticated"] is True
    assert res_a["student_id"] == stu_a["id"]
    print("PASS: Face A matched Student A successfully!")

    # 4. Test Scan Face B -> MUST match Student B
    r_verify_b = requests.post(f"{BASE_URL}/api/face/verify", files={"file": ("scan_b.jpg", face_b_bytes, "image/jpeg")})
    res_b = r_verify_b.json()
    print("Scan Face B Result:", res_b)
    assert res_b["authenticated"] is True
    assert res_b["student_id"] == stu_b["id"]
    print("PASS: Face B matched Student B successfully!")

    # 5. Test Scan Face C (Unregistered) -> MUST FAIL (authenticated: False)
    r_verify_c = requests.post(f"{BASE_URL}/api/face/verify", files={"file": ("scan_c.jpg", face_c_bytes, "image/jpeg")})
    res_c = r_verify_c.json()
    print("Scan Unregistered Face C Result:", res_c)
    assert res_c["authenticated"] is False
    assert res_c["student_id"] is None
    print("PASS: Unregistered Face C correctly REJECTED!")

    print("\n>>> INSIGHTFACE ARCFACE BIOMETRIC DISCRIMINATION TEST PASSED 100%! <<<")

if __name__ == "__main__":
    test_full_face_pipeline()
