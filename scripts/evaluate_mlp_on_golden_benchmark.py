"""
Avaluació de l'arquitectura MLP (amb i sense Tier 2 Taxonomy) sobre el Golden Benchmark Set (182 productes reals).
"""
import json
import time
import random
import re
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn
from sentence_transformers import SentenceTransformer

ROOT_DIR = Path(__file__).resolve().parent.parent
BENCHMARK_FILE = ROOT_DIR / "data" / "dataset" / "benchmark" / "golden_test_set.jsonl"
TAXONOMY_FILE = ROOT_DIR / "packages" / "domain" / "src" / "data" / "taxonomy.json"
DATA_FILE = ROOT_DIR / "data" / "dataset" / "real" / "real_ingredients_clean.jsonl"

CORE_LANGS = {'ca', 'es', 'en', 'de', 'fr', 'it', 'mul'}
LABEL_MAP = {
    "vegan": 0,
    "vegetarian": 1,
    "non_vegetarian": 2,
    "ambiguous": 3,
}
INV_LABEL_MAP = {v: k for k, v in LABEL_MAP.items()}

# 1. BANC DE HARD NEGATIVES I PARELLES MÍNIMES MULTILINGÜES
HARD_NEGATIVES = [
    # Falsos amics vegetals (porten paraules d'origen animal però són 100% vegetals)
    ("mantega de cacau", "vegan"),
    ("manteca de cacao", "vegan"),
    ("cocoa butter", "vegan"),
    ("beurre de cacao", "vegan"),
    ("Kakaobutter", "vegan"),
    ("burro di cacao", "vegan"),
    
    ("mantega de cacauet", "vegan"),
    ("mantequilla de cacahuete", "vegan"),
    ("peanut butter", "vegan"),
    ("beurre de cacahuète", "vegan"),
    ("Erdnussbutter", "vegan"),
    ("burro di arachidi", "vegan"),
    
    ("mantega de karité", "vegan"),
    ("manteca de karité", "vegan"),
    ("shea butter", "vegan"),
    ("beurre de karité", "vegan"),
    
    ("llet d'ametlles", "vegan"),
    ("leche de almendras", "vegan"),
    ("almond milk", "vegan"),
    ("lait d'amande", "vegan"),
    ("Mandelmilch", "vegan"),
    ("latte di mandorla", "vegan"),
    
    ("llet de civada", "vegan"),
    ("leche de avena", "vegan"),
    ("oat milk", "vegan"),
    ("lait d'avoine", "vegan"),
    ("Hafermilch", "vegan"),
    ("Haferdrink", "vegan"),
    ("latte d'avena", "vegan"),
    
    ("llet de soja", "vegan"),
    ("leche de soja", "vegan"),
    ("soya milk", "vegan"),
    ("lait de soja", "vegan"),
    ("Sojamilch", "vegan"),
    ("Sojadrink", "vegan"),
    ("latte di soia", "vegan"),
    
    ("llet de coco", "vegan"),
    ("leche de coco", "vegan"),
    ("coconut milk", "vegan"),
    ("lait de coco", "vegan"),
    ("Kokosmilch", "vegan"),
    ("Kokosdrink", "vegan"),
    ("Reismilch", "vegan"),
    ("Reisdrink", "vegan"),
    ("Mandeldrink", "vegan"),
    ("Pflanzenmilch", "vegan"),
    ("pflanzliche Milch", "vegan"),
    
    ("formatge vegà", "vegan"),
    ("queso vegano", "vegan"),
    ("vegan cheese", "vegan"),
    ("fromage végétal", "vegan"),
    ("fromage végétal de coco", "vegan"),
    ("veganer Käse", "vegan"),
    
    ("carn vegetal", "vegan"),
    ("carn de soja", "vegan"),
    ("carne vegetal", "vegan"),
    ("carne vegetal a base de soja", "vegan"),
    ("carne de soja", "vegan"),
    ("plant-based meat", "vegan"),
    ("viande végétale", "vegan"),
    ("Pflanzenfleisch", "vegan"),
    ("Sojafleisch", "vegan"),
    
    ("hamburguesa vegetal", "vegan"),
    ("hamburguesa de tofu", "vegan"),
    ("veggie burger", "vegan"),
    ("tofu burger", "vegan"),
    ("salsitxa vegana", "vegan"),
    ("salchicha vegana", "vegan"),
    ("vegan sausage", "vegan"),
    
    ("lecitina de soja", "vegan"),
    ("lecitina de girasol", "vegan"),
    ("soy lecithin", "vegan"),
    ("sunflower lecithin", "vegan"),
    ("lécithine de soja", "vegan"),
    ("Sonnenblumenlecithin", "vegan"),
    
    ("carbonat de calci", "vegan"),
    ("carbonato de calcio", "vegan"),
    ("calcium carbonate", "vegan"),
    ("carbonate de calcium", "vegan"),
    ("proteïna de pèsol", "vegan"),
    ("proteína de guisante", "vegan"),
    ("pea protein", "vegan"),
    
    # Contraparts reals d'origen animal (Lactis i Ous)
    ("mantega de vaca", "vegetarian"),
    ("mantega tradicional", "vegetarian"),
    ("mantequilla de vaca", "vegetarian"),
    ("dairy butter", "vegetarian"),
    ("beurre laitier", "vegetarian"),
    ("Butter", "vegetarian"),
    ("burro", "vegetarian"),
    
    ("llet de vaca", "vegetarian"),
    ("llet sencera", "vegetarian"),
    ("leche entera", "vegetarian"),
    ("leche pasteurizada", "vegetarian"),
    ("whole milk", "vegetarian"),
    ("cow milk", "vegetarian"),
    ("lait de vache", "vegetarian"),
    ("Kuhmilch", "vegetarian"),
    ("Vollmilch", "vegetarian"),
    ("latte vaccino", "vegetarian"),
    
    ("fromage de chèvre", "vegetarian"),
    ("queso de cabra", "vegetarian"),
    ("goat cheese", "vegetarian"),
    ("queso manchego", "vegetarian"),
    ("Parmigiano Reggiano", "vegetarian"),
    
    ("caseinat de calci", "vegetarian"),
    ("caseinato de calcio", "vegetarian"),
    ("calcium caseinate", "vegetarian"),
    ("caseinate de calcium", "vegetarian"),
    ("caseïna de llet", "vegetarian"),
    ("caseína láctea", "vegetarian"),
    ("milk casein", "vegetarian"),
    
    ("sèrum de llet en pols", "vegetarian"),
    ("suero de leche en polvo", "vegetarian"),
    ("whey protein powder", "vegetarian"),
    ("lactosérum en poudre", "vegetarian"),
    ("Molkeneiweiß", "vegetarian"),
    
    ("clara d'ou", "vegetarian"),
    ("clara de huevo pasteurizada", "vegetarian"),
    ("egg white", "vegetarian"),
    ("blanc d'œuf", "vegetarian"),
    ("Hühnereiweiß", "vegetarian"),
    ("albumina d'ou", "vegetarian"),
    ("ovoalbúmina", "vegetarian"),
    
    # Contraparts d'Escorxador (Carn / Grassa animal / Peix / Coagulants)
    ("mantega de porc", "non_vegetarian"),
    ("manteca de cerdo", "non_vegetarian"),
    ("pork lard", "non_vegetarian"),
    ("saindoux", "non_vegetarian"),
    ("Schweineschmalz", "non_vegetarian"),
    ("Rinderfett", "non_vegetarian"),
    ("grasa bovina", "non_vegetarian"),
    ("beef tallow", "non_vegetarian"),
    
    ("carn de bou", "non_vegetarian"),
    ("carn de vedella", "non_vegetarian"),
    ("carne picada de vacuno", "non_vegetarian"),
    ("ground beef", "non_vegetarian"),
    ("viande de bœuf", "non_vegetarian"),
    ("Rindfleisch", "non_vegetarian"),
    ("carne bovina", "non_vegetarian"),
    
    ("gelatina de porc", "non_vegetarian"),
    ("gelatina de cerdo", "non_vegetarian"),
    ("pork gelatin", "non_vegetarian"),
    ("gélatine de porc", "non_vegetarian"),
    ("Schweinegelatine", "non_vegetarian"),
    
    ("carmí de cotxinilla (E120)", "non_vegetarian"),
    ("carmín de cochinilla", "non_vegetarian"),
    ("cochineal carmine", "non_vegetarian"),
    ("carmin de cochenille", "non_vegetarian"),
    ("E120", "non_vegetarian"),
    
    ("hígado graso de pato", "non_vegetarian"),
    ("foie gras de canard", "non_vegetarian"),
    ("anchovy extract", "non_vegetarian"),
    ("extracto de anchoa", "non_vegetarian"),
    ("sang de porc", "non_vegetarian"),
    ("sangre de cerdo", "non_vegetarian"),
    
    # Additius d'origen dual / dubtós
    ("emulgent E471", "ambiguous"),
    ("emulsionante E471", "ambiguous"),
    ("mono y diglicéridos de ácidos grasos", "ambiguous"),
    ("mono- and diglycerides of fatty acids", "ambiguous"),
    ("mono- et diglycérides d'acides gras", "ambiguous"),
    ("Mono- und Diglyceride von Speisefettsäuren", "ambiguous"),
    ("stearic acid", "ambiguous"),
    ("ácido esteárico", "ambiguous"),
    ("acide stéarique", "ambiguous"),
    ("glicerina", "ambiguous"),
    ("glycerin", "ambiguous"),
    ("lecitina", "ambiguous"),
    ("lecithin", "ambiguous"),
]

