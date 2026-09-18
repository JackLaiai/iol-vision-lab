/* Study-mean calculator only. No image simulator dependencies or evidence mutations. */
(function (root) {
  "use strict";
  const OUTSIDE = "超出目前研究資料範圍，無法估算";

  function calculate(distanceCm, record) {
    if (typeof distanceCm !== "number" || !Number.isFinite(distanceCm) || distanceCm <= 0) {
      return { error: "請輸入大於 0 的有限距離（cm）" };
    }
    const distanceM = distanceCm / 100;
    const defocus = -1 / distanceM;
    const base = { distanceCm, distanceM, defocus };
    if (defocus < -3.5 || defocus > 0) return { ...base, error: OUTSIDE };
    const source = record?.product?.model_number === "TFNT00"
      ? record.sources?.find(item => item.label === "S4") : null;
    const points = (source?.defocus_points || [])
      .filter(point => point.source === "S4" && Number.isFinite(point.defocus_D) &&
        point.defocus_D >= -3.5 && point.defocus_D <= 0)
      .slice().sort((a, b) => a.defocus_D - b.defocus_D);
    // Strict matching: do not snap a nearby distance to a published point.
    const direct = points.find(point => point.defocus_D === defocus);
    if (direct && Number.isFinite(direct.mean_logMAR)) {
      return { ...base, method: "direct published point", mean: direct.mean_logMAR,
        sd: Number.isFinite(direct.SD_logMAR) ? direct.SD_logMAR : null, points: [direct] };
    }
    for (let i = 1; i < points.length; i += 1) {
      const left = points[i - 1], right = points[i];
      if (left.defocus_D < defocus && defocus < right.defocus_D &&
          Number.isFinite(left.mean_logMAR) && Number.isFinite(right.mean_logMAR)) {
        const mean = left.mean_logMAR + ((defocus - left.defocus_D) /
          (right.defocus_D - left.defocus_D)) * (right.mean_logMAR - left.mean_logMAR);
        return { ...base, method: "website-derived linear interpolation", mean, sd: null, points: [left, right] };
      }
    }
    return { ...base, error: "缺少可用的 S4 原始資料，無法估算" };
  }

  function mount(container, record) {
    container.replaceChildren();
    container.hidden = true;
    if (record?.product?.model_number !== "TFNT00" || !record.sources?.some(s => s.label === "S4")) return;
    container.hidden = false;
    const el = (tag, text, className) => {
      const node = document.createElement(tag);
      if (text !== undefined) node.textContent = text;
      if (className) node.className = className;
      return node;
    };
    const heading = el("h3", "Viewing Distance / Defocus Calculator");
    heading.id = "distance-calculator-title";
    container.setAttribute("aria-labelledby", heading.id);
    container.append(heading,
      el("p", "Defocus Curve（離焦視力曲線）；logMAR = logarithm of the Minimum Angle of Resolution；Linear Interpolation（線性內插）。"),
      el("p", "依據該研究的雙眼遠距矯正離焦曲線所得到的研究平均值／內插估計，不代表個人術後視力。", "disclaimer-box"),
      el("p", "僅使用 S4 的 0 D 至 −3.5 D 資料；不外推、不內插 SD、不轉換為 image blur。"));
    const label = el("label", "Viewing distance（cm）");
    const input = el("input");
    input.type = "number";
    input.step = "any";
    input.id = "viewing-distance-cm";
    input.value = "40";
    label.htmlFor = input.id;
    const output = el("div", undefined, "distance-results");
    output.id = "distance-results";
    output.setAttribute("aria-live", "polite");
    container.append(label, input, output);
    const number = value => Number(value.toPrecision(12)).toString();
    const update = () => {
      const result = calculate(input.valueAsNumber, record);
      output.replaceChildren();
      if (Number.isFinite(result.defocus)) {
        output.append(el("p", `distance_m = ${number(result.distanceCm)} / 100 = ${number(result.distanceM)} m`),
          el("p", `Defocus = -1 / ${number(result.distanceM)} = ${number(result.defocus)} D（約 ${result.defocus.toFixed(2)} D）`));
      }
      if (result.error) {
        output.append(el("p", result.error));
        return;
      }
      const direct = result.method === "direct published point";
      output.append(el("span", result.method, `evidence-badge ${direct ? "published-point" : "interpolated-point"}`));
      const fields = el("dl", undefined, "source-fields");
      [["Calculated defocus (D)", number(result.defocus)],
        ["Study-derived mean logMAR", direct ? result.mean.toFixed(2) : `約 ${result.mean.toFixed(5)}`],
        ["Published SD (logMAR)", direct && result.sd !== null ? result.sd.toFixed(2) : "不提供"],
        ["Calculation method", result.method]].forEach(([name, value]) => {
          const row = el("div"); row.append(el("dt", name), el("dd", value)); fields.append(row);
        });
      output.append(fields);
      if (!direct) {
        const [a, b] = result.points;
        output.append(el("p", `Published points：(${a.defocus_D} D, ${a.mean_logMAR.toFixed(2)} logMAR) 與 (${b.defocus_D} D, ${b.mean_logMAR.toFixed(2)} logMAR)`),
          el("p", "VA = y1 + ((x-x1)/(x2-x1)) × (y2-y1)"),
          el("p", `VA = ${a.mean_logMAR.toFixed(2)} + ((${number(result.defocus)} - (${a.defocus_D})) / (${b.defocus_D} - (${a.defocus_D}))) × (${b.mean_logMAR.toFixed(2)} - (${a.mean_logMAR.toFixed(2)})) ≈ ${result.mean.toFixed(5)} logMAR`),
          el("p", "公式顯示值經格式化；計算使用未四捨五入的 defocus。SD 不提供。"));
      }
      const link = el("a", "[S4]", "source-marker");
      link.href = "#source-S4";
      link.addEventListener("click", () => {
        const card = document.getElementById("source-S4");
        if (card) { card.closest("details").open = true; card.focus(); }
      });
      output.append(link);
    };
    input.addEventListener("input", update);
    update();
  }
  root.DefocusCalculator = { calculate, mount };
})(typeof window === "undefined" ? globalThis : window);
