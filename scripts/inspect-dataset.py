"""
Script per inspeccionar de manera interactiva o per mostreig el dataset de Vegan Tools.
Permet veure exemples reals d'ingredients, la seva llengua, i les etiquetes ground truth.
"""

import json
import random
import sys
from pathlib import Path
from collections import Counter

DATASET_DIR = Path("data/dataset/processed")

def inspect_dataset(split="train", n_samples=15, filter_class=None, filter_lang=None, search_term=None):
    file_path = DATASET_DIR / f"{split}.jsonl"
    if not file_path.exists():
        print(f"❌ No s'ha trobat el fitxer {file_path}")
        return

    samples = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                samples.append(json.loads(line))

    print(f"\n📂 Fitxer: {file_path.name} | Total mostres: {len(samples)}")

    # Filtres opcionals
    filtered = samples
    if filter_class:
        if filter_class == "slaughter":
            filtered = [s for s in filtered if s["has_slaughter"] == 1]
        elif filter_class == "secretion":
            filtered = [s for s in filtered if s["has_secretion"] == 1]
        elif filter_class == "dual":
            filtered = [s for s in filtered if s["has_dual_origin"] == 1]
        elif filter_class == "vegan":
            filtered = [s for s in filtered if s["has_slaughter"] == 0 and s["has_secretion"] == 0 and s["has_dual_origin"] == 0]

    if filter_lang:
        filtered = [s for s in filtered if s.get("language") == filter_lang or s.get("original_lang") == filter_lang]

    if search_term:
        filtered = [s for s in filtered if search_term.lower() in s["text"].lower()]

    print(f"🔍 Mostres que compleixen el filtre: {len(filtered)}")

    if not filtered:
        print("Cap mostra trobada.")
        return

    random.seed(42)
    selected = random.sample(filtered, min(n_samples, len(filtered)))

    print("\n" + "=" * 90)
    print(f"{'#':<3} | {'Idioma':<7} | {'Sla':<4} {'Sec':<4} {'Dual':<4} | {'Origen / ID':<25} | {'Text dels Ingredients'}")
    print("=" * 90)

    for i, s in enumerate(selected, 1):
        sla = "🍖" if s["has_slaughter"] else "  "
        sec = "🥛" if s["has_secretion"] else "  "
        dua = "⚠️" if s["has_dual_origin"] else "  "
        src = f"{s.get('source', '')[:12]}:{s.get('entity_id', '')[:10]}"
        text = s["text"]
        if len(text) > 65:
            text = text[:62] + "..."
        lang = s.get("original_lang", s.get("language", "?"))
        print(f"{i:<3} | {lang:<7} | {sla:<4} {sec:<4} {dua:<4} | {src:<25} | {text}")

    print("=" * 90)
    print("Llegenda: 🍖 = Carn/Escorxador (has_slaughter) | 🥛 = Secreció animal (has_secretion) | ⚠️ = Additiu dubtós (has_dual_origin)")

if __name__ == "__main__":
    split = "train"
    n = 12
    cls = None
    lang = None
    q = None

    for arg in sys.argv[1:]:
        if arg.startswith("--split="):
            split = arg.split("=")[1]
        elif arg.startswith("--n="):
            n = int(arg.split("=")[1])
        elif arg.startswith("--class="):
            cls = arg.split("=")[1]
        elif arg.startswith("--lang="):
            lang = arg.split("=")[1]
        elif arg.startswith("--q="):
            q = arg.split("=")[1]

    inspect_dataset(split=split, n_samples=n, filter_class=cls, filter_lang=lang, search_term=q)
