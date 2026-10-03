#!/usr/bin/env python3
"""
Vegan Tools — Script d'Enginyeria de Dades de Machine Learning (Fase 2)
Genera datasets d'alta puresa per al classificador d'ingredients (Product Scanner).

Punts clau d'enginyeria (Fase 2):
1. Descàrrega i cache de les taxonomies oficials d'Open Food Facts (ingredients.json i additives.json).
2. Propagació taxonòmica d'etiquetes corregida (formatges/lactis com a secreció=1).
3. Preprocessament i normalització unificada de text (Fase 1: sense percentatges, separadors uniformes).
4. Injecció massiva de "Hard Negatives" (falsos amics: mantega de cacau, llet de coco, carn vegetal, etc.).
5. Granularitat mixta 50/50: 50% termes atòmics aïllats + 50% formulacions complexes multi-ingredient.
6. Quota multilingüe estricta: 25% ca, 25% en, 15% de, 15% es, 20% poti-poti europeu (fr, it, pt, nl, pl, etc.).
7. Blindatge contra Data Leakage: exclusió estricta de qualsevol mostra del Golden Benchmark Set.
8. Partició GroupStratifiedSplit per família taxonòmica (70% train, 15% val, 15% test).
"""

import json
import os
import re
import random
import urllib.request
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

import sys
sys.path.insert(0, str(Path(__file__).parent))
from ingredient_normalizer import normalize_ingredient_text, split_traces

# Constants de directori
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data" / "dataset"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
BENCHMARK_FILE = DATA_DIR / "benchmark" / "golden_test_set.jsonl"

# URLs canòniques del CDN d'Open Food Facts
INGREDIENTS_TAXONOMY_URL = "https://static.openfoodfacts.org/data/taxonomies/ingredients.json"
ADDITIVES_TAXONOMY_URL = "https://static.openfoodfacts.org/data/taxonomies/additives.json"

EUROPEAN_LANGS = {
    "ca", "en", "de", "es", "fr", "it",
    "pt", "nl", "pl", "sv", "da", "fi", "cs", "ro", "el", "hu", "no", "sk"
}

