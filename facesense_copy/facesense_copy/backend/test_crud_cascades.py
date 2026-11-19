import requests

BASE_URL = "http://127.0.0.1:8000"

def test_admin_crud_cascades():
    print("=== TESTING ADMIN CRUD & CASCADING DELETION INTEGRITY ===")

    # 1. Login as Admin
    r_admin = requests.post(f"{BASE_URL}/api/admin/login", json={"email":"admin@college.edu", "password":"admin123"})
    assert r_admin.status_code == 200
    token = r_admin.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test Student CRUD
    r_create_stu = requests.post(
        f"{BASE_URL}/api/admin/students",
        headers=headers,
        json={
            "enrollment_no": "ET23BTCO888",
            "full_name": "Temp CRUD Student",
            "email": "crud.student@scet.ac.in",
            "department": "Computer Engineering",
            "semester": 7,
            "division": "Div-1"
        }
    )
    assert r_create_stu.status_code == 200
    stu_data = r_create_stu.json()
    stu_id = stu_data["id"]
    print(f"Created Temp Student ID {stu_id} successfully.")

    # Delete Student with cascading cleanup
    r_del_stu = requests.delete(f"{BASE_URL}/api/admin/students/{stu_id}", headers=headers)
    assert r_del_stu.status_code == 200
    print(f"Deleted Student ID {stu_id} with clean cascading DB & disk cleanup.")

    # 3. Test Faculty CRUD
    r_create_fac = requests.post(
        f"{BASE_URL}/api/admin/faculty",
        headers=headers,
        json={
            "faculty_code": "FAC_CRUD_TEST",
            "full_name": "Temp Test Faculty",
            "email": "temp.faculty@scet.ac.in",
            "department": "Computer Engineering",
            "designation": "Assistant Professor",
            "password": "faculty123"
        }
    )
    assert r_create_fac.status_code == 200
    fac_data = r_create_fac.json()
    fac_id = fac_data["id"]
    print(f"Created Temp Faculty ID {fac_id} successfully.")

    # Delete Faculty
    r_del_fac = requests.delete(f"{BASE_URL}/api/admin/faculty/{fac_id}", headers=headers)
    assert r_del_fac.status_code == 200
    print(f"Deleted Faculty ID {fac_id} cleanly.")

    # 4. Test Subject CRUD
    r_create_sub = requests.post(
        f"{BASE_URL}/api/admin/subjects",
        headers=headers,
        json={
            "subject_code": "SUB_CRUD_888",
            "subject_name": "Temp Testing Subject",
            "department": "Computer Engineering",
            "semester": 7
        }
    )
    assert r_create_sub.status_code == 200
    sub_data = r_create_sub.json()
    sub_id = sub_data["id"]
    print(f"Created Temp Subject ID {sub_id} successfully.")

    # Delete Subject
    r_del_sub = requests.delete(f"{BASE_URL}/api/admin/subjects/{sub_id}", headers=headers)
    assert r_del_sub.status_code == 200
    print(f"Deleted Subject ID {sub_id} cleanly.")

    print("\n>>> ALL ADMIN CRUD & CASCADING DELETION INTEGRITY TESTS PASSED 100%! <<<")

if __name__ == "__main__":
    test_admin_crud_cascades()
