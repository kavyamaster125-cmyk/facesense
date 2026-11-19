from datetime import date
from app.database import SessionLocal, engine, Base
import app.models.all_models as models
from app.security import hash_password

Base.metadata.create_all(bind=engine)

def safe_migrate():
    from sqlalchemy import text, inspect as sa_inspect
    try:
        with engine.connect() as conn:
            inspector = sa_inspect(engine)
            columns = [c["name"] for c in inspector.get_columns("students")]
            if "attendance_percentage" not in columns:
                conn.execute(text("ALTER TABLE students ADD COLUMN attendance_percentage FLOAT DEFAULT 0"))
                conn.commit()
                print("Migration: Added attendance_percentage column to students table.")
            if "cpi" not in columns:
                conn.execute(text("ALTER TABLE students ADD COLUMN cpi FLOAT DEFAULT 0.0"))
                conn.commit()
                print("Migration: Added cpi column to students table.")
    except Exception as e:
        print(f"Migration note: {e}")

safe_migrate()

import random

STUDENTS_DATA = [
    # ET23BTCO Students
    ("ET23BTCO001", "Adishariya Nishitaben Bhaveshbhai", 9.16),
    ("ET23BTCO002", "Balar Vasu Manojbhai", 9.17),
    ("ET23BTCO003", "Borad Meetben Rajeshbhai", 8.10),
    ("ET23BTCO004", "Charvi Vishal Desai", 8.31),
    ("ET23BTCO005", "Chaudhari Nirmal Nikunjbhai", 7.09),
    ("ET23BTCO006", "Dantrelia Krunal Nareshkumar", 8.16),
    ("ET23BTCO007", "Desai Nyasa Amit", 8.16),
    ("ET23BTCO008", "Desai Rudriben Dharmeshkumar", 9.43),
    ("ET23BTCO009", "Dhela Krishn Chandrakant", 9.71),
    ("ET23BTCO010", "Diya Keyurkumar Patel", 8.16),
    ("ET23BTCO011", "Ghinaiya Darshan Jitendrakumar", 8.62),
    ("ET23BTCO012", "Gohil Sahani", 8.56),
    ("ET23BTCO013", "Jariwala Jaimin Prakashkumar", 9.51),
    ("ET23BTCO014", "Jivani Vedant Prakash", 6.00),
    ("ET23BTCO015", "Kalathiya Jiya Shaileshbhai", 9.26),
    ("ET23BTCO016", "Kavya Rakesh Patel", 9.33),
    ("ET23BTCO017", "Kevadiya Harsh Hasmukhbhai", 8.46),
    ("ET23BTCO018", "Khemka Umang Balkrishna", 7.92),
    ("ET23BTCO019", "Khokhariya Krishiv Dineshbhai", 7.01),
    ("ET23BTCO020", "Khunt Jash Mukeshbhai", 9.07),
    ("ET23BTCO021", "Krish Kiritbhai Patel", 8.03),
    ("ET23BTCO022", "Krishee Amit Mehta", 8.06),
    ("ET23BTCO023", "Lathiya Parth Nareshbhai", 8.95),
    ("ET23BTCO024", "Lambahiya Preet Nileshbhai", 8.90),
    ("ET23BTCO025", "Mangaliya Hitesh Desai", 9.43),
    ("ET23BTCO026", "Maniya Niyati Rajeshbhai", 8.33),
    ("ET23BTCO027", "Manya Jain", 7.87),
    ("ET23BTCO028", "Master Kavya Rakeshbhai", 8.95),
    ("ET23BTCO029", "Naik Brinda Subodhkumar", 8.22),
    ("ET23BTCO030", "Nanavati Nisharg Viresh", 7.70),
    ("ET23BTCO031", "Parekh Masoom Viral", 8.77),
    ("ET23BTCO032", "Parmar Vrutik Gaurangsinh", 9.02),
    ("ET23BTCO033", "Patel Aarav Bhavinbhai", 9.27),
    ("ET23BTCO034", "Patel Ainishkumar Pradipbhai", 7.58),
    ("ET23BTCO035", "Patel Arya Bhavinbhai", 8.04),
    ("ET23BTCO036", "Patel Hemilkumar Narendrabhai", 9.15),
    ("ET23BTCO037", "Patel Hetvi Kalpeshkumar", 9.13),
    ("ET23BTCO038", "Patel Kruzarth Kamleshkumar", 7.61),
    ("ET23BTCO039", "Patel Miral Hiteshbhai", 8.98),
    ("ET23BTCO040", "Patel Moksha Manish", 8.40),
    ("ET23BTCO041", "Patel Siddhi Hiteshbhai", 9.08),
    ("ET23BTCO042", "Patel Sujal Kirankumar", 9.40),
    ("ET23BTCO043", "Patel Yashvi Pareshbhai", 8.53),
    ("ET23BTCO044", "Patel Yesha Shaileshkumar", 9.34),
    ("ET23BTCO045", "Patel Zeel Rajendrakumar", 9.44),
    ("ET23BTCO046", "Pawankumar Navinchandra", 9.28),
    ("ET23BTCO047", "Radadiya Prince Ajaybhai", 7.81),
    ("ET23BTCO048", "Rana Saloni Harshadbhai", 9.76),
    ("ET23BTCO049", "Rathod Falgun Bharatbhai", 9.74),
    ("ET23BTCO050", "Rathod Mitalkumari Pareshbhai", 8.30),
    ("ET23BTCO051", "Saksena Saniya Krisha Pravinbhai", 8.97),
    ("ET23BTCO052", "Shah Arjun Pratik", 7.89),
    ("ET23BTCO053", "Shaikh Vadid Sadik Mohmed", 9.00),
    ("ET23BTCO054", "Sheikh Mohammad Abrar Mohammad Shakil", 9.62),
    ("ET23BTCO055", "Singh Kunwarvijay Shambhu", 9.29),
    ("ET23BTCO056", "Solanki Krish Khandubhai", 7.33),
    ("ET23BTCO057", "Sonani Om Bharatbhai", 8.15),
    ("ET23BTCO058", "Sutariya Vandan Ghanshyambhai", 8.59),
    ("ET23BTCO059", "Suthar Smit Miteshkumar", 9.70),
    ("ET23BTCO060", "Tagadiya Bhavya Rameshbhai", 9.22),
    ("ET23BTCO061", "Talaviya Darsini Atulbhai", 8.50),
    ("ET23BTCO062", "Tejani Het Pravinbhai", 8.98),
    ("ET23BTCO063", "UNAGAR MIRALI JAYANTIBHAI", 8.32),
    ("ET23BTCO064", "Vaishnav Parthiv Ashokbhai", 8.33),
    ("ET23BTCO065", "Vasani Khevna Chintan", 9.42),
    ("ET23BTCO066", "Viradiya Mayank Lalitbhai", 9.09),
    ("ET23BTCO067", "Vora Chahat Pravinbhai", 8.60),

    # ET24BTCO Students (Official Sem 6 Result Notification Data)
    ("ET24BTCO801", "ASTHA ALPESHBHAI KAKADIYA", 8.32),
    ("ET24BTCO802", "BAHERIYA SHRUTI DINESHBHAI", 7.38),
    ("ET24BTCO803", "BANDWALA MOHAMMED TAAHIR", 7.74),
    ("ET24BTCO804", "GANDHI KENA KAUSHALKUMAR", 8.49),
    ("ET24BTCO805", "GHUGE POOJA CHANDRABHAN", 7.92),
    ("ET24BTCO807", "MEHTA KARISHMA PARIMALKUMAR", 7.28),
    ("ET24BTCO808", "MODI VATSAL DEVENKUMAR", 9.01),
    ("ET24BTCO809", "MORADIYA DARSHIL VIJAYBHAI", 9.01),
    ("ET24BTCO810", "PATEL DHRUVBHAI SANJAYBHAI", 7.90),
    ("ET24BTCO811", "PATEL HETKUMAR SURESHBHAI", 7.40),
    ("ET24BTCO812", "PREKSHA MEHULKUMAR MODI", 8.06),
    ("ET24BTCO813", "RUTANSHIHBEN JAYENDRASINH DAYMA", 9.31),
    ("ET24BTCO815", "HADIYA KRISHNA MAHESHBHAI", 8.01),
    ("ET24BTCO817", "SHARIKA THUSOO", 6.91),
    ("ET24BTCO818", "SUTHAR ABHIKUMAR RAJUBHAI", 8.78),
]

