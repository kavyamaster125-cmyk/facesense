from insightface.app import FaceAnalysis

# Global model instance
face_app = None


def load_face_model():
    global face_app

    if face_app is None:
        face_app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"]
        )

        face_app.prepare(ctx_id=0, det_size=(640, 640))

    return face_app