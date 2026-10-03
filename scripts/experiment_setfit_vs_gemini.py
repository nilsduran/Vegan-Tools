"""
Mini-Experiment: SetFit Multilingüe vs Gemini 2.5 Flash Lite
Compara empíricament un classificador d'estat estructurat (SetFit)
amb un LLM d'alta potència (Gemini Flash Lite) sobre 20 desafiaments reals.
"""
import os
os.environ["WANDB_DISABLED"] = "true"
import json
import random
import time
from pathlib import Path
from datasets import Dataset
from setfit import SetFitModel, Trainer, TrainingArguments
from google import genai

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT_DIR / "data" / "dataset" / "real" / "real_ingredients_clean.jsonl"

# 1. Carregar dades reals filtrades a idiomes principals
CORE_LANGS = {'ca', 'es', 'en', 'de', 'fr', 'it', 'mul'}
LABEL_MAP = {
    "vegan": 0,
    "vegetarian": 1,
    "non_vegetarian": 2,
    "ambiguous": 3,
}
INV_LABEL_MAP = {v: k for k, v in LABEL_MAP.items()}

samples_by_class = {c: [] for c in LABEL_MAP}

with open(DATA_FILE, "r", encoding="utf-8") as f:
    for line in f:
        if line.strip():
            s = json.loads(line)
            if s.get("language") in CORE_LANGS and s.get("diet_status") in LABEL_MAP:
                samples_by_class[s["diet_status"]].append(s["text"])

print("Mostres disponibles per classe en idiomes troncols:")
for c, lst in samples_by_class.items():
    print(f" - {c}: {len(lst)} ingredients")

# Mostreig equilibrat (64 mostres per classe = 256 mostres d'alta qualitat)
random.seed(42)
SAMPLES_PER_CLASS = 64
train_texts = []
train_labels = []

for c, lst in samples_by_class.items():
    chosen = random.sample(lst, SAMPLES_PER_CLASS)
    for txt in chosen:
        train_texts.append(txt)
        train_labels.append(LABEL_MAP[c])

train_ds = Dataset.from_dict({"text": train_texts, "label": train_labels})
print(f"\n📦 Dataset d'entrenament SetFit preparat ({len(train_ds)} mostres reals)")

# 2. Inicialització i Entrenament de SetFit Multilingüe
MODEL_ID = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
print(f"🚀 Carregant SetFit model: {MODEL_ID}...")

model = SetFitModel.from_pretrained(
    MODEL_ID,
    labels=["vegan", "vegetarian", "non_vegetarian", "ambiguous"]
)

args = TrainingArguments(
    batch_size=16,
    num_epochs=1,
    num_iterations=20, # Genera parelles contrastives
    body_learning_rate=2e-5,
    head_learning_rate=1e-2,
    seed=42,
    report_to="none",
)

trainer = Trainer(
    model=model,
    args=args,
    train_dataset=train_ds,
)

print("\n⚡ Iniciant entrenament contrastiu SetFit...")
t0 = time.time()
trainer.train()
train_time = time.time() - t0
print(f"✅ Entrenament SetFit completat en {train_time:.1f} segons!")

# 3. El Subconjunt de Desafiament (20 casos crítics multilingües)
CHALLENGE_SET = [
    # Falsos amics vegetals (molt difícils per a regex o models ingenus)
    {"text": "mantega de cacau", "lang": "ca", "expected": "vegan", "type": "Fals Amic"},
    {"text": "leche de almendras", "lang": "es", "expected": "vegan", "type": "Fals Amic"},
    {"text": "Hafermilch", "lang": "de", "expected": "vegan", "type": "Fals Amic"},
    {"text": "beurre de cacahuète", "lang": "fr", "expected": "vegan", "type": "Fals Amic"},
    {"text": "carne vegetal a base de soja", "lang": "es", "expected": "vegan", "type": "Fals Amic"},
    {"text": "fromage végétal de coco", "lang": "fr", "expected": "vegan", "type": "Fals Amic"},
    
    # Carn / Escorxador (Crític ètic: tolerància zero)
    {"text": "gelatina de porc", "lang": "ca", "expected": "non_vegetarian", "type": "Escorxador"},
    {"text": "carmí de cotxinilla (E120)", "lang": "ca", "expected": "non_vegetarian", "type": "Escorxador"},
    {"text": "hígado graso de pato", "lang": "es", "expected": "non_vegetarian", "type": "Escorxador"},
    {"text": "Rinderfett", "lang": "de", "expected": "non_vegetarian", "type": "Escorxador"},
    {"text": "anchovy extract", "lang": "en", "expected": "non_vegetarian", "type": "Escorxador"},
    {"text": "sang de porc", "lang": "fr", "expected": "non_vegetarian", "type": "Escorxador"},
    
    # Secrecions Animals (Lactis / Ous)
    {"text": "sèrum de llet en pols", "lang": "ca", "expected": "vegetarian", "type": "Lacti / Ou"},
    {"text": "clara de huevo pasteurizada", "lang": "es", "expected": "vegetarian", "type": "Lacti / Ou"},
    {"text": "Hühnereiweiß", "lang": "de", "expected": "vegetarian", "type": "Lacti / Ou"},
    {"text": "fromage de chèvre", "lang": "fr", "expected": "vegetarian", "type": "Lacti / Ou"},
    {"text": "caseinate de calcium", "lang": "fr", "expected": "vegetarian", "type": "Lacti / Ou"},
    
    # Additius d'origen dual / ambigu
    {"text": "emulgent E471", "lang": "ca", "expected": "ambiguous", "type": "Additiu Dual"},
    {"text": "mono y diglicéridos de ácidos grasos", "lang": "es", "expected": "ambiguous", "type": "Additiu Dual"},
    {"text": "stearic acid", "lang": "en", "expected": "ambiguous", "type": "Additiu Dual"},
]

