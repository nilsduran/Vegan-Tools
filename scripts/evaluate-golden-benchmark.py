"""
Script d'avaluació estandarditzat per al Golden Benchmark Set (Fase 0).
Permet avaluar de manera imparcial qualsevol model o baseline:
- Regex Baseline (regles heurístiques tradicionals)
- Model ONNX Local
- (Opcionalment) Model PyTorch o Cloud
"""

import json
import sys
import time
import re
from pathlib import Path
from typing import Dict, Tuple, List, Optional
import numpy as np

BENCHMARK_FILE = Path("data/dataset/benchmark/golden_test_set.jsonl")

# --------------------------------------------------------------------------
# 1. EVALUADOR REGEX BASELINE (El sistema basat en regles anterior)
# --------------------------------------------------------------------------
REGEX_SLAUGHTER = re.compile(
    r"\b(carn|porc|pollastre|vedella|bou|xai|conill|pernil|cansalada|bacon|llard|saïm|"
    r"gelatina|carmí|carmin|cochinilla|e120|e-120|peix|tonyina|bacallà|anxova|anxoves|salmó|rap|lluç|"
    r"marisc|gamba|gambes|llagostí|cranc|musclo|quall animal|"
    r"carne|cerdo|pollo|ternera|buey|cordero|conejo|jamón|tocino|manteca de cerdo|"
    r"pescado|atún|bacalao|anchoa|salmón|merluza|marisco|mejillón|cuajo animal|"
    r"meat|pork|chicken|beef|lamb|rabbit|ham|bacon|lard|"
    r"gelatin|gelatine|carmine|cochineal|fish|tuna|cod|anchovy|salmon|crab|shrimp|prawn|"
    r"fleisch|schweinefleisch|rindfleisch|hähnchen|speck|tierisches lab|"
    r"viande|porc|poulet|boeuf|jambon|lard|poisson|thon|saumon|gélatine)\b",
    re.IGNORECASE
)

REGEX_SECRETION = re.compile(
    r"\b(llet|formatge|iogurt|mantega|nata|sèrum|crema de llet|caseïna|caseïnat|"
    r"ou|ous|clara d'ou|rovell|mel|cera d'abelles|e901|e-901|"
    r"leche|queso|yogur|mantequilla|nata|suero|caseína|caseinato|"
    r"huevo|huevos|clara de huevo|yema|miel|cera de abejas|"
    r"milk|cheese|yogurt|butter|cream|whey|casein|caseinate|"
    r"egg|eggs|egg white|egg yolk|honey|beeswax|"
    r"milch|käse|joghurt|butter|sahne|molke|hühnerei|eiweiß|eigelb|honig|bienenwachs|"
    r"lait|fromage|yaourt|beurre|crème|lactosérum|oeuf|oeufs|miel|cire d'abeille)\b",
    re.IGNORECASE
)

REGEX_DUAL = re.compile(
    r"\b(e471|e-471|e472|e-472|e481|e-481|e422|e-422|glicerol|glicerina|glycerol|glycerin|"
    r"àcid esteàric|ácido esteárico|stearic acid|e570|e-570|vitamina d3|vitamin d3|colecalciferol|cholecalciferol)\b",
    re.IGNORECASE
)

# Falsos amics vegetals per a regex bàsica
REGEX_VEGAN_FALSE_FRIENDS = re.compile(
    r"\b(mantega de cacau|manteca de cacao|cocoa butter|kakaobutter|beurre de cacao|"
    r"crema de cacauet|mantequilla de cacahuete|peanut butter|erdnussbutter|beurre de cacahuète|"
    r"llet d'ametll|leche de almendra|almond milk|mandelmilch|lait d'amande|"
    r"llet de civada|leche de avena|oat milk|hafermilch|lait d'avoine|"
    r"llet de coco|leche de coco|coconut milk|kokosmilch|lait de coco|"
    r"llet de soja|leche de soja|soy milk|sojamilch|lait de soja|"
    r"formatge vegà|queso vegano|vegan cheese|veganer käse|fromage végétal|"
    r"carn vegetal|carne vegetal|plant-based meat|vegan meat|steak végétal)\b",
    re.IGNORECASE
)

