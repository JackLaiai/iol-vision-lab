const CATALOG_URL = "data/taiwan-iol-catalog.json";
const EVIDENCE_INDEX_URL = "data/evidence/index.json";
const EMPTY_VALUE = "尚無資料";

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function formatValue(value, unit) {
  if (!hasValue(value)) return EMPTY_VALUE;
  if (typeof value === "object") {
    // Display reported observations only; never interpolate or feed the simulator.
    if (hasValue(value.mean)) {
      const uncertainty = hasValue(value.uncertainty?.value)
        ? ` ± ${value.uncertainty.value}${hasValue(value.uncertainty.type) ? ` (${value.uncertainty.type})` : ""}` : "";
      return `${value.mean}${uncertainty}${hasValue(unit) ? ` ${unit}` : ""}`;
    }
    if (hasValue(value.fromDiopters) && hasValue(value.throughDiopters) && hasValue(value.visualAcuityUpperBound)) {
      return `${value.fromDiopters > 0 ? "+" : ""}${value.fromDiopters} D 至 ${value.throughDiopters} D：VA ${value.comparison} ${value.visualAcuityUpperBound} ${unit || ""}`;
    }
    if (Array.isArray(value)) return value.length ? value.join("、") : EMPTY_VALUE;
    if (hasValue(value.value)) return `${value.value}${hasValue(value.unit) ? ` ${value.unit}` : ""}`;
    return EMPTY_VALUE;
  }
  return `${value}${hasValue(unit) ? ` ${unit}` : ""}`;
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(value => typeof value === "string" && value))];
}

function sourceIdsForParameter(record, parameter) {
  const mapped = record.parameterSourceMap?.[parameter.key];
  return uniqueStrings(Array.isArray(mapped) ? mapped : parameter.sourceIds);
}

function parameterLabelsByKey(record) {
  return Object.fromEntries(evidenceParameters(record).map(parameter => [parameter.key, parameter.label || parameter.key]));
}

function evidenceParameters(record) {
  return [...(record.clinicalParameters || []), ...(record.product?.marketEvidence || []), ...(record.in_vivo_optical_quality || [])];
}

function parameterKeysForSource(record, sourceLabel) {
  const keys = [];
  evidenceParameters(record).forEach(parameter => {
    if (sourceIdsForParameter(record, parameter).includes(sourceLabel)) keys.push(parameter.key);
  });
  return uniqueStrings(keys);
}

function validateEvidenceRecord(record) {
  const errors = [];
  if (!record || typeof record !== "object") return ["Evidence record 必須是 JSON object。"];
  if (!record.clinicalRecord || typeof record.clinicalRecord !== "object") {
    errors.push("缺少以 clinical-record.template.json 為基礎的 clinicalRecord。");
  }

  const parameters = evidenceParameters(record);
  const sources = Array.isArray(record.sources) ? record.sources : [];
  const parameterKeys = new Set();
  parameters.forEach(parameter => {
    if (!parameter?.key) errors.push("Clinical parameter 缺少 key。");
    if (parameterKeys.has(parameter?.key)) errors.push(`Clinical parameter key 重複：${parameter.key}`);
    parameterKeys.add(parameter?.key);
  });

  const sourceLabels = new Set();
  sources.forEach(source => {
    if (!source?.label) errors.push("Source 缺少 label。");
    if (sourceLabels.has(source?.label)) errors.push(`Source label 重複：${source.label}`);
    sourceLabels.add(source?.label);
  });

  parameters.forEach(parameter => {
    sourceIdsForParameter(record, parameter).forEach(sourceId => {
      if (!sourceLabels.has(sourceId)) errors.push(`${parameter.key} 對應到不存在的 source：${sourceId}`);
    });
  });
  return errors;
}

function renderProduct(record) {
  const product = record.product || {};
  document.querySelector("#product-name").textContent = hasValue(product.name) ? product.name : "產品名稱待提供";
  const identity = [product.manufacturer, product.model].filter(hasValue).join(" · ");
  document.querySelector("#product-summary").textContent = identity || "本頁為共用版型預覽，尚未接入任何產品或研究資料。";
}

