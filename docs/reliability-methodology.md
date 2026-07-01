# Reliability methodology

## What “99% reliable” means

The target applies only to **definitive verdict precision**. Coverage is reported separately.
A product with a readable list but no detected conflict may be `probably_vegan`; this is
visually and semantically distinct from a verified `vegan` result. A product without a
readable list or with conflicting evidence remains `unknown`.

The launch benchmark must contain at least 500 representative Spanish product revisions,
independently labelled by two reviewers. Release requires the one-sided 95% lower confidence
bound for definitive verdict precision to be at least 99%.

## Evidence order

1. Recognised certification.
2. Current manufacturer statement.
3. Current package label confirmed by a reviewer.
4. Provenanced external data, including Open Food Facts.
5. Automated extraction or web search.

Lower layers may identify candidates and contradictions. They cannot silently promote
themselves to higher assurance.

## Classification rules

- Declared meat, fish, insect-derived or slaughter-derived ingredients produce
  `non_vegetarian`.
- Dairy, eggs, honey and similar ingredients produce `vegetarian`.
- Potentially animal-derived ingredients such as E471 produce `probably_vegetarian`
  without provenance.
- Precautionary allergen statements (“may contain”, “traces of”) are stored separately and do
  not change a vegan verdict.
- Absence of a recognised animal ingredient is not sufficient on its own to confirm `vegan`.

Every output includes the rule version, evidence source, market, revision and verification date.

## Data lifecycle

Product revisions are append-only. A newer ingredient list creates a revision rather than
rewriting history. Uploaded menu originals remain private and are scheduled for deletion after
30 days. Public menus retain structured data and capture/validity metadata.
