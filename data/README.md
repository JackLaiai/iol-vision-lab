# IOL data boundary

## Taiwan IOL catalog — 台灣市場 master database

`taiwan-iol-catalog.template.json` 是單一 IOL 產品條目的空白範本，供未來建立
「台灣市場 master database」。目前不是已填入產品的資料庫，也不代表任何產品
已獲許可、上市、可於特定醫院取得或有特定價格。所有欄位均為 `null`。

用途與 clinical evidence record 不同：

- **Catalog**：以產品／型號為單位，整理製造商、設計、台灣許可、市場供應、
  健保／自費、醫院可用性、價格及查證來源。不同型號或 toric 版本應分開記錄。
- **Clinical evidence record**：以產品、研究組別及一致量測條件為單位，保存
  研究結果、單位、測試條件與來源。單一 catalog 產品可對應多筆 evidence records。
  Catalog 不取代研究紀錄，也不能直接作為模擬參數或真實 IOL prediction。

欄位規則：

- 未知一律保留 `null`；不得以 `false`、零、空字串或猜測值代替未知。
  `toric` 僅在有來源確認後填入 JSON boolean `true` 或 `false`，目前為 `null`。
- TFDA 許可、市場供應、健保分類、自費狀態、醫院可用性及價格應分別查證，
  不得由其中一項推定其他項目；`manufacturer_country` 也不得以品牌印象推定。
- 未來填入醫院可用性或價格時，應連同來源、查證日期及適用範圍記錄；
  價格另需幣別與費用涵蓋項目。`last_verified_date` 使用 `YYYY-MM-DD`，
  沒有實際查證時保留 `null`，不能填範本建立日期。
- 臨床結果與研究條件欄位目前皆為預留。未來若有多筆研究，應使用可追溯到
  evidence record 的條目陣列，而非挑選一個數值作為產品的固定表現。
  每個結果與條件必須能透過相同 record ID 對應，不能混用不同研究的條件。
- `tfda_source`、`nhi_source`、`manufacturer_source` 與 `clinical_sources`
  預留供來源條目陣列使用，應記錄標題、網址／識別碼、資料位置及查證日期；
  臨床來源另可連結 evidence record ID。尚無來源時仍為 `null`。

本範本未加入真實產品、醫學數值或來源，未進行外部搜尋。它不由目前網站載入，
不改變 UI 或 demo 模擬邏輯。

## Demo data

`demo-lenses.js` contains the original four category-level profiles, unchanged
apart from explicit `dataStatus` and `source` metadata. All scores, halo/glare
strengths, contrast percentages and blur amounts are **demo / heuristic data**.
They are not clinical measurements, incidence rates or product comparisons.
The existing heuristic formulas, defaults and presets remain in `app.js`.

The page loads this classic script before `app.js`, preserving direct `file://`
opening as well as HTTP previews. No fetch, build step or dependency is required.

## Clinical record template (not loaded by the simulator)

`clinical-record.template.json` is an empty structural template, not a clinical
record or a populated evidence dataset. No actual products or results are included.
`schemaVersion` is a format version; `logMAR` and `D` specify intended units, not
observations. Runtime validation and an evidence-to-image model remain TODO.

Create one record per product, study arm and consistent measurement context.
Separate records are required when viewing condition, correction, follow-up or
other shared conditions differ. Do not pool incompatible measurements silently.

Field conventions:

- `manufacturer`, `model`, `iolType`: source-supported product identifiers.
- `viewingCondition`: `monocular`, `binocular`, or `null`.
- `correctionStatus`: `corrected`, `uncorrected`, or `null`; retain the exact
  correction protocol in `correctionDetails` (e.g. distance correction).
- Follow-up: reported value and explicit unit. Sample size: reported value and
  unit (`eyes` or `participants`); do not substitute one for the other.
- Pupil: reported diameter, dilation, illumination and measurement method.
- `defocusCurve.points`: `null` until available, then an array of objects with
  `defocusD`, `visualAcuityLogMAR`, `statistic`, `sampleSize`, `uncertainty`,
  and `sourceLocator`. Missing fields remain `null`. Retain the reported statistic;
  do not invent points, interpolate, extrapolate or convert units silently.
- `contrastSensitivity.points`: `null` until available, then an array with
  `spatialFrequency`, `value`, `statistic`, `sampleSize`, `uncertainty`,
  and `sourceLocator`. Test, units, illumination and glare condition must accompany
  the results. CSS contrast percentages are not contrast sensitivity data.
- `uncertainty`: `null` if unreported; otherwise an object containing `type`,
  `value`, `lower`, `upper`, and `confidenceLevel`, with unavailable fields `null`.
  Do not treat SD, SE and confidence intervals as interchangeable.
- Halo/glare: preserve the instrument, endpoint (frequency, severity or bother),
  scale and units. Numerator and denominator are only for reported counts.
  A questionnaire score must not be treated as incidence or image opacity.
- Source: title, DOI, PMID and/or FDA document URL/ID as available; `locator`
  identifies the table, figure or page. Never fabricate identifiers. Record
  whether data were transcribed, digitized or otherwise extracted.
- Review: `TODO` until verified; use `reviewed` only after source checking and
  recording reviewer/date. Review alone does not validate a simulation model.

Missing data are `null`, never zero or demo defaults. `TODO` is for workflow
status and notes, not numeric fields. Unknown arrays remain `null`; an empty
array must not be used to imply a measured absence. Do not add guessed clinical
data for PanOptix, Vivity, Odyssey, PureSee, Eyhance or any other product.

Future evidence mode must validate records and report unsupported conditions as
unavailable. It must never silently fall back to demo data. Source-backed charts
and validated image simulation are separate deliverables.