# 2. Carregar dades reals equilibrades + Hard Negatives
samples_by_class = {c: [] for c in LABEL_MAP}
with open(DATA_FILE, "r", encoding="utf-8") as f:
    for line in f:
        if line.strip():
            s = json.loads(line)
            if s.get("language") in CORE_LANGS and s.get("diet_status") in LABEL_MAP:
                samples_by_class[s["diet_status"]].append(s["text"])

random.seed(42)
SAMPLES_PER_CLASS = 1000
all_texts = []
all_labels = []

for c, lst in samples_by_class.items():
    chosen = random.sample(lst, min(SAMPLES_PER_CLASS, len(lst)))
    for txt in chosen:
        all_texts.append(txt)
        all_labels.append(LABEL_MAP[c])

for _ in range(4):
    for txt, label_str in HARD_NEGATIVES:
        all_texts.append(txt)
        all_labels.append(LABEL_MAP[label_str])

print(f"📦 Dataset d'entrenament preparat ({len(all_texts)} mostres)")

# 3. Model MLP
class IngredientMLP(nn.Module):
    def __init__(self, in_features=384, hidden=128, out_classes=4):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_features, hidden),
            nn.BatchNorm1d(hidden),
            nn.ReLU(),
            nn.Dropout(0.25),
            nn.Linear(hidden, 64),
            nn.ReLU(),
            nn.Dropout(0.15),
            nn.Linear(64, out_classes)
        )
    def forward(self, x):
        return self.net(x)

