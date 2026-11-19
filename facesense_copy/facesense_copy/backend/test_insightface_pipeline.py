import cv2
import numpy as np
import insightface

print("Initializing InsightFace ArcFace Engine...")
app = insightface.app.FaceAnalysis(name='buffalo_s', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))

def create_synthetic_face(skin_tone=(140, 110, 90), eye_x=75):
    img = np.zeros((400, 400, 3), dtype=np.uint8) + 200
    cv2.circle(img, (200, 200), 100, skin_tone, -1)  # Face Oval
    cv2.circle(img, ( eye_x + 80, 170), 12, (255, 255, 255), -1)  # Eye L
    cv2.circle(img, (240, 170), 12, (255, 255, 255), -1)  # Eye R
    cv2.circle(img, ( eye_x + 80, 170), 4, (0, 0, 0), -1)
    cv2.circle(img, (240, 170), 4, (0, 0, 0), -1)
    cv2.ellipse(img, (200, 250), (30, 15), 0, 0, 180, (40, 40, 180), 4)  # Mouth
    return img

print("Testing InsightFace detection & ArcFace embedding extraction...")
img = create_synthetic_face()
faces = app.get(img)
print(f"Faces detected: {len(faces)}")
if faces:
    emb = faces[0].embedding
    print(f"ArcFace Embedding dimension: {len(emb)}, L2 Norm: {np.linalg.norm(emb):.4f}")
