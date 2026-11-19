import requests
import cv2
import numpy as np

BASE_URL = "http://127.0.0.1:8000"

def create_face_img(eye_offset=0, mouth_w=15, square=False):
    img = np.zeros((200, 200, 3), dtype=np.uint8) + 180
    if not square:
        cv2.circle(img, (100, 100), 55, (140, 110, 90), -1)
    else:
        cv2.rectangle(img, (45, 45), (155, 155), (90, 70, 50), -1)

    cv2.circle(img, (75 + eye_offset, 80), 8, (255, 255, 255), -1)
    cv2.circle(img, (125 - eye_offset, 80), 8, (255, 255, 255), -1)
    cv2.circle(img, (75 + eye_offset, 80), 3, (0, 0, 0), -1)
    cv2.circle(img, (125 - eye_offset, 80), 3, (0, 0, 0), -1)
    cv2.ellipse(img, (100, 130), (mouth_w, 10), 0, 0, 180, (40, 40, 180), 3)

    _, enc = cv2.imencode(".jpg", img)
    return enc.tobytes()

def test_strict():
    print("=== TESTING STRICT FACIAL BIOMETRIC DISCRIMINATION ===")

    # Admin Login
    r_admin = requests.post(f"{BASE_URL}/api/admin/login", json={"email":"admin@college.edu", "password":"admin123"})
    token = r_admin.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Clean old test embeddings in DB
    students = requests.get(f"{BASE_URL}/api/admin/students", headers=headers).json()
    test_stu = students[0]
    print(f"Registering Face Image for Student '{test_stu['full_name']}' (ID: {test_stu['id']})...")

    # 2. Register Face Image for Student A
    face_a = create_face_img(eye_offset=0, mouth_w=15, square=False)
    r_reg = requests.post(
        f"{BASE_URL}/api/admin/face/register/{test_stu['id']}",
        files={"file": ("student_a.jpg", face_a, "image/jpeg")},
        headers=headers
    )
    assert r_reg.status_code == 200, f"Register failed: {r_reg.text}"
    print("Registered Student A face successfully!")

    # 3. Test Scan with SAME Face (Student A) -> MUST PASS
    r_scan_a = requests.post(
        f"{BASE_URL}/api/face/verify",
        files={"file": ("scan_a.jpg", face_a, "image/jpeg")}
    )
    res_a = r_scan_a.json()
    print("Scan Same Person Result:", res_a)
    assert res_a["authenticated"] is True
    print("PASS 1: Registered student logged in successfully!")

    # 4. Test Scan with DIFFERENT Face (Square face with different features) -> MUST FAIL (authenticated: False)
    face_b = create_face_img(eye_offset=15, mouth_w=40, square=True)
    r_scan_b = requests.post(
        f"{BASE_URL}/api/face/verify",
        files={"file": ("scan_b.jpg", face_b, "image/jpeg")}
    )
    res_b = r_scan_b.json()
    print("Scan Different Person Result:", res_b)
    assert res_b["authenticated"] is False
    print("PASS 2: Unregistered / Different face correctly REJECTED (authenticated: False)!")

    print("\n>>> STRICT FACIAL RECOGNITION DISCRIMINATION TEST PASSED 100%! <<<")

if __name__ == "__main__":
    test_strict()
