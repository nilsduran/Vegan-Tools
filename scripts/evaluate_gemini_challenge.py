"""
Avaluació de Gemini 3.1 Flash Lite sobre els 20 casos crítics del Challenge Set.
"""
import os
import json
import time
from dotenv import load_dotenv
load_dotenv(".env")
from google import genai

api_key = os.environ.get("GEMINI_API_KEY")
model_name = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite")
client = genai.Client(api_key=api_key)

CHALLENGE_SET = [
    {"text": "mantega de cacau", "expected": "vegan", "type": "Fals Amic"},
    {"text": "leche de almendras", "expected": "vegan", "type": "Fals Amic"},
    {"text": "Hafermilch", "expected": "vegan", "type": "Fals Amic"},
    {"text": "beurre de cacahuète", "expected": "vegan", "type": "Fals Amic"},
    {"text": "carne vegetal a base de soja", "expected": "vegan", "type": "Fals Amic"},
    {"text": "fromage végétal de coco", "expected": "vegan", "type": "Fals Amic"},
    {"text": "gelatina de porc", "expected": "non_vegetarian", "type": "Escorxador"},
    {"text": "carmí de cotxinilla (E120)", "expected": "non_vegetarian", "type": "Escorxador"},
    {"text": "hígado graso de pato", "expected": "non_vegetarian", "type": "Escorxador"},
    {"text": "Rinderfett", "expected": "non_vegetarian", "type": "Escorxador"},
    {"text": "anchovy extract", "expected": "non_vegetarian", "type": "Escorxador"},
    {"text": "sang de porc", "expected": "non_vegetarian", "type": "Escorxador"},
    {"text": "sèrum de llet en pols", "expected": "vegetarian", "type": "Lacti / Ou"},
    {"text": "clara de huevo pasteurizada", "expected": "vegetarian", "type": "Lacti / Ou"},
    {"text": "Hühnereiweiß", "expected": "vegetarian", "type": "Lacti / Ou"},
    {"text": "fromage de chèvre", "expected": "vegetarian", "type": "Lacti / Ou"},
    {"text": "caseinate de calcium", "expected": "vegetarian", "type": "Lacti / Ou"},
    {"text": "emulgent E471", "expected": "ambiguous", "type": "Additiu Dual"},
    {"text": "mono y diglicéridos de ácidos grasos", "expected": "ambiguous", "type": "Additiu Dual"},
    {"text": "stearic acid", "expected": "ambiguous", "type": "Additiu Dual"},
]

prompt = """Ets un auditor expert en ingredients i alimentació vegana/vegetariana.
Classifica cadascun dels següents 20 ingredients en una d'aquestes 4 categories exactes:
- "vegan": 100% d'origen vegetal, fúngic o mineral. Inclou falsos amics com mantega de cacau, llet de civada/ametlles, carn vegetal de soja, formatge vegetal.
- "vegetarian": conté derivats animals com llet, sèrum lacti, caseïna/caseïnat, formatge, ous, clara/rovell, mel, cera d'abella (sense carn ni sacrifici).
- "non_vegetarian": conté carn, aviram, peix, marisc, gelatina animal, carmí/cochinilla E120, sèu/greix animal, quall animal.
- "ambiguous": additius d'origen dual o dubtós que poden ser tant vegetals com animals segons el fabricant (ex: E471, mono i diglicèrids, àcid esteàric, glicerina).

Retorna ÚNICAMENT un array JSON amb la mateixa mida i ordre, on cada element té:
{"text": "...", "category": "vegan"|"vegetarian"|"non_vegetarian"|"ambiguous", "reason": "breu explicació"}

Ingredients:
""" + "\n".join([f"{i+1}. {item['text']}" for i, item in enumerate(CHALLENGE_SET)])

print(f"🤖 Consultant {model_name}...")
t0 = time.time()
resp = client.models.generate_content(
    model=model_name,
    contents=prompt,
    config={"response_mime_type": "application/json"}
)
elapsed = time.time() - t0
print(f"✅ Resposta rebuda en {elapsed:.2f}s ({elapsed/len(CHALLENGE_SET)*1000:.1f}ms/ingredient batchejat)\n")

predictions = json.loads(resp.text)

print("=" * 115)
print(f"📊 RENDIMENT DE {model_name} SOBRE EL CHALLENGE SET (20 CASOS CRÍTICS)")
print("=" * 115)
print(f"{'Tipus':<13} | {'Ingredient':<33} | {'Esperat':<14} | {'Gemini Predicció':<18} | {'Motiu'}")
print("-" * 115)

hits = 0
for i, item in enumerate(CHALLENGE_SET):
    exp = item["expected"]
    pred_obj = predictions[i] if i < len(predictions) else {"category": "error", "reason": "missing"}
    pred = pred_obj.get("category", "unknown")
    reason = pred_obj.get("reason", "")
    
    ok = "✅" if pred == exp else "❌"
    if pred == exp: hits += 1
    
    print(f"{item['type']:<13} | {item['text']:<33} | {exp:<14} | {ok} {pred:<15} | {reason[:35]}")

print("=" * 115)
print(f"🎯 ACCURACY TOTAL DE {model_name}: {hits}/{len(CHALLENGE_SET)} ({hits/len(CHALLENGE_SET)*100:.1f}%)")
print("=" * 115)
