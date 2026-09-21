/* Admin-curated media only. No optical image processing or upload path. */
(() => {
  "use strict";
  const el = (tag, text, cls) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  };
  async function json(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`資料載入失敗（${response.status}）`);
    return response.json();
  }
  function localFile(path, prefix) {
    if (typeof path !== "string" || !path.startsWith(prefix)) return null;
    const base = new URL(prefix, document.baseURI);
    const url = new URL(path, document.baseURI);
    return url.origin === base.origin && url.pathname.startsWith(base.pathname) ? url.href : null;
  }
  function media(scene) {
    const empty = () => el("p", "場景素材尚未加入", "scene-media-empty");
    const url = localFile(scene.media?.file, "assets/scenes/");
    if (!url || !["image", "video"].includes(scene.media?.type)) return empty();
    const node = el(scene.media?.type === "image" ? "img" : "video");
    if (scene.media?.type === "image") { node.alt = scene.title_zh; node.loading = "lazy"; }
    else { node.controls = true; node.preload = "metadata"; node.setAttribute("aria-label", scene.title_zh); }
    node.addEventListener("error", () => node.replaceWith(el("p", "場景素材無法載入", "scene-media-empty")), { once: true });
    node.src = url;
    return node;
  }
  function result(scene, product, record) {
    const box = el("div", undefined, "scene-result");
    if (scene.distance_scope !== "primary_target_only" || !Number.isFinite(scene.viewing_distance_cm) || scene.viewing_distance_cm <= 0) {
      box.append(el("p", "未設定明確的主要觀看目標距離；不計算 defocus。")); return box;
    }
    if (!record) { box.append(el("p", "此 IOL 尚無可用研究離焦曲線，無法估算。")); return box; }
    const value = window.DefocusCalculator.calculate(scene.viewing_distance_cm, record);
    if (value.error) { box.append(el("p", value.error)); return box; }
    const direct = value.method === "direct published point";
    box.append(el("span", direct ? "Direct published point" : "Website-derived linear interpolation", `scene-badge ${direct ? "scene-direct" : "scene-interpolation"}`),
      el("p", `${value.distanceCm} cm → ${value.distanceM.toFixed(2)} m → Defocus = -1 / ${value.distanceM.toFixed(2)} = ${value.defocus.toFixed(2)} D`),
      el("p", `研究平均 logMAR：${direct ? value.mean.toFixed(2) : `約 ${value.mean.toFixed(5)}`}`),
      el("p", `Published SD：${direct && value.sd !== null ? value.sd.toFixed(2) : "不提供"}`));
    if (!direct) box.append(el("p", `內插使用原始點：${value.points.map(p => `${p.defocus_D} D / ${p.mean_logMAR.toFixed(2)} logMAR`).join("、")}；計算使用未四捨五入的 defocus。`));
    for (const source of new Set(value.points.map(p => p.source))) {
      const link = el("a", `[${source}]`);
      link.href = `iol-detail.html?model=${encodeURIComponent(product.model_number)}#source-${encodeURIComponent(source)}`;
      box.append(link);
    }
    box.append(el("p", "此數值為依研究離焦視力曲線得到的研究平均結果／內插估計，不代表個人術後視力。"));
    return box;
  }
  function render(scenes, product, record) {
    const cards = document.getElementById("scene-cards"); cards.replaceChildren();
    for (const scene of scenes) {
      const card = el("article", undefined, "scene-card"); card.dataset.scene = scene.id;
      card.append(el("h2", scene.title_zh), media(scene));
      const fields = el("dl");
      for (const [name, value] of [["Media", scene.media?.type === "image" ? "Image" : scene.media?.type === "video" ? "Video" : "Image / Video：尚未指定"], ["Lighting", scene.lighting], ["Focus category", scene.focus_category], ["主要觀看目標距離", Number.isFinite(scene.viewing_distance_cm) ? `${scene.viewing_distance_cm} cm` : "未設定固定距離"], ["Simulation status", "not_connected · Optical image simulation 尚未啟用"]]) fields.append(el("dt", name), el("dd", value));
      card.append(fields, el("p", "此距離僅代表主要觀看目標，不代表畫面中所有物體皆位於相同距離。"), result(scene, product, record)); const detailURL = new URL(window.EvidenceRouting.detail(product), document.baseURI);
      detailURL.searchParams.set("scene", scene.id);
      if (scene.distance_scope === "primary_target_only" && Number.isFinite(scene.viewing_distance_cm) && scene.viewing_distance_cm > 0) detailURL.searchParams.set("distance", scene.viewing_distance_cm);
      const action = el("a", detailURL.searchParams.has("distance") ? "查看此場景的視力證據" : "查看 IOL 證據（未設定主要觀看距離）");
      action.href = detailURL.href; action.className = "scene-detail-action"; card.append(action); cards.append(card);
    }
  }
  async function init() {
    const status = document.getElementById("library-status");
    const select = document.getElementById("scene-iol");
    try {
      const [scenes, catalog, index] = await Promise.all([json("data/scenes.json"), json("data/taiwan-iol-catalog.json"), json("data/evidence/index.json")]);
      select.replaceChildren();
      catalog.forEach((product, i) => {
        const option = el("option", `${product.manufacturer} · ${product.model} · ${product.model_number || "型號尚無資料"}`); option.value = String(i); select.append(option);
      });
      const requested = new URLSearchParams(location.search).get("model");
      const initial = catalog.findIndex(p => requested ? p.model_number === requested : Object.hasOwn(index, p.model_number));
      select.value = String(initial >= 0 ? initial : 0); select.disabled = false;
      let generation = 0;
      async function update() {
        const token = ++generation;
        const product = catalog[Number(select.value)];
        render(scenes, product, null); status.textContent = "正在讀取所選 IOL 的研究資料。";
        let record = null, error = null;
        try {
          const path = localFile(window.EvidenceRouting.path(index, product), "data/evidence/");
          if (path) {
            record = await json(path);
            if (!window.EvidenceRouting.matches(record, product) || /demo|placeholder/i.test(record.dataStatus || "")) throw new Error("Evidence 與所選產品不符或仍為 placeholder。");
          }
        } catch (e) { record = null; error = e.message; }
        if (token !== generation) return;
        render(scenes, product, record);
        status.textContent = error || `${product.model}：${record ? "已載入研究資料" : "臨床證據資料整理中"}。目前僅顯示研究視力資料，尚未套用影像模擬。`;
      }
      select.addEventListener("change", update); await update();
    } catch (error) { status.textContent = `Scene Library 暫時無法載入：${error.message}`; }
  }
  init();
})();
