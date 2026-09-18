// Current renderer explicitly uses demo / heuristic data only.
// Clinical records are separate and must not fall back to these values.
// DEMO / HEURISTIC DATA: not published clinical data; cannot be used for real IOL prediction.
// Category profiles (far/intermediate/near/dys), base halo/glare/contrast and blur
// are defined in data/demo-lenses.js for all four IOL categories.
const lensData = demoLensData;

// Demo scene distances are labels, not measured optical inputs.
// DEMO / HEURISTIC DATA: not published clinical data; cannot be used for real IOL prediction.
// Distance labels are illustrative scene settings, not clinical measurements.
const scenes = {
  street:{name:"遠距離街景",distance:"5 m+",hint:"道路、招牌、遠方物體",className:"scene-street"},
  computer:{name:"電腦工作",distance:"60–80 cm",hint:"螢幕與桌面工作距離",className:"scene-computer"},
  phone:{name:"手機閱讀",distance:"35–40 cm",hint:"手機、書籍與近距離閱讀",className:"scene-phone"},
  night:{name:"夜間駕駛",distance:"5 m+",hint:"夜間車燈與道路辨識",className:"scene-night"},
  restaurant:{name:"餐廳室內",distance:"50–150 cm",hint:"中距離人臉與桌面近距離",className:"scene-restaurant"}
};

let currentScene = "street";
// Demo / heuristic defaults; not patient measurements.
// DEMO / HEURISTIC DATA: not published clinical data; cannot be used for real IOL prediction.
// Initial halo, glare, contrast, residual astigmatism and pupil are demo inputs.
let settings = {halo:38,glare:26,contrast:92,astig:.2,pupil:3.4};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function populateLensSelect(select, value){
  Object.entries(lensData).forEach(([key,lens])=>{
    const option=document.createElement("option");
    option.value=key; option.textContent=lens.name;
    select.appendChild(option);
  });
  select.value=value;
}
populateLensSelect($("#lensLeft"),"monofocal");
populateLensSelect($("#lensRight"),"trifocal");

Object.entries(scenes).forEach(([key,scene])=>{
  const b=document.createElement("button");
  b.textContent=scene.name;
  b.dataset.scene=key;
  if(key===currentScene)b.classList.add("active");
  b.onclick=()=>{currentScene=key; render();};
  $("#sceneTabs").appendChild(b);
});

// Demo / heuristic model: all weights, thresholds and limits are unvalidated.
// DEMO / HEURISTIC DATA: not published clinical data; cannot be used for real IOL prediction.
// Night/pupil multipliers, blending weights, contrast/blur coefficients and clamps
// are manually assigned effects, with no validated clinical prediction mapping.
function effective(side){
  const lens = lensData[$(`#lens${side}`).value];
  const scene = scenes[currentScene];
  const nightFactor = currentScene==="night" ? 1.25 : 1;
  const pupilFactor = 1 + Math.max(0,settings.pupil-3.0)*0.11;
  const blend = .55;
  const halo = Math.min(100,(lens.base.halo*(1-blend)+settings.halo*blend)*nightFactor*pupilFactor);
  const glare = Math.min(100,(lens.base.glare*(1-blend)+settings.glare*blend)*nightFactor*pupilFactor);
  const contrast = Math.max(50,Math.min(115,(lens.base.contrast*.45+settings.contrast*.55)-settings.astig*6));
  const blur = lens.blur[currentScene] + settings.astig*.72 + Math.max(0,settings.pupil-4.5)*.08;
  return {lens,scene,halo,glare,contrast,blur};
}

// Demo rendering coefficients map to CSS effects, not clinical units.
// DEMO / HEURISTIC DATA: not published clinical data; cannot be used for real IOL prediction.
// CSS blur, contrast, saturation, scale and overlay opacity coefficients are visual effects.
function renderSide(side){
  const e=effective(side);
  const frame=$(`#scene${side}`);
  const art=frame.querySelector(".scene-art");
  art.className=`scene-layer scene-art ${e.scene.className}`;
  art.style.filter=`blur(${e.blur}px) contrast(${e.contrast}%) saturate(${Math.max(74,e.contrast-3)}%)`;
  art.style.transform=`scale(${1+e.blur*.005})`;
  frame.querySelector(".halo-layer").style.opacity=(e.halo/100*.78).toFixed(2);
  frame.querySelector(".glare-layer").style.opacity=(e.glare/100*.72).toFixed(2);
  frame.querySelector(".astigmatism-layer").style.opacity=Math.min(.55,settings.astig/2.2);
  frame.querySelector(".astigmatism-layer").style.backdropFilter=`blur(${settings.astig*.32}px)`;
  $(`#distance${side}`).textContent=e.scene.distance;
  $(`#sceneName${side}`).textContent=e.scene.name;
  $(`#sceneHint${side}`).textContent=e.scene.hint;

  // DEMO / HEURISTIC DATA: not published clinical data; cannot be used for real IOL prediction.
  // Scores and /100 bars are illustrative; dys is not an incidence rate.
  const p=e.lens.profile;
  $(`#profile${side}`).innerHTML=[
    ["遠距離",p.far],["中距離",p.intermediate],["近距離",p.near],["夜間光學現象",100-p.dys]
  ].map(([label,val],i)=>`<div class="metric"><small>${label}</small><b>${i===3?(100-val)+" / 100":val+" / 100"}</b><div class="bar"><i style="width:${val}%"></i></div></div>`).join("");
}

