(()=>{
 "use strict";
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const ids=['search','manufacturer','category','toric','market','evidence'];
 let entries=[],selected=[];
 const category=p=>/enhanced monofocal/i.test(p.iol_type||'')?'Enhanced monofocal':({monofocal:'Monofocal',edof:'EDOF',trifocal:'Trifocal'}[(p.iol_type||'').toLowerCase()]||p.iol_type||'尚無資料');
 const key=e=>e.p.product_key||e.p.model_number||`catalog:${e.i}`;
 const link=e=>e.p.product_key||e.p.model_number?window.EvidenceRouting.detail(e.p):`iol-detail.html?catalog=${e.i}`;
 async function json(path){const r=await fetch(path);if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}
 function options(id,values){const select=document.getElementById(id);for(const v of ['',...new Set(values)]){const o=el('option',v||'全部');o.value=v;select.append(o);}}
 function selection(){document.getElementById('selection').textContent=selected.length?`已選擇：${selected.map(e=>e.p.model_number||e.p.model).join('、')}（${selected.length}/2）`:'尚未選擇比較產品（最多兩顆）';}
 function render(){
 const v=Object.fromEntries(ids.map(id=>[id,document.getElementById(id).value]));const query=v.search.trim().toLowerCase();
 const visible=entries.filter(e=>{const p=e.p;return (!query||[p.model,p.model_number,p.manufacturer,...(e.record?.product?.taiwan_models||[])].join(' ').toLowerCase().includes(query))&&(!v.manufacturer||v.manufacturer===p.manufacturer)&&(!v.category||v.category===category(p))&&(!v.toric||v.toric===(typeof p.toric==='boolean'?String(p.toric):'unknown'))&&(!v.market||v.market===(p.taiwan_market_status||'尚無資料'))&&(!v.evidence||v.evidence===(e.error?'error':e.record?'yes':'no'));});
 const groups=new Map();for(const e of visible){const k=e.p.manufacturer+'|'+e.family;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(e);}
 const container=document.getElementById('families');container.replaceChildren();
 for(const group of groups.values()){
  const first=group[0],card=el('article');card.className='family';card.dataset.family=first.family;card.append(el('p',first.p.manufacturer),el('h2',first.family));
  card.append(el('p',`Lens category：${[...new Set(group.map(e=>category(e.p)))].join('、')} · Toric variants：${[...new Set(group.map(e=>e.p.toric===true?'Toric':e.p.toric===false?'Non-toric':'尚無資料'))].join(' / ')}`),el('p',`Taiwan market status：${[...new Set(group.map(e=>e.p.taiwan_market_status||'尚無資料'))].join('、')}`));
  card.append(el('p', 'Taiwan model numbers：'+[...new Set(group.flatMap(e=>e.record?.product?.taiwan_models||e.p.taiwan_models||(e.p.model_number?[e.p.model_number]:['尚無資料'])))].join('、')));
  const details=el('details');details.open=Boolean(query);details.append(el('summary',`型號與證據（${group.length} 筆符合篩選）`));
  for(const e of group){const row=el('div');row.className='variant';row.dataset.model=key(e);row.append(el('h3',e.p.model_number||e.p.model+' · catalog 型號尚無資料'));const models=e.record?.product?.taiwan_models||e.p.taiwan_models||[];if(models.length)row.append(el('p','Taiwan listed models：'+models.join('、')+'（不等同 catalog 單一型號）'));
   const tags=el('p');tags.className='tags';tags.textContent=e.error?'Evidence 暫時無法載入':[[0,'Clinical evidence'],[1,'Numerical defocus data'],[7,'Optical bench evidence'],[11,'Direct head-to-head evidence'],[12,'Taiwan regulatory data']].map(([i,label])=>`${label}：${e.coverage[i].status==='Available'?'已整理':e.coverage[i].status==='Partial / qualitative only'?(i===1?'尚無逐點數值（僅定性資料）':'部分／定性資料'):'尚未整理'}`).join(' · ');row.append(tags);
   const a=el('a','查看資料');a.href=link(e);const button=el('button',selected.some(s=>key(s)===key(e))?'已加入比較':'加入比較');button.type='button';button.disabled=selected.some(s=>key(s)===key(e));button.addEventListener('click',()=>{if(selected.length>=2||selected.some(s=>key(s)===key(e)))return;selected.push(e);selection();if(selected.length===2)location.href='iol-comparison.html?'+new URLSearchParams({a:key(selected[0]),b:key(selected[1])});else render();});row.append(a,button);details.append(row);
  }card.append(details);container.append(card);
 }document.getElementById('catalog-status').textContent=visible.length?`${groups.size} 組／${visible.length} 筆產品符合篩選。證據標籤依個別型號顯示。`:'沒有符合條件的產品；可清除篩選。';
 }
 async function init(){try{
 const [catalog,index]=await Promise.all([json('data/taiwan-iol-catalog.json'),json('data/evidence/index.json')]);
 entries=await Promise.all(catalog.map(async(p,i)=>{const e={p,i,record:null};try{const path=window.EvidenceRouting.path(index,p);if(path){const base=new URL('data/evidence/',document.baseURI),url=new URL(path,document.baseURI);if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname))throw new Error('invalid path');const r=await json(url);if(!window.EvidenceRouting.matches(r,p)||/demo|placeholder/i.test(r.dataStatus||''))throw new Error('placeholder or mismatch');e.record=r;}}catch(err){e.error=err.message;}return e;}));
 const records=entries.map(e=>e.record).filter(Boolean);
 for(const e of entries){const base=(e.p.model||'').replace(/ Toric$/,'');const counterpart=catalog.some(p=>p.manufacturer===e.p.manufacturer&&p.model===base&&p.toric===false);e.family=e.p.product_family||((e.p.toric===true&&counterpart)?base:e.p.model)||'尚無資料';e.coverage=window.EvidenceUtils.classify(e.p,e.record,records);}
 options('manufacturer',catalog.map(p=>p.manufacturer));options('category',['Monofocal','Enhanced monofocal','EDOF','Trifocal',...catalog.map(category)]);options('market',catalog.map(p=>p.taiwan_market_status||'尚無資料'));
 ids.forEach(id=>document.getElementById(id).addEventListener(id==='search'?'input':'change',render));document.getElementById('clear-selection').addEventListener('click',()=>{selected=[];selection();render();});if(matchMedia('(max-width:720px)').matches)document.getElementById('filters').open=false;render();
 }catch(e){document.getElementById('catalog-status').textContent='載入失敗：'+e.message;}}
 init();
})();