function renderSourceTypeBadges(record) {
  const container = document.querySelector("#source-type-badges");
  container.replaceChildren();
  const types = uniqueStrings((record.sources || []).map(source => source.sourceType ?? source.source_type).filter(hasValue));
  if (!types.length) {
    container.textContent = "尚無已接入來源";
    return;
  }
  types.forEach(type => container.append(createElement("span", "evidence-badge source-type-badge", type)));
}

function createSourceMarker(sourceId, parameterLabel) {
  const marker = createElement("a", "source-marker", `[${sourceId}]`);
  marker.href = `#source-${sourceId}`;
  marker.setAttribute("aria-label", `${parameterLabel}：查看 ${sourceId} 來源`);
  return marker;
}

function renderClinicalParameters(record) {
  const container = document.querySelector("#clinical-parameters");
  container.replaceChildren();
  const parameters = Array.isArray(record.clinicalParameters) ? record.clinicalParameters : [];
  if (!parameters.length) {
    container.append(createElement("p", "empty-evidence", "尚無 clinical parameters。"));
    return;
  }

  // Group only records that explicitly provide the separate in-vivo category.
  const grouped = Array.isArray(record.in_vivo_optical_quality);
  const targets = {};
  if (grouped) {
    for (const [key, title] of [["va", "Clinical visual acuity"], ["vivo", "In-vivo optical quality"], ["defocus", "Defocus curve qualitative evidence"]]) {
      const group = createElement("div", "clinical-group");
      const heading = createElement("dt", "", title);
      const body = createElement("dd");
      const list = createElement("dl");
      if (key === "vivo") body.append(createElement("p", "", "Postoperative ocular optical-quality measurements；不是 IOL-only optical bench MTF，不可與 bench 50 lp/mm MTF 直接比較。"));
      body.append(list); group.append(heading, body); container.append(group); targets[key] = list;
    }
  }
  [...parameters, ...(record.in_vivo_optical_quality || [])].forEach(parameter => {
    const row = createElement("div", "evidence-metric");
    row.dataset.parameter = parameter.key;
    const label = parameter.label || parameter.key;
    row.append(createElement("dt", "", label));
    const value = createElement("dd", "", formatValue(parameter.value, parameter.unit));
    if (parameter.key === "defocus_curve") {
      const curves = (record.sources || []).filter(source =>
        sourceIdsForParameter(record, parameter).includes(source.label) && Array.isArray(source.defocus_points) && source.defocus_points.length);
      if (curves.length) {
        row.classList.add("defocus-metric");
        value.replaceChildren();
        curves.forEach(source => value.append(renderDefocusTable(source)));
      }
    }
    const markers = createElement("span", "source-markers");
    sourceIdsForParameter(record, parameter).forEach(sourceId => markers.append(createSourceMarker(sourceId, label)));
    value.append(markers);
    row.append(value);
    if (grouped) {
      const vivo = record.in_vivo_optical_quality.includes(parameter);
      if (vivo) value.append(createElement("p", "", `Measurement conditions: ${parameter.measurementContext.measurement_system}; pupil ${parameter.measurementContext.pupil_mm} mm; postoperative ${parameter.measurementContext.followUpDuration.value} ${parameter.measurementContext.followUpDuration.unit}.`));
      targets[vivo ? "vivo" : parameter.key.includes("defocus") ? "defocus" : "va"].append(row);
    } else container.append(row);
  });
}