# --------------------------------------------------------------------------
# HARD NEGATIVES: Falsos amics vegetals que confonen models superficials
# Són 100% vegans ([0, 0, 0]), però contenen paraules com "mantega", "llet", "carn", "formatge".
# --------------------------------------------------------------------------
HARD_NEGATIVES = {
    "ca": [
        ("mantega de cacau", "plant_fat"),
        ("mantega de karité", "plant_fat"),
        ("crema de cacauet", "plant_spread"),
        ("llet d'ametlles", "plant_milk"),
        ("llet de civada", "plant_milk"),
        ("llet de coco", "plant_milk"),
        ("llet de soja", "plant_milk"),
        ("llet d'arròs", "plant_milk"),
        ("iogurt de soja", "plant_dairy"),
        ("formatge vegà", "plant_cheese"),
        ("formatge 100% vegetal", "plant_cheese"),
        ("carn de soja", "plant_meat"),
        ("carn vegetal", "plant_meat"),
        ("hamburguesa 100% vegetal", "plant_meat"),
        ("botifarra vegetal", "plant_meat"),
        ("salsitxes veganes", "plant_meat"),
        ("proteïna texturitzada de pèsol", "plant_protein"),
        ("àcid làctic d'origen vegetal", "plant_additive"),
        ("agar-agar", "plant_gelling"),
        ("pectina de fruita", "plant_gelling"),
        ("cera de carnauba", "plant_wax"),
        ("cera de candelilla", "plant_wax"),
    ],
    "es": [
        ("manteca de cacao", "plant_fat"),
        ("manteca de karité", "plant_fat"),
        ("crema de cacahuete", "plant_spread"),
        ("mantequilla de cacahuete", "plant_spread"),
        ("leche de almendras", "plant_milk"),
        ("leche de avena", "plant_milk"),
        ("leche de coco", "plant_milk"),
        ("leche de soja", "plant_milk"),
        ("leche de arroz", "plant_milk"),
        ("yogur de soja", "plant_dairy"),
        ("queso vegano", "plant_cheese"),
        ("queso 100% vegetal", "plant_cheese"),
        ("carne de soja", "plant_meat"),
        ("carne vegetal", "plant_meat"),
        ("hamburguesa 100% vegetal", "plant_meat"),
        ("salchichas veganas", "plant_meat"),
        ("proteína de guisante", "plant_protein"),
        ("ácido láctico vegetal", "plant_additive"),
        ("agar-agar", "plant_gelling"),
        ("pectina", "plant_gelling"),
        ("cera de carnauba", "plant_wax"),
    ],
    "en": [
        ("cocoa butter", "plant_fat"),
        ("shea butter", "plant_fat"),
        ("peanut butter", "plant_spread"),
        ("almond butter", "plant_spread"),
        ("almond milk", "plant_milk"),
        ("oat milk", "plant_milk"),
        ("coconut milk", "plant_milk"),
        ("soy milk", "plant_milk"),
        ("rice milk", "plant_milk"),
        ("soy yogurt", "plant_dairy"),
        ("coconut yogurt", "plant_dairy"),
        ("vegan cheese", "plant_cheese"),
        ("plant-based cheese", "plant_cheese"),
        ("vegan meat", "plant_meat"),
        ("plant-based meat", "plant_meat"),
        ("meatless burger", "plant_meat"),
        ("textured vegetable protein", "plant_protein"),
        ("pea protein isolate", "plant_protein"),
        ("plant lactic acid", "plant_additive"),
        ("agar agar", "plant_gelling"),
        ("fruit pectin", "plant_gelling"),
        ("carnauba wax", "plant_wax"),
        ("candelilla wax", "plant_wax"),
    ],
    "de": [
        ("Kakaobutter", "plant_fat"),
        ("Sheabutter", "plant_fat"),
        ("Erdnussbutter", "plant_spread"),
        ("Mandelbutter", "plant_spread"),
        ("Mandelmilch", "plant_milk"),
        ("Hafermilch", "plant_milk"),
        ("Kokosmilch", "plant_milk"),
        ("Sojamilch", "plant_milk"),
        ("Reismilch", "plant_milk"),
        ("Sojajoghurt", "plant_dairy"),
        ("veganer Käse", "plant_cheese"),
        ("Pflanzenkäse", "plant_cheese"),
        ("pflanzliches Fleisch", "plant_meat"),
        ("veganes Hackfleisch", "plant_meat"),
        ("Sojafleisch", "plant_meat"),
        ("vegane Wurst", "plant_meat"),
        ("Erbsenprotein", "plant_protein"),
        ("pflanzliche Milchsäure", "plant_additive"),
        ("Agar-Agar", "plant_gelling"),
        ("Pektin", "plant_gelling"),
        ("Carnaubawachs", "plant_wax"),
    ],
    "fr": [
        ("beurre de cacao", "plant_fat"),
        ("beurre de karité", "plant_fat"),
        ("beurre de cacahuète", "plant_spread"),
        ("lait d'amande", "plant_milk"),
        ("lait d'avoine", "plant_milk"),
        ("lait de coco", "plant_milk"),
        ("lait de soja", "plant_milk"),
        ("yaourt de soja", "plant_dairy"),
        ("fromage végétal", "plant_cheese"),
        ("fauxmage", "plant_cheese"),
        ("viande végétale", "plant_meat"),
        ("steak végétal", "plant_meat"),
        ("protéine de pois", "plant_protein"),
        ("agar-agar", "plant_gelling"),
        ("pectine de fruit", "plant_gelling"),
        ("cire de carnauba", "plant_wax"),
    ],
    "it": [
        ("burro di cacao", "plant_fat"),
        ("burro di arachidi", "plant_spread"),
        ("latte di mandorla", "plant_milk"),
        ("latte di avena", "plant_milk"),
        ("latte di cocco", "plant_milk"),
        ("latte di soia", "plant_milk"),
        ("yogurt di soia", "plant_dairy"),
        ("formaggio vegetale", "plant_cheese"),
        ("carne vegetale", "plant_meat"),
        ("burger vegetale", "plant_meat"),
        ("proteine di pisello", "plant_protein"),
        ("agar-agar", "plant_gelling"),
        ("pectina", "plant_gelling"),
    ],
}


