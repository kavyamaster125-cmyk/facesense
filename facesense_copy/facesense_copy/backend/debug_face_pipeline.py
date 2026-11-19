import json
import numpy as np
from app.database import SessionLocal
from app.models.all_models import Student, FaceEmbedding
from app.services.face_recognition_service import cosine_similarity

def debug_db_embeddings():
    db = SessionLocal()
    records = db.query(FaceEmbedding).all()
    print(f"=== DATABASE EMBEDDINGS AUDIT (Total Records: {len(records)}) ===")

    if not records:
        print("NO FACE EMBEDDINGS FOUND IN DATABASE!")
        return

    embeddings_data = []
    for r in records:
        stu = db.query(Student).filter(Student.id == r.student_id).first()
        name = stu.full_name if stu else "UNKNOWN"
        vec = json.loads(r.embedding_json)
        arr = np.array(vec, dtype=np.float32)
        embeddings_data.append({
            "id": r.id,
            "student_id": r.student_id,
            "name": name,
            "vector": arr,
            "len": len(vec),
            "norm": np.linalg.norm(arr),
            "mean": np.mean(arr),
            "std": np.std(arr)
        })

        print(f"Embedding ID: {r.id} | Student ID: {r.student_id} | Name: '{name}' | Dim: {len(vec)} | L2 Norm: {np.linalg.norm(arr):.4f} | Mean: {np.mean(arr):.6f}")

    print("\n=== PAIRWISE SIMILARITY MATRIX ===")
    N = len(embeddings_data)
    for i in range(N):
        for j in range(N):
            sim = cosine_similarity(embeddings_data[i]["vector"].tolist(), embeddings_data[j]["vector"].tolist())
            print(f"[{embeddings_data[i]['name']}] vs [{embeddings_data[j]['name']}]: {sim:.4f}")

if __name__ == "__main__":
    debug_db_embeddings()
