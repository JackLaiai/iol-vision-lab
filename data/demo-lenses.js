// DEMO / HEURISTIC DATA ONLY — preserved from the original prototype.
// All profile scores, base effects and blur values are illustrative, not clinical measurements.
// No product-specific evidence or validated mapping to visual acuity is implied.
const demoLensData = {
  // DEMO / HEURISTIC DATA: not published clinical data; cannot be used for real IOL prediction.
  // All profile (far/intermediate/near/dys), base (halo/glare/contrast), and scene blur values below.
  monofocal: {
    dataStatus:"demo / heuristic data",
    source:null,
    name:"Monofocal｜單焦點",
    short:"Monofocal",
    profile:{far:96,intermediate:58,near:28,dys:18},
    base:{halo:10,glare:14,contrast:103},
    blur:{street:0.2,computer:1.25,phone:2.45,night:0.45,restaurant:1.05},
    desc:"通常以單一主要焦點為設計核心，常見設定是優先遠距離清晰。",
    bullets:["遠距離通常最穩定","中近距離常需眼鏡輔助","夜間光暈通常較少"]
  },
  // DEMO / HEURISTIC DATA: not published clinical data; cannot be used for real IOL prediction.
  // All profile (far/intermediate/near/dys), base (halo/glare/contrast), and scene blur values below.
  enhanced: {
    dataStatus:"demo / heuristic data",
    source:null,
    name:"Enhanced Monofocal｜增強型單焦點",
    short:"Enhanced",
    profile:{far:94,intermediate:74,near:38,dys:25},
    base:{halo:16,glare:18,contrast:100},
    blur:{street:0.25,computer:.72,phone:1.85,night:.48,restaurant:.75},
    desc:"在維持單焦點設計精神下，嘗試延伸部分中距離視覺。",
    bullets:["遠距離表現通常良好","中距離可能優於傳統單焦點","近距離仍可能需要眼鏡"]
  },
  // DEMO / HEURISTIC DATA: not published clinical data; cannot be used for real IOL prediction.
  // All profile (far/intermediate/near/dys), base (halo/glare/contrast), and scene blur values below.
  edof: {
    dataStatus:"demo / heuristic data",
    source:null,
    name:"EDOF｜延伸焦深",
    short:"EDOF",
    profile:{far:91,intermediate:88,near:58,dys:42},
    base:{halo:28,glare:27,contrast:94},
    blur:{street:.34,computer:.34,phone:1.05,night:.65,restaurant:.38},
    desc:"藉由延伸焦深，強調遠距離到中距離之間較連續的視覺範圍。",
    bullets:["遠至中距離通常較連續","近距離依設計與個體而異","夜間光學現象可能增加"]
  },
  // DEMO / HEURISTIC DATA: not published clinical data; cannot be used for real IOL prediction.
  // All profile (far/intermediate/near/dys), base (halo/glare/contrast), and scene blur values below.
  trifocal: {
    dataStatus:"demo / heuristic data",
    source:null,
    name:"Trifocal｜三焦點",
    short:"Trifocal",
    profile:{far:88,intermediate:91,near:88,dys:67},
    base:{halo:52,glare:45,contrast:88},
    blur:{street:.42,computer:.25,phone:.28,night:.8,restaurant:.3},
    desc:"同時配置遠、中、近焦點，以降低多距離情境下的眼鏡依賴。",
    bullets:["遠中近距離涵蓋較完整","較可能降低近用眼鏡依賴","halo / glare 較需要討論"]
  }
};
