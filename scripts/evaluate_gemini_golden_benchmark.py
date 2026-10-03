"""
Avaluació de Gemini 3.1 Flash Lite sobre el Golden Benchmark complet (182 productes reals).
Utilitza batching de 20 productes per crida per optimitzar latència i no saturar límits d'API.
"""
import os
import json
import time
from pathlib import Path
import numpy as np
from dotenv import load_dotenv
load_dotenv(".env")
from google import genai

ROOT_DIR = Path(__file__).resolve().parent.parent
BENCHMARK_FILE = ROOT_DIR / "data" / "dataset" / "benchmark" / "golden_test_set.jsonl"

api_key = os.environ.get("GEMINI_API_KEY")
model_name = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite")
client = genai.Client(api_key=api_key)

samples = []
with open(BENCHMARK_FILE, "r", encoding="utf-8") as f:
    for line in f:
        if line.strip():
            samples.append(json.loads(line))

print(f"📦 Carregats {len(samples)} productes del Golden Benchmark.")
print(f"🚀 Avaluant amb {model_name} en blocs de 20 productes...")

BATCH_SIZE = 20
y_true_sla, y_pred_sla = [], []
y_true_sec, y_pred_sec = [], []
y_true_dua, y_pred_dua = [], []

fatal_errors = []
hard_vegan_total = 0
hard_vegan_fps = 0
trace_vegan_total = 0
trace_vegan_fps = 0
latencies = []

prompt_template = """Ets un auditor ètic expert en etiquetatge alimentari i dietes veganes/vegetarianes.
Analitza cadascun dels productes següents basant-te en la seva llista d'ingredients (ignora les traces precautòries com 'pot contenir traces de...').
Per a cada producte, avalua exactament aquests 3 atributs binaris (1 = present com a ingredient real, 0 = absent):
- has_slaughter: 1 si conté carn, aviram, peix, marisc, gelatina animal, carmí E120, quall animal.
- has_secretion: 1 si conté llet, formatge, mantega animal, sèrum lacti, caseïna, ou, clara, rovell, mel, cera d'abella.
- has_dual_origin: 1 si conté additius d'origen dubtós (E471, mono i diglicèrids, àcid esteàric, etc.) que requereixen confirmació del fabricant.

ATENCIÓ:
- Els falsos amics vegetals (mantega de cacau, crema de cacauet, llet d'ametlles, carn vegetal) són 100% vegetals: NO posis has_slaughter=1 ni has_secretion=1!
- Les traces precautòries ('kann spuren von milch enthalten', 'puede contener trazas de huevo') NO són ingredients del producte: NO les comptis!

Retorna un array JSON exacte d'objectes:
[{"id": "...", "has_slaughter": 0|1, "has_secretion": 0|1, "has_dual_origin": 0|1, "verdict": "vegan"|"vegetarian"|"non_vegetarian"|"ambiguous"}]

Productes a analitzar:
"""

t_start_total = time.time()

for b_idx in range(0, len(samples), BATCH_SIZE):
    batch = samples[b_idx:b_idx + BATCH_SIZE]
    batch_prompt = prompt_template + "\n".join([
        f"- ID: {s['entity_id']}\n  Text: {s['text']}" for s in batch
    ])
    
    t0 = time.time()
    try:
        resp = client.models.generate_content(
            model=model_name,
            contents=batch_prompt,
            config={"response_mime_type": "application/json"}
        )
        batch_preds = json.loads(resp.text)
        pred_map = {item.get("id"): item for item in batch_preds if isinstance(item, dict)}
    except Exception as e:
        print(f"⚠️ Error al bloc {b_idx//BATCH_SIZE + 1}: {e}")
        pred_map = {}
        time.sleep(2)

    elapsed_batch = time.time() - t0
    lat_per_prod = elapsed_batch / len(batch) * 1000

    for s in batch:
        eid = s["entity_id"]
        true_sla = s["has_slaughter"]
        true_sec = s["has_secretion"]
        true_dua = s["has_dual_origin"]

        pred_obj = pred_map.get(eid, {})
        p_sla = int(pred_obj.get("has_slaughter", 0))
        p_sec = int(pred_obj.get("has_secretion", 0))
        p_dua = int(pred_obj.get("has_dual_origin", 0))

        latencies.append(lat_per_prod)
        y_true_sla.append(true_sla)
        y_pred_sla.append(p_sla)
        y_true_sec.append(true_sec)
        y_pred_sec.append(p_sec)
        y_true_dua.append(true_dua)
        y_pred_dua.append(p_dua)

        if true_sla == 1 and p_sla == 0 and p_sec == 0 and p_dua == 0:
            fatal_errors.append((eid, s["text"], s.get("language", "unknown")))

        if s.get("category") == "hard_vegan":
            hard_vegan_total += 1
            if p_sla == 1 or p_sec == 1:
                hard_vegan_fps += 1

        if s.get("category") == "trace_vegan":
            trace_vegan_total += 1
            if p_sla == 1 or p_sec == 1:
                trace_vegan_fps += 1

    print(f"Bloc {b_idx//BATCH_SIZE + 1}/{(len(samples)+BATCH_SIZE-1)//BATCH_SIZE} completat ({elapsed_batch:.2f}s, {lat_per_prod:.0f}ms/prod)")
    time.sleep(1) # Petit cooldown per respectar rate limits

