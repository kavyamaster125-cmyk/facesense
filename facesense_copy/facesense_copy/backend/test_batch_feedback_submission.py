import requests

BASE_URL = "http://127.0.0.1:8000"

def test_batch_submission_and_single_coupon():
    print("=== TESTING BATCH FEEDBACK SUBMISSION & SINGLE COUPON ENGINE ===")

    # Admin Login to fetch students & assignments
    r_admin = requests.post(f"{BASE_URL}/api/admin/login", json={"email":"admin@college.edu", "password":"admin123"})
    assert r_admin.status_code == 200
    token = r_admin.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Find a student with unsubmitted courses
    students = requests.get(f"{BASE_URL}/api/admin/students", headers=headers).json()
    target_student = None
    unsubmitted = []
    cycle_id = 1

    for s in students:
        r_elig = requests.get(f"{BASE_URL}/api/student/{s['id']}/eligible-faculty")
        if r_elig.status_code == 200:
            d = r_elig.json()
            unsub = [item for item in d["subjects"] if not item["already_submitted"]]
            if unsub:
                target_student = s
                unsubmitted = unsub
                cycle_id = d["cycle_id"] or 1
                break

    if not target_student:
        # Create a test student
        r_create = requests.post(
            f"{BASE_URL}/api/admin/students",
            headers=headers,
            json={
                "enrollment_no": "ET23BTCO999",
                "full_name": "Test Batch Student",
                "department": "Computer Engineering",
                "semester": 7,
                "division": "Div-1"
            }
        )
        assert r_create.status_code == 200
        target_student = r_create.json()
        r_elig = requests.get(f"{BASE_URL}/api/student/{target_student['id']}/eligible-faculty")
        d = r_elig.json()
        unsubmitted = d["subjects"]
        cycle_id = d["cycle_id"] or 1

    sid = target_student["id"]
    print(f"Testing Batch Submission for Student '{target_student['full_name']}' (ID: {sid}) across {len(unsubmitted)} courses in Cycle {cycle_id}...")

    # Build Batch Submission Payload for ALL assigned courses
    responses_payload = []
    for item in unsubmitted:
        responses_payload.append({
            "faculty_id": item["faculty_id"],
            "subject_id": item["subject_id"],
            "star_rating": 5,
            "swipe_response": "AGREE",
            "slider_value": 85,
            "mcq_option": "No major improvement required",
            "suggestion_text": "Excellent explanation of algorithms and practical examples."
        })

    batch_payload = {
        "feedback_cycle_id": cycle_id,
        "student_id": sid,
        "focus_score": 92.5,
        "liveness_passed": True,
        "responses": responses_payload
    }

    # Submit Batch
    r_sub = requests.post(f"{BASE_URL}/api/feedback/submit-batch", json=batch_payload)
    assert r_sub.status_code == 200, f"Submit batch failed: {r_sub.text}"
    res_data = r_sub.json()

    print("Batch Submit Success:", res_data["success"], "| Submitted Count:", res_data["submitted_count"])
    assert res_data["success"] is True
    assert res_data["submitted_count"] == len(responses_payload)

    # VERIFY SINGLE COUPON RULE
    reward = res_data["reward"]
    print("Reward Granted:", reward["granted"])
    if reward["granted"]:
        coupon = reward["coupon_code"]
        assert coupon is not None
        assert coupon.startswith("COFFEE-FB-") or coupon.startswith("REWARD-FB-")
        print(f"PASS: EXACTLY ONE COUPON generated for entire session: {coupon}")

    # TEST DUPLICATE SUBMISSION BLOCKING
    r_sub_dup = requests.post(f"{BASE_URL}/api/feedback/submit-batch", json=batch_payload)
    print("Duplicate Submit Status Code:", r_sub_dup.status_code)
    assert r_sub_dup.status_code == 409, "Duplicate submission was NOT blocked!"
    print("PASS: Duplicate batch submission correctly BLOCKED with 409 Conflict!")

    print("\n>>> ALL BATCH FEEDBACK SUBMISSION & SINGLE COUPON TESTS PASSED 100%! <<<")

if __name__ == "__main__":
    test_batch_submission_and_single_coupon()
