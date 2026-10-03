"""
Mòdul de normalització d'ingredients alimentaris en Python (Fase 1).
Idèntic a packages/domain/src/ingredient-normalizer.ts per garantir
paritat absoluta entre l'entrenament ML i el runtime TypeScript de Vegan Tools.
"""

import re
from typing import Tuple, List

# Regex per aïllar clàusules de traces precautòries
TRACE_PATTERN = re.compile(
    r"(?:may (?:also )?contain(?: traces of)?|traces? of|manufactured (?:in a facility|on equipment)[^.:;]*|"
    r"packed in a facility[^.:;]*|pot contenir(?: traces de)?|traces? de|"
    r"elaborat en una (?:fàbrica|línia|instal·lació)[^.:;]*|puede contener(?: trazas de)?|"
    r"trazas? (?:de|posibles)|posibles trazas de|fabricado en[^.:;]*|"
    r"kann (?:produktionsbedingt )?spuren (?:enthalten )?von|spuren von|"
    r"hergestellt in einem betrieb[^.:;]*|peut contenir(?: des traces d[e'])?|"
    r"traces? (?:d[e']|éventuelles d[e'])|fabriqué dans un atelier[^.:;]*|"
    r"pu[oò] contenere(?: tracce di)?|tracce di)\s*:?\s*([^.;)]*?)(?:\s+enthalten)?(?=[.;)]|$)",
    re.IGNORECASE
)

LABEL_PREFIX_PATTERN = re.compile(
    r"^\s*(?:ingredients?|ingredientes?|zutaten|ingr[eé]dients?|ingredienti|composici[oó]n?|zloženie|składniki)\s*[:\-–]\s*",
    re.IGNORECASE
)

def split_traces(text: str) -> Tuple[str, List[str]]:
    traces = []
    def replacer(match):
        captured = match.group(1) or match.group(0)
        val = captured.strip().lstrip(": \t").rstrip()
        val = re.sub(r"\s+enthalten$", "", val, flags=re.IGNORECASE).strip()
        if val:
            traces.append(val)
        return " "

    cleaned = TRACE_PATTERN.sub(replacer, text)
    return cleaned, traces

def normalize_ingredient_text(raw_text: str) -> Tuple[str, List[str]]:
    """
    Normalitza el text de la formulació d'ingredients:
    1. Aïlla i extreu les traces d'al·lèrgens precautòries.
    2. Elimina prefixos ('Ingredients: ', 'Zutaten: ', etc.).
    3. Elimina percentatges ('(65%)', ' 12.5% ', '1.5%').
    4. Canònica codis E ('E 471', 'e-471' -> 'E471').
    5. Converteix separadors (•, ;, |, ~) a comes netes.
    6. Col·lapsa espais i comes redundants.
    """
    if not raw_text or not isinstance(raw_text, str):
        return "", []

    # 1. Traces
    text, traces = split_traces(raw_text)

    # 2. Prefixos
    text = LABEL_PREFIX_PATTERN.sub("", text)

    # 3. Percentatges
    text = re.sub(r"\s*[\(\[]\s*\d+(?:[.,]\d+)?\s*%\s*[\)\]]", "", text)
    text = re.sub(r"\s*\b\d+(?:[.,]\d+)?\s*%", "", text)

    # 4. Codis E canònics
    text = re.sub(r"\b[eE]\s*[-–—]?\s*(\d{3,4}[a-z]?)\b", r"E\1", text)

    # 5. Separadors (preservant la l·l geminada en català)
    text = re.sub(r"([lL])[\u00B7·•]([lL])", r"\1__ELA_GEMINADA__\2", text)
    text = re.sub(r"[\u2022\u2023\u25E6\u2043\u2219•|;~*·]+", ", ", text)
    text = text.replace("__ELA_GEMINADA__", "·")

    # 6. Espais i comes
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s*,\s*", ", ", text)
    text = re.sub(r"(?:,\s*)+", ", ", text)

    # 7. Retall final
    text = re.sub(r"^[\s,.:;]+|[\s,.:;]+$", "", text).strip()

    return text, traces