def download_file(url: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        print(f"  [Cache] Utilitzant {dest.name} ({dest.stat().st_size / 1024:.1f} KB)")
        return dest

    print(f"  [Descarregant] {url} -> {dest.name}...")
    headers = {"User-Agent": "VeganTools-ML-DatasetBuilder/2.0 (contact@vegantools.org)"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp, open(dest, "wb") as f:
        while chunk := resp.read(65536):
            f.write(chunk)
    print(f"  [Descarregat] {dest.name} ({dest.stat().st_size / 1024:.1f} KB)")
    return dest


def resolve_taxonomy_status(
    entry_id: str,
    taxonomy: Dict[str, dict],
    visited: Optional[Set[str]] = None,
) -> Tuple[Optional[str], Optional[str], str]:
    if visited is None:
        visited = set()
    if entry_id in visited or entry_id not in taxonomy:
        return None, None, entry_id

    visited.add(entry_id)
    entry = taxonomy[entry_id]

    veg = entry.get("vegan", {}).get("en")
    vgt = entry.get("vegetarian", {}).get("en")
    parents = entry.get("parents", [])

    if veg and vgt:
        root_family = parents[0] if parents else entry_id
        return veg, vgt, root_family

    for parent in parents:
        p_veg, p_vgt, p_root = resolve_taxonomy_status(parent, taxonomy, visited)
        if p_veg and p_vgt:
            return p_veg, p_vgt, p_root or parent

    root_family = parents[0] if parents else entry_id
    return veg, vgt, root_family


def classify_to_multilabel(vegan: Optional[str], vegetarian: Optional[str]) -> Optional[Dict[str, int]]:
    """Mapeig precís corregit: qualsevol lacti/formatge és secreció=1."""
    if not vegan or not vegetarian:
        return None

    # 1. 100% Vegà certificat
    if vegan == "yes" and vegetarian == "yes":
        return {"has_slaughter": 0, "has_secretion": 0, "has_dual_origin": 0}

    # 2. Slaughter: carn, peix, marisc, gelatina animal, carmí E120
    if vegetarian == "no":
        return {"has_slaughter": 1, "has_secretion": 0, "has_dual_origin": 0}

    # 3. Secretion animal: llet, formatge, ou, mel, mantega
    if vegan == "no":
        return {"has_slaughter": 0, "has_secretion": 1, "has_dual_origin": 1 if vegetarian == "maybe" else 0}

    # 4. Dual Origin pur: E471, àcid esteàric, glicerina
    if vegan == "maybe":
        return {"has_slaughter": 0, "has_secretion": 0, "has_dual_origin": 1}

    return None


def extract_atomic_samples(ingredients_file: Path, additives_file: Path) -> List[dict]:
    """Extreu mostres atòmiques individuals multilingües de la taxonomia d'Open Food Facts."""
    with open(ingredients_file, "r", encoding="utf-8") as f:
        ing_data = json.load(f)
    with open(additives_file, "r", encoding="utf-8") as f:
        add_data = json.load(f)

    combined = {**ing_data, **add_data}
    samples: List[dict] = []
    seen_texts: Set[str] = set()

    for item_id, item in combined.items():
        veg, vgt, root_family = resolve_taxonomy_status(item_id, combined)
        labels = classify_to_multilabel(veg, vgt)
        if not labels:
            continue

        names = item.get("name", {})
        if not isinstance(names, dict):
            continue

        for lang, text in names.items():
            if not isinstance(text, str) or len(text.strip()) < 2:
                continue

            if lang not in EUROPEAN_LANGS:
                continue

            clean_text, _ = normalize_ingredient_text(text)
            if len(clean_text) < 2:
                continue

            norm_key = (lang, clean_text.lower())
            if norm_key in seen_texts:
                continue
            seen_texts.add(norm_key)

            sample_lang = lang
            if lang in ("fr", "it"):
                sample_lang = "fr_it"
            elif lang not in ("ca", "en", "de", "es"):
                sample_lang = "other_eu"

            samples.append({
                "text": clean_text,
                "language": sample_lang,
                "original_lang": lang,
                "granularity": "atomic",
                "source": "openfoodfacts_taxonomy",
                "entity_id": item_id,
                "root_family": root_family,
                "has_slaughter": labels["has_slaughter"],
                "has_secretion": labels["has_secretion"],
                "has_dual_origin": labels["has_dual_origin"],
            })

    # Injecció d'atòmics Hard Negatives
    for lang, items in HARD_NEGATIVES.items():
        for term, subcat in items:
            clean_term, _ = normalize_ingredient_text(term)
            norm_key = (lang, clean_term.lower())
            if norm_key not in seen_texts:
                seen_texts.add(norm_key)
                sample_lang = lang if lang in ("ca", "en", "de", "es") else "fr_it"
                samples.append({
                    "text": clean_term,
                    "language": sample_lang,
                    "original_lang": lang,
                    "granularity": "atomic",
                    "source": "hard_negative_plant",
                    "entity_id": f"hard_neg:{clean_term.lower().replace(' ', '_')}",
                    "root_family": f"hard_neg_{subcat}",
                    "has_slaughter": 0,
                    "has_secretion": 0,
                    "has_dual_origin": 0,
                })

    return samples


def extract_cookbook_ingredients() -> List[dict]:
    """Extreu ingredients reals 100% vegetals de cookbook.ts."""
    samples: List[dict] = []
    cookbook_file = PROJECT_ROOT / "packages" / "domain" / "src" / "cookbook.ts"
    if not cookbook_file.exists():
        return samples

    content = cookbook_file.read_text(encoding="utf-8")
    pattern = re.compile(r'name:\s*\{\s*ca:\s*"([^"]+)",\s*en:\s*"([^"]+)"\s*\}')
    for match in pattern.finditer(content):
        ca_name = match.group(1).strip()
        en_name = match.group(2).strip()

        for lang, text in [("ca", ca_name), ("en", en_name)]:
            clean_text, _ = normalize_ingredient_text(text)
            samples.append({
                "text": clean_text,
                "language": lang,
                "original_lang": lang,
                "granularity": "atomic",
                "source": "master_cookbook",
                "entity_id": f"cookbook:{re.sub(r'[^a-z0-9]+', '_', clean_text.lower())[:30]}",
                "root_family": "culinary_plant_base",
                "has_slaughter": 0,
                "has_secretion": 0,
                "has_dual_origin": 0,
            })

    return samples


def synthesize_realistic_food_lists(atomic_samples: List[dict], count: int = 12500) -> List[dict]:
    """
    Sintetitza formulacions complexes industrials realistes combinant components atòmics,
    connectors, al·lèrgens i injecció de Hard Negatives.
    """
    by_category = {
        "vegan": [s for s in atomic_samples if s["has_slaughter"] == 0 and s["has_secretion"] == 0 and s["has_dual_origin"] == 0],
        "slaughter": [s for s in atomic_samples if s["has_slaughter"] == 1],
        "secretion": [s for s in atomic_samples if s["has_secretion"] == 1],
        "dual": [s for s in atomic_samples if s["has_dual_origin"] == 1],
    }

    CONNECTORS = {
        "ca": ("Ingredients: ", ", "),
        "en": ("Ingredients: ", ", "),
        "de": ("Zutaten: ", ", "),
        "es": ("Ingredientes: ", ", "),
        "fr": ("Ingrédients: ", ", "),
        "it": ("Ingredienti: ", ", "),
    }

    # Clàusules de traces per avaluar que la normalització les extreu netament
    TRACE_CLAUSES = {
        "ca": [". Pot contenir traces de llet i ou.", ". Traces de fruits secs.", ""],
        "en": [". May contain milk and egg.", ". Manufactured on equipment that processes fish.", ""],
        "de": [". Kann Spuren von Milch und Eiern enthalten.", ". Spuren von Schalenfrüchten.", ""],
        "es": [". Puede contener trazas de leche.", ". Fabricado en una instalación con huevo.", ""],
        "fr": [". Traces éventuelles de lait.", ""],
        "it": [". Può contenere tracce di latte e uova.", ""],
    }

    synth_langs = ["ca", "en", "de", "es", "fr", "it"]
    synth_weights = [0.30, 0.25, 0.15, 0.15, 0.08, 0.07]

    synthesized: List[dict] = []
    random.seed(42)

    for i in range(count):
        lang = random.choices(synth_langs, weights=synth_weights)[0]

        # Mode ètic: 45% vegà (inclou hard negatives), 22% secreció, 20% carn, 13% dual
        mode = random.choices(["vegan", "secretion", "slaughter", "dual"], weights=[0.45, 0.22, 0.20, 0.13])[0]

        prefix, sep = CONNECTORS.get(lang, ("Ingredients: ", ", "))
        items: List[dict] = []

        # 1. Base vegana (2 a 5 ingredients)
        vegan_pool = [s for s in by_category["vegan"] if s.get("original_lang") == lang] or by_category["vegan"]
        items.extend(random.sample(vegan_pool, min(len(vegan_pool), random.randint(2, 5))))

        # 2. Injecció d'un Hard Negative en el 35% de mostres veganes!
        # (ex: mantega de cacau dins d'una xocolata vegana)
        if mode == "vegan" and random.random() < 0.35 and lang in HARD_NEGATIVES:
            hn_term, hn_cat = random.choice(HARD_NEGATIVES[lang])
            clean_hn, _ = normalize_ingredient_text(hn_term)
            items.append({
                "text": clean_hn,
                "root_family": f"hard_neg_{hn_cat}",
            })

        has_slaughter = 0
        has_secretion = 0
        has_dual = 0
        root_families = [item["root_family"] for item in items]

        if mode == "slaughter":
            sl_pool = [s for s in by_category["slaughter"] if s.get("original_lang") == lang] or by_category["slaughter"]
            if sl_pool:
                sl_item = random.choice(sl_pool)
                items.append(sl_item)
                has_slaughter = 1
                root_families.append(sl_item["root_family"])

        elif mode == "secretion":
            sec_pool = [s for s in by_category["secretion"] if s.get("original_lang") == lang] or by_category["secretion"]
            if sec_pool:
                sec_item = random.choice(sec_pool)
                items.append(sec_item)
                has_secretion = 1
                root_families.append(sec_item["root_family"])

        elif mode == "dual":
            dual_pool = [s for s in by_category["dual"] if s.get("original_lang") == lang] or by_category["dual"]
            if dual_pool:
                dual_item = random.choice(dual_pool)
                items.append(dual_item)
                has_dual = 1
                root_families.append(dual_item["root_family"])

        random.shuffle(items)
        trace_suffix = random.choice(TRACE_CLAUSES.get(lang, [""]))
        raw_text = prefix + sep.join(item["text"] for item in items) + trace_suffix

        # Passem per la pipeline unificada de normalització de la Fase 1
        clean_text, traces = normalize_ingredient_text(raw_text)

        synthesized.append({
            "text": clean_text,
            "raw_text": raw_text,
            "traces": traces,
            "language": lang if lang in ("ca", "en", "de", "es") else "fr_it",
            "original_lang": lang,
            "granularity": "complex",
            "source": "synthetic_recipe_v2",
            "entity_id": f"synth_v2_{i}",
            "root_family": "_".join(sorted(set(root_families))[:2]),
            "has_slaughter": has_slaughter,
            "has_secretion": has_secretion,
            "has_dual_origin": has_dual,
        })

    return synthesized


def balance_dataset(
    atomic_samples: List[dict],
    synth_samples: List[dict],
    target_total: int = 25000,
) -> List[dict]:
    """
    Equilibra el dataset respectant:
    1. Granularitat Mixta 50% atòmic i 50% complex.
    2. Quotes d'idioma: 25% ca, 25% en, 15% de, 15% es, 20% poti-poti europeu.
    3. Exclusió estricta de qualsevol mostra del Golden Benchmark.
    """
    # 1. Carreguem mostres del Golden Benchmark per assegurar ZERO data leakage
    golden_texts = set()
    if BENCHMARK_FILE.exists():
        with open(BENCHMARK_FILE, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    item = json.loads(line)
                    clean_t, _ = normalize_ingredient_text(item["text"])
                    golden_texts.add(clean_t.lower())
        print(f"🛡️ Blindatge Data Leakage: Bloquejades {len(golden_texts)} mostres del Golden Benchmark.")

    target_atomic = target_total // 2
    target_complex = target_total - target_atomic

    # Filtratge de leakage
    clean_atomic = [s for s in atomic_samples if s["text"].lower() not in golden_texts]
    clean_complex = [s for s in synth_samples if s["text"].lower() not in golden_texts]

    targets_lang = {
        "ca": 0.25,
        "en": 0.25,
        "de": 0.15,
        "es": 0.15,
        "poti_poti": 0.20,
    }

    def sample_bucket(pool: List[dict], target_n: int) -> List[dict]:
        by_bucket = defaultdict(list)
        for s in pool:
            orig = s.get("original_lang", "other")
            if orig == "ca":
                b = "ca"
            elif orig == "en":
                b = "en"
            elif orig == "de":
                b = "de"
            elif orig == "es":
                b = "es"
            else:
                b = "poti_poti"
            by_bucket[b].append(s)

        selected = []
        random.seed(42)

        for b, ratio in targets_lang.items():
            count = int(target_n * ratio)
            b_pool = by_bucket[b]
            random.shuffle(b_pool)

            # Equilibrar classes dins de cada idioma
            by_class = defaultdict(list)
            for s in b_pool:
                if s["has_slaughter"]:
                    cls = "slaughter"
                elif s["has_secretion"]:
                    cls = "secretion"
                elif s["has_dual_origin"]:
                    cls = "dual"
                else:
                    cls = "vegan"
                by_class[cls].append(s)

            class_quotas = {
                "slaughter": int(count * 0.20),
                "secretion": int(count * 0.20),
                "dual": int(count * 0.15),
                "vegan": count - int(count * 0.20) - int(count * 0.20) - int(count * 0.15),
            }

            b_selected = []
            for cls, c_cnt in class_quotas.items():
                cls_pool = by_class[cls]
                b_selected.extend(cls_pool[:c_cnt])

            remaining = count - len(b_selected)
            if remaining > 0:
                already_ids = {id(x) for x in b_selected}
                extra = [x for x in b_pool if id(x) not in already_ids]
                b_selected.extend(extra[:remaining])

            for s in b_selected:
                s["language_bucket"] = b
                s["language"] = "fr_it_other" if b == "poti_poti" else b

            selected.extend(b_selected)

        return selected

    selected_atomic = sample_bucket(clean_atomic, target_atomic)
    selected_complex = sample_bucket(clean_complex, target_complex)

    combined = selected_atomic + selected_complex
    random.shuffle(combined)
    return combined


def group_stratified_split(
    samples: List[dict],
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
) -> Tuple[List[dict], List[dict], List[dict]]:
    """Partició per família taxonòmica arrel per evitar data leakage entre train/val/test."""
    families: Dict[str, List[dict]] = defaultdict(list)
    for s in samples:
        fam = s.get("root_family") or s.get("entity_id") or "misc"
        families[fam].append(s)

    train_set, val_set, test_set = [], [], []
    train_target = len(samples) * train_ratio
    val_target = len(samples) * val_ratio

    fam_list = list(families.items())
    random.seed(42)
    random.shuffle(fam_list)

    for fam, items in fam_list:
        if len(train_set) < train_target:
            train_set.extend(items)
        elif len(val_set) < val_target:
            val_set.extend(items)
        else:
            test_set.extend(items)

    random.shuffle(train_set)
    random.shuffle(val_set)
    random.shuffle(test_set)
    return train_set, val_set, test_set


def compute_dataset_stats(samples: List[dict]) -> dict:
    total = len(samples)
    if total == 0:
        return {}

    lang_counts = defaultdict(int)
    slaughter_count = sum(1 for s in samples if s["has_slaughter"])
    secretion_count = sum(1 for s in samples if s["has_secretion"])
    dual_count = sum(1 for s in samples if s["has_dual_origin"])
    vegan_count = sum(1 for s in samples if not s["has_slaughter"] and not s["has_secretion"] and not s["has_dual_origin"])
    atomic_count = sum(1 for s in samples if s.get("granularity") == "atomic")
    complex_count = sum(1 for s in samples if s.get("granularity") == "complex")

    for s in samples:
        lang_counts[s["language"]] += 1

    return {
        "total_samples": total,
        "granularity": {
            "atomic": f"{atomic_count} ({atomic_count / total * 100:.1f}%)",
            "complex": f"{complex_count} ({complex_count / total * 100:.1f}%)",
        },
        "languages": {k: f"{v} ({v / total * 100:.1f}%)" for k, v in sorted(lang_counts.items())},
        "classes": {
            "slaughter": f"{slaughter_count} ({slaughter_count / total * 100:.1f}%)",
            "secretion": f"{secretion_count} ({secretion_count / total * 100:.1f}%)",
            "dual_origin": f"{dual_count} ({dual_count / total * 100:.1f}%)",
            "pure_vegan": f"{vegan_count} ({vegan_count / total * 100:.1f}%)",
        },
    }


def save_jsonl(samples: List[dict], dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    with open(dest, "w", encoding="utf-8") as f:
        for s in samples:
            f.write(json.dumps(s, ensure_ascii=False) + "\n")
    print(f"  [Desat] {dest.name} -> {len(samples)} mostres ({dest.stat().st_size / 1024:.1f} KB)")


def main():
    print("=" * 75)
    print("🌱 VEGAN TOOLS: ENGINYERIA DE DADES DE MACHINE LEARNING (FASE 2)")
    print("=" * 75)

    TARGET_SCALE = 25000

    # 1. Taxonomies
    print("\n📦 Pas 1: Descàrrega i cache de taxonomies...")
    ing_file = download_file(INGREDIENTS_TAXONOMY_URL, RAW_DIR / "ingredients.json")
    add_file = download_file(ADDITIVES_TAXONOMY_URL, RAW_DIR / "additives.json")

    # 2. Extracció atòmica + Hard Negatives
    print("\n🔬 Pas 2: Extracció d'ingredients atòmics i injecció de Hard Negatives...")
    atomic_samples = extract_atomic_samples(ing_file, add_file)
    print(f"  Extretes {len(atomic_samples)} mostres atòmiques pures.")

    # 3. Ingredients culinaris de cookbook
    cookbook_samples = extract_cookbook_ingredients()
    print(f"  Extretes {len(cookbook_samples)} mostres del receptari mestre.")
    atomic_samples.extend(cookbook_samples)

    # 4. Síntesi de formulacions complexes
    print("\n🧪 Pas 3: Síntesi de formulacions complexes amb combinació de Hard Negatives...")
    synth_samples = synthesize_realistic_food_lists(atomic_samples, count=TARGET_SCALE // 2)
    print(f"  Sintetitzades {len(synth_samples)} formulacions complexes.")

    # 5. Balanceig híbrid 50/50 i quotes d'idioma
    print(f"\n⚖️ Pas 4: Balanceig híbrid i quotes d'idioma ({TARGET_SCALE} mostres)...")
    balanced = balance_dataset(atomic_samples, synth_samples, target_total=TARGET_SCALE)
    print(f"  Seleccionades {len(balanced)} mostres equilibrades.")

    # 6. Partició GroupStratifiedSplit
    print("\n🛡️ Pas 5: Partició GroupStratifiedSplit per família taxonòmica...")
    train_set, val_set, test_set = group_stratified_split(balanced, train_ratio=0.70, val_ratio=0.15)

    # 7. Desat
    print("\n💾 Pas 6: Desat dels conjunts a data/dataset/processed/...")
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    save_jsonl(train_set, PROCESSED_DIR / "train.jsonl")
    save_jsonl(val_set, PROCESSED_DIR / "val.jsonl")
    save_jsonl(test_set, PROCESSED_DIR / "test.jsonl")

    # 8. Estadístiques
    stats = {
        "overall": compute_dataset_stats(balanced),
        "train": compute_dataset_stats(train_set),
        "val": compute_dataset_stats(val_set),
        "test": compute_dataset_stats(test_set),
    }

    with open(PROCESSED_DIR / "dataset_stats.json", "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)

    print("\n📈 RESUM DEL DATASET FINAL ESCALAT (FASE 2):")
    print(json.dumps(stats["overall"], indent=2, ensure_ascii=False))
    print("\n✅ Dataset de la Fase 2 generat amb èxit!")


if __name__ == "__main__":
    main()