FACULTY_DATA = [
    ("FAC_PK", "Prof. (Dr.) Pariza Kamboj", "pariza.kamboj@scet.ac.in", "Professor & Head"),
    ("FAC_DP", "Prof. (Dr.) Dhatri Pandya", "dhatri.pandya@scet.ac.in", "Associate Professor"),
    ("FAC_JJ", "Prof. Jignesh Joshi", "jignesh.joshi@scet.ac.in", "Assistant Professor"),
    ("FAC_SG", "Prof. Snehal Gandhi", "snehal.gandhi@scet.ac.in", "Assistant Professor"),
    ("FAC_BP", "Prof. Bhavesh Patel", "bhavesh.patel@scet.ac.in", "Assistant Professor"),
    ("FAC_SB", "Prof. Sulabh Bhatt", "sulabh.bhatt@scet.ac.in", "Assistant Professor"),
    ("FAC_JC", "Prof. Jayesh Chaudhary", "jayesh.chaudhary@scet.ac.in", "Assistant Professor"),
    ("FAC_JB", "Prof. Jaydeep Barad", "jaydeep.barad@scet.ac.in", "Assistant Professor"),
    ("FAC_AS", "Prof. Amisha Sakariya", "amisha.sakariya@scet.ac.in", "Assistant Professor"),
    ("FAC_BB", "Prof. Bhumika Bhatt", "bhumika.bhatt@scet.ac.in", "Class Coordinator"),
    ("FAC_MM", "Prof. (Dr.) Mayuri Mehta", "mayuri.mehta@scet.ac.in", "Professor & HOD"),
]