function renderDefocusTable(source) {
  const table = createElement("table", "defocus-table");
  table.append(createElement("caption", "", `${source.source_table || "Defocus curve"} · ${source.label} · ${source.measurement || EMPTY_VALUE} · ${source.follow_up || EMPTY_VALUE} · ${source.lighting_condition || EMPTY_VALUE}`));
  const head = createElement("thead");
  const header = createElement("tr");
  ["Defocus (D)", "mean logMAR", "SD logMAR", "Source"].forEach(label => {
    const cell = createElement("th", "", label);
    cell.scope = "col";
    header.append(cell);
  });
  head.append(header);
  table.append(head);
  const body = createElement("tbody");
  // Transcribed observations only. No interpolation or simulator access.
  source.defocus_points.forEach(point => {
    const row = createElement("tr");
    const defocus = typeof point.defocus_D === "number" ? `${point.defocus_D > 0 ? "+" : ""}${point.defocus_D.toFixed(1)}` : EMPTY_VALUE;
    [defocus, point.mean_logMAR, point.SD_logMAR].forEach((value, index) => {
      row.append(createElement("td", "", index && typeof value === "number" ? value.toFixed(2) : formatValue(value)));
    });
    const citation = createElement("td");
    citation.append(createSourceMarker(point.source, "Defocus curve"));
    row.append(citation);
    body.append(row);
  });
  table.append(body);
  return table;
}

const sourceFields = [
  ["Implantation", "implantation"],
  ["Study design", "studyDesign"],
  ["Population", "population"],
  ["Sample size", "sampleSize"],
  ["Follow-up", "followUp"],
  ["Monocular / binocular", "monocularOrBinocular"],
  ["Corrected / uncorrected", "correctedOrUncorrected"],
  ["PMID / DOI / PMA / TFDA license", "sourceIdentifier"],
  ["URL", "url"]
];

function createSourceField(label, key, source) {
  const wrapper = createElement("div");
  wrapper.append(createElement("dt", "", label));
  const value = createElement("dd");
  if (key === "url" && hasValue(source[key])) {
    const link = createElement("a", "source-marker", source[key]);
    link.href = source[key];
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    value.append(link);
  } else {
    value.textContent = formatValue(source[key]);
  }
  wrapper.append(value);
  return wrapper;
}

function renderSourceCards(record) {
  const container = document.querySelector("#source-list");
  container.replaceChildren();
  const sources = Array.isArray(record.sources) ? record.sources : [];
  if (!sources.length) {
    container.append(createElement("p", "empty-evidence", "尚無來源資料。"));
    return;
  }

  const parameterLabels = parameterLabelsByKey(record);
  sources.forEach(source => {
    // Accept supplementary field names without changing S1–S3.
    source = { ...source,
      sourceType: source.sourceType ?? source.source_type,
      studyDesign: source.studyDesign ?? source.study_design,
      sampleSize: source.sampleSize ?? source.panoptix_subgroup,
      followUp: source.followUp ?? source.follow_up,
      sourceIdentifier: source.sourceIdentifier ?? [source.DOI && `DOI: ${source.DOI}`, source.PMID && `PMID: ${source.PMID}`].filter(Boolean).join("; ")
    };
    const card = createElement("article", "source-card");
    card.id = `source-${source.label}`;
    card.tabIndex = -1;
    card.setAttribute("aria-labelledby", `title-${source.label}`);
    const header = createElement("header");
    const badgeText = hasValue(source.sourceType) ? `${source.label} · ${source.sourceType}` : source.label;
    header.append(createElement("span", "evidence-badge", badgeText));
    const title = createElement("h3", "", hasValue(source.title) ? source.title : "來源標題待提供");
    title.id = `title-${source.label}`;
    header.append(title);
    header.append(createElement("p", "", `Source type：${formatValue(source.sourceType)}`));
    card.append(header);
    const verification = source.verification || {};
    const labels = { verified_primary_or_official_source: "Source verified", partially_verified: "Partially verified", not_independently_verified: "Verification pending" };
    const verificationDetails = createElement("details", "source-verification");
    const summary = createElement("summary");
    const verificationBadge = createElement("span", "evidence-badge", labels[verification.status] || "Verification pending");
    verificationBadge.title = "僅代表網站資料是否與原始／正式公開來源核對，不代表研究品質、證據等級或臨床優越性。";
    summary.append(verificationBadge); verificationDetails.append(summary);
    verificationDetails.append(createElement("p", "", verificationBadge.title), createElement("p", "", `Verified date：${formatValue(verification.verified_date)}`));
    const references = createElement("ul");
    (verification.verified_against || []).forEach(ref => references.append(createElement("li", "", ref)));
    if (!references.children.length) references.append(createElement("li", "", "尚無核對來源紀錄"));
    verificationDetails.append(references, createElement("p", "", formatValue(verification.notes)), createElement("p", "", "此為來源層級的核對狀態；record 中原有 extraction／review 註記保留為歷史紀錄。"));
    card.append(verificationDetails);

    const fields = createElement("dl", "source-fields");
    sourceFields.forEach(([label, key]) => fields.append(createSourceField(label, key, source)));
    [["Measurement", "measurement"], ["Lighting condition", "lighting_condition"], ["Visual acuity unit", "visual_acuity_unit"], ["Source table", "source_table"], ["Supplementary file", "supplementary_file"], ["Extraction method", "data_extraction_method"]].forEach(([label, key]) => {
      if (hasValue(source[key])) fields.append(createSourceField(label, key, source));
    });
    card.append(fields);

    const parameterLinks = createElement("div", "parameter-links");
    parameterLinks.append(createElement("h4", "", "本頁哪些參數來自此來源？"));
    const parameterKeys = parameterKeysForSource(record, source.label);
    if (Array.isArray(record.opticalEvidence?.mtf) && record.opticalEvidence.mtf.some(item => item.source === source.label)) {
      parameterKeys.push("Optical Bench Evidence：MTF");
    }
    const parameterText = parameterKeys.length
      ? parameterKeys.map(key => parameterLabels[key] || key).join("、")
      : "尚未建立參數對應。";
    parameterLinks.append(createElement("p", "", parameterText));
    card.append(parameterLinks);
    container.append(card);
  });
}

