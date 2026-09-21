/* Same-study mean ± SD only. No inferred measurements or treatment ranking. */
(()=>{
 "use strict";
 const finite=x=>typeof x==='number'&&Number.isFinite(x);
 const node=(tag,attrs={},text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;};
 const text=(tag,value)=>{const n=document.createElement(tag);n.textContent=value;return n;};
 function compatible(left,right){
  if(!left||!right||!left.study_id||left.study_id!==right.study_id||left.arm_id===right.arm_id)return false;
  const a=left.study,b=right.study;
  // Conservative guard: all study fields, including measurement conditions and endpoints, must match.
  if(!a||!b||a.study_id!==left.study_id||b.study_id!==right.study_id||JSON.stringify(a)!==JSON.stringify(b)||!a.measurement_conditions)return false;
  if(!a.arms?.[left.arm_id]||!a.arms?.[right.arm_id]||!Array.isArray(a.outcomes)||!a.outcomes.length)return false;
  const keys=new Set();
  return a.outcomes.every(o=>{
   const key=JSON.stringify([o.endpoint,o.distance_cm,o.unit]);if(!o.endpoint||keys.has(key)||o.unit!=='logMAR')return false;keys.add(key);
   return [left.arm_id,right.arm_id].every(id=>finite(o[id]?.mean)&&finite(o[id]?.SD)&&o[id].SD>=0);
  });
 }
 function mount(container,{left,right}){
  container.replaceChildren();if(!compatible(left,right))return false;
  const study=left.study,arms=[left.arm_id,right.arm_id],outcomes=study.outcomes;
  container.classList.add('head-to-head-chart');container.dataset.studyId=study.study_id;
  container.append(text('h3','Same-study clinical outcomes · mean ± SD'),text('p','較低 logMAR 代表較佳視力。本圖將較低 logMAR 放在上方。統計顯著不等同於個人臨床優越性。'),text('p',study.measurement_conditions),text('p',`● ${study.arms[arms[0]].product_family}　◆ ${study.arms[arms[1]].product_family}；error bars = published SD（不是 confidence intervals）。`));
  const W=Math.max(760,outcomes.length*190),H=450,L=75,R=25,T=35,B=115;
  const low=Math.min(...outcomes.flatMap(o=>arms.map(id=>o[id].mean-o[id].SD))),high=Math.max(...outcomes.flatMap(o=>arms.map(id=>o[id].mean+o[id].SD))),pad=(high-low||1)*.12,min=low-pad,max=high+pad;
  const y=v=>T+(v-min)/(max-min)*(H-T-B),step=(W-L-R)/outcomes.length;
  const svg=node('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':`Direct head-to-head clinical outcomes: ${study.study_id}`});
  svg.append(node('line',{x1:L,x2:L,y1:T,y2:H-B,class:'h2h-axis'}));
  for(let i=0;i<=5;i++){const value=min+(max-min)*i/5;svg.append(node('line',{x1:L,x2:W-R,y1:y(value),y2:y(value),class:'h2h-grid'}),node('text',{x:L-10,y:y(value)+4,'text-anchor':'end'},value.toFixed(2)));}
  svg.append(node('text',{transform:`translate(18 ${H/2}) rotate(-90)`,'text-anchor':'middle'},'Visual acuity (logMAR)'));
  outcomes.forEach((o,i)=>{
   const center=L+step*(i+.5);
   arms.forEach((id,j)=>{const xx=center+(j===0?-22:22),value=o[id],yy=y(value.mean),top=y(value.mean-value.SD),bottom=y(value.mean+value.SD);const g=node('g',{class:`h2h-observation h2h-arm-${j}`,'data-arm':id,'data-endpoint':o.endpoint,'data-mean':value.mean,'data-sd':value.SD});
    g.append(node('line',{x1:xx,x2:xx,y1:top,y2:bottom,class:'h2h-error','data-lower':value.mean-value.SD,'data-upper':value.mean+value.SD}));for(const pos of [top,bottom])g.append(node('line',{x1:xx-6,x2:xx+6,y1:pos,y2:pos,class:'h2h-error'}));
    g.append(j===0?node('circle',{cx:xx,cy:yy,r:5}):node('path',{d:`M ${xx} ${yy-6} L ${xx+6} ${yy} L ${xx} ${yy+6} L ${xx-6} ${yy} Z`}));g.append(node('title',{},`${study.arms[id].product_family}: ${o.endpoint}, ${value.mean} ± ${value.SD} ${o.unit}`));svg.append(g);
   });
   const pv=o.between_group_p,p=finite(pv?.value)&&['=','<','≤','>','≥'].includes(pv?.operator)?`p ${pv.operator} ${pv.value}`:'p-value 尚無資料';
   svg.append(node('text',{x:center,y:H-B+25,'text-anchor':'middle'},o.endpoint),node('text',{x:center,y:H-B+46,'text-anchor':'middle'},finite(o.distance_cm)?`${o.distance_cm} cm`:'距離尚無資料'),node('text',{x:center,y:H-B+68,'text-anchor':'middle',class:'h2h-pvalue','data-endpoint':o.endpoint},p));
   const significant=finite(pv?.value)&&((['=','≤'].includes(pv.operator)&&pv.value<.05)||(pv.operator==='<'&&pv.value<=.05));
   if(significant)container.append(text('p',`${o.endpoint}：原研究報告組間差異具統計顯著性（${p}）。`));
  });
  container.append(svg,text('p','UDVA／CDVA 若未提供測量距離，顯示「距離尚無資料」，不自行指定。所有數值詳列於下方原始表格。'));return true;
 }
 window.HeadToHeadChart={mount,compatible};
})();