SUBJECTS_DATA = [
    ("CS501", "Database Management Systems (DBMS)", 5),
    ("CS502", "Artificial Intelligence & Machine Learning (AI/ML)", 5),
    ("BTCO13701", "Compiler Design (CD)", 7),
    ("BTCO13702", "Software Engineering (SE)", 7),
    ("BTCO14709", "Big Data Analytics (BDA)", 7),
    ("BTCO14703", "Computer Vision (CV)", 7),
    ("BTCO14708", "Deep Learning (DL)", 7),
    ("BTCO14704", "Cloud Computing (CC)", 7),
]


ASSIGNMENTS_MAP = [
    ("CS501", "FAC_PK"),      # DBMS (Sem 5) -> Prof. (Dr.) Pariza Kamboj
    ("CS502", "FAC_DP"),      # AI/ML (Sem 5) -> Prof. (Dr.) Dhatri Pandya
    ("BTCO13701", "FAC_JB"),  # Compiler Design -> Prof. Jaydeep Barad
    ("BTCO13701", "FAC_DP"),  # Compiler Design -> Prof. (Dr.) Dhatri Pandya
    ("BTCO13702", "FAC_SG"),  # Software Engineering -> Prof. Snehal Gandhi
    ("BTCO13702", "FAC_JJ"),  # Software Engineering -> Prof. Jignesh Joshi
    ("BTCO14709", "FAC_AS"),  # Big Data Analytics -> Prof. Amisha Sakariya
    ("BTCO14703", "FAC_BP"),  # Computer Vision -> Prof. Bhavesh Patel
    ("BTCO14703", "FAC_DP"),  # Computer Vision -> Prof. (Dr.) Dhatri Pandya
    ("BTCO14708", "FAC_PK"),  # Deep Learning -> Prof. (Dr.) Pariza Kamboj
    ("BTCO14704", "FAC_BP"),  # Cloud Computing -> Prof. Bhavesh Patel
    ("BTCO14704", "FAC_SB"),  # Cloud Computing -> Prof. Sulabh Bhatt
    ("BTCO14704", "FAC_JC"),  # Cloud Computing -> Prof. Jayesh Chaudhary
]



