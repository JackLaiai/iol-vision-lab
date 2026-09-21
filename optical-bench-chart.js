/* Single-product optical records; source and measurement setups stay separate. */
(()=>{
 "use strict";
 const finite=x=>typeof x==='number'&&Number.isFinite(x), list=x=>Array.isArray(x)?x:x?[x]:[];
 const display=x=>x===null||x===undefined||x===''?'尚無資料':String(x);
 const text=(tag,value)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=value;return n;};
 const svgNode=(tag,attrs={},value)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(value!==undefined)n.textContent=value;return n;};
 function conditions(container,rows){
  const details=text('details');details.open=true;details.append(text('summary','Measurement conditions · 各筆原始條件'));
  rows.forEach(item=>{
   const dl=text('dl');dl.className='bench-chart-conditions';
   for(const [label,value] of [['Pupil / aperture (mm)',item.pupil_mm],['Wavelength (nm)',item.wavelength_nm],['Spatial frequency',finite(item.spatial_frequency?.value)?`${item.spatial_frequency.value} ${display(item.spatial_frequency.unit)}`:null],['Focus',item.focus],['Model cornea / spherical aberration',item.model_eye_condition],['Corneal spherical aberration (µm)',item.corneal_spherical_aberration_um],['Measurement system',item.measurement_system],['Measurement condition',item.measurement_condition],['Source id',item.source]]){
    const row=text('div');row.append(text('dt',label),text('dd',display(value)));dl.append(row);
   }details.append(dl);
  });container.append(details);
 }
 function plot(container,rows){
  if(rows.length===1){const item=rows[0],card=text('p',`MTF at ${display(item.spatial_frequency?.value)} ${display(item.spatial_frequency?.unit)}: ${item.mtf_value}${finite(item.mtf_SD)?` ± ${item.mtf_SD} (published SD)`:''}`);card.className='bench-single-value';card.dataset.value=item.mtf_value;container.append(card);return;}
  // A chart group never mixes focus, units, wavelength, cornea or measurement system.
  if(rows.some(r=>!finite(r.spatial_frequency?.value)||!r.spatial_frequency.unit||!finite(r.pupil_mm))){container.append(text('p','分組所需條件尚無資料，僅列出原始數值。'));rows.forEach(r=>container.append(text('p',`MTF: ${r.mtf_value}`)));return;}
  const pupils=[...new Set(rows.map(r=>r.pupil_mm))].sort((a,b)=>a-b),freqs=[...new Set(rows.map(r=>r.spatial_frequency.value))].sort((a,b)=>a-b);
  if(new Set(rows.map(r=>JSON.stringify([r.pupil_mm,r.spatial_frequency.value]))).size!==rows.length){container.append(text('p','同条件有多筆記錄，不合併或平均；請查看下方原始記錄。'));return;}
  const W=700,H=360,L=65,R=25,T=38,B=65,step=(W-L-R)/freqs.length;
  const max=Math.max(...rows.map(r=>r.mtf_value+(finite(r.mtf_SD)?r.mtf_SD:0)),0.01)*1.15;
  const y=v=>H-B-v/max*(H-T-B),barWidth=Math.min(55,step*.65/pupils.length);
  const legend=text('p'); pupils.forEach((p,i)=>{const item=text('span',`■ ${p.toFixed(1)} mm pupil　`);item.style.color=i%2?'#887093':'#247b90';legend.append(item);});container.append(legend);
  const svg=svgNode('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':`Study ${rows[0].source}: ${display(rows[0].focus)} MTF, grouped by pupil and spatial frequency`});
  for(let i=0;i<=4;i++){const v=max*i/4;svg.append(svgNode('line',{x1:L,x2:W-R,y1:y(v),y2:y(v),class:'bench-grid'}),svgNode('text',{x:L-10,y:y(v)+4,'text-anchor':'end'},v.toFixed(2)));}
  svg.append(svgNode('text',{x:20,y:T-10},'MTF'),svgNode('text',{x:W/2,y:H-10,'text-anchor':'middle'},`Spatial frequency (${rows[0].spatial_frequency.unit})`));
  freqs.forEach((f,i)=>svg.append(svgNode('text',{x:L+step*(i+.5),y:H-B+25,'text-anchor':'middle'},`${f} ${rows[0].spatial_frequency.unit}`)));
  rows.forEach(item=>{
   const j=pupils.indexOf(item.pupil_mm),xx=L+step*(freqs.indexOf(item.spatial_frequency.value)+.5)+(j-(pupils.length-1)/2)*barWidth;
   const g=svgNode('g',{class:'bench-chart-point','data-source':item.source,'data-value':item.mtf_value,'data-pupil':item.pupil_mm,'data-frequency':item.spatial_frequency.value});
   g.append(svgNode('rect',{x:xx-barWidth*.42,y:Math.min(y(0),y(item.mtf_value)),width:barWidth*.84,height:Math.abs(y(0)-y(item.mtf_value)),fill:j%2?'#887093':'#247b90'}),svgNode('title',{},`${item.pupil_mm} mm; ${item.spatial_frequency.value} ${item.spatial_frequency.unit}; MTF ${item.mtf_value}`),svgNode('text',{x:xx,y:y(item.mtf_value)-9,'text-anchor':'middle'},String(item.mtf_value)));
   if(finite(item.mtf_SD)){const a=y(item.mtf_value-item.mtf_SD),b=y(item.mtf_value+item.mtf_SD);g.append(svgNode('line',{x1:xx,x2:xx,y1:a,y2:b,class:'bench-error'}));for(const yy of [a,b])g.append(svgNode('line',{x1:xx-5,x2:xx+5,y1:yy,y2:yy,class:'bench-error'}));}
   svg.append(g);
  });container.append(svg,text('p','每根柱只代表一筆已提供的數值；沒有內插、擬合、外推或平均。'));
 }
 function mount(container,{opticalEvidence,sources=[]}){
  container.replaceChildren();container.className='optical-bench-charts';
  const records=list(opticalEvidence?.mtf).filter(r=>finite(r.mtf_value)&&sources.some(s=>s.label===r.source));
  if(!records.length)return;
  container.append(text('h3','Optical Bench Evidence Visualization'),text('p','MTF（Modulation Transfer Function，調變傳遞函數）描述光學系統保留不同空間頻率對比的能力。不同研究的測量條件可能不同，因此本頁不將不同研究的 MTF 數值直接視為產品間優劣比較。'));
  for(const id of new Set(records.map(r=>r.source))){
   const section=text('section');section.className='bench-source-chart';section.dataset.source=id;
   const source=sources.find(s=>s.label===id);section.append(text('h4',`Study ${id}`),text('p',source.title||'尚無資料'));
   const link=text('a',`[${id}]`);link.href=`#source-${encodeURIComponent(id)}`;link.className='source-marker';section.append(link);
   const groups=new Map();records.filter(r=>r.source===id).forEach(r=>{const key=JSON.stringify([r.focus,r.wavelength_nm,r.spatial_frequency?.unit,r.model_eye_condition,r.corneal_spherical_aberration_um,r.measurement_system,r.measurement_condition]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);});
   for(const rows of groups.values()){const block=text('div');block.className='bench-setup-chart';block.append(text('h5',`Focus：${display(rows[0].focus)}`));plot(block,rows);conditions(block,rows);section.append(block);}
   container.append(section);
  }
  const qualitative=(key)=>list(opticalEvidence?.[key]).some(r=>r?.available===true||r?.figure_available===true);
  for(const [key,label] of [['throughFocusMTF','Through-focus MTF'],['psf','PSF']]){
   const metadataOnly=qualitative(key)&&list(opticalEvidence?.[key]).every(r=>r?.numerical_points_available===false||(!r?.matrix&&!r?.values&&!finite(r?.value)));
   const sourceFigure=key==='throughFocusMTF'&&sources.some(s=>s.through_focus_mtf?.figure_available===true);
   if(metadataOnly||sourceFigure)container.append(text('p',`${label}：研究有相關光學資料，但目前沒有可直接繪製的公開逐點數值。`));
  }
 }
 window.OpticalBenchChart={mount};
})();
