# Public Beta Release Candidate Check

Date: 2026-10-03  
Repository: `/Users/jacklai/Documents/GitHub/iol-vision-lab`  
Branch: `v2-evidence-based`

## Decision

**Recommended for Public Beta merge**

No blocking issue was identified by this scoped release-candidate check. Recommend merging v2-evidence-based into main for an explicitly educational public beta. No merge, commit or push was performed. This is a software release check, not independent medical-source verification, clinical validation or optical image-simulation approval.

## Automated regression

| Check | Result |
|---|---|
| `node scripts/validate-data.cjs` | PASS; metadata gaps remain warnings |
| `node tests/beta-cleanup.cjs` | PASS |
| `node tests/coverage-dom.cjs` | PASS; all 14 rendered coverage rows match reusable classifier |
| `node tests/homepage.cjs` | PASS; closed and expanded demo at all five widths |
| `node tests/release-browser.cjs` | PASS; 27 page/query cases; no reported HTTP, JavaScript, text, unnamed-control or overflow failures |

The data validator covers JSON parsing, catalog/index targets, family mapping, unique source IDs and source references, verification shape, numerical point validity, the four-family coverage snapshot, calculator direct/interpolation/range behavior and rejection for non-numerical products. Placeholder defocus data is excluded. Browser checks include legitimate and illegitimate head-to-head selections. No snapshot was regenerated to mask a regression.

## Actual browser journeys

- **A — PASS:** Home primary Explore CTA → Catalog → TFNT00 detail → Patient Summary → numerical Defocus Curve → S4 source link; the source disclosure becomes visible.
- **B — PASS:** Home Compare CTA → selectors PureSee/Eyhance → shared-study chart. The independent automated tests also exercise reversed selection and reject fake TFNT00/Eyhance or Gemetric/PanOptix head-to-head charts.
- **C — PASS:** Home scene CTA → phone-40cm card with TFNT00 selected → scene action → detail with scene query and distance=40 → calculator input 40, direct published point, chart present.
- **D — PASS:** Catalog Gemetric Plus Toric variant action → shared family detail → explicit statement that GPT2–GPT6 cylinder models were not reported separately. The data validator confirms all five variants share one evidence file.
- **E — PASS:** Methodology footer links navigate to Explore, Compare and Evidence Coverage.

No dead-end, wrong product evidence or broken route was observed in these journeys.

## Product and evidence spot checks

- TFNT00: S2–S6 and S1-NHI verified; S1-LICENSE partially verified; historical S1 and S1-HOSPITAL pending. Calculator remains restricted to S4 numerical defocus points. 40/100 cm direct, 70 cm interpolation without invented SD, 20 cm refused.
- DIB00: catalog DIB00 and study ICB00 remain distinct. No numerical defocus curve; calculator refuses estimates rather than substituting 40 cm UNVA.
- PureSee: catalog model remains null, Taiwan models DEN00V/ZEN00V are distinct from study model ZEN00V. Product-key routing works; calculator refuses estimates.
- Gemetric Plus Toric: explicit product-family scope, five catalog models, one evidence file. Pooled toric/non-toric results are not claimed as separate cylinder-model outcomes; calculator refuses estimates.
- Optical bench rendering stays source-separated. No cross-product optical head-to-head or averaging was introduced. Figure-only PSF/through-focus metadata remains partial, not numerical evidence.

## Public wording and demo separation

Scanned public HTML/JS for: predict your vision, best IOL, recommended IOL, winner, superior overall, 模擬你的術後視覺, 這就是你會看到的樣子. No matches found.

Homepage Experimental visual demo is closed by default and carries **Heuristic demo — not evidence-based optical simulation**. Primary navigation and onboarding lead to the evidence tools. Demo scripts remain isolated from structured coverage and patient-summary data; no research pipeline imports were introduced. The public beta does not claim to predict an individual's postoperative vision.

## Responsive and accessibility basics

Browser pass at **320, 375, 390, 430 and 1280px** on Home, Catalog, four main product details, shared-study Comparison, Scene Library, Coverage and Methodology (50 page/width combinations): no whole-document horizontal overflow. Home demo was additionally checked open and closed at all five widths.

Keyboard focus is visible on the tested routes. Home → Catalog → Detail → Comparison is keyboard navigable. Native details/summary responds to Enter and exposes browser-managed expanded state. Visible forms have labels/accessibility names in the automated checks. Evidence statuses include text and are not conveyed by color alone. This is a basic check, not full WCAG or assistive-technology certification; internal table scrolling is acceptable and not treated as page overflow.

## Git / release hygiene

- Working directory and Git root confirmed as the Documents repository, branch v2-evidence-based.
- No 32080626 raw dataset found in the repository; no tracked ZIP/TIFF research dataset.
- All 70 local files under research/psf-validation/generated are ignored by Git.
- No tracked file larger than 1 MB; no unused large tracked binary identified.
- No production HTML/JS matches for localhost, /Users/ absolute paths or console.log/debug. Localhost in test tooling is intentional.
- Research scripts retained. No evidence JSON, medical values, calculators, charts, simulator or research results changed in this RC check.
- Only this RC report was added during this check.

## Non-blocking issues

1. Source citation completeness remains documented in SOURCE_METADATA_GAPS.md: some titles, official URLs or journal/year fields are missing. Do not fabricate them; current UI distinguishes missing metadata from verification status and evidence validity.
2. External citation availability, full screen-reader/contrast auditing and real-device chart legibility warrant follow-up during beta.
3. No actual scene video/media exists yet, so media playback is not certified by these checks. No image simulation is enabled by this release.
4. Tests were run locally against a static server. A post-merge GitHub Pages deployment smoke test remains necessary; it was not claimed as completed here.

## Regression status

TFNT00, DIB00, PureSee and Gemetric Plus Toric: **PASS** for existing data mappings, coverage and calculator safety. Shared-study and source-separated chart behavior retained. No failures required code changes in this RC check.
