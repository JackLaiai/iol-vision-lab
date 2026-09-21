/* Published observations and calculator overlay are separate SVG layers. */
(()=>{
 "use strict";
 const svgNode=(tag,attrs={},text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;};
 const textNode=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
 function mount(container,{points,source,measurementConditions,selectedDistanceCm,calculate}){
  container.replaceChildren();
  const data=(Array.isArray(points)?points:[]).filter(p=>Number.isFinite(p.defocus_D)&&Number.isFinite(p.mean_logMAR)).slice().sort((a,b)=>b.defocus_D-a.defocus_D);
  if(!data.length){container.append(textNode('p','目前只有定性／圖表型離焦證據，尚無可直接繪製的逐點 published numerical data。'));return {update:()=>{}};}
  const label=source?.label||'來源尚無資料';
  container.append(textNode('p',`Published ${label} mean ± SD · 圓點／誤差棒；Website-derived interpolation · 菱形；Selected viewing distance · 虛線。`),textNode('p','較低 logMAR（較好的視力）位於上方。直線僅為視覺連線，不代表新增 published measurements；未進行 smoothing 或 curve fitting。'));
  const conditions=textNode('p','Measurement conditions：'+(measurementConditions||[]).filter(x=>x!==null&&x!==undefined&&x!=='').join(' · '));container.append(conditions);
  const W=780,H=430,L=80,R=35,T=35,B=65,xmax=Math.max(...data.map(p=>p.defocus_D)),xmin=Math.min(...data.map(p=>p.defocus_D));
  const lows=data.map(p=>p.mean_logMAR-(Number.isFinite(p.SD_logMAR)?p.SD_logMAR:0)), highs=data.map(p=>p.mean_logMAR+(Number.isFinite(p.SD_logMAR)?p.SD_logMAR:0));
  const low=Math.min(...lows),high=Math.max(...highs),pad=(high-low||1)*.1,ymin=low-pad,ymax=high+pad;
  const x=v=>L+(xmax-v)/(xmax-xmin||1)*(W-L-R),y=v=>T+(v-ymin)/(ymax-ymin)*(H-T-B);
  const svg=svgNode('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':`Defocus Curve ${label}, published mean and SD; lower logMAR at top`});
  const published=svgNode('g',{'data-layer':'published'}),overlay=svgNode('g',{'data-layer':'overlay'});
  svg.append(svgNode('line',{x1:L,y1:T,x2:L,y2:H-B,class:'axis'}),svgNode('line',{x1:L,y1:H-B,x2:W-R,y2:H-B,class:'axis'}));
  for(let i=0;i<=5;i++){const v=ymin+(ymax-ymin)*i/5;svg.append(svgNode('line',{x1:L,y1:y(v),x2:W-R,y2:y(v),class:'grid'}),svgNode('text',{x:L-10,y:y(v)+4,'text-anchor':'end'},v.toFixed(2)));}
  for(const p of data)svg.append(svgNode('text',{x:x(p.defocus_D),y:H-B+24,'text-anchor':'middle'},(p.defocus_D>0?'+':'')+p.defocus_D.toFixed(1)));
  svg.append(svgNode('text',{x:W/2,y:H-12,'text-anchor':'middle'},'Defocus (D)'),svgNode('text',{transform:`translate(20 ${H/2}) rotate(-90)`,'text-anchor':'middle'},'Visual acuity (logMAR)'));
  published.append(svgNode('polyline',{points:data.map(p=>`${x(p.defocus_D)},${y(p.mean_logMAR)}`).join(' '),class:'published-line'}));
  for(const p of data){const group=svgNode('g',{'data-defocus':p.defocus_D,'data-mean':p.mean_logMAR,class:'chart-published-point'});if(Number.isFinite(p.SD_logMAR)){
   const top=y(p.mean_logMAR-p.SD_logMAR),bottom=y(p.mean_logMAR+p.SD_logMAR);
   group.append(svgNode('line',{x1:x(p.defocus_D),x2:x(p.defocus_D),y1:top,y2:bottom,class:'sd-bar','data-lower':p.mean_logMAR-p.SD_logMAR,'data-upper':p.mean_logMAR+p.SD_logMAR}));
   for(const yy of [top,bottom])group.append(svgNode('line',{x1:x(p.defocus_D)-5,x2:x(p.defocus_D)+5,y1:yy,y2:yy,class:'sd-cap'}));
  }group.append(svgNode('circle',{cx:x(p.defocus_D),cy:y(p.mean_logMAR),r:4}),svgNode('title',{},`${p.defocus_D} D: ${p.mean_logMAR} logMAR; SD ${Number.isFinite(p.SD_logMAR)?p.SD_logMAR:'尚無資料'} [${label}]`));published.append(group);}
  svg.append(published,overlay);container.append(svg);
  const output=textNode('p','');output.className='defocus-chart-result';output.setAttribute('aria-live','polite');container.append(output);
  function update(distance){overlay.replaceChildren();if(typeof calculate!=='function'){output.textContent='尚未連接觀看距離 calculator。';return;}
   const result=calculate(distance);if(result.error){output.textContent=(Number.isFinite(result.defocus)?`${distance} cm / ${result.defocus.toFixed(2)} D：`:'')+result.error;return;}
   if(result.defocus<xmin||result.defocus>xmax){output.textContent='超出已發表資料範圍，不建立估計點。';return;}
   const direct=result.method==='direct published point';output.textContent=`${distance} cm / ${result.defocus.toFixed(2)} D · ${direct?'Direct published point':'Website-derived linear interpolation'} · mean ${result.mean.toFixed(5)} logMAR${direct?'':'；SD 不提供'}`;
   const xx=x(result.defocus),yy=y(result.mean);overlay.append(svgNode('line',{x1:xx,x2:xx,y1:T,y2:H-B,class:'distance-guide'}));
   if(direct)overlay.append(svgNode('circle',{cx:xx,cy:yy,r:8,class:'direct-marker'}));
   else overlay.append(svgNode('path',{d:`M ${xx} ${yy-8} L ${xx+8} ${yy} L ${xx} ${yy+8} L ${xx-8} ${yy} Z`,class:'interpolation-marker'}));
  }
  update(selectedDistanceCm);return {update};
 }
 window.DefocusChart={mount};
})();
