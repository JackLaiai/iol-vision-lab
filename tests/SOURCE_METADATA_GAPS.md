# Source metadata gaps — 2026-10-03

No new bibliographic data was fetched or inferred. Verification flags remain unchanged. Missing citation metadata does not mean evidence is invalid or low quality.

## A — Existing identifiers, renderer-only fix

- Eyhance E2: PMID 37069559 and PMC10108453 already exist in `verification.verified_against`.
- Eyhance E3: PMC8046615 already exists in `verification.verified_against`.
- PanOptix S6: DOI already exists in `verification.verified_against`; now included alongside existing sourceIdentifier.
- Other sources: uppercase/lowercase DOI/PMID and explicit sourceIdentifier are read without writing back to JSON.

## B — Citation fields not populated on source records

This inventory deliberately distinguishes missing source fields from unknown facts. Journal/year may occur elsewhere in record text; a curator should confirm source-specific mapping before consolidation. Official URLs have not been reconstructed from identifiers. Regulatory sources do not require a journal/DOI. No missing field was filled by guesswork.

| Product | Source | Missing field | Public beta impact |
|---|---|---|---|
| panoptix-tfnt00 | S1 | title, official/source URL | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| panoptix-tfnt00 | S2 | official/source URL, journal (source-level field), year (source-level field) | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| panoptix-tfnt00 | S3 | title, official/source URL | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| panoptix-tfnt00 | S4 | official/source URL, PMID / PMCID | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| panoptix-tfnt00 | S5 | official/source URL | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| panoptix-tfnt00 | S6 | official/source URL, journal (source-level field) | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| panoptix-tfnt00 | S1-LICENSE | title, official/source URL | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| panoptix-tfnt00 | S1-NHI | official/source URL | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| panoptix-tfnt00 | S1-HOSPITAL | title, official/source URL | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| eyhance-dib00 | E1 | official/source URL | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| eyhance-dib00 | E2 | official/source URL, DOI, journal (source-level field), year (source-level field) | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| eyhance-dib00 | E3 | official/source URL, DOI, journal (source-level field), year (source-level field) | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| eyhance-dib00 | E4 | official/source URL, journal (source-level field), year (source-level field) | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| eyhance-dib00 | TW1 | title, official/source URL | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| eyhance-dib00 | E5 | official/source URL, journal (source-level field), year (source-level field) | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| eyhance-dib00 | O1 | official/source URL, DOI, journal (source-level field), year (source-level field) | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| hoya-vivinex-gemetric-plus-toric | TW1 | official/source URL | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| hoya-vivinex-gemetric-plus-toric | C1 | official/source URL | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| tecnis-puresee | P1 | official/source URL, journal (source-level field), year (source-level field) | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| tecnis-puresee | TW1 | title, official/source URL | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| tecnis-puresee | TW2 | title, official/source URL | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| tecnis-puresee | P2 | official/source URL, journal (source-level field), year (source-level field) | Non-blocking with explicit incomplete-citation wording; curator follow-up |
| tecnis-puresee | O1 | official/source URL, DOI, journal (source-level field), year (source-level field) | Non-blocking with explicit incomplete-citation wording; curator follow-up |

Historical PanOptix S1 is retained for provenance, not active parameter mapping. S1-HOSPITAL remains pending; its missing title/identifier must not be presented as verified national availability. Incomplete identification is displayed as「來源識別資訊尚未完整整理」; verified/partial/pending comes only from the source verification status. Complete citations and clickable official source URLs remain a beta follow-up, not a reason to fabricate links.
