import numpy as np


def cosine_similarity(embedding1, embedding2):
    """
    Calculate cosine similarity between two face embeddings.
    """

    embedding1 = np.array(embedding1)
    embedding2 = np.array(embedding2)

    similarity = np.dot(embedding1, embedding2) / (
        np.linalg.norm(embedding1) * np.linalg.norm(embedding2)
    )

    return float(similarity)