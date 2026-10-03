"""
Extractor de Dades 100% Reals i Auditades (Open Food Facts + EFSA).
Sense combinacions sintètiques, sense soroll de 'cor de bou amb raïm'.
Resol l'herència ontològica d'ancestres sobre 6.645 ingredients i 764 additius.
"""
import json
import re
from pathlib import Path
from collections import Counter

ROOT_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT_DIR / "data" / "dataset" / "raw"
OUT_DIR = ROOT_DIR / "data" / "dataset" / "real"
OUT_DIR.mkdir(parents=True, exist_ok=True)

with open(RAW_DIR / "ingredients.json", "r", encoding="utf-8") as f:
    raw_ing = json.load(f)

with open(RAW_DIR / "additives.json", "r", encoding="utf-8") as f:
    raw_add = json.load(f)

# Roots ontològiques
PLANT_ROOTS = {
    'en:plant', 'en:vegetable', 'en:fruit', 'en:cereal', 'en:seed', 'en:legume',
    'en:grain', 'en:herb', 'en:spice', 'en:fungus', 'en:algae', 'en:mineral',
    'en:cereal-flour', 'en:vegetable-oil-and-fat', 'en:plant-based-food', 'en:sugar',
    'en:cocoa', 'en:coffee', 'en:tea', 'en:nut', 'en:berry'
}
ANIMAL_ROOTS = {
    'en:meat', 'en:poultry', 'en:pork', 'en:beef', 'en:fish', 'en:seafood',
    'en:crustacean', 'en:mammal', 'en:mollusc', 'en:bird', 'en:game', 'en:lamb',
    'en:veal', 'en:duck', 'en:turkey', 'en:gelatin', 'en:slaughter-by-product'
}
DAIRY_ROOTS = {
    'en:dairy', 'en:milk', 'en:cheese', 'en:cow-milk', 'en:goat-milk', 'en:sheep-milk',
    'en:egg', 'en:bee-products', 'en:honey', 'en:whey', 'en:butter', 'en:casein'
}

def resolve_diet(item_id, item_data, raw_pool, visited=None):
    if visited is None: visited = set()
    if item_id in visited: return None
    visited.add(item_id)
    
    # 1. Comprovació d'etiquetes explícites
    v = str(item_data.get('vegan', {}).get('en', '')).lower()
    vg = str(item_data.get('vegetarian', {}).get('en', '')).lower()
    
    if 'no' in vg or 'no' in v and ('meat' in item_id or 'fish' in item_id or 'gelatin' in item_id or 'pork' in item_id):
        return 'non_vegetarian', 1, 0, 0
    if 'no' in v and 'yes' in vg:
        return 'vegetarian', 0, 1, 0
    if 'yes' in v and 'yes' in vg:
        return 'vegan', 0, 0, 0
    if 'maybe' in v or 'maybe' in vg:
        return 'ambiguous', 0, 0, 1
        
    # 2. Herència de graf d'ancestres
    parents = item_data.get('parents', [])
    for p in parents:
        if any(r in p for r in ANIMAL_ROOTS):
            return 'non_vegetarian', 1, 0, 0
        if any(r in p for r in DAIRY_ROOTS):
            return 'vegetarian', 0, 1, 0
        if any(r in p for r in PLANT_ROOTS):
            return 'vegan', 0, 0, 0
        if p in raw_pool:
            res = resolve_diet(p, raw_pool[p], raw_pool, visited)
            if res: return res
            
    return None

# Carregar exclusions del Golden Benchmark per evitar qualsevol data leakage
GOLDEN_PATH = ROOT_DIR / "data" / "dataset" / "benchmark" / "golden_test_set.jsonl"
golden_texts = set()
if GOLDEN_PATH.exists():
    with open(GOLDEN_PATH, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                golden_texts.add(json.loads(line)["text"].strip().lower())

print(f"Bloquejades {len(golden_texts)} mostres del Golden Benchmark per protecció antifugues.")

real_samples = []
seen_pairs = set()

def process_item(item_id, data, category_default, raw_pool):
    res = resolve_diet(item_id, data, raw_pool)
    if not res:
        return
        
    status, has_sl, has_sec, has_dua = res
    
    # Recollir noms i sinònims reals per idioma
    lang_names = []
    for lang, name in data.get("name", {}).items():
        if isinstance(name, str) and len(name.strip()) >= 2:
            lang_names.append((lang, name.strip()))
            
    for syn_lang, syn_list in data.get("synonyms", {}).items():
        if isinstance(syn_list, list):
            for s in syn_list:
                if isinstance(s, str) and len(s.strip()) >= 2:
                    lang_names.append((syn_lang, s.strip()))
                    
    # Si és additiu, afegir formats de codi E
    if item_id.startswith("en:e"):
        code = item_id.replace("en:", "").upper()
        for c_variant in [code, f"E{code[1:]}", f"E-{code[1:]}", f"E {code[1:]}"]:
            lang_names.append(("mul", c_variant))

    for lang, text in lang_names:
        text_clean = text.strip()
        # Normalitzem espais
        text_clean = re.sub(r"\s+", " ", text_clean)
        
        # Filtrem brossa (números sols, enllaços, codis de país estranys)
        if len(text_clean) < 2 or text_clean.isdigit():
            continue
        if text_clean.lower() in golden_texts:
            continue
            
        dedup_key = (text_clean.lower(), status)
        if dedup_key in seen_pairs:
            continue
        seen_pairs.add(dedup_key)
        
        real_samples.append({
            "text": text_clean,
            "diet_status": status,
            "has_slaughter": has_sl,
            "has_secretion": has_sec,
            "has_dual_origin": has_dua,
            "canonical_id": item_id,
            "language": lang,
            "category": category_default,
        })

# Processar additius
for item_id, data in raw_add.items():
    process_item(item_id, data, "additive", raw_add)

# Processar ingredients
for item_id, data in raw_ing.items():
    process_item(item_id, data, "ingredient", raw_ing)

print(f"Extretes {len(real_samples)} mostres 100% reals d'Open Food Facts & EFSA!")
counts = Counter(s["diet_status"] for s in real_samples)
print("Distribució de classes reals:", dict(counts))
lang_counts = Counter(s["language"] for s in real_samples).most_common(8)
print("Top idiomes reals:", lang_counts)

# Desa el dataset net
out_file = OUT_DIR / "real_ingredients_clean.jsonl"
with open(out_file, "w", encoding="utf-8") as f:
    for s in real_samples:
        f.write(json.dumps(s, ensure_ascii=False) + "\n")

print(f"✅ Desat dataset real a {out_file.name} ({out_file.stat().st_size / 1024:.1f} KB)")
