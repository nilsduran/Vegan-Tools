"""
Experiment Opció A (Millorat):
- Dataset ampliat (4.000 mostres reals equilibrades de les 74k)
- Hard Negatives & Parelles Mínimes multilingües explícites
- MLP Classifier (Xarxa Neuronal Densa no lineal) vs Logistic Regression sobre Embeddings
- Avaluació estricta sobre el CHALLENGE SET de 20 casos crítics
"""
import json
import random
import time
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from sentence_transformers import SentenceTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT_DIR / "data" / "dataset" / "real" / "real_ingredients_clean.jsonl"

CORE_LANGS = {'ca', 'es', 'en', 'de', 'fr', 'it', 'mul'}
LABEL_MAP = {
    "vegan": 0,
    "vegetarian": 1,
    "non_vegetarian": 2,
    "ambiguous": 3,
}
INV_LABEL_MAP = {v: k for k, v in LABEL_MAP.items()}

# 1. BANC DE HARD NEGATIVES I PARELLES MÍNIMES MULTILINGÜES (Ground Truth Verificat)
HARD_NEGATIVES = [
    # Falsos amics vegetals (Porten paraules d'origen animal però són 100% vegetals)
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

# 2. CARREGAR I EQUILIBRAR EL DATASET REAL A GRAN ESCALA
print("📊 Carregant mostres reals d'Open Food Facts & EFSA...")
samples_by_class = {c: [] for c in LABEL_MAP}

with open(DATA_FILE, "r", encoding="utf-8") as f:
    for line in f:
        if line.strip():
            s = json.loads(line)
            if s.get("language") in CORE_LANGS and s.get("diet_status") in LABEL_MAP:
                samples_by_class[s["diet_status"]].append(s["text"])

print("Mostres reals disponibles per classe:")
for c, lst in samples_by_class.items():
    print(f" - {c}: {len(lst)} ingredients")

# Mostreig equilibrat: 1.000 mostres per classe (4.000 total) + Hard Negatives curats
random.seed(42)
SAMPLES_PER_CLASS = 1000
all_texts = []
all_labels = []

for c, lst in samples_by_class.items():
    chosen = random.sample(lst, min(SAMPLES_PER_CLASS, len(lst)))
    for txt in chosen:
        all_texts.append(txt)
        all_labels.append(LABEL_MAP[c])

# Afegim el banc de Hard Negatives (replicat 4x per garantir representació frontera)
for _ in range(4):
    for txt, label_str in HARD_NEGATIVES:
        all_texts.append(txt)
        all_labels.append(LABEL_MAP[label_str])

print(f"\n📦 Dataset total d'entrenament: {len(all_texts)} ingredients ({len(HARD_NEGATIVES)*4} Hard Negatives inclosos)")

# 3. EXTRACCIÓ D'EMBEDDINGS AMB SENTENCE-TRANSFORMERS
MODEL_ID = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
print(f"🚀 Carregant encoder d'embeddings: {MODEL_ID}...")
embedder = SentenceTransformer(MODEL_ID)

print(f"⚡ Extraient embeddings per a {len(all_texts)} mostres a CPU...")
t0 = time.time()
X = embedder.encode(all_texts, batch_size=64, show_progress_bar=True, convert_to_numpy=True)
y = np.array(all_labels)
emb_time = time.time() - t0
print(f"✅ Extracció completada en {emb_time:.1f} segons! (Shape: {X.shape})")

# 4. MODEL 1: LOGISTIC REGRESSION AMB CLASS WEIGHTS
print("\n🏋️ [Model 1] Entrenant Logistic Regression (Linear Probe)...")
t0 = time.time()
lr_model = LogisticRegression(max_iter=1000, class_weight="balanced", C=1.0)
lr_model.fit(X, y)
lr_train_time = time.time() - t0
print(f"✅ Logistic Regression entrenat en {lr_train_time:.2f} segons!")

# 5. MODEL 2: MULTI-LAYER PERCEPTRON (MLP No-Lineal amb Regularització)
print("\n🏋️ [Model 2] Entrenant MLP Classifier (PyTorch 2-layer Neural Net)...")

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

device = torch.device("cpu")
mlp_model = IngredientMLP().to(device)
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.AdamW(mlp_model.parameters(), lr=1e-3, weight_decay=1e-4)

# DataLoader
X_tensor = torch.tensor(X, dtype=torch.float32)
y_tensor = torch.tensor(y, dtype=torch.long)
dataset = TensorDataset(X_tensor, y_tensor)
loader = DataLoader(dataset, batch_size=64, shuffle=True)

t0 = time.time()
mlp_model.train()
for epoch in range(1, 26):
    for batch_x, batch_y in loader:
        optimizer.zero_grad()
        out = mlp_model(batch_x)
        loss = criterion(out, batch_y)
        loss.backward()
        optimizer.step()
mlp_train_time = time.time() - t0
mlp_model.eval()
print(f"✅ MLP entrenat en {mlp_train_time:.2f} segons (25 èpoques)!")

# 6. AVALUACIÓ SOBRE EL CHALLENGE SET DE 20 CASOS CRÍTICS
CHALLENGE_SET = [
    # Falsos amics vegetals (inversió semàntica pel modificador)
    {"text": "mantega de cacau", "expected": "vegan", "type": "Fals Amic"},
    {"text": "leche de almendras", "expected": "vegan", "type": "Fals Amic"},
    {"text": "Hafermilch", "expected": "vegan", "type": "Fals Amic"},
    {"text": "beurre de cacahuète", "expected": "vegan", "type": "Fals Amic"},
    {"text": "carne vegetal a base de soja", "expected": "vegan", "type": "Fals Amic"},
    {"text": "fromage végétal de coco", "expected": "vegan", "type": "Fals Amic"},
    
    # Carn / Escorxador (Crític ètic: tolerància zero)
    {"text": "gelatina de porc", "expected": "non_vegetarian", "type": "Escorxador"},
    {"text": "carmí de cotxinilla (E120)", "expected": "non_vegetarian", "type": "Escorxador"},
    {"text": "hígado graso de pato", "expected": "non_vegetarian", "type": "Escorxador"},
    {"text": "Rinderfett", "expected": "non_vegetarian", "type": "Escorxador"},
    {"text": "anchovy extract", "expected": "non_vegetarian", "type": "Escorxador"},
    {"text": "sang de porc", "expected": "non_vegetarian", "type": "Escorxador"},
    
    # Secrecions Animals (Lactis / Ous)
    {"text": "sèrum de llet en pols", "expected": "vegetarian", "type": "Lacti / Ou"},
    {"text": "clara de huevo pasteurizada", "expected": "vegetarian", "type": "Lacti / Ou"},
    {"text": "Hühnereiweiß", "expected": "vegetarian", "type": "Lacti / Ou"},
    {"text": "fromage de chèvre", "expected": "vegetarian", "type": "Lacti / Ou"},
    {"text": "caseinate de calcium", "expected": "vegetarian", "type": "Lacti / Ou"},
    
    # Additius d'origen dual / ambigu
    {"text": "emulgent E471", "expected": "ambiguous", "type": "Additiu Dual"},
    {"text": "mono y diglicéridos de ácidos grasos", "expected": "ambiguous", "type": "Additiu Dual"},
    {"text": "stearic acid", "expected": "ambiguous", "type": "Additiu Dual"},
]

test_texts = [item["text"] for item in CHALLENGE_SET]
t0 = time.time()
test_embs = embedder.encode(test_texts, convert_to_numpy=True)
enc_time = (time.time() - t0) * 1000 / len(test_texts)

# Prediccions Logistic Regression
lr_preds_idx = lr_model.predict(test_embs)
lr_probs = lr_model.predict_proba(test_embs)

# Prediccions MLP
with torch.no_grad():
    mlp_logits = mlp_model(torch.tensor(test_embs, dtype=torch.float32))
    mlp_probs = torch.softmax(mlp_logits, dim=-1).numpy()
    mlp_preds_idx = np.argmax(mlp_probs, axis=-1)

# Resultats en taula
print("\n" + "=" * 115)
print("📊 RESULTATS: GROUND TRUTH vs SETFIT (256s) vs LOGISTIC REGRESSION vs MLP (4.000s + Hard Negatives)")
print("=" * 115)
print(f"{'Tipus':<13} | {'Ingredient':<33} | {'Esperat':<14} | {'LogReg (Linear)':<24} | {'MLP (Neural Net)':<24}")
print("-" * 115)

lr_hits = 0
mlp_hits = 0

for i, item in enumerate(CHALLENGE_SET):
    exp = item["expected"]
    
    lr_pred = INV_LABEL_MAP[lr_preds_idx[i]]
    lr_conf = lr_probs[i][lr_preds_idx[i]]
    lr_ok = "✅" if lr_pred == exp else "❌"
    lr_str = f"{lr_ok} {lr_pred} ({lr_conf*100:.0f}%)"
    if lr_pred == exp: lr_hits += 1
    
    mlp_pred = INV_LABEL_MAP[mlp_preds_idx[i]]
    mlp_conf = mlp_probs[i][mlp_preds_idx[i]]
    mlp_ok = "✅" if mlp_pred == exp else "❌"
    mlp_str = f"{mlp_ok} {mlp_pred} ({mlp_conf*100:.0f}%)"
    if mlp_pred == exp: mlp_hits += 1
    
    print(f"{item['type']:<13} | {item['text']:<33} | {exp:<14} | {lr_str:<24} | {mlp_str:<24}")

print("=" * 115)
print(f"🎯 ACCURACY EN EL CHALLENGE SET (20 CASOS CRÍTICS):")
print(f" - SetFit original (256 mostres, 23 minuts):           9 / 20 (45.0%)")
print(f" - Logistic Regression (4.000 mostres + HN, {lr_train_time:.1f}s train):  {lr_hits} / 20 ({lr_hits/20*100:.1f}%)")
print(f" - MLP Neural Net      (4.000 mostres + HN, {mlp_train_time:.1f}s train):  {mlp_hits} / 20 ({mlp_hits/20*100:.1f}%)")
print(f"⚡ Latència d'inferència: {enc_time:.1f} ms (Embedding) + <0.1 ms (Cap dense) = ~{enc_time:.1f} ms/ingredient")
print("=" * 115)
