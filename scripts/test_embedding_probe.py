from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')

pairs = [
    ('mantega', 'mantega de cacau'),
    ('cacau', 'mantega de cacau'),
    ('leche', 'leche de almendras'),
    ('almendras', 'leche de almendras'),
    ('carne', 'carne vegetal'),
    ('soja', 'carne vegetal'),
    ('caseinate de calcium', 'calcium'),
    ('caseinate de calcium', 'lait'),
    ('lait', 'fromage de chèvre'),
]

for w1, w2 in pairs:
    e1 = model.encode(w1)
    e2 = model.encode(w2)
    sim = np.dot(e1, e2) / (np.linalg.norm(e1) * np.linalg.norm(e2))
    print(f'Similarity between "{w1}" and "{w2}": {sim:.4f}')