function containsOpticalNumber(value) {
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.some(containsOpticalNumber);
  if (value && typeof value === "object") return Object.values(value).some(containsOpticalNumber);
  return false;
}

function renderOpticalEvidence(record) {
  const container = document.querySelector("#optical-evidence-data");
  container.replaceChildren();
  const definitions = [
    // focus may be distance/intermediate/near; frequency units remain source-specific (e.g. lp/mm or cycles/degree).
    ["mtf", "MTF — Modulation Transfer Function", ["focus", "pupil_mm", "wavelength_nm", "spatial_frequency", "values", "measurement_system", "model_eye_condition", "measurement_condition", "source"]],
    ["throughFocusMTF", "Through-focus MTF", ["defocus_D", "spatial_frequency", "value", "pupil_mm", "wavelength_nm", "measurement_condition", "source"]],
    ["ptf", "PTF — Phase Transfer Function", ["focus", "defocus_D", "pupil_mm", "wavelength_nm", "spatial_frequency", "phase_value", "phase_unit", "measurement_system", "model_eye_condition", "source"]],
    ["otf", "OTF — Optical Transfer Function", ["available", "representation", "spatial_frequency_grid", "complex_values", "pupil_mm", "wavelength_nm", "defocus_D", "source"]],
    ["psf", "PSF — Point Spread Function", ["available", "pupil_mm", "wavelength_nm", "defocus_D", "values", "matrix", "pixel_scale", "normalization", "measurement_condition", "source"]]
  ];
  definitions.forEach(([key, title, fields]) => {
    const section = createElement("section", "optical-measurement");
    section.append(createElement("h4", "", title));
    const data = record.opticalEvidence?.[key];
    const valueFields = { mtf: ["mtf_value", "values"], throughFocusMTF: ["value"], ptf: ["phase_value"], otf: ["complex_values"], psf: ["matrix", "values"] };
    const records = Array.isArray(data) ? data : [data];
    const hasNumbers = records.some(item => valueFields[key].some(field => containsOpticalNumber(item?.[field])));
    if (!hasNumbers) {
      section.append(createElement("p", "empty-evidence", "尚無公開數值資料"));
      container.append(section);
      return;
    }
    if (key === "mtf" && Array.isArray(record.opticalEvidence?.mtf)) {
      record.opticalEvidence.mtf.forEach(item => {
        const measurement = createElement("article", "mtf-record");
        const heading = createElement("h4", "", `Pupil ${formatValue(item.pupil_mm, "mm")} · ${formatValue(item.focus)} focus`);
        const details = createElement("dl", "source-fields");
        [
          ["MTF", "mtf_value"], ["Wavelength (nm)", "wavelength_nm"],
          ["Spatial frequency", "spatial_frequency"], ["Measurement system", "measurement_system"],
          ["Model eye condition", "model_eye_condition"], ["Measurement condition", "measurement_condition"]
        ].forEach(([label, field]) => details.append(createSourceField(label, field, item)));
        measurement.append(heading, details);
        if ((record.sources || []).some(source => source.label === item.source)) {
          measurement.append(createSourceMarker(item.source, `${item.pupil_mm} mm ${item.focus} MTF`));
        }
        section.append(measurement);
      });
      if (!record.opticalEvidence.mtf.length) section.append(createElement("p", "empty-evidence", EMPTY_VALUE));
      container.append(section);
      return;
    }
    const list = createElement("dl", "source-fields");
    fields.forEach(field => {
      const row = createElement("div");
      const value = record.opticalEvidence?.[key]?.[field];
      if (field === "spatial_frequency") {
        row.append(createElement("dt", "", field), createElement("dd", "",
          `value: ${formatValue(value?.value)}；unit: ${formatValue(value?.unit)}`));
        list.append(row);
        return;
      }
      // Present only stored data: no conversion, calculation, or clinical fallback.
      const display = !hasValue(value) ? EMPTY_VALUE
        : typeof value === "object" ? JSON.stringify(value) : String(value);
      row.append(createElement("dt", "", field), createElement("dd", "", display));
      list.append(row);
    });
    section.append(list);
    container.append(section);
  });
}

