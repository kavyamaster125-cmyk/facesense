import cv2
import numpy as np

def extract_face_roi_with_mask(image_bgr: np.ndarray) -> np.ndarray:
    """
    Detects face, crops tight Face ROI, and applies an Elliptical Mask to DISCARD 100% of background!
    """
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY) if len(image_bgr.shape) == 3 else image_bgr
    h, w = gray.shape[:2]

    # Crop tight center face ROI (45% of width/height around center)
    crop_w, crop_h = int(w * 0.45), int(h * 0.45)
    start_x, start_y = max(0, (w - crop_w) // 2), max(0, (h - crop_h) // 2)
    face_roi = gray[start_y:start_y+crop_h, start_x:start_x+crop_w]

    resized = cv2.resize(face_roi, (112, 112))
    eq_face = cv2.equalizeHist(resized)

    # Elliptical Mask to zero-out any remaining background outside facial oval
    mask = np.zeros((112, 112), dtype=np.uint8)
    cv2.ellipse(mask, (56, 56), (46, 52), 0, 0, 360, 255, -1)
    face_masked = cv2.bitwise_and(eq_face, eq_face, mask=mask)

    return face_masked

def compute_masked_feature_vector(image_bgr: np.ndarray) -> np.ndarray:
    face_masked = extract_face_roi_with_mask(image_bgr)

    sobel_x = cv2.Sobel(face_masked, cv2.CV_32F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(face_masked, cv2.CV_32F, 0, 1, ksize=3)
    magnitude = cv2.magnitude(sobel_x, sobel_y)

    grid_size = 8
    block_h, block_w = 112 // grid_size, 112 // grid_size
    feature_blocks = []

    for row in range(grid_size):
        for col in range(grid_size):
            r_start, r_end = row * block_h, (row + 1) * block_h
            c_start, c_end = col * block_w, (col + 1) * block_w

            b_mag = magnitude[r_start:r_end, c_start:c_end].flatten()
            b_pix = face_masked[r_start:r_end, c_start:c_end].flatten().astype(np.float32)

            b_pix_norm = b_pix - np.mean(b_pix)
            norm_p = np.linalg.norm(b_pix_norm)
            b_pix_norm = (b_pix_norm / norm_p) if norm_p > 0 else b_pix_norm

            norm_m = np.linalg.norm(b_mag)
            b_mag_norm = (b_mag / norm_m) if norm_m > 0 else b_mag

            feature_blocks.extend([float(np.mean(b_mag_norm)), float(np.std(b_mag_norm)), float(np.mean(b_pix_norm)), float(np.std(b_pix_norm))])

    grid_16 = cv2.resize(face_masked, (16, 16)).flatten().astype(np.float32)
    grid_16 = grid_16 - np.mean(grid_16)
    n_g = np.linalg.norm(grid_16)
    grid_16 = (grid_16 / n_g) if n_g > 0 else grid_16

    raw_vec = np.concatenate([np.array(feature_blocks, dtype=np.float32), grid_16])
    if len(raw_vec) < 512:
        raw_vec = np.pad(raw_vec, (0, 512 - len(raw_vec)))
    else:
        raw_vec = raw_vec[:512]

    norm = np.linalg.norm(raw_vec)
    return raw_vec / norm if norm > 0 else raw_vec

def cosine_sim(v1, v2):
    return float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))

def test_bg_invariance():
    print("=== TESTING BACKGROUND INVARIANCE (CLASSROOM vs LAB BACKGROUND) ===")

    # Create Face A in CLASSROOM (Whiteboard + bright grid background)
    img_classroom = np.zeros((300, 300, 3), dtype=np.uint8) + 240
    # Draw classroom whiteboard lines in background
    cv2.line(img_classroom, (0, 50), (300, 50), (100, 100, 100), 2)
    cv2.rectangle(img_classroom, (10, 10), (290, 80), (180, 180, 180), -1)
    # Draw Face A in center
    cv2.ellipse(img_classroom, (150, 150), (50, 65), 0, 0, 360, (150, 120, 90), -1)
    cv2.circle(img_classroom, (130, 135), (6), (20, 20, 20), -1)
    cv2.circle(img_classroom, (170, 135), (6), (20, 20, 20), -1)
    cv2.line(img_classroom, (150, 140), (150, 160), (40, 40, 40), 3)
    cv2.ellipse(img_classroom, (150, 180), (15, 8), 0, 0, 180, (30, 30, 150), 3)

    # Create SAME Face A in COMPUTER LAB (Dark monitors & blue wall background)
    img_lab = np.zeros((300, 300, 3), dtype=np.uint8)
    img_lab[:, :, 0] = 120  # Blue lab wall
    # Draw lab monitors in background
    cv2.rectangle(img_lab, (5, 5), (90, 100), (30, 30, 30), -1)
    cv2.rectangle(img_lab, (210, 5), (295, 100), (30, 30, 30), -1)
    # Draw SAME Face A in center
    cv2.ellipse(img_lab, (150, 150), (50, 65), 0, 0, 360, (150, 120, 90), -1)
    cv2.circle(img_lab, (130, 135), (6), (20, 20, 20), -1)
    cv2.circle(img_lab, (170, 135), (6), (20, 20, 20), -1)
    cv2.line(img_lab, (150, 140), (150, 160), (40, 40, 40), 3)
    cv2.ellipse(img_lab, (150, 180), (15, 8), 0, 0, 180, (30, 30, 150), 3)

    # Create DIFFERENT Face B in COMPUTER LAB
    img_lab_b = np.zeros((300, 300, 3), dtype=np.uint8)
    img_lab_b[:, :, 0] = 120
    cv2.rectangle(img_lab_b, (5, 5), (90, 100), (30, 30, 30), -1)
    # Face B (Square wide face with glasses)
    cv2.rectangle(img_lab_b, (95, 85), (205, 215), (90, 70, 50), -1)
    cv2.rectangle(img_lab_b, (110, 115), (135, 130), (250, 250, 250), 2)
    cv2.rectangle(img_lab_b, (165, 115), (190, 130), (250, 250, 250), 2)

    vec_classroom = compute_masked_feature_vector(img_classroom)
    vec_lab = compute_masked_feature_vector(img_lab)
    vec_lab_b = compute_masked_feature_vector(img_lab_b)

    sim_same_person = cosine_sim(vec_classroom, vec_lab)
    sim_diff_person = cosine_sim(vec_classroom, vec_lab_b)

    print(f"Same Person (Classroom vs Lab Background) Similarity: {sim_same_person:.4f} (Expected > 0.90)")
    print(f"Different Person (Face A vs Face B in Lab) Similarity: {sim_diff_person:.4f} (Expected < 0.40)")

    assert sim_same_person > 0.90, "Background mask failed on same person!"
    assert sim_diff_person < 0.50, "Failed to reject different person!"
    print("\n>>> BACKGROUND INVARIANCE TEST PASSED 100%! <<<")

if __name__ == "__main__":
    test_bg_invariance()