MODEL_ID = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
embedder = SentenceTransformer(MODEL_ID)

print(f"⚡ Extracció d'embeddings de train ({len(all_texts)} mostres)...")
X_train = embedder.encode(all_texts, batch_size=64, show_progress_bar=False, convert_to_numpy=True)
y_train = np.array(all_labels)

mlp = IngredientMLP()
optimizer = torch.optim.AdamW(mlp.parameters(), lr=1e-3, weight_decay=1e-4)
criterion = nn.CrossEntropyLoss()

dataset = torch.utils.data.TensorDataset(torch.tensor(X_train, dtype=torch.float32), torch.tensor(y_train, dtype=torch.long))
loader = torch.utils.data.DataLoader(dataset, batch_size=64, shuffle=True)

mlp.train()
for epoch in range(25):
    for bx, by in loader:
        optimizer.zero_grad()
        loss = criterion(mlp(bx), by)
        loss.backward()
        optimizer.step()
mlp.eval()
print("✅ MLP entrenat amb èxit!")

# 4. Carregar la Taxonomia Tier 2 correctament
taxonomy_index = {}
if TAXONOMY_FILE.exists():
    with open(TAXONOMY_FILE, "r", encoding="utf-8") as f:
        tax_data = json.load(f)
        entities = tax_data.get("entities", [])
        aliases = tax_data.get("aliases", {})
        for alias_text, ent_idx in aliases.items():
            if 0 <= ent_idx < len(entities):
                taxonomy_index[alias_text.lower().strip()] = entities[ent_idx]["status"]
        for ent in entities:
            if "name" in ent and isinstance(ent["name"], str):
                taxonomy_index[ent["name"].lower().strip()] = ent["status"]
            if "id" in ent and isinstance(ent["id"], str):
                clean_id = ent["id"].split(":")[-1].lower()
                taxonomy_index[clean_id] = ent["status"]

