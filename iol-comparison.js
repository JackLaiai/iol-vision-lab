/* Evidence availability only; no ranking, media effects or evidence mutation. */
(() => {
  "use strict";
  const EMPTY = "尚無資料", NONE = "No structured evidence yet", NUM = "Published numerical data available", QUAL = "Qualitative evidence only";
  const state = { products: [], index: {}, selectedScene: null, sides: {} };
  const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
  const list = value => Array.isArray(value) ? value : value ? [value] : [];
  const numeric = value => typeof value === "number" && Number.isFinite(value);
  const numericalArray = value => Array.isArray(value) && value.some(v => numeric(v) || numericalArray(v));
  const show = value => value === null || value === undefined || value === "" ? EMPTY : String(value);
  async function fetchJSON(path) { const r = await fetch(path); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }
  function fields(rows) { const dl = el("dl"); for (const [k,v] of rows) { const row = el("div"); row.append(el("dt", k), el("dd", show(v))); dl.append(row); } return dl; }
  function sourceLink(product, id) { const a = el("a", `[${id}]`); a.href = `iol-detail.html?model=${encodeURIComponent(product.model_number)}#source-${encodeURIComponent(id)}`; return a; }
  function availability(record) {
    const params = record?.clinicalParameters || [], sources = record?.sources || [], optical = record?.opticalEvidence || {};
    const endpoint = pattern => params.some(p => pattern.test(p.key) && (numeric(p.value) || numeric(p.value?.mean)));
    const defocus = sources.some(s => list(s.defocus_points).some(p => numeric(p.defocus_D) && numeric(p.mean_logMAR)));
    const through = list(optical.throughFocusMTF).some(p => numeric(p.value));
    const throughFigure = sources.some(s => s.through_focus_mtf?.figure_available === true);
    return [
      ["Clinical outcomes", endpoint(/(?:ucva|bcdva|binocular_va|udva|cdva|uiva|unva)$/) ? NUM : NONE],
      ["Defocus Curve", defocus ? NUM : sources.some(s => s.defocus_curve_available === true) ? `${QUAL} · figure / qualitative structured evidence only` : params.some(p => p.key === "defocus_range" && numeric(p.value?.visualAcuityUpperBound)) ? "Published range summary only; no structured points" : NONE],
      ["Contrast sensitivity", endpoint(/^contrast_sensitivity/) ? NUM : NONE],
      ["Spectacle independence", endpoint(/^spectacle_independence/) ? NUM : NONE],
      ["Dysphotopsia", endpoint(/^(severity_|bothersomeness_)/) ? NUM : NONE],
      ["In-vivo optical quality", list(record?.in_vivo_optical_quality).some(p => numeric(p.value?.mean)) ? "In-vivo optical quality data available · ocular OQAS, not bench MTF" : NONE],
      ["Optical bench MTF", list(optical.mtf).some(p => numeric(p.mtf_value)) ? NUM : NONE],
      ["Through-focus MTF", through ? NUM : throughFigure ? `${QUAL} · figure metadata only; no numerical table` : NONE],
      ["PSF", numericalArray(optical.psf?.matrix) || numericalArray(optical.psf?.values) ? NUM : NONE],
      ["OTF", numericalArray(optical.otf?.complex_values) ? NUM : NONE],
      ["PTF", list(optical.ptf).some(p => numeric(p.phase_value)) ? NUM : NONE]
    ];
  }
  function distanceResult(product, record) {
    const box = el("div", undefined, "result");
    const hasPoints = record?.sources?.some(s => list(s.defocus_points).some(p => numeric(p.defocus_D) && numeric(p.mean_logMAR)));
    if (!hasPoints) { box.append(el("p", "目前沒有足夠的 published defocus numerical data")); return box; }
    const result = window.DefocusCalculator.calculate(document.getElementById("distance").valueAsNumber, record);
    if (result.error) { box.append(el("p", result.error)); return box; }
    const direct = result.method === "direct published point";
    box.append(el("span", direct ? "Direct published point" : "Website-derived linear interpolation", `badge ${direct ? "direct" : "interpolated"}`),
      el("p", `${result.distanceCm} cm → ${result.distanceM} m → ${result.defocus.toFixed(2)} D`),
      el("p", `Mean logMAR：${direct ? result.mean.toFixed(2) : result.mean.toFixed(5)}`),
      el("p", `Published SD：${direct && result.sd !== null ? result.sd.toFixed(2) : "不提供"}`));
    if (!direct) box.append(el("p", `Published points：${result.points.map(p => `${p.defocus_D} D / ${p.mean_logMAR} logMAR`).join("、")}`));
    for (const id of new Set(result.points.map(p => p.source))) {
      box.append(sourceLink(product, id));
      const source = record.sources.find(s => s.label === id);
      if (source) box.append(el("h4", "Measurement conditions"), fields([["Measurement", source.measurement], ["Follow-up", source.follow_up ?? source.followUp], ["Lighting", source.lighting_condition], ["Patients", source.patients], ["Eyes", source.eyes], ["Study design", source.study_design ?? source.studyDesign]]));
    }
    return box;
  }
  function render(side) {
    const { product, record, loading, error } = state.sides[side];
    const node = document.getElementById(`side-${side}`); node.replaceChildren(el("h2", product.model || EMPTY));
    const market = key => record?.product?.marketEvidence?.find(p => p.key === key)?.value;
    node.append(fields([["Manufacturer", product.manufacturer], ["Product name", product.model], ["Model", product.model_number], ["Lens category", product.iol_type], ["Toric / non-toric", product.toric === true ? "Toric" : product.toric === false ? "Non-toric" : null], ["Taiwan market status", product.taiwan_market_status], ["Taiwan availability (source record)", market("taiwan_availability")], ["TFDA status", product.taiwan_tfda_status], ["TFDA license", product.tfda_license_number ?? market("tfda_license_number")], ["NHI code", product.nhi_code ?? market("taiwan_nhi_special_material_code")], ["Evidence availability", loading ? "載入中…" : error ? `資料載入失敗：${error}` : record ? "Structured evidence record available" : NONE]]));
    if (product.model_number) { const a = el("a", "查看完整資料與來源"); a.href = `iol-detail.html?model=${encodeURIComponent(product.model_number)}`; node.append(a); }
    if (loading || error) return;
    node.append(el("h3", "Evidence comparison"), fields(availability(record)), el("h3", "Published study results · Viewing distance"), distanceResult(product, record));
    if (record?.modelRelationship) {
      node.append(el("h3", "Model relationship"), fields([["Catalog model", record.modelRelationship.catalog_model], ["Study model", record.modelRelationship.study_model], ["Relationship", record.modelRelationship.relationship]]));
      node.append(el("h3", "Adult clinical evidence available · Published study results"));
      const rows = (record.clinicalParameters || []).filter(p => numeric(p.value?.mean)).map(p => [p.label, `${p.value.mean.toFixed(2)} ± ${p.value.uncertainty.value.toFixed(2)} ${p.unit} [${p.sourceIds.join(", ")}]`]);
      node.append(fields(rows), el("p", "Measurement conditions：各列保留單眼／雙眼、矯正條件、距離與追蹤時間，請查看完整來源。"));
    }
    if (record?.disclaimer) node.append(el("p", record.disclaimer));
  }
  async function select(side) {
    const product = state.products[Number(document.getElementById(`iol-${side}`).value)];
    const entry = { product, record: null, loading: true, error: null }; state.sides[side] = entry; render(side);
    try {
      const path = Object.hasOwn(state.index, product.model_number) ? state.index[product.model_number] : null;
      if (path) {
        const base = new URL("data/evidence/", document.baseURI), url = new URL(path, document.baseURI);
        if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw new Error("Evidence path invalid");
        const record = await fetchJSON(url);
        if (record.product?.model_number !== product.model_number || /demo|placeholder/i.test(record.dataStatus || "")) throw new Error("Evidence product mismatch or placeholder");
        entry.record = record;
      }
    } catch (e) { entry.error = e.message; }
    entry.loading = false;
    if (state.sides[side] === entry) render(side);
  }
  async function init() {
    try {
      [state.products, state.index] = await Promise.all([fetchJSON("data/taiwan-iol-catalog.json"), fetchJSON("data/evidence/index.json")]);
      if (!state.products.length) throw new Error("Catalog is empty");
      for (const [side, preferred] of [["a", "TFNT00"], ["b", "DIB00"]]) {
        const selectNode = document.getElementById(`iol-${side}`);
        state.products.forEach((p,i) => { const o = el("option", `${p.manufacturer} · ${p.model} · ${p.model_number || EMPTY}`); o.value = String(i); selectNode.append(o); });
        const i = state.products.findIndex(p => p.model_number === preferred); selectNode.value = String(i < 0 ? 0 : i); selectNode.disabled = false;
        selectNode.addEventListener("change", () => select(side));
      }
      document.getElementById("distance").addEventListener("input", () => { for (const side of ["a", "b"]) if (state.sides[side]) render(side); });
      await Promise.all([select("a"), select("b")]); document.getElementById("status").textContent = "比較目前資料庫的證據可用性；尚無資料不代表沒有研究或產品效果較差。";
    } catch (e) { document.getElementById("status").textContent = `無法載入比較資料：${e.message}`; }
  }
  init();
})();
