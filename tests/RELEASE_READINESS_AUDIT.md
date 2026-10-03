# Release-readiness audit — 2026-10-03

Repository: Documents/GitHub/iol-vision-lab; branch: v2-evidence-based.

## Decision

**Blocking: none identified by the scoped automated checks after cleanup. Suitable for a first educational public beta**, with citation-completeness and broader accessibility/device testing tracked as non-blocking follow-up. This is not medical validation or a claim of image-simulation readiness. No clinical/optical values or verification conclusions changed; every data JSON file is byte-identical to the pre-cleanup snapshot.

## Passed

- All data JSON parsed; 14 catalog records resolve consistently. Four formal evidence files; GPT2–GPT6 share one family file. Records without evidence remain catalog-only. PureSee retains its product key and null model.
- Unique source IDs, source mappings, verification structure and numerical defocus types checked. Unknown/null and explicit questionnaire 0 remain distinct in the current data/rendering. Development placeholder does not qualify as numerical defocus evidence.
- TFNT00 calculator: 40 and 100 cm direct published points; 70 cm interpolation with no SD; 20 cm refused. DIB00, PureSee, Gemetric refuse 40/66/70 cm estimates. No near-VA substitution.
- Coverage snapshot computed with the existing reusable module; all 14 rendered table rows match it. No coverage rule changed in this audit.
- Both PureSee/Eyhance selection orders render the shared-study chart; TFNT00/Eyhance and Gemetric/PanOptix do not. Patient-reported outcomes retain their separate same-study tables.
- Source-separated optical rendering remains unchanged. Figure-only through-focus/PSF is partial, not numerical; no production HTML/JS imports the research directory.
- 27 page/query cases return HTTP 200, including all catalog records, unknown model, product-key route, comparison preselection and phone scene context. Local non-fragment navigation checks pass; no JS errors or broken images detected. Scene files remain absent by design, so actual video playback cannot yet be validated.
- Tab reaches a focusable control; statuses have text labels, not only color. Evidence pages have no whole-document horizontal overflow at 390px in these checks.

## Cleanup results

- Detail/comparison now derive current per-source status from verification.status. The legacy record disclaimer remains preserved in JSON but is no longer presented as the current verification conclusion. No Eyhance-specific UI condition was added. Educational limitations and the distinction from study quality remain visible.
- Renderer includes existing identifier fields and identifiers already recorded in verified_against (notably Eyhance E2/E3 and PanOptix S6). Missing identification displays「來源識別資訊尚未完整整理」. No guessed URLs or identifiers were added.
- Home overflow fixed at 320, 375, 390 and 430px: the fixed 390px lens decoration imposed Grid min-content width; selector/header sizing and footer unwrapped content also overflowed at 320px. Minmax(0,1fr), bounded decorative dimensions and wrapping solve the layout without overflow-x:hidden. Simulator JS/effects unchanged.
- Global :focus-visible covers links, buttons, forms, native disclosure summaries and focusable elements, including the existing select outline:none override. Mobile navigation remains accessible.
- Keyboard-only Home → Catalog → Product detail → Comparison passes. Native details/summary expands/collapses with Enter and maintains browser-managed expanded semantics; no stale manual aria-expanded state. Visible form inputs have accessible labels; evidence states use text.

## Non-blocking follow-up

- See SOURCE_METADATA_GAPS.md for source-by-source title, identifier, journal/year and official URL gaps. These do not invalidate evidence, and verification remains independent of citation completeness.
- Full screen-reader, contrast, touch-device chart-legibility and external publication-link audits remain outside this basic check. No real scene media is present, so video playback is not yet exercised.
- Historical provenance text remains in JSON. Current user-facing verification comes from source status; curators may later reconcile historical notes without changing this sprint's data.

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

## Metadata warnings (stored fields; renderer now exposes identifiers from verification references)

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

All existing automated checks plus beta-cleanup.cjs were rerun. Coverage snapshot unchanged. No commit or push performed.