print(f"🏛️ Taxonomia Tier 2 carregada ({len(taxonomy_index)} termes indexats)")

# 5. Segmentador
def split_ingredients(text: str) -> list[str]:
    cleaned = re.sub(r"(?:pot contenir|puede contener|may contain|kann spuren enthalten|peut contenir)[^,;.]*", " ", text, flags=re.IGNORECASE)
    parts = re.split(r"[,;:\n\r\(\)]+", cleaned)
    res = []
    for p in parts:
        clean_p = p.strip(" .•-–—\t\"'")
        clean_p = re.sub(r"\b\d+(?:[\.,]\d+)?\s*%\b", "", clean_p).strip()
        if len(clean_p) >= 2 and not clean_p.isdigit():
            res.append(clean_p)
    return res if res else [cleaned.strip()]

# 6. Classificador d'un token
def classify_token(token: str, use_tier2: bool = True):
    t_lower = token.lower().strip()
    if use_tier2 and t_lower in taxonomy_index:
        status = taxonomy_index[t_lower]
        if status in ("vegan", "vegetarian", "non_vegetarian", "ambiguous"):
            return status, 1.0, "tier2_taxonomy"
    
    # Tier 3: MLP
    emb = embedder.encode([token], convert_to_numpy=True)
    with torch.no_grad():
        logits = mlp(torch.tensor(emb, dtype=torch.float32))
        probs = torch.softmax(logits, dim=-1).numpy()[0]
        idx = int(np.argmax(probs))
        return INV_LABEL_MAP[idx], float(probs[idx]), "tier3_mlp"

