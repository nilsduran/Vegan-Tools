"""
Compilador de la Taxonomia d'Open Food Facts per a Vegan Tools (Tier 2).
Genera un índex compacte i optimitzat per a packages/domain.
"""
import json
import re
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT_DIR / "data" / "dataset" / "raw"
OUT_DIR = ROOT_DIR / "packages" / "domain" / "src" / "data"
OUT_DIR.mkdir(parents=True, exist_ok=True)

with open(RAW_DIR / "ingredients.json", "r", encoding="utf-8") as f:
    raw_ing = json.load(f)

with open(RAW_DIR / "additives.json", "r", encoding="utf-8") as f:
    raw_add = json.load(f)

def normalize_key(text: str) -> str:
    t = text.lower()
    t = t.replace("‐", "-").replace("‑", "-").replace("–", "-").replace("—", "-")
    # Treure diacrítics
    t = re.sub(r"[àáâäã]", "a", t)
    t = re.sub(r"[èéêë]", "e", t)
    t = re.sub(r"[ìíîï]", "i", t)
    t = re.sub(r"[òóôöõ]", "o", t)
    t = re.sub(r"[ùúûü]", "u", t)
    t = re.sub(r"[ç]", "c", t)
    t = re.sub(r"[ñ]", "n", t)
    t = re.sub(r"[\s\-_]+", " ", t).strip()
    return t

def get_diet_status(data: dict) -> str:
    vegan = str(data.get("vegan", {}).get("en", "")).lower()
    vegetarian = str(data.get("vegetarian", {}).get("en", "")).lower()
    
    # 1. Escorxador (no vegetarià)
    if "no" in vegetarian:
        return "non_vegetarian"
    # 2. Lactis / Ous / Mel (vegetarià però no vegà)
    if "no" in vegan and "yes" in vegetarian:
        return "vegetarian"
    # 3. Vegà pur
    if "yes" in vegan and "yes" in vegetarian:
        return "vegan"
    # 4. Dubtós / Origen dual (ex: E471)
    if "maybe" in vegan or "maybe" in vegetarian or ("no" in vegan and not vegetarian):
        return "ambiguous"
    return "unknown"

entities = []
aliases = {}

def add_entry(item_id: str, data: dict, category_default: str):
    status = get_diet_status(data)
    if status == "unknown":
        return

    canonical_name = (
        data.get("name", {}).get("ca") or
        data.get("name", {}).get("es") or
        data.get("name", {}).get("en") or
        item_id.split(":")[-1].replace("-", " ").capitalize()
    )

    entity_idx = len(entities)
    entities.append({
        "id": item_id,
        "name": canonical_name,
        "status": status,
        "category": category_default,
    })

    # Recollir tots els noms i sinònims en tots els idiomes
    names = set()
    for lang, name in data.get("name", {}).items():
        if isinstance(name, str):
            names.add(name)
    for syn_lang, syn_list in data.get("synonyms", {}).items():
        if isinstance(syn_list, list):
            for s in syn_list:
                if isinstance(s, str):
                    names.add(s)

    # Si és un additiu, afegir codis E
    if item_id.startswith("en:e"):
        code = item_id.replace("en:", "").upper()
        names.add(code)
        names.add(f"e{code[1:]}")
        names.add(f"e-{code[1:]}")
        names.add(f"e {code[1:]}")

    for n in names:
        n_clean = normalize_key(n)
        if len(n_clean) >= 2 and not n_clean.isdigit():
            # Prioritzem assignar termes llargs o existents
            if n_clean not in aliases:
                aliases[n_clean] = entity_idx

# 1. Additius
for item_id, data in raw_add.items():
    add_entry(item_id, data, "additive")

# 2. Ingredients
for item_id, data in raw_ing.items():
    add_entry(item_id, data, "ingredient")

print(f"Entities catalogades: {len(entities)}")
print(f"Aliases indexades: {len(aliases)}")

out_file = OUT_DIR / "taxonomy.json"
with open(out_file, "w", encoding="utf-8") as f:
    json.dump({
        "entities": entities,
        "aliases": aliases,
    }, f, separators=(",", ":"), ensure_ascii=False)

file_mb = out_file.stat().st_size / (1024 * 1024)
print(f"✅ Generat {out_file.name} amb èxit! Mida: {file_mb:.2f} MB")
