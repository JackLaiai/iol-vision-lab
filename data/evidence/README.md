# Product-specific evidence

`index.json` maps exact catalog `model_number` strings to page-relative JSON paths.
It is deliberately empty: no product-specific clinical evidence has been added.

Static URLs use `iol-detail.html?model=TFNT00` (relative to the site directory).
The page loads `../`-free, same-site paths such as `data/evidence/<product-slug>.json`.
This works under GitHub Pages project subdirectories without backend routing.

To add a product:

1. Add its verified identity to `data/taiwan-iol-catalog.json`. Keep missing fields
   null. A non-null, unique `model_number` is required for a detail-page link.
2. Link to `iol-detail.html?model=<URL-encoded model_number>`.
3. Only when evidence is available, create `data/evidence/<product-slug>.json`.
   Use the outer structure of `data/demo-placeholder.json` and the clinical
   structure of `data/clinical-record.template.json`; replace placeholder sources
   and mappings with reviewed evidence, never inferred clinical values.
4. Include `product.model_number` matching the catalog exactly. Product identity
   in the UI always comes from the catalog. `lastVerifiedDate` in evidence refers
   to evidence verification; catalog `last_verified_date` remains separate.
5. Add the model/path pair to `index.json`. Source markers use `parameterSourceMap`
   and labels in `sources`; clinical evidence and website simulation stay separate.

Do not map the development-only `demo-placeholder.json` to a real product.
Missing mappings show 「臨床證據資料整理中」. Failed or invalid evidence loads show
an unavailable state while preserving the catalog product details. No demo fallback
is used. No query parameter selects an arbitrary evidence file.