# 7. Avaluació
def run_evaluation(use_tier2: bool = True):
    samples = []
    with open(BENCHMARK_FILE, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                samples.append(json.loads(line))

    y_true_sla, y_pred_sla = [], []
    y_true_sec, y_pred_sec = [], []
    y_true_dua, y_pred_dua = [], []
    
    fatal_errors = []
    hard_vegan_total = 0
    hard_vegan_fps = 0
    trace_vegan_total = 0
    trace_vegan_fps = 0
    latencies = []
    tier2_matches = 0
    tier3_calls = 0

    for s in samples:
        text = s["text"]
        true_sla = s["has_slaughter"]
        true_sec = s["has_secretion"]
        true_dua = s["has_dual_origin"]

        t0 = time.perf_counter()
        tokens = split_ingredients(text)
        
        p_sla, p_sec, p_dua = 0, 0, 0
        for tok in tokens:
            pred_class, conf, origin = classify_token(tok, use_tier2=use_tier2)
            if origin == "tier2_taxonomy":
                tier2_matches += 1
            else:
                tier3_calls += 1
                
            if pred_class == "non_vegetarian":
                p_sla = 1
            elif pred_class == "vegetarian":
                p_sec = 1
            elif pred_class == "ambiguous":
                p_dua = 1

        elapsed = (time.perf_counter() - t0) * 1000
        latencies.append(elapsed)

        y_true_sla.append(true_sla)
        y_pred_sla.append(p_sla)
        y_true_sec.append(true_sec)
        y_pred_sec.append(p_sec)
        y_true_dua.append(true_dua)
        y_pred_dua.append(p_dua)

        if true_sla == 1 and p_sla == 0 and p_sec == 0 and p_dua == 0:
            fatal_errors.append((s["entity_id"], text, s.get("language", "unknown")))

        if s.get("category") == "hard_vegan":
            hard_vegan_total += 1
            if p_sla == 1 or p_sec == 1:
                hard_vegan_fps += 1

        if s.get("category") == "trace_vegan":
            trace_vegan_total += 1
            if p_sla == 1 or p_sec == 1:
                trace_vegan_fps += 1

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

    name = "HÍBRID: Tier 2 (Taxonomia) + Tier 3 (MLP)" if use_tier2 else "PUR TIER 3 (MLP sol sobre tots els tokens)"
    print("\n" + "=" * 80)
    print(f"📊 RENDIMENT SOBRE GOLDEN BENCHMARK (182 PRODUCTES) — {name}")
    print("=" * 80)
    print(f"{'Atribut':<35} | {'Precisió':<10} | {'Recall':<10} | {'F1-Score':<10} | {'Suport'}")
    print("-" * 80)
    print(f"{'Carn / Escorxador (has_slaughter)':<35} | {p_sla*100:>8.2f}% | {r_sla*100:>8.2f}% | {f1_sla*100:>8.2f}% | {sup_sla:>6}")
    print(f"{'Secrecions Animals (has_secretion)':<35} | {p_sec*100:>8.2f}% | {r_sec*100:>8.2f}% | {f1_sec*100:>8.2f}% | {sup_sec:>6}")
    print(f"{'Additius Dubtosos (has_dual_origin)':<35} | {p_dua*100:>8.2f}% | {r_dua*100:>8.2f}% | {f1_dua*100:>8.2f}% | {sup_dua:>6}")
    print("-" * 80)
    print(f"🚨 Falsos Vegans Morals (Carn -> Vegà): {len(fatal_errors)} errors (Meta: 0)")
    if fatal_errors:
        for eid, txt, lang in fatal_errors[:3]:
            print(f"   - [{lang}] {txt[:70]}...")
    
    hard_acc = ((hard_vegan_total - hard_vegan_fps) / hard_vegan_total * 100) if hard_vegan_total > 0 else 0
    print(f"🛡️ Robustesa Falsos Amics: {hard_acc:.1f}% ({hard_vegan_total - hard_vegan_fps}/{hard_vegan_total})")
    
    trace_acc = ((trace_vegan_total - trace_vegan_fps) / trace_vegan_total * 100) if trace_vegan_total > 0 else 0
    print(f"🌾 Immunitat a Traces: {trace_acc:.1f}% ({trace_vegan_total - trace_vegan_fps}/{trace_vegan_total})")
    
    total_tokens = tier2_matches + tier3_calls
    if total_tokens > 0:
        print(f"🧩 Cobertura: {tier2_matches}/{total_tokens} tokens resolts per Taxonomia Tier 2 ({tier2_matches/total_tokens*100:.1f}%), {tier3_calls} per MLP Tier 3")
        
    p50 = np.percentile(latencies, 50)
    p95 = np.percentile(latencies, 95)
    print(f"⚡ Latència per producte complet: p50={p50:.1f}ms | p95={p95:.1f}ms")
    print("=" * 80)

if __name__ == "__main__":
    print("\n🔬 [Test 1] Avaluació Híbrida: Taxonomia Tier 2 + MLP Tier 3...")
    run_evaluation(use_tier2=True)
    print("\n🔬 [Test 2] Avaluació Pura: Només MLP Tier 3...")
    run_evaluation(use_tier2=False)
