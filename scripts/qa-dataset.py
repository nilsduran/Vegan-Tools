"""
Control de Qualitat (QA) i Auditoria del Dataset Real d'Open Food Facts.
Verifica que les etiquetes siguin 100% fiables i detecta possibles anomalies.
"""
import json
import re
import random
from collections import Counter
from pathlib import Path

DATA_FILE = Path("data/dataset/real/real_ingredients_clean.jsonl")

with open(DATA_FILE, "r", encoding="utf-8") as f:
    samples = [json.loads(line) for line in f]

print(f"📊 Total mostres carregades per al QA: {len(samples)}")

# Llistes de comprovació per detectar possibles anomalies
MEAT_WORDS = {
    'meat', 'pork', 'beef', 'chicken', 'lamb', 'veal', 'duck', 'turkey', 'fish', 'salmon',
    'tuna', 'cod', 'anchov', 'gelatin', 'carmine', 'cochineal', 'lard', 'bacon', 'ham',
    'carn', 'porc', 'vedella', 'pollastre', 'xai', 'conill', 'peix', 'tonyina', 'bacalla',
    'anxov', 'gelatina', 'carmi', 'cotxinilla', 'llard', 'cansalada', 'pernil',
    'carne', 'cerdo', 'ternera', 'pollo', 'cordero', 'conejo', 'pescado', 'atun', 'bacalao',
    'anchoa', 'manteca de cerdo', 'jamon', 'tocino',
    'fleisch', 'schwein', 'rind', 'hahnchen', 'speck', 'fisch',
    'viande', 'boeuf', 'poulet', 'jambon'
}

DAIRY_EGG_WORDS = {
    'milk', 'cheese', 'butter', 'cream', 'whey', 'casein', 'egg', 'yolk', 'albumen', 'honey',
    'llet', 'formatge', 'mantega', 'nata', 'serum', 'caseina', 'ou', 'rovell', 'clara', 'mel',
    'leche', 'queso', 'mantequilla', 'suero', 'caseina', 'huevo', 'yema', 'miel',
    'milch', 'kase', 'sahne', 'molke', 'ei', 'eigelb', 'honig',
    'lait', 'fromage', 'beurre', 'creme', 'lactoserum', 'oeuf'
}

# Falsos amics vegetals que contenen paraules com 'butter', 'milk', 'cheese', 'meat' però són 100% vegans
ALLOWED_VEGAN_FALSE_FRIENDS = {
    'cocoa butter', 'cacao butter', 'mantega de cacau', 'manteca de cacao', 'beurre de cacao', 'kakaobutter',
    'peanut butter', 'crema de cacauet', 'mantequilla de cacahuete', 'erdnussbutter', 'beurre de cacahuete',
    'shea butter', 'mantega de karite', 'manteca de karite', 'beurre de karite', 'karitebutter',
    'almond milk', 'llet d ametlla', 'leche de almendra', 'mandelmilch', 'lait d amande',
    'soy milk', 'soya milk', 'llet de soja', 'leche de soja', 'sojamilch', 'lait de soja',
    'oat milk', 'llet de civada', 'leche de avena', 'hafermilch', 'lait d avoine',
    'coconut milk', 'llet de coco', 'leche de coco', 'kokosmilch', 'lait de coco',
    'rice milk', 'llet d arros', 'leche de arroz', 'reismilch', 'lait de riz',
    'vegan cheese', 'formatge vega', 'queso vegano', 'veganer kase', 'fromage vegetal',
    'plant meat', 'carn vegetal', 'carne vegetal', 'vegan meat', 'steak vegetal',
    'butternut', 'milk thistle', 'butter bean', 'eggplant'
}

def clean_tok(text):
    t = text.lower()
    t = re.sub(r"[àáâäã]", "a", t)
    t = re.sub(r"[èéêë]", "e", t)
    t = re.sub(r"[ìíîï]", "i", t)
    t = re.sub(r"[òóôöõ]", "o", t)
    t = re.sub(r"[ùúûü]", "u", t)
    t = re.sub(r"[ç]", "c", t)
    t = re.sub(r"[ñ]", "n", t)
    t = re.sub(r"[\s\-_']+", " ", t).strip()
    return t

suspicious_vegans = []
suspicious_non_vegans = []

for s in samples:
    t = clean_tok(s["text"])
    status = s["diet_status"]
    
    # 1. Comprovar si un 'vegan' conté una paraula de carn o lacti (sense ser un fals amic permès)
    if status == "vegan":
        is_false_friend = any(ff in t for ff in ALLOWED_VEGAN_FALSE_FRIENDS)
        if not is_false_friend:
            words = set(t.split())
            meat_hits = words.intersection(MEAT_WORDS)
            dairy_hits = words.intersection(DAIRY_EGG_WORDS)
            if meat_hits or dairy_hits:
                suspicious_vegans.append((s["canonical_id"], s["text"], s["language"], meat_hits | dairy_hits))

    # 2. Comprovar si un 'non_vegetarian' és en realitat un vegetal evident
    if status == "non_vegetarian":
        # ex: "apple", "tomato", "olive oil" etiquetat com a carn?
        pure_plants = {'apple', 'tomato', 'potato', 'carrot', 'rice', 'wheat', 'olive', 'orange', 'banana', 'salt', 'water', 'sugar'}
        words = set(t.split())
        plant_hits = words.intersection(pure_plants)
        if plant_hits and not any(m in t for m in MEAT_WORDS):
            suspicious_non_vegans.append((s["canonical_id"], s["text"], s["language"], plant_hits))

print(f"\n🔍 RESULTATS DE L'AUDITORIA:")
print(f"- Sospitosos en classe 'vegan' (possibles carns/lactis colats): {len(suspicious_vegans)} / {sum(1 for s in samples if s['diet_status'] == 'vegan')} ({len(suspicious_vegans)/sum(1 for s in samples if s['diet_status'] == 'vegan')*100:.2f}%)")
if suspicious_vegans:
    print("  Exemples de sospitosos en 'vegan':")
    for cid, txt, lang, hits in suspicious_vegans[:5]:
        print(f"    * [{lang}] ID: {cid} | Text: '{txt}' | Paraules clau trobades: {hits}")

print(f"\n- Sospitosos en classe 'non_vegetarian' (possibles vegetals colats): {len(suspicious_non_vegans)} / {sum(1 for s in samples if s['diet_status'] == 'non_vegetarian')} ({len(suspicious_non_vegans)/sum(1 for s in samples if s['diet_status'] == 'non_vegetarian')*100:.2f}%)")
if suspicious_non_vegans:
    print("  Exemples de sospitosos en 'non_vegetarian':")
    for cid, txt, lang, hits in suspicious_non_vegans[:5]:
        print(f"    * [{lang}] ID: {cid} | Text: '{txt}' | Paraules clau trobades: {hits}")

print("\n📋 10 MOSTRES ALEATÒRIES PER A INSPECCIÓ HUMANA:")
random.seed(42)
for cat in ['vegan', 'vegetarian', 'non_vegetarian', 'ambiguous']:
    print(f"\n--- Categoria: {cat.upper()} ---")
    cat_samples = [s for s in samples if s['diet_status'] == cat]
    for s in random.sample(cat_samples, min(3, len(cat_samples))):
        print(f"  [{s['language']}] '{s['text']}' (ID: {s['canonical_id']})")