function render(){
  $$("#sceneTabs button").forEach(b=>b.classList.toggle("active",b.dataset.scene===currentScene));
  renderSide("Left"); renderSide("Right");
}
$("#lensLeft").onchange=render; $("#lensRight").onchange=render;

// DEMO / HEURISTIC DATA: not published clinical data; cannot be used for real IOL prediction.
// Slider unit formatting (D/mm/%) does not validate the underlying demo inputs.
const controlMap = [
  ["haloControl","halo","haloOut",v=>v],
  ["glareControl","glare","glareOut",v=>v],
  ["contrastControl","contrast","contrastOut",v=>v+"%"],
  ["astigControl","astig","astigOut",v=>(v/10).toFixed(1)+" D",v=>v/10],
  ["pupilControl","pupil","pupilOut",v=>(v/10).toFixed(1)+" mm",v=>v/10]
];
controlMap.forEach(([id,key,out,fmt,transform])=>{
  const el=$("#"+id);
  el.oninput=()=>{
    const raw=+el.value;
    settings[key]=transform?transform(raw):raw;
    $("#"+out).value=fmt(raw);
    render();
  };
});

// Demo / heuristic presets, including astigmatism and pupil values.
// DEMO / HEURISTIC DATA: not published clinical data; cannot be used for real IOL prediction.
// All night/computer/reading preset values are manually assigned demo settings.
$$("[data-preset]").forEach(btn=>btn.onclick=()=>{
  const p=btn.dataset.preset;
  if(p==="night"){currentScene="night"; settings={halo:58,glare:52,contrast:83,astig:.4,pupil:5.0};}
  if(p==="computer"){currentScene="computer"; settings={halo:24,glare:19,contrast:98,astig:.2,pupil:3.2};}
  if(p==="reading"){currentScene="phone"; settings={halo:20,glare:16,contrast:101,astig:.1,pupil:2.8};}
  syncControls(); render();
});
// DEMO / HEURISTIC DATA: not published clinical data; cannot be used for real IOL prediction.
// Display conversions only; D/mm labels do not turn presets into clinical measurements.
function syncControls(){
  $("#haloControl").value=settings.halo; $("#haloOut").value=settings.halo;
  $("#glareControl").value=settings.glare; $("#glareOut").value=settings.glare;
  $("#contrastControl").value=settings.contrast; $("#contrastOut").value=settings.contrast+"%";
  $("#astigControl").value=Math.round(settings.astig*10); $("#astigOut").value=settings.astig.toFixed(1)+" D";
  $("#pupilControl").value=Math.round(settings.pupil*10); $("#pupilOut").value=settings.pupil.toFixed(1)+" mm";
}

Object.entries(lensData).forEach(([key,lens],idx)=>{
  // Demo categorical coverage indicators, not measured outcomes.
  // DEMO / HEURISTIC DATA: not published clinical data; cannot be used for real IOL prediction.
  // Binary near/intermediate/far coverage flags are illustrative category assignments.
  const active = key==="monofocal" ? [0,0,1] : key==="enhanced" ? [0,1,1] : key==="edof" ? [0,1,1] : [1,1,1];
  const labels=["Near","Intermediate","Far"];
  const card=document.createElement("article"); card.className="type-card";
  card.innerHTML=`<span class="num">0${idx+1}</span><h3>${lens.name}</h3><p>${lens.desc}</p><ul>${lens.bullets.map(x=>`<li>${x}</li>`).join("")}</ul><div class="range-vis" title="Near → Intermediate → Far">${active.map((x,i)=>`<span class="${x?"on":""}" title="${labels[i]}"></span>`).join("")}</div>`;
  $("#typeGrid").appendChild(card);
});

// DEMO / HEURISTIC DATA: not published clinical data; cannot be used for real IOL prediction.
// Reading/computer distance labels are illustrative, not measured patient data.
const lifestyle = {
  "夜間開車":"夜間視覺與 dysphotopsia",
  "手機":"35–40 cm 近距離",
  "電腦":"60–80 cm 中距離",
  "閱讀":"持續近距離閱讀",
  "運動":"動態遠中距離",
  "攝影":"對比與細節辨識",
  "不想戴眼鏡":"降低眼鏡依賴"
};
const selected=new Set();
Object.entries(lifestyle).forEach(([label,summary])=>{
  const b=document.createElement("button");b.textContent=label;
  b.onclick=()=>{
    selected.has(label)?selected.delete(label):selected.add(label);
    b.classList.toggle("active",selected.has(label));
    const vals=[...selected].map(k=>lifestyle[k]);
    $("#lifestyleSummary").textContent=vals.length?"你重視："+vals.join("、"):"尚未選擇生活需求";
  };
  $("#lifestyleChips").appendChild(b);
});

render();
