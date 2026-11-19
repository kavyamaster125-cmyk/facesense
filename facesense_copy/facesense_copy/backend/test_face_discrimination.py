import cv2
import numpy as np

def compute_facial_signature(image_gray: np.ndarray) -> np.ndarray:
    """
    Computes illumination-invariant facial landmark and contour feature signature.
    Uses Histogram Equalization + Block-level Zero-Mean L2 Normalization.
    """
    face_112 = cv2.resize(image_gray, (112, 112))
    eq_face = cv2.equalizeHist(face_112)

    # 1. Sobel Gradients for Face Contours (eyes, nose, mouth, chin)
    sobel_x = cv2.Sobel(eq_face, cv2.CV_32F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(eq_face, cv2.CV_32F, 0, 1, ksize=3)
    magnitude = cv2.magnitude(sobel_x, sobel_y)

    # 2. Block-wise Normalized Edge Histograms (8x8 grid)
    grid_size = 8
    block_h = 112 // grid_size
    block_w = 112 // grid_size

    feature_blocks = []
    for row in range(grid_size):
        for col in range(grid_size):
            r_start, r_end = row * block_h, (row + 1) * block_h
            c_start, c_end = col * block_w, (col + 1) * block_w

            b_mag = magnitude[r_start:r_end, c_start:c_end].flatten()
            b_pix = eq_face[r_start:r_end, c_start:c_end].flatten().astype(np.float32)

            b_pix_norm = b_pix - np.mean(b_pix)
            norm_p = np.linalg.norm(b_pix_norm)
            if norm_p > 0:
                b_pix_norm = b_pix_norm / norm_p

            norm_m = np.linalg.norm(b_mag)
            b_mag_norm = (b_mag / norm_m) if norm_m > 0 else b_mag

            feature_blocks.extend([float(np.mean(b_mag_norm)), float(np.std(b_mag_norm)), float(np.mean(b_pix_norm)), float(np.std(b_pix_norm))])

    grid_16 = cv2.resize(eq_face, (16, 16)).flatten().astype(np.float32)
    grid_16 = grid_16 - np.mean(grid_16)
    n_g = np.linalg.norm(grid_16)
    if n_g > 0:
        grid_16 = grid_16 / n_g

    raw_vec = np.concatenate([np.array(feature_blocks, dtype=np.float32), grid_16])
    if len(raw_vec) < 512:
        raw_vec = np.pad(raw_vec, (0, 512 - len(raw_vec)))
    else:
        raw_vec = raw_vec[:512]

    n_tot = np.linalg.norm(raw_vec)
    return raw_vec / n_tot if n_tot > 0 else raw_vec

def cosine_sim(v1, v2):
    return float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))

def test_discrimination():
    # Face A (Person 1)
    img_a = np.zeros((150, 150), dtype=np.uint8) + 180
    cv2.circle(img_a, (75, 75), 40, (80), -1)  # Oval face
    cv2.circle(img_a, (60, 60), 6, (200), -1)  # Eye Left
    cv2.circle(img_a, (90, 60), 6, (200), -1)  # Eye Right
    cv2.line(img_a, (75, 70), (75, 90), (50), 3)  # Nose
    cv2.ellipse(img_a, (75, 105), (15, 8), 0, 0, 180, (40), 2)  # Mouth

    # Face A slightly shifted (Same Person 1, different frame)
    img_a2 = np.zeros((150, 150), dtype=np.uint8) + 175
    cv2.circle(img_a2, (76, 74), 41, (82), -1)
    cv2.circle(img_a2, (61, 59), 6, (198), -1)
    cv2.circle(img_a2, (91, 59), 6, (198), -1)
    cv2.line(img_a2, (76, 69), (76, 89), (52), 3)
    cv2.ellipse(img_a2, (76, 104), (15, 8), 0, 0, 180, (42), 2)

    # Face B (Different Person 2 with wide beard, glasses, high nose)
    img_b = np.zeros((150, 150), dtype=np.uint8) + 160
    cv2.rectangle(img_b, (35, 40), (115, 120), (50), -1)  # Square face with beard
    cv2.rectangle(img_b, (50, 55), (70, 65), (240), 2)  # Glasses L
    cv2.rectangle(img_b, (80, 55), (100, 65), (240), 2)  # Glasses R
    cv2.line(img_b, (50, 95), (100, 95), (200), 4)  # Wide mouth

    sig_a = compute_facial_signature(img_a)
    sig_a2 = compute_facial_signature(img_a2)
    sig_b = compute_facial_signature(img_b)

    sim_same = cosine_sim(sig_a, sig_a2)
    sim_diff = cosine_sim(sig_a, sig_b)

    print(f"Similarity for SAME person: {sim_same:.4f}")
    print(f"Similarity for DIFFERENT person: {sim_diff:.4f}")

if __name__ == "__main__":
    test_discrimination()