function renderSimulation(record) {
  const simulation = record.websiteSimulation || {};
  document.querySelector("#simulation-description").textContent = hasValue(simulation.description)
    ? simulation.description
    : "尚無資料。Published clinical evidence 與網站模擬維持分開。";
  const status = document.querySelector("#simulation-status");
  status.replaceChildren(document.createTextNode(formatValue(simulation.status)));
  status.append(createElement("br"));
  status.append(createElement("small", "", "此區不會把 clinical values 當成模擬結果。"));
}

function renderDisclaimer(record) {
  const container = document.querySelector("#evidence-disclaimer");
  container.replaceChildren();
  container.append(createElement("strong", "", "教育用途聲明"));
  container.append(createElement("p", "", hasValue(record.disclaimer) ? record.disclaimer : EMPTY_VALUE));
}

function revealEvidenceSource(hash) {
  if (!/^#source-[A-Za-z0-9_-]+$/.test(hash)) return;
  const card = document.getElementById(hash.slice(1));
  if (!card) return;
  const details = card.closest("details");
  if (details) details.open = true;
  card.focus({ preventScroll: true });
  card.scrollIntoView({ block: "start" });
}

function bindSourceNavigation() {
  document.querySelectorAll('.source-marker[href^="#source-"]').forEach(link => {
    link.addEventListener("click", () => revealEvidenceSource(link.hash));
  });
}

function renderEvidencePanel(record, product = null) {
  const errors = validateEvidenceRecord(record);
  if (errors.length) throw new Error(errors.join(" "));
  if (product) renderCatalogProduct(product);
  else renderProduct(record);
  // Taiwan market claims stay with product data, outside clinical observations.
  const productFields = document.querySelector("#product-fields");
  productFields.querySelectorAll("[data-market-evidence]").forEach(field => field.remove());
  (record.product?.marketEvidence || []).forEach(parameter => {
    const field = createSourceField(parameter.label || parameter.key, "value", parameter);
    field.dataset.marketEvidence = parameter.key;
    const markers = createElement("span", "source-markers");
    sourceIdsForParameter(record, parameter).forEach(id => markers.append(createSourceMarker(id, parameter.label || parameter.key)));
    field.querySelector("dd").append(markers);
    productFields.append(field);
  });
  renderSourceTypeBadges(record);
  document.querySelector("#last-verified-date").textContent = formatValue(record.lastVerifiedDate);
  renderClinicalParameters(record);
  renderSourceCards(record);
  window.DefocusCalculator.mount(document.querySelector("#distance-calculator"), record);
  const chartContainer = document.getElementById("defocus-chart");
  const numericalSource = (record.sources || []).find(source => Array.isArray(source.defocus_points) && source.defocus_points.some(p => Number.isFinite(p.defocus_D) && Number.isFinite(p.mean_logMAR)));
  const input = document.getElementById("viewing-distance-cm");
  const chart = window.DefocusChart.mount(chartContainer, {
    points: numericalSource?.defocus_points, source: numericalSource,
    measurementConditions: numericalSource ? [numericalSource.measurement, numericalSource.follow_up ?? numericalSource.followUp, numericalSource.lighting_condition, numericalSource.visual_acuity_unit, numericalSource.panoptix_subgroup ?? numericalSource.sampleSize] : [],
    selectedDistanceCm: input?.valueAsNumber,
    calculate: distance => window.DefocusCalculator.calculate(distance, record)
  });
  if (input) input.addEventListener("input", () => chart.update(input.valueAsNumber));
  renderSimulation(record);
  renderOpticalEvidence(record);
  renderDisclaimer(record);
  bindSourceNavigation();
  revealEvidenceSource(location.hash);
}

function renderEvidenceError(error) {
  document.querySelector("#product-name").textContent = "資料載入失敗";
  document.querySelector("#product-summary").textContent = error.message;
  document.querySelector("#source-type-badges").textContent = EMPTY_VALUE;
  document.querySelector("#last-verified-date").textContent = EMPTY_VALUE;
  document.querySelector("#clinical-parameters").replaceChildren(createElement("p", "empty-evidence", "無法載入 clinical parameters。"));
  document.querySelector("#source-list").replaceChildren(createElement("p", "empty-evidence", "無法載入 sources。"));
  renderDisclaimer({ disclaimer: "資料未成功載入；本頁不顯示或推測任何 clinical evidence。" });
}

async function loadEvidenceData(url) {
  if (typeof url !== "string" || !url) throw new Error("缺少 JSON 路徑。");
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Evidence JSON 載入失敗（HTTP ${response.status}）。`);
  return response.json();
}

function renderCatalogProduct(product) {
  document.querySelector("#product-name").textContent = formatValue(product.model);
  document.querySelector("#product-summary").textContent = [product.manufacturer, product.model_number].filter(hasValue).join(" · ") || EMPTY_VALUE;
  const fields = document.querySelector("#product-fields");
  fields.replaceChildren();
  [
    ["Manufacturer", "manufacturer"], ["Model", "model"],
    ["Model number", "model_number"], ["IOL type", "iol_type"],
    ["Toric", "toric"], ["TFDA status", "taiwan_tfda_status"],
    ["TFDA license number", "tfda_license_number"], ["NHI category", "nhi_category"],
    ["Last verified date", "last_verified_date"]
  ].forEach(([label, key]) => fields.append(createSourceField(label, key, product)));
  document.querySelector("#product-details").hidden = false;
}

function renderEvidenceUnavailable(message) {
  renderOpticalEvidence({});
  document.querySelector("#source-type-badges").textContent = EMPTY_VALUE;
  document.querySelector("#last-verified-date").textContent = EMPTY_VALUE;
  const list = document.querySelector("#clinical-parameters");
  const row = createElement("div", "evidence-metric");
  row.append(createElement("dt", "", "臨床證據狀態"), createElement("dd", "", message));
  list.replaceChildren(row);
  document.querySelector("#source-list").replaceChildren(createElement("p", "empty-evidence", message));
  document.querySelector("#simulation-description").textContent = "尚無此產品的網站模擬資料。";
  document.querySelector("#simulation-status").textContent = EMPTY_VALUE;
  renderDisclaimer({ disclaimer: "本頁產品基本資料來自台灣產品 catalog；不代表已具備臨床證據或個人術後視覺預測。" });
}

function resolveEvidenceURL(path) {
  // Relative to this page, including a GitHub Pages project subdirectory.
  if (typeof path !== "string" || !/^data\/evidence\/[A-Za-z0-9_-]+\.json$/.test(path) || path === EVIDENCE_INDEX_URL) {
    throw new Error("Evidence mapping 路徑無效。");
  }
  return new URL(path, document.baseURI).href;
}

async function initializeEvidencePanel() {
  renderOpticalEvidence({});
  document.querySelector("#distance-calculator").hidden = true;
  document.querySelector("#distance-calculator").replaceChildren();
  document.querySelector("#product-details").hidden = true;
  document.querySelector("#product-fields").replaceChildren();
  const model = new URLSearchParams(location.search).get("model");
  const productKey = new URLSearchParams(location.search).get("product");
  const catalogIndex = new URLSearchParams(location.search).get("catalog");
  if (catalogIndex === null && !productKey && (!model || !model.trim())) {
    document.querySelector("#product-name").textContent = "請指定產品型號";
    document.querySelector("#product-summary").textContent = "請透過含有 model 參數的產品連結開啟本頁。";
    renderEvidenceUnavailable("尚未選擇產品");
    return;
  }
  let product;
  try {
    const catalog = await loadEvidenceData(CATALOG_URL);
    if (!Array.isArray(catalog)) throw new Error("產品 catalog 格式無效。");
    const matches = catalog.filter((item, i) => catalogIndex !== null ? /^\d+$/.test(catalogIndex) && i === Number(catalogIndex) : productKey ? item.product_key === productKey : item.model_number === model.trim());
    if (!matches.length) {
      document.querySelector("#product-name").textContent = "找不到此產品";
      document.querySelector("#product-summary").textContent = `台灣 catalog 中沒有型號：${model}`;
      renderEvidenceUnavailable("找不到此產品");
      return;
    }
    if (matches.length !== 1) throw new Error("產品型號重複，暫時無法顯示。");
    product = matches[0];
    renderCatalogProduct(product);
  } catch (error) {
    renderEvidenceError(error);
    renderEvidenceUnavailable("產品資料載入失敗");
    return;
  }
  try {
    const index = await loadEvidenceData(EVIDENCE_INDEX_URL);
    if (!index || Array.isArray(index) || typeof index !== "object") throw new Error("Evidence index 格式無效。");
    const path = window.EvidenceRouting.path(index, product);
    if (path === null || path === undefined) {
      renderEvidenceUnavailable("臨床證據資料整理中");
      return;
    }
    const record = await loadEvidenceData(resolveEvidenceURL(path));
    if (!window.EvidenceRouting.matches(record, product) || /placeholder|demo/i.test(record.dataStatus || "")) {
      throw new Error("Evidence 產品型號不符或仍為測試資料。");
    }
    renderEvidencePanel(record, product);
  } catch (error) {
    renderEvidenceUnavailable("臨床證據資料暫時無法載入");
  }
}

window.EvidencePanel = {
  formatValue,
  sourceIdsForParameter,
  validateEvidenceRecord,
  renderEvidencePanel,
  loadEvidenceData,
  initializeEvidencePanel
};

window.addEventListener("hashchange", () => revealEvidenceSource(location.hash));
initializeEvidencePanel();