# 4. Prediccions SetFit
test_texts = [item["text"] for item in CHALLENGE_SET]
t0 = time.time()
setfit_preds_raw = model.predict(test_texts)
setfit_probs = model.predict_proba(test_texts)
setfit_lat = (time.time() - t0) * 1000 / len(test_texts)

# 5. Prediccions Gemini 2.5 Flash Lite
print("\n🤖 Consultant Gemini 2.5 Flash Lite sobre els 20 casos...")
client = genai.Client()
gemini_prompt = """Classifica aquest ingredient alimentari en una d'aquestes 4 categories exactes:
- "vegan": 100% vegetal, mineral o fúngic (sense origen animal). Inclou falsos amics com mantega de cacau, llet de civada, formatge vegà.
- "vegetarian": conté llet, formatge, mantega animal, ous, mel (sense escorxador).
- "non_vegetarian": conté carn, aviram, peix, marisc, gelatina animal, carmí/cochinilla o quall animal.
- "ambiguous": additiu d'origen dubtós (com E471, mono i diglicèrids, àcid esteàric).

Retorna ÚNICAMENT un objecte JSON amb el camp "category".
Text de l'ingredient: """

gemini_preds = []
t0 = time.time()
for item in CHALLENGE_SET:
    try:
        resp = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=gemini_prompt + item["text"],
            config={"response_mime_type": "application/json"}
        )
        parsed = json.loads(resp.text)
        cat = parsed.get("category", "unknown")
    except Exception as e:
        cat = f"error: {e}"
    gemini_preds.append(cat)
gemini_lat = (time.time() - t0) * 1000 / len(CHALLENGE_SET)

# 6. Taula Comparativa Final
print("\n" + "=" * 105)
print(f"📊 COMPARATIVA CARA A CARA: GROUND TRUTH vs SETFIT vs GEMINI FLASH LITE")
print("=" * 105)
print(f"{'Tipus':<13} | {'Ingredient':<33} | {'Esperat':<14} | {'SetFit (Conf.)':<20} | {'Gemini Flash Lite':<16}")
print("-" * 105)

setfit_hits = 0
gemini_hits = 0

for i, item in enumerate(CHALLENGE_SET):
    exp = item["expected"]
    sf_pred = str(setfit_preds_raw[i])
    sf_conf = float(setfit_probs[i].max())
    gem_pred = gemini_preds[i]
    
    sf_ok = "✅" if sf_pred == exp else "❌"
    gem_ok = "✅" if gem_pred == exp else "❌"
    
    if sf_pred == exp: setfit_hits += 1
    if gem_pred == exp: gemini_hits += 1
    
    sf_str = f"{sf_ok} {sf_pred} ({sf_conf*100:.0f}%)"
    gem_str = f"{gem_ok} {gem_pred}"
    
    print(f"{item['type']:<13} | {item['text']:<33} | {exp:<14} | {sf_str:<20} | {gem_str:<16}")

print("=" * 105)
print(f"🎯 ACCURACY TOTAL:")
print(f" - SetFit (Model Edge Local, {train_time:.1f}s train, {setfit_lat:.1f}ms/pred):  {setfit_hits}/{len(CHALLENGE_SET)} ({setfit_hits/len(CHALLENGE_SET)*100:.1f}%)")
print(f" - Gemini 2.5 Flash Lite (API Cloud, {gemini_lat:.0f}ms/pred):                {gemini_hits}/{len(CHALLENGE_SET)} ({gemini_hits/len(CHALLENGE_SET)*100:.1f}%)")
print("=" * 105)
