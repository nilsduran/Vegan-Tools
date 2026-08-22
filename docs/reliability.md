# Vegan Tools — Reliability & Verdict Methodology

This document details the classification philosophy, assurance levels, and evidence evaluation pipeline that powers Vegan Tools.

---

## 🎯 1. The "99% Definitive Precision" Standard

In safety-critical dietary classification, **a false positive is dangerous**. Declaring a non-vegan item as "vegan" violates user trust and ethical boundaries.

Therefore:
- Precision applies strictly to **definitive verdicts** (`VEGAN` or `NOT_VEGAN`).
- Ambiguous ingredients without verifiable provenance are explicitly marked as `PROBABLY_VEGAN` or `UNKNOWN`.
- Absence of a recognized animal ingredient is **never** sufficient on its own to declare an item `VEGAN`.

---

## 🔍 2. Strict Evidence Hierarchy

When evaluating product packages, barcode registries, and restaurant menus, sources are prioritized in strict descending order:

```text
1. Recognised Third-Party Certification (e.g. V-Label, Vegan Society sunflower)
2. Current Official Manufacturer / Restaurant Statement
3. Packaging Label verified by a Human Reviewer
4. Provenanced Open Database Records (e.g. Open Food Facts)
5. Automated LLM Extraction & Web Search Grounding
```

> [!IMPORTANT]
> Lower layers may suggest candidates and highlight potential contradictions, but they can **never** silently promote themselves above higher assurance tiers.

---

## ⚖️ 3. Ingredient Classification Rules

The deterministic engine (`@vegan-tools/domain`) applies conservative rules:

- **Slaughter & Meat Derivatives**: Any ingredient derived from slaughtered animals (e.g., gelatin, carmine/E120, rennet, animal lard) immediately yields `NOT_VEGAN` and `NON_VEGETARIAN`.
- **Dairy, Eggs & Bee Products**: Ingredients such as whey, casein, albumen, shellac, and honey yield `VEGETARIAN` and `NOT_VEGAN`.
- **Dual-Origin Additives**: Additives that can be synthesized from either animal fats or plant oils (such as Mono- and diglycerides of fatty acids / **E471**, stearic acid, glycerin) default to `PROBABLY_VEGAN` unless plant-origin is explicitly certified on the label.
- **Precautionary Allergen Statements**: Statements such as *"May contain traces of milk or eggs"* describe shared equipment cross-contact rather than intentional recipe ingredients. Under standard vegan guidelines, they do not invalidate a `VEGAN` verdict, but are flagged separately for allergy safety.

---

## 🔄 4. Data Lifecycle & Auditability

- **Immutable Product Revisions**: Product modifications create a new historical revision rather than destructively overwriting previous entries.
- **Ephemeral Raw Uploads**: Raw photographed images and PDF uploads are retained temporarily in private storage for extraction and scheduled for deletion after 30 days.
- **Auditable Citations**: Every structured output links back to its verified `sourceUrl`, extraction timestamp, and rule engine version.