def seed_all():
    db = SessionLocal()
    try:
        print("Seeding SCET Semester 7 Computer Engineering Data...")

        # 0. Seed Super Admin
        admin = db.query(models.AdminUser).filter(models.AdminUser.email == "admin@college.edu").first()
        if not admin:
            admin = models.AdminUser(
                full_name="System Super Admin",
                email="admin@college.edu",
                password_hash=hash_password("admin123"),
                role="SUPER_ADMIN"
            )
            db.add(admin)
            db.commit()
            print("Super Admin seeded: admin@college.edu / admin123")

        # 1. Active Feedback Cycle for Sem 7
        cycle = db.query(models.FeedbackCycle).filter(models.FeedbackCycle.semester == 7).first()
        if not cycle:
            cycle = models.FeedbackCycle(
                session_name="Odd Semester 2026-27 (Sem 7)",
                semester=7,
                academic_year="2026-2027",
                start_date=date(2026, 6, 1),
                end_date=date(2026, 12, 31),
                status="ACTIVE",
                is_active=True
            )
            db.add(cycle)
        else:
            cycle.is_active = True
            cycle.status = "ACTIVE"
        db.commit()

        # 2. Seed Students ET23BTCO001 to ET23BTCO067 and ET24BTCO801 to ET24BTCO818
        random.seed(42)  # Consistent attendance seeding
        for item in STUDENTS_DATA:
            eno, name, cpi_val = item[0], item[1], item[2]
            att_val = random.randint(60, 90)

            stu = db.query(models.Student).filter(models.Student.enrollment_no == eno).first()
            if not stu:
                stu = models.Student(
                    enrollment_no=eno,
                    full_name=name,
                    email=f"{eno.lower()}@scet.ac.in",
                    department="Computer Engineering",
                    semester=7,
                    division="Div-1",
                    attendance_percentage=att_val,
                    cpi=cpi_val,
                    is_registered=False
                )
                db.add(stu)
            else:
                has_emb = db.query(models.FaceEmbedding).filter(models.FaceEmbedding.student_id == stu.id).first()
                stu.full_name = name
                stu.semester = 7
                stu.department = "Computer Engineering"
                stu.division = "Div-1"
                stu.attendance_percentage = att_val
                stu.cpi = cpi_val
                stu.is_registered = bool(has_emb)
        db.commit()

        print(f"Added/Updated {len(STUDENTS_DATA)} Students (ET23BTCO001-067 & ET24BTCO801-818).")

        # 2b. Auto-load registered face embeddings from seed JSON if database has none
        if db.query(models.FaceEmbedding).count() == 0:
            seed_json_path = os.path.join(os.path.dirname(__file__), "seed_data", "registered_faces_seed.json")
            if os.path.exists(seed_json_path):
                import json
                with open(seed_json_path, "r", encoding="utf-8") as f:
                    face_seeds = json.load(f)
                loaded_count = 0
                for item in face_seeds:
                    eno = item["enrollment_no"]
                    stu = db.query(models.Student).filter(models.Student.enrollment_no == eno).first()
                    if stu:
                        emb = models.FaceEmbedding(
                            student_id=stu.id,
                            embedding_json=item["embedding_json"],
                            model_version=item.get("model_version", "arcface_v1")
                        )
                        db.add(emb)
                        stu.is_registered = True
                        if item.get("face_image_path"):
                            stu.face_image_path = item["face_image_path"]
                        loaded_count += 1
                db.commit()
                print(f"Auto-seeded {loaded_count} registered student face embeddings into database.")

        # 3. Seed Faculty Members
        fac_obj_map = {}
        for fcode, fname, femail, fdesig in FACULTY_DATA:
            fac = db.query(models.Faculty).filter(models.Faculty.email == femail).first()
            if not fac:
                fac = models.Faculty(
                    faculty_code=fcode,
                    full_name=fname,
                    email=femail,
                    department="Computer Engineering",
                    designation=fdesig,
                    password_hash=hash_password("faculty123")
                )
                db.add(fac)
                db.commit()
                db.refresh(fac)
            else:
                fac.full_name = fname
                fac.designation = fdesig
                db.commit()
            fac_obj_map[fcode] = fac
        print(f"Added/Updated {len(FACULTY_DATA)} Faculty Members.")

        # 4. Seed Subjects
        subj_obj_map = {}
        for scode, sname, sem in SUBJECTS_DATA:
            sub = db.query(models.Subject).filter(models.Subject.subject_code == scode).first()
            if not sub:
                sub = models.Subject(
                    subject_code=scode,
                    subject_name=sname,
                    department="Computer Engineering",
                    semester=sem
                )
                db.add(sub)
                db.commit()
                db.refresh(sub)
            else:
                sub.subject_name = sname
                sub.semester = sem
                db.commit()
            subj_obj_map[scode] = sub
        print(f"Added/Updated {len(SUBJECTS_DATA)} Subjects.")

        # 5. Seed Faculty-Subject Assignments
        for scode, fcode in ASSIGNMENTS_MAP:
            sub = subj_obj_map[scode]
            fac = fac_obj_map[fcode]
            assign = db.query(models.FacultySubject).filter(
                models.FacultySubject.faculty_id == fac.id,
                models.FacultySubject.subject_id == sub.id
            ).first()
            if not assign:
                assign = models.FacultySubject(
                    faculty_id=fac.id,
                    subject_id=sub.id,
                    division="Div-1",
                    semester=7,
                    academic_year="2026-2027"
                )
                db.add(assign)
        db.commit()
        print("Faculty-Subject Assignments updated successfully!")

    except Exception as e:
        print("Error seeding SCET data:", e)
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
