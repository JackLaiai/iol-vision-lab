# Release-readiness audit — 2026-10-03

Repository: Documents/GitHub/iol-vision-lab; branch: v2-evidence-based.

## Decision

Core evidence browsing is suitable for a limited, explicitly educational preview. **Do not call this an unconditional public-beta release pass yet.** Resolve the disclosure conflict and mobile/accessibility findings below before broad public launch. No clinical or optical values, evidence JSON, calculator, simulator, or research results were changed in this audit. Verification flags were checked structurally, not independently reverified against publications.

## Passed

- All data JSON parsed; 14 catalog records resolve consistently. Four formal evidence files; GPT2–GPT6 share one family file. Records without evidence remain catalog-only. PureSee retains its product key and null model.
- Unique source IDs, source mappings, verification structure and numerical defocus types checked. Unknown/null and explicit questionnaire 0 remain distinct in the current data/rendering. Development placeholder does not qualify as numerical defocus evidence.
- TFNT00 calculator: 40 and 100 cm direct published points; 70 cm interpolation with no SD; 20 cm refused. DIB00, PureSee, Gemetric refuse 40/66/70 cm estimates. No near-VA substitution.
- Coverage snapshot computed with the existing reusable module; all 14 rendered table rows match it. No coverage rule changed in this audit.
- Both PureSee/Eyhance selection orders render the shared-study chart; TFNT00/Eyhance and Gemetric/PanOptix do not. Patient-reported outcomes retain their separate same-study tables.
- Source-separated optical rendering remains unchanged. Figure-only through-focus/PSF is partial, not numerical; no production HTML/JS imports the research directory.
- 27 page/query cases return HTTP 200, including all catalog records, unknown model, product-key route, comparison preselection and phone scene context. Local non-fragment navigation checks pass; no JS errors or broken images detected. Scene files remain absent by design, so actual video playback cannot yet be validated.
- Tab reaches a focusable control; statuses have text labels, not only color. Evidence pages have no whole-document horizontal overflow at 390px in these checks.

## Findings requiring attention

1. **Disclosure consistency:** Eyhance's existing disclaimer still says the transcription has not been independently checked, cites only E2 as clinical evidence, and literally displays `null`. Later sources have verified flags and additional studies. This is stored medical/provenance wording, so it was not rewritten. Curator should reconcile its historical/current scope before public launch.
2. **Source completeness:** several formal sources retain null titles or lack structured identifiers/URLs. A verified badge alone does not provide a complete citation. See exact warnings below; do not fabricate missing metadata.
3. **Mobile home:** horizontal overflow at 390px. Left unchanged because the home/demo simulator was excluded from this round. Evidence pages did not exhibit this page-level overflow.
4. **Focus visibility:** existing `.vision-card select` has `outline:none`; visible keyboard-focus treatment needs improvement. Basic Tab access is not a WCAG audit.
5. **Chart readability:** charts retain text labels and numerical tables, but no screen-reader audit or device-level text-legibility certification was performed. External source link availability was not crawled. Fragment links and exhaustive invalid-query combinations are not covered by the local URL status sweep.

## Pure code changes

- Comparison source links now use shared product routing, preventing future `model=null` links for product-key records.
- Shared-study table rendering rejects missing study metadata, missing measurement conditions, mismatched study IDs and missing selected arms before rendering. Existing same-study outcome object equality is retained; no outcomes changed.

## Reproducibility

See `tests/README.md`. Added dependency-free data validation, coverage snapshot, browser sweep and coverage-DOM regression. Snapshot reflects current database coverage, not independently proven evidence quality. Browser warnings are reported separately from fatal HTTP/JS failures.

## Coverage snapshot

A = Available; P = Partial / qualitative only; N = Not structured yet. A numerical-defocus column marked P still means no usable numerical curve, not calculator eligibility.

| Category | TFNT00 | DIB00 | PureSee | Gemetric Plus family |
|---|---|---|---|---|
| Clinical VA | A | A | A | N |
| Numerical defocus | A | P | P | P |
| Qualitative defocus | P | P | P | P |
| Contrast sensitivity | A | P | P | P |
| Spectacle use | A | A | A | P |
| Dysphotopsia | A | A | A | P |
| In-vivo quality | N | A | N | N |
| Bench MTF | A | A | A | N |
| Numerical through-focus MTF | P | N | P | N |
| PSF | N | P | N | N |
| OTF/PTF | N | N | N | N |
| Head-to-head | N | A | A | N |
| Taiwan evidence | A | A | A | A |

## Metadata warnings

- panoptix-tfnt00/S1: missing source title
- panoptix-tfnt00/S3: missing source title
- panoptix-tfnt00/S1-LICENSE: missing source title
- panoptix-tfnt00/S1-HOSPITAL: missing source title
- panoptix-tfnt00/S1-HOSPITAL: no structured identifier (may be an official document)
- eyhance-dib00/E2: no structured identifier (may be an official document)
- eyhance-dib00/E3: no structured identifier (may be an official document)
- eyhance-dib00/TW1: missing source title
- eyhance-dib00/TW1: no structured identifier (may be an official document)
- tecnis-puresee/TW1: missing source title
- tecnis-puresee/TW1: no structured identifier (may be an official document)
- tecnis-puresee/TW2: missing source title
- tecnis-puresee/TW2: no structured identifier (may be an official document)

No commit or push performed.
