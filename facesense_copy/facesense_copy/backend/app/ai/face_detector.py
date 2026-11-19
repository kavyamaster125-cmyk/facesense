import cv2
import numpy as np

from app.ai.utils import load_face_model


def detect_face(image_path: str):
    """
    Detects a face from an image and returns the detected face object.
    """

    app = load_face_model()

    image = cv2.imread(image_path)

    if image is None:
        raise Exception("Image not found.")

    faces = app.get(image)

    if len(faces) == 0:
        raise Exception("No face detected.")

    return faces[0]