"""
Test de Cobertura i Precisió del Tier 2 (Taxonomia en memòria)
Comprova com es comporta la Taxonomia pura sobre:
1. Els 20 casos crítics del Challenge Set
2. Els ingredients del Golden Benchmark
"""
import json
import re
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
TAXONOMY_FILE = ROOT_DIR / "packages" / "domain" / "src" / "data" / "taxonomy.json"
BENCHMARK_FILE = ROOT_DIR / "data" / "dataset" / "benchmark" / "golden_test_set.jsonl"

with open(TAXONOMY_FILE, "r", encoding="utf-8") as f:
    tax = json.load(f)

entities = tax["entities"]
aliases = tax["aliases"]

index = {}
for alias, idx in aliases.items():
    index[alias.lower().strip()] = entities[idx]["status"]
for ent in entities:
    if "name" in ent and isinstance(ent["name"], str):
        index[ent["name"].lower().strip()] = ent["status"]
    if "id" in ent and isinstance(ent["id"], str):
        index[ent["id"].split(":")[-1].lower().strip()] = ent["status"]

print(f"🏛️ Taxonomia Tier 2 carregada: {len(index)} claus indexades")

# 1. Challenge Set
CHALLENGE_SET = [
    ("mantega de cacau", "vegan"),
    ("leche de almendras", "vegan"),
    ("Hafermilch", "vegan"),
    ("beurre de cacahuète", "vegan"),
    ("carne vegetal a base de soja", "vegan"),
    ("fromage végétal de coco", "vegan"),
    ("gelatina de porc", "non_vegetarian"),
    ("carmí de cotxinilla (E120)", "non_vegetarian"),
    ("hígado graso de pato", "non_vegetarian"),
    ("Rinderfett", "non_vegetarian"),
    ("anchovy extract", "non_vegetarian"),
    ("sang de porc", "non_vegetarian"),
    ("sèrum de llet en pols", "vegetarian"),
    ("clara de huevo pasteurizada", "vegetarian"),
    ("Hühnereiweiß", "vegetarian"),
    ("fromage de chèvre", "vegetarian"),
    ("caseinate de calcium", "vegetarian"),
    ("emulgent E471", "ambiguous"),
    ("mono y diglicéridos de ácidos grasos", "ambiguous"),
    ("stearic acid", "ambiguous"),
]

print("\n" + "=" * 80)
print(f"{'Cas':<35} | {'Esperat':<15} | {'Taxonomia Tier 2':<25}")
print("-" * 80)

def lookup_tier2(text: str):
    t_clean = text.lower().strip()
    # 1. Coincidència exacta amb l'índex d'àlies i entitats de la taxonomia
    if t_clean in index:
        return index[t_clean], "exact"
        
    # 2. Extreure codi E normalitzat si és un additiu (e.g. E120, E471)
    e_match = re.search(r"\b(e\s*[-]?\s*\d{3,4}[a-z]?)\b", t_clean)
    if e_match:
        e_norm = e_match.group(1).replace(" ", "").replace("-", "")
        if e_norm in index:
            return index[e_norm], f"e_code ({e_norm})"
            
    # Si no és exacte, NO fem substring ingenu: es delega al Tier 3 (MLP)
    return None, "miss"

hits = 0
for text, exp in CHALLENGE_SET:
    status, method = lookup_tier2(text)
    if status == exp:
        ok = "✅"
        hits += 1
    elif status is None:
        ok = "❓ (Miss -> a Tier 3)"
    else:
        ok = f"❌ (Error: {status})"
    res_str = f"{ok} [{method}]" if status else ok
    print(f"{text:<35} | {exp:<15} | {res_str:<25}")

print("=" * 80)
print(f"🎯 Total resolt amb èxit per Tier 2 pur: {hits}/{len(CHALLENGE_SET)} ({hits/len(CHALLENGE_SET)*100:.1f}%)")

# 2. Golden Benchmark Token Coverage
print("\n📦 Avaluant Cobertura de Tokens sobre el Golden Benchmark (182 productes)...")
benchmark_tokens = []
with open(BENCHMARK_FILE, "r", encoding="utf-8") as f:
    for line in f:
        if line.strip():
            p = json.loads(line)
            # Split
            cleaned = re.sub(r"(?:pot contenir|puede contener|may contain|kann spuren enthalten|peut contenir)[^,;.]*", " ", p["text"], flags=re.IGNORECASE)
            for part in re.split(r"[,;:\n\r\(\)]+", cleaned):
                tok = part.strip(" .•-–—\t\"'")
                tok = re.sub(r"\b\d+(?:[\.,]\d+)?\s*%\b", "", tok).strip()
                if len(tok) >= 2 and not tok.isdigit():
                    benchmark_tokens.append(tok)

tier2_hits = 0
for tok in benchmark_tokens:
    status, _ = lookup_tier2(tok)
    if status:
        tier2_hits += 1

print(f"Total de tokens extrets del Golden Benchmark: {len(benchmark_tokens)}")
print(f"Tokens resolts de forma instantània pel Tier 2: {tier2_hits} ({tier2_hits/len(benchmark_tokens)*100:.1f}%)")
print(f"Tokens que van al Tier 3 (MLP Edge):            {len(benchmark_tokens) - tier2_hits} ({(len(benchmark_tokens) - tier2_hits)/len(benchmark_tokens)*100:.1f}%)")
