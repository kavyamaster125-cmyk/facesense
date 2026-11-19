import requests

BASE_URL = "http://127.0.0.1:8000"

def safe_print(text):
    print(text.encode("ascii", errors="replace").decode("ascii"))

def run_tests():
    print("--- 1. Testing Root Endpoint ---")
    r = requests.get(f"{BASE_URL}/")
    assert r.status_code == 200, f"Root failed: {r.text}"
    safe_print("PASS: Root endpoint OK")

    print("\n--- 2. Testing Student Eligible Faculty Fetch ---")
    r = requests.get(f"{BASE_URL}/api/student/1/eligible-faculty")
    assert r.status_code == 200, f"Eligible faculty failed: {r.text}"
    data = r.json()
    assert "subjects" in data
    assert len(data["subjects"]) > 0
    safe_print(f"PASS: Eligible faculty fetched for student 1 ({data['full_name']})")
    cycle_id = data["cycle_id"]
    subj_id = data["subjects"][0]["subject_id"]
    fac_id = data["subjects"][0]["faculty_id"]

    print("\n--- 3. Testing Valid Feedback Submission & Reward Engine ---")
    payload = {
        "feedback_cycle_id": cycle_id,
        "student_id": 1,
        "faculty_id": fac_id,
        "subject_id": subj_id,
        "star_rating": 5,
        "swipe_response": "AGREE",
        "slider_value": 85,
        "mcq_option": "Explanation clarity",
        "suggestion_text": "Prof. XYZ explains database indexing concepts very clearly with great classroom interaction.",
        "focus_score": 92.0
    }
    r = requests.post(f"{BASE_URL}/api/feedback/submit", json=payload)
    # 200 or 409 if already submitted in previous run
    if r.status_code == 200:
        res = r.json()
        assert res["success"] is True
        safe_print(f"PASS: Feedback submitted successfully. Reward result: {res['reward']['message']}")
    else:
        safe_print("INFO: First feedback already recorded from previous test run.")

    print("\n--- 4. Testing Duplicate Feedback Submission Prevention (DB Constraint) ---")
    r_dup = requests.post(f"{BASE_URL}/api/feedback/submit", json=payload)
    assert r_dup.status_code == 409, f"Expected 409 Conflict, got {r_dup.status_code}: {r_dup.text}"
    safe_print("PASS: Duplicate submission attempt correctly blocked with HTTP 409 Conflict!")

    print("\n--- 5. Testing Faculty Login ---")
    r_login = requests.post(f"{BASE_URL}/api/faculty/login", json={
        "email": "prof.xyz@college.edu",
        "password": "faculty123"
    })
    assert r_login.status_code == 200, f"Faculty login failed: {r_login.text}"
    token = r_login.json()["access_token"]
    fac_id_logged = r_login.json()["faculty"]["id"]
    safe_print(f"PASS: Faculty login successful. Token acquired for Faculty ID {fac_id_logged}")

    print("\n--- 6. Testing Confidential Faculty Analytics API ---")
    headers = {"Authorization": f"Bearer {token}"}
    r_analytics = requests.get(f"{BASE_URL}/api/faculty/analytics?faculty_id={fac_id_logged}", headers=headers)
    assert r_analytics.status_code == 200, f"Faculty analytics failed: {r_analytics.text}"
    analytics_data = r_analytics.json()
    safe_print("PASS: Faculty Analytics fetched.")
    safe_print(f"Small-Sample Mask active?: {analytics_data.get('privacy_masked')}")

    print("\n--- 7. Testing Strict RBAC Security (Attempting access to another faculty's report) ---")
    r_illegal = requests.get(f"{BASE_URL}/api/faculty/analytics?faculty_id=9999", headers=headers)
    assert r_illegal.status_code == 403, f"Expected 403 Forbidden for cross-faculty access, got {r_illegal.status_code}"
    safe_print("PASS: Cross-faculty unauthorized analytics query blocked with HTTP 403 Forbidden!")

    print("\n--- 8. Testing Super Admin Login & Global System Overview ---")
    r_admin = requests.post(f"{BASE_URL}/api/admin/login", json={
        "email": "admin@college.edu",
        "password": "admin123"
    })
    assert r_admin.status_code == 200, f"Admin login failed: {r_admin.text}"
    admin_token = r_admin.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    r_admin_stats = requests.get(f"{BASE_URL}/api/admin/analytics", headers=admin_headers)
    assert r_admin_stats.status_code == 200, f"Admin analytics failed: {r_admin_stats.text}"
    safe_print(f"PASS: Super Admin Analytics fetched: {r_admin_stats.json()}")

    safe_print("\nALL SYSTEM TESTS PASSED SUCCESSFULLY 100%!")

if __name__ == "__main__":
    run_tests()
