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
  function availability(record, product) {
    return window.EvidenceUtils.classify(product, record, state.records || []).map((cell,i)=>[window.EvidenceUtils.columns[i], cell.status]);
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
    if (product.model_number || product.product_key) { const a = el("a", "查看完整資料與來源"); a.href = window.EvidenceRouting.detail(product); node.append(a); }
    if (loading || error) return;
    node.append(el("h3", "Evidence comparison"), fields(availability(record, product)), el("h3", "Published study results · Viewing distance"), distanceResult(product, record));
    if (record?.modelRelationship) {
      node.append(el("h3", "Model relationship"), fields([["Catalog model", record.modelRelationship.catalog_model], ["Study model", record.modelRelationship.study_model], ["Relationship", record.modelRelationship.relationship]]));
      node.append(el("h3", "Adult clinical evidence available · Published study results"));
      const rows = (record.clinicalParameters || []).filter(p => numeric(p.value?.mean)).map(p => [p.label, `${p.value.mean.toFixed(2)} ± ${p.value.uncertainty.value.toFixed(2)} ${p.unit} [${p.sourceIds.join(", ")}]`]);
      node.append(fields(rows), el("p", "Measurement conditions：各列保留單眼／雙眼、矯正條件、距離與追蹤時間，請查看完整來源。"));
    }
    if (record?.disclaimer) node.append(el("p", record.disclaimer));
  }
  function renderShared() {
    const box = document.getElementById("shared-study"); box.replaceChildren(); box.hidden = true;
    const a = state.sides.a, b = state.sides.b;
    if (!a?.record || !b?.record || a.loading || b.loading) return;
    for (const left of a.record.sharedStudies || []) {
      const right = (b.record.sharedStudies || []).find(s => s.study_id === left.study_id && s.arm_id !== left.arm_id);
      if (!right || JSON.stringify(left.study) !== JSON.stringify(right.study)) continue;
      const s = left.study; box.hidden = false;
      box.append(el("h2", "Direct head-to-head evidence"), el("p", "Direct head-to-head study · " + s.study_id), el("h3", s.title), fields([["Study design", s.design], ["Total sample", `${s.total_sample.patients} patients / ${s.total_sample.eyes} eyes`], ["Follow-up", s.follow_up], ["Refractive target", `Approximately ${s.refractive_target.from_D} to ${s.refractive_target.to_D} D`], ["Measurement conditions", s.measurement_conditions]]));
      for (const ref of [left, right]) { const arm = s.arms[ref.arm_id]; box.append(el("p", `${arm.product_family}: ${arm.patients} patients / ${arm.eyes} eyes; study model: ${arm.study_model || "尚無資料（此研究未提供）"}`)); }
      const table = el("table"), head = el("tr");
      for (const title of ["Endpoint (logMAR, mean ± SD)", s.arms[left.arm_id].product_family, s.arms[right.arm_id].product_family, "Between-group p-value"]) head.append(el("th", title));
      const thead = el("thead"); thead.append(head); table.append(thead); const tbody = el("tbody");
      for (const o of s.outcomes) { const row = el("tr"); for (const v of [o.endpoint + (o.distance_cm ? ` (${o.distance_cm} cm)` : ""), ...[left,right].map(ref => `${o[ref.arm_id].mean.toFixed(2)} ± ${o[ref.arm_id].SD.toFixed(2)}`), `${o.between_group_p.operator} ${o.between_group_p.value}`]) row.append(el("td", v)); tbody.append(row); }
      const chart = el("div");
      if (window.HeadToHeadChart.mount(chart, {left, right})) box.append(chart);
      table.append(tbody); box.append(table, el("p", "UIVA / UNVA: This study reported a statistically significant between-group difference. 統計顯著不等於臨床優越性；未重新計算 effect size，亦不提供排名或推薦。"), el("p", `${s.review_status} · DOI ${s.DOI} · PMID ${s.PMID}`));
    }
  }
  async function select(side) {
    const product = state.products[Number(document.getElementById(`iol-${side}`).value)];
    const entry = { product, record: null, loading: true, error: null }; state.sides[side] = entry; render(side); renderShared();
    try {
      const path = window.EvidenceRouting.path(state.index, product);
      if (path) {
        const base = new URL("data/evidence/", document.baseURI), url = new URL(path, document.baseURI);
        if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw new Error("Evidence path invalid");
        const record = await fetchJSON(url);
        if (!window.EvidenceRouting.matches(record, product) || /demo|placeholder/i.test(record.dataStatus || "")) throw new Error("Evidence product mismatch or placeholder");
        entry.record = record;
      }
    } catch (e) { entry.error = e.message; }
    entry.loading = false;
    if (state.sides[side] === entry) { render(side); renderShared(); }
  }
  async function init() {
    try {
      [state.products, state.index] = await Promise.all([fetchJSON("data/taiwan-iol-catalog.json"), fetchJSON("data/evidence/index.json")]);
      state.records = (await Promise.all(state.products.map(async p => {
        const path = window.EvidenceRouting.path(state.index,p);
        if (!path) return null;
        try { const r = await fetchJSON(path); return window.EvidenceRouting.matches(r,p) && !/demo|placeholder/i.test(r.dataStatus || "") ? r : null; } catch { return null; }
      }))).filter(Boolean);
      if (!state.products.length) throw new Error("Catalog is empty");
      for (const [side, preferred] of [["a", "TFNT00"], ["b", "DIB00"]]) {
        const selectNode = document.getElementById(`iol-${side}`);
        state.products.forEach((p,i) => { const o = el("option", `${p.manufacturer} · ${p.model} · ${p.model_number || EMPTY}`); o.value = String(i); selectNode.append(o); });
        const requested = new URLSearchParams(location.search).get(side);
        const i = state.products.findIndex((p, j) => requested ? (p.product_key || p.model_number || `catalog:${j}`) === requested : p.model_number === preferred); selectNode.value = String(i < 0 ? 0 : i); selectNode.disabled = false;
        selectNode.addEventListener("change", () => select(side));
      }
      document.getElementById("distance").addEventListener("input", () => { for (const side of ["a", "b"]) if (state.sides[side]) render(side); });
      await Promise.all([select("a"), select("b")]); document.getElementById("status").textContent = "比較目前資料庫的證據可用性；尚無資料不代表沒有研究或產品效果較差。";
    } catch (e) { document.getElementById("status").textContent = `無法載入比較資料：${e.message}`; }
  }
  init();
})();