def evaluate_regex(text: str) -> Tuple[int, int, int]:
    # Si és un fals amic vegetal pur i no té res més
    has_sla = 1 if REGEX_SLAUGHTER.search(text) else 0
    has_sec = 1 if REGEX_SECRETION.search(text) else 0
    has_dua = 1 if REGEX_DUAL.search(text) else 0

    # Lògica naive de falsos amics: si té "mantega de cacau" o "llet d'ametlles", ignora la mantega/llet
    if REGEX_VEGAN_FALSE_FRIENDS.search(text):
        cleaned = REGEX_VEGAN_FALSE_FRIENDS.sub(" ", text)
        has_sla = 1 if REGEX_SLAUGHTER.search(cleaned) else 0
        has_sec = 1 if REGEX_SECRETION.search(cleaned) else 0

    return has_sla, has_sec, has_dua


# --------------------------------------------------------------------------
# 2. RUNNER D'AVALUACIÓ
# --------------------------------------------------------------------------
def run_evaluation(model_type: str = "regex", onnx_path: Optional[str] = None, use_normalizer: bool = True):
    norm_status = "ACTIVAT (Fase 1)" if use_normalizer else "DESACTIVAT (Text cru)"
    print("=" * 80)
    print(f"🔬 VEGAN TOOLS: AVALUACIÓ SOBRE EL GOLDEN BENCHMARK (FASE 0 & FASE 1)")
    print(f"   Model avaluat: {model_type.upper()} | Normalitzador: {norm_status}")
    print("=" * 80)

    if not BENCHMARK_FILE.exists():
        print(f"❌ Error: No s'ha trobat {BENCHMARK_FILE}")
        return

    with open(BENCHMARK_FILE, "r", encoding="utf-8") as f:
        samples = [json.loads(line) for line in f]

    print(f"📁 Carregades {len(samples)} mostres immutables i auditades.\n")

    onnx_session = None
    tokenizer = None
    thresholds = (0.10, 0.20, 0.25)

    if model_type == "onnx":
        import onnxruntime as ort
        from transformers import AutoTokenizer

        if not onnx_path or not Path(onnx_path).exists():
            print(f"❌ Error: No s'ha trobat el model ONNX a {onnx_path}")
            return

        print(f"📦 Carregant sessió ONNX des de: {onnx_path}")
        onnx_session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
        tokenizer = AutoTokenizer.from_pretrained("distilbert/distilbert-base-multilingual-cased")

        # Carregar decision_config.json si existeix
        cfg_file = Path(onnx_path).parent / "decision_config.json"
        if cfg_file.exists():
            with open(cfg_file, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                th = cfg.get("thresholds", {})
                thresholds = (th.get("slaughter", 0.10), th.get("secretion", 0.20), th.get("dual_origin", 0.25))
                print(f"⚙️ Llindars carregats de decision_config.json: {thresholds}")

    # Comptadors de mètriques
    total = len(samples)
    y_true_sla, y_pred_sla = [], []
    y_true_sec, y_pred_sec = [], []
    y_true_dua, y_pred_dua = [], []

    hard_vegan_total = 0
    hard_vegan_false_positives = 0 # Vegans marcats erròniament com a no-vegans

    trace_vegan_total = 0
    trace_vegan_degraded = 0 # Vegans amb traces marcats erròniament com a no-vegans

    fatal_moral_errors = [] # Carn predita com a 100% vegana!

    latencies = []

    # Importem el normalitzador de la Fase 1
    sys.path.insert(0, str(Path(__file__).parent))
    from ingredient_normalizer import normalize_ingredient_text

    for s in samples:
        text = s["text"]
        true_sla = s["has_slaughter"]
        true_sec = s["has_secretion"]
        true_dua = s["has_dual_origin"]

        t0 = time.perf_counter()

        if use_normalizer:
            text, _ = normalize_ingredient_text(text)

        if model_type == "regex":
            p_sla, p_sec, p_dua = evaluate_regex(text)
        elif model_type == "onnx":
            enc = tokenizer(text, truncation=True, max_length=96, padding="max_length", return_tensors="np")
            inputs = {
                "input_ids": enc["input_ids"].astype(np.int64),
                "attention_mask": enc["attention_mask"].astype(np.int64),
            }
            outputs = onnx_session.run(None, inputs)
            logits = outputs[0][0]
            probs = 1.0 / (1.0 + np.exp(-logits))
            p_sla = 1 if probs[0] >= thresholds[0] else 0
            p_sec = 1 if probs[1] >= thresholds[1] else 0
            p_dua = 1 if probs[2] >= thresholds[2] else 0
        else:
            raise ValueError(f"Model no suportat: {model_type}")

        elapsed_ms = (time.perf_counter() - t0) * 1000
        latencies.append(elapsed_ms)

        y_true_sla.append(true_sla)
        y_pred_sla.append(p_sla)
        y_true_sec.append(true_sec)
        y_pred_sec.append(p_sec)
        y_true_dua.append(true_dua)
        y_pred_dua.append(p_dua)

        # 1. Comprovació de Fals Vegà Moral Fatal (Carn real predita com a [0, 0, 0])
        if true_sla == 1 and p_sla == 0 and p_sec == 0 and p_dua == 0:
            fatal_moral_errors.append((s["entity_id"], text, s["language"]))

        # 2. Hard Negatives: era 100% vegà (hard_vegan), el model diu que no és vegà?
        if s["category"] == "hard_vegan":
            hard_vegan_total += 1
            if p_sla == 1 or p_sec == 1:
                hard_vegan_false_positives += 1

        # 3. Traces: era vegà amb traces, el model l'ha degradat a no-vegà?
        if s["category"] == "trace_vegan":
            trace_vegan_total += 1
            if p_sla == 1 or p_sec == 1:
                trace_vegan_degraded += 1

    # Càlcul de mètriques
    def calc_metrics(y_t, y_p):
        y_t = np.array(y_t)
        y_p = np.array(y_p)
        tp = np.sum((y_p == 1) & (y_t == 1))
        fp = np.sum((y_p == 1) & (y_t == 0))
        fn = np.sum((y_p == 0) & (y_t == 1))
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0
        return prec, rec, f1, int(np.sum(y_t))

    p_sla_m, r_sla_m, f1_sla_m, sup_sla = calc_metrics(y_true_sla, y_pred_sla)
    p_sec_m, r_sec_m, f1_sec_m, sup_sec = calc_metrics(y_true_sec, y_pred_sec)
    p_dua_m, r_dua_m, f1_dua_m, sup_dua = calc_metrics(y_true_dua, y_pred_dua)

    # Resultats
    print("📊 RESULTATS REALS SOBRE EL GOLDEN TEST SET:")
    print("-" * 80)
    print(f"{'Atribut':<35} | {'Precisió':<10} | {'Recall':<10} | {'F1-Score':<10} | {'Suport'}")
    print("-" * 80)
    print(f"{'Carn / Escorxador (has_slaughter)':<35} | {p_sla_m*100:>8.2f}% | {r_sla_m*100:>8.2f}% | {f1_sla_m*100:>8.2f}% | {sup_sla:>6}")
    print(f"{'Secrecions Animals (has_secretion)':<35} | {p_sec_m*100:>8.2f}% | {r_sec_m*100:>8.2f}% | {f1_sec_m*100:>8.2f}% | {sup_sec:>6}")
    print(f"{'Additius Dubtosos (has_dual_origin)':<35} | {p_dua_m*100:>8.2f}% | {r_dua_m*100:>8.2f}% | {f1_dua_m*100:>8.2f}% | {sup_dua:>6}")
    print("-" * 80)

    print("\n🎯 AUDITORIA ÈTICA I DE ROBUSTESA:")
    print(f"   🚨 Falsos Vegans Morals (Carn venuda com a vegana): {len(fatal_moral_errors)} errors (Meta: 0)")
    if fatal_moral_errors:
        print("      ⚠️ Exemples d'errors fatals:")
        for eid, txt, lang in fatal_moral_errors[:3]:
            print(f"         - [{lang}] {txt[:70]}...")

    hard_neg_acc = ((hard_vegan_total - hard_vegan_false_positives) / hard_vegan_total * 100) if hard_vegan_total > 0 else 0
    print(f"   🛡️ Robustesa Falsos Amics ('mantega de cacau', etc.): {hard_neg_acc:.1f}% encerts ({hard_vegan_false_positives}/{hard_vegan_total} falsos positius)")

    trace_immunity = ((trace_vegan_total - trace_vegan_degraded) / trace_vegan_total * 100) if trace_vegan_total > 0 else 0
    print(f"   🌾 Immunitat a Traces Precautòries: {trace_immunity:.1f}% ({trace_vegan_degraded}/{trace_vegan_total} degradats erròniament)")

    p50 = np.percentile(latencies, 50)
    p95 = np.percentile(latencies, 95)
    print(f"\n⚡ LATÈNCIA EN CPU: p50={p50:.2f}ms | p95={p95:.2f}ms")
    print("=" * 80)

if __name__ == "__main__":
    mtype = "regex"
    mpath = None
    normalize = True
    for arg in sys.argv[1:]:
        if arg.startswith("--model="):
            mtype = arg.split("=")[1]
        elif arg.startswith("--onnx="):
            mpath = arg.split("=")[1]
        elif arg in ("--no-normalize", "--raw"):
            normalize = False
        elif arg == "--normalize":
            normalize = True

    run_evaluation(mtype, mpath, use_normalizer=normalize)