total_time = time.time() - t_start_total

def metrics(yt, yp):
    yt, yp = np.array(yt), np.array(yp)
    tp = np.sum((yp == 1) & (yt == 1))
    fp = np.sum((yp == 1) & (yt == 0))
    fn = np.sum((yp == 0) & (yt == 1))
    prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0
    return prec, rec, f1, int(np.sum(yt))

p_sla, r_sla, f1_sla, sup_sla = metrics(y_true_sla, y_pred_sla)
p_sec, r_sec, f1_sec, sup_sec = metrics(y_true_sec, y_pred_sec)
p_dua, r_dua, f1_dua, sup_dua = metrics(y_true_dua, y_pred_dua)

print("\n" + "=" * 80)
print(f"📊 RENDIMENT DE {model_name} SOBRE EL GOLDEN BENCHMARK (182 PRODUCTES)")
print("=" * 80)
print(f"{'Atribut':<35} | {'Precisió':<10} | {'Recall':<10} | {'F1-Score':<10} | {'Suport'}")
print("-" * 80)
print(f"{'Carn / Escorxador (has_slaughter)':<35} | {p_sla*100:>8.2f}% | {r_sla*100:>8.2f}% | {f1_sla*100:>8.2f}% | {sup_sla:>6}")
print(f"{'Secrecions Animals (has_secretion)':<35} | {p_sec*100:>8.2f}% | {r_sec*100:>8.2f}% | {f1_sec*100:>8.2f}% | {sup_sec:>6}")
print(f"{'Additius Dubtosos (has_dual_origin)':<35} | {p_dua*100:>8.2f}% | {r_dua*100:>8.2f}% | {f1_dua*100:>8.2f}% | {sup_dua:>6}")
print("-" * 80)
print(f"🚨 Falsos Vegans Morals (Carn venuda com a vegana): {len(fatal_errors)} errors (Meta: 0)")
if fatal_errors:
    for eid, txt, lang in fatal_errors:
        print(f"   - [{lang}] {txt[:70]}...")

hard_acc = ((hard_vegan_total - hard_vegan_fps) / hard_vegan_total * 100) if hard_vegan_total > 0 else 0
print(f"🛡️ Robustesa Falsos Amics ('mantega de cacau', etc.): {hard_acc:.1f}% ({hard_vegan_total - hard_vegan_fps}/{hard_vegan_total})")

trace_acc = ((trace_vegan_total - trace_vegan_fps) / trace_vegan_total * 100) if trace_vegan_total > 0 else 0
print(f"🌾 Immunitat a Traces Precautòries: {trace_acc:.1f}% ({trace_vegan_total - trace_vegan_fps}/{trace_vegan_total})")

p50 = np.percentile(latencies, 50)
p95 = np.percentile(latencies, 95)
print(f"⚡ Latència API per producte: p50={p50:.1f}ms | p95={p95:.1f}ms (Temps total: {total_time:.1f}s)")
print("=" * 80)
