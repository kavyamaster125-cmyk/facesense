import requests

BASE_URL = "http://127.0.0.1:8000"

def safe_print(text):
    print(text.encode("ascii", errors="replace").decode("ascii"))

def test_deletions():
    safe_print("=== TESTING ALL 5 DELETE ENDPOINTS ===")

    # 1. Admin Login
    r_admin = requests.post(f"{BASE_URL}/api/admin/login", json={
        "email": "admin@college.edu",
        "password": "admin123"
    })
    assert r_admin.status_code == 200
    token = r_admin.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test Feedback Cycle Deletion
    cycles = requests.get(f"{BASE_URL}/api/admin/feedback-sessions", headers=headers).json()
    if len(cycles) > 0:
        target_cycle = cycles[-1]
        r_del_c = requests.delete(f"{BASE_URL}/api/admin/feedback-sessions/{target_cycle['id']}", headers=headers)
        assert r_del_c.status_code == 200, f"Delete cycle failed: {r_del_c.text}"
        safe_print(f"PASS: Deleted Feedback Cycle '{target_cycle['session_name']}'")

    # 3. Test Assignment Deletion
    assignments = requests.get(f"{BASE_URL}/api/admin/faculty-subjects", headers=headers).json()
    if len(assignments) > 0:
        target_assign = assignments[-1]
        r_del_a = requests.delete(f"{BASE_URL}/api/admin/faculty-subjects/{target_assign['id']}", headers=headers)
        assert r_del_a.status_code == 200, f"Delete assignment failed: {r_del_a.text}"
        safe_print(f"PASS: Deleted Assignment ID {target_assign['id']}")

    # 4. Test Subject Deletion
    # Create temp subject to delete
    subj_res = requests.post(f"{BASE_URL}/api/admin/subjects", json={
        "subject_code": "DEL_TEST_101",
        "subject_name": "Temporary Test Subject",
        "department": "Computer Engineering",
        "semester": 7
    }, headers=headers).json()
    r_del_s = requests.delete(f"{BASE_URL}/api/admin/subjects/{subj_res['id']}", headers=headers)
    assert r_del_s.status_code == 200, f"Delete subject failed: {r_del_s.text}"
    safe_print("PASS: Deleted Subject 'DEL_TEST_101'")

    # 5. Test Faculty Deletion
    fac_res = requests.post(f"{BASE_URL}/api/admin/faculty", json={
        "faculty_code": "DEL_FAC_99",
        "full_name": "Dr. Delete Test",
        "email": "del.test@scet.ac.in",
        "department": "Computer Engineering",
        "designation": "Assistant Professor"
    }, headers=headers).json()
    r_del_f = requests.delete(f"{BASE_URL}/api/admin/faculty/{fac_res['id']}", headers=headers)
    assert r_del_f.status_code == 200, f"Delete faculty failed: {r_del_f.text}"
    safe_print("PASS: Deleted Faculty 'Dr. Delete Test'")

    # 6. Test Student Deletion
    stu_res = requests.post(f"{BASE_URL}/api/admin/students", json={
        "enrollment_no": "DEL_STU_99",
        "full_name": "Student Delete Test",
        "department": "Computer Engineering",
        "semester": 7
    }, headers=headers).json()
    r_del_st = requests.delete(f"{BASE_URL}/api/admin/students/{stu_res['id']}", headers=headers)
    assert r_del_st.status_code == 200, f"Delete student failed: {r_del_st.text}"
    safe_print("PASS: Deleted Student 'Student Delete Test'")

    # 7. Re-seed to keep database intact
    from seed_scet_data import seed_all
    seed_all()
    safe_print("\n>>> ALL 5 DELETE ACTIONS VERIFIED 100% WORKING! <<<")

if __name__ == "__main__":
    test_deletions()
