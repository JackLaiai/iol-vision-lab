# Release validation

Run from repository root:

```sh
node scripts/validate-data.cjs
```

Read-only, dependency-free data checks: JSON parsing, index targets, source IDs and references, verification shape, catalog/family mapping, point types, coverage regression and calculator refusal. Missing source titles/identifiers are warnings, not invented replacements. `coverage.snapshot.json` records the reviewed current classification, not medical correctness or evidence quality. Review a changed classification before updating it; do not regenerate it merely to make tests pass.

For browser checks, install Playwright outside the repository or supply it through NODE_PATH; start a static server rooted here on port 8000:

```sh
python3 -m http.server 8000
node tests/release-browser.cjs
node tests/coverage-dom.cjs
node tests/beta-cleanup.cjs
```

Optional CHROME_PATH selects an existing browser; AUDIT_OUTPUT writes browser diagnostics to a caller-selected location outside the repository. The browser script returns nonzero for HTTP/resource/JavaScript failures and reports text/accessibility/overflow findings for manual review. Coverage DOM check compares all 14 rows to the reusable classifier and checks Tab focus. These basic checks are not WCAG certification, medical-source re-verification, or clinical validation. Links are local-site checks, not external publication availability.

Beta cleanup check covers 320/375/390/430px home layout, keyboard-only Home → Catalog → Detail → Comparison, visible focus, labeled forms, dynamic source status, and native details expansion. Native summary/details exposes expanded state through the browser accessibility tree; no redundant aria-expanded attribute is added.
