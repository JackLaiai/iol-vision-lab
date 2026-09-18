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
  return Object.fromEntries((record.clinicalParameters || []).map(parameter => [parameter.key, parameter.label || parameter.key]));
}

function parameterKeysForSource(record, sourceLabel) {
  const keys = [];
  (record.clinicalParameters || []).forEach(parameter => {
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

  const parameters = Array.isArray(record.clinicalParameters) ? record.clinicalParameters : [];
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
  const types = uniqueStrings((record.sources || []).map(source => source.sourceType).filter(hasValue));
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

  parameters.forEach(parameter => {
    const row = createElement("div", "evidence-metric");
    row.dataset.parameter = parameter.key;
    const label = parameter.label || parameter.key;
    row.append(createElement("dt", "", label));
    const value = createElement("dd", "", formatValue(parameter.value, parameter.unit));
    const markers = createElement("span", "source-markers");
    sourceIdsForParameter(record, parameter).forEach(sourceId => markers.append(createSourceMarker(sourceId, label)));
    value.append(markers);
    row.append(value);
    container.append(row);
  });
}

const sourceFields = [
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

    const fields = createElement("dl", "source-fields");
    sourceFields.forEach(([label, key]) => fields.append(createSourceField(label, key, source)));
    card.append(fields);

    const parameterLinks = createElement("div", "parameter-links");
    parameterLinks.append(createElement("h4", "", "本頁哪些參數來自此來源？"));
    const parameterKeys = parameterKeysForSource(record, source.label);
    const parameterText = parameterKeys.length
      ? parameterKeys.map(key => parameterLabels[key] || key).join("、")
      : "尚未建立參數對應。";
    parameterLinks.append(createElement("p", "", parameterText));
    card.append(parameterLinks);
    container.append(card);
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
  renderSourceTypeBadges(record);
  document.querySelector("#last-verified-date").textContent = formatValue(record.lastVerifiedDate);
  renderClinicalParameters(record);
  renderSourceCards(record);
  renderSimulation(record);
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
  document.querySelector("#product-details").hidden = true;
  document.querySelector("#product-fields").replaceChildren();
  const model = new URLSearchParams(location.search).get("model");
  if (!model || !model.trim()) {
    document.querySelector("#product-name").textContent = "請指定產品型號";
    document.querySelector("#product-summary").textContent = "請透過含有 model 參數的產品連結開啟本頁。";
    renderEvidenceUnavailable("尚未選擇產品");
    return;
  }
  let product;
  try {
    const catalog = await loadEvidenceData(CATALOG_URL);
    if (!Array.isArray(catalog)) throw new Error("產品 catalog 格式無效。");
    const matches = catalog.filter(item => item.model_number === model.trim());
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
    const path = Object.hasOwn(index, product.model_number) ? index[product.model_number] : null;
    if (path === null || path === undefined) {
      renderEvidenceUnavailable("臨床證據資料整理中");
      return;
    }
    const record = await loadEvidenceData(resolveEvidenceURL(path));
    if (record.product?.model_number !== product.model_number || /placeholder|demo/i.test(record.dataStatus || "")) {
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
