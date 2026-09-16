
const lensData = {
  monofocal: {
    name:"Monofocal｜單焦點",
    short:"Monofocal",
    profile:{far:96,intermediate:58,near:28,dys:18},
    base:{halo:10,glare:14,contrast:103},
    blur:{street:0.2,computer:1.25,phone:2.45,night:0.45,restaurant:1.05},
    desc:"通常以單一主要焦點為設計核心，常見設定是優先遠距離清晰。",
    bullets:["遠距離通常最穩定","中近距離常需眼鏡輔助","夜間光暈通常較少"]
  },
  enhanced: {
    name:"Enhanced Monofocal｜增強型單焦點",
    short:"Enhanced",
    profile:{far:94,intermediate:74,near:38,dys:25},
    base:{halo:16,glare:18,contrast:100},
    blur:{street:0.25,computer:.72,phone:1.85,night:.48,restaurant:.75},
    desc:"在維持單焦點設計精神下，嘗試延伸部分中距離視覺。",
    bullets:["遠距離表現通常良好","中距離可能優於傳統單焦點","近距離仍可能需要眼鏡"]
  },
  edof: {
    name:"EDOF｜延伸焦深",
    short:"EDOF",
    profile:{far:91,intermediate:88,near:58,dys:42},
    base:{halo:28,glare:27,contrast:94},
    blur:{street:.34,computer:.34,phone:1.05,night:.65,restaurant:.38},
    desc:"藉由延伸焦深，強調遠距離到中距離之間較連續的視覺範圍。",
    bullets:["遠至中距離通常較連續","近距離依設計與個體而異","夜間光學現象可能增加"]
  },
  trifocal: {
    name:"Trifocal｜三焦點",
    short:"Trifocal",
    profile:{far:88,intermediate:91,near:88,dys:67},
    base:{halo:52,glare:45,contrast:88},
    blur:{street:.42,computer:.25,phone:.28,night:.8,restaurant:.3},
    desc:"同時配置遠、中、近焦點，以降低多距離情境下的眼鏡依賴。",
    bullets:["遠中近距離涵蓋較完整","較可能降低近用眼鏡依賴","halo / glare 較需要討論"]
  }
};

const scenes = {
  street:{name:"遠距離街景",distance:"5 m+",hint:"道路、招牌、遠方物體",className:"scene-street"},
  computer:{name:"電腦工作",distance:"60–80 cm",hint:"螢幕與桌面工作距離",className:"scene-computer"},
  phone:{name:"手機閱讀",distance:"35–40 cm",hint:"手機、書籍與近距離閱讀",className:"scene-phone"},
  night:{name:"夜間駕駛",distance:"5 m+",hint:"夜間車燈與道路辨識",className:"scene-night"},
  restaurant:{name:"餐廳室內",distance:"50–150 cm",hint:"中距離人臉與桌面近距離",className:"scene-restaurant"}
};

let currentScene = "street";
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

$$("[data-preset]").forEach(btn=>btn.onclick=()=>{
  const p=btn.dataset.preset;
  if(p==="night"){currentScene="night"; settings={halo:58,glare:52,contrast:83,astig:.4,pupil:5.0};}
  if(p==="computer"){currentScene="computer"; settings={halo:24,glare:19,contrast:98,astig:.2,pupil:3.2};}
  if(p==="reading"){currentScene="phone"; settings={halo:20,glare:16,contrast:101,astig:.1,pupil:2.8};}
  syncControls(); render();
});
function syncControls(){
  $("#haloControl").value=settings.halo; $("#haloOut").value=settings.halo;
  $("#glareControl").value=settings.glare; $("#glareOut").value=settings.glare;
  $("#contrastControl").value=settings.contrast; $("#contrastOut").value=settings.contrast+"%";
  $("#astigControl").value=Math.round(settings.astig*10); $("#astigOut").value=settings.astig.toFixed(1)+" D";
  $("#pupilControl").value=Math.round(settings.pupil*10); $("#pupilOut").value=settings.pupil.toFixed(1)+" mm";
}

Object.entries(lensData).forEach(([key,lens],idx)=>{
  const active = key==="monofocal" ? [0,0,1] : key==="enhanced" ? [0,1,1] : key==="edof" ? [0,1,1] : [1,1,1];
  const labels=["Near","Intermediate","Far"];
  const card=document.createElement("article"); card.className="type-card";
  card.innerHTML=`<span class="num">0${idx+1}</span><h3>${lens.name}</h3><p>${lens.desc}</p><ul>${lens.bullets.map(x=>`<li>${x}</li>`).join("")}</ul><div class="range-vis" title="Near → Intermediate → Far">${active.map((x,i)=>`<span class="${x?"on":""}" title="${labels[i]}"></span>`).join("")}</div>`;
  $("#typeGrid").appendChild(card);
});

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
