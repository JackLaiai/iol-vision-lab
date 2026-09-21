/* Coverage evaluates stored results, never quality, ranking, or derived clinical values. */
(() => {
 "use strict";
 const A="Available", P="Partial / qualitative only", N="Not structured yet";
 const columns=["Clinical visual acuity","Numerical Defocus Curve","Qualitative / figure-only Defocus Curve","Contrast sensitivity","Spectacle independence","Dysphotopsia","In-vivo optical quality","Optical bench MTF","Through-focus MTF numerical","PSF","OTF / PTF","Direct head-to-head evidence","Taiwan regulatory / market evidence"];
 const arr=x=>Array.isArray(x)?x:x?[x]:[];
 const num=x=>typeof x==="number"&&Number.isFinite(x);
 const has=x=>x!==null&&x!==undefined&&x!=="";
 const numbers=x=>Array.isArray(x)&&x.some(v=>num(v)||numbers(v));
 const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 const clean=s=>!/demo|placeholder/i.test([s.dataStatus,s.label,s.title,s.sourceType].filter(Boolean).join(" "));
 function classify(product,record,records) {
  const sources=(record?.sources||[]).filter(clean), ids=new Set(sources.map(s=>s.label));
  const sourceIds=p=>arr(record?.parameterSourceMap?.[p.key]||p.sourceIds||p.source).filter(id=>ids.has(id));
  const params=(record?.clinicalParameters||[]).filter(p=>sourceIds(p).length);
  const optical=record?.opticalEvidence||{};
  const cell=(status,refs,reason)=>({status,refs:[...new Set(refs)],reason});
  const from=(items,reason,partial=false)=>cell(items.length?(partial?P:A):N,items.flatMap(sourceIds),items.length?reason:"尚無符合此類別的 structured results；metadata、樣本數與測量條件不當作結果值。");
  const endpoints=pattern=>params.filter(p=>pattern.test(p.key)&&(num(p.value)||num(p.value?.mean)));
  const curves=sources.filter(s=>arr(s.defocus_points).some(p=>num(p.defocus_D)&&num(p.mean_logMAR)));
  const qualitative=sources.filter(s=>s.defocus_curve_available===true&&s.numerical_points_available===false);
  const ranges=params.filter(p=>/defocus/.test(p.key)&&num(p.value?.visualAcuityUpperBound));
  const mtf=arr(optical.mtf).filter(p=>ids.has(p.source)&&num(p.mtf_value));
  const through=arr(optical.throughFocusMTF).filter(p=>ids.has(p.source)&&num(p.defocus_D)&&num(p.value));
  const figures=sources.filter(s=>s.through_focus_mtf?.figure_available===true);
  const psf=arr(optical.psf).filter(p=>ids.has(p.source)&&(numbers(p.matrix)||numbers(p.values)));
  const otf=arr(optical.otf).filter(p=>ids.has(p.source)&&numbers(p.complex_values));
  const ptf=arr(optical.ptf).filter(p=>ids.has(p.source)&&num(p.phase_value));
  const shared=(record?.sharedStudies||[]).filter(s=>ids.has(s.source)&&records.some(other=>other!==record&&(other?.sharedStudies||[]).some(t=>t.study_id===s.study_id&&t.arm_id!==s.arm_id&&JSON.stringify(t.study)===JSON.stringify(s.study))));
  const market=(record?.product?.marketEvidence||[]).filter(p=>/taiwan|tfda|nhi/i.test(p.key)&&sourceIds(p).length&&has(p.value));
  const catalogKeys=['taiwan_tfda_status','tfda_license_number','taiwan_market_status','nhi_category','nhi_code','taiwan_hospital_availability'].filter(k=>has(product[k]));
  // Coverage measures structured content, independently of source verification.
  const marketKeys = new Set(market.map(p=>p.key));
  const structuredMarket = marketKeys.has('tfda_license_number') && (marketKeys.has('taiwan_nhi_category') || marketKeys.has('taiwan_nhi_special_material_code'));
  return [from(endpoints(/(?:ucva|bcdva|binocular_va|udva|cdva|uiva|unva)$/),"clinicalParameters 視力 endpoint 的 mean/value 有數值，並連到正式來源。"),
   cell(curves.length?A:qualitative.length||ranges.length?P:N,curves.length?curves.map(s=>s.label):[...qualitative.map(s=>s.label),...ranges.flatMap(sourceIds)],curves.length?"source.defocus_points 同時具有 defocus_D 與 mean_logMAR；未使用 40 cm VA 推導。":"沒有逐點數值；若有 figure/range evidence，僅標記 Partial。"),
   cell(qualitative.length||ranges.length?P:N,[...qualitative.map(s=>s.label),...ranges.flatMap(sourceIds)],"僅根據明確 figure-only flag 或 clinical defocus range summary；不從圖取值。"),
   from(endpoints(/^contrast_sensitivity/),"對比敏感度 endpoint 有數值。"),from(endpoints(/^spectacle_independence/),"眼鏡獨立性 endpoint 有數值。"),from(endpoints(/^(severity_|bothersomeness_)/),"Severity / bothersomeness 原始 endpoint 分開保存。"),
   from(arr(record?.in_vivo_optical_quality).filter(p=>sourceIds(p).length&&num(p.value?.mean)),"獨立 in_vivo_optical_quality 有結果；不是 bench MTF。"),
   from(mtf,"opticalEvidence.mtf 有 mtf_value 與 source。"),
   cell(through.length?A:figures.length?P:N,through.length?through.map(p=>p.source):figures.map(s=>s.label),through.length?"Through-focus 記錄含 defocus_D 與 value。":"沒有 through-focus numerical table；figure metadata 僅算 Partial。"),
   from(psf,"PSF matrix / numerical values 存在，非僅 pupil 等 metadata。"),
   cell(otf.length&&ptf.length?A:otf.length||ptf.length?P:N,[...otf,...ptf].map(p=>p.source),"分別檢查 OTF complex_values 與 PTF phase_value；只有其中一類數值則為 Partial。"),
   cell(shared.length?A:N,shared.map(s=>s.source),"跨產品相同 study_id、相同 study 內容且不同 arm_id，才算 shared head-to-head。"),
   cell(structuredMarket?A:market.length||catalogKeys.length?P:N,market.flatMap(sourceIds),structuredMarket?"有 source-linked 許可證及 NHI 類別／代碼；Available 不代表已完整驗證或目前上市狀態。":market.length||catalogKeys.length?`已有部分市場／法規欄位：${catalogKeys.join(', ')}${market.length?'；另有來源 marketEvidence':''}。不由許可證推斷目前核准／上市狀態。`:"尚無具體台灣法規／市場欄位；僅 market=Taiwan 或 source_status 不算。")];
 }
 function verification(cell,record){
  if(cell.status===N)return null;
  const statuses=cell.refs.map(id=>record?.sources?.find(s=>s.label===id)?.verification?.status);
  if(statuses.length&&statuses.every(s=>s==='verified_primary_or_official_source'))return 'Source verified';
  if(statuses.some(s=>s==='verified_primary_or_official_source'||s==='partially_verified'))return 'Partially verified';
  return 'Verification pending';
 }
 async function json(path){const r=await fetch(path);if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}
 async function init(){try{
  const [catalog,index]=await Promise.all([json('data/taiwan-iol-catalog.json'),json('data/evidence/index.json')]);
  const loaded=await Promise.all(catalog.map(async product=>{try{const path=window.EvidenceRouting.path(index,product);if(!path)return {record:null};const base=new URL('data/evidence/',document.baseURI),url=new URL(path,document.baseURI);if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname))throw new Error('invalid path');const record=await json(url);if(!window.EvidenceRouting.matches(record,product)||/demo|placeholder/i.test(record.dataStatus||''))throw new Error('placeholder or product mismatch');return {record};}catch(e){return {record:null,error:e.message};}}));
  const table=document.getElementById('coverage-table'),head=el('thead'),hr=el('tr');['Product',...columns].forEach(c=>{const th=el('th',c);th.scope='col';hr.append(th);});head.append(hr);table.append(head);const body=el('tbody');
  catalog.forEach((product,i)=>{const {record,error}=loaded[i],tr=el('tr');tr.dataset.product=product.product_key||product.model_number||String(i);const th=el('th');th.scope='row';const href=product.product_key||product.model_number?window.EvidenceRouting.detail(product):`iol-detail.html?catalog=${i}`;const link=el('a',`${product.model} · ${product.model_number||'型號尚無資料'}`);link.href=href;th.append(link);if(error)th.append(el('p',`資料載入失敗，coverage 未判定：${error}`));tr.append(th);
   classify(product,record,loaded.map(x=>x.record).filter(Boolean)).forEach((cell,j)=>{const td=el('td');td.dataset.category=columns[j];const details=el('details');details.append(el('summary',error?'暫時無法判定':cell.status),el('p',error?'請重新載入後再查看。':cell.reason));const a=el('a','查看產品證據');a.href=href+'#sources-evidence';details.append(a);td.append(details);if(!error){const v=verification(cell,record);if(v){const badge=el('small',v);badge.title='只表示網站資料與來源核對，不代表研究品質。來源：'+(cell.refs.join(', ')||'catalog，尚無來源級核對紀錄');td.append(badge);}}tr.append(td);});body.append(tr);
  });table.append(body);document.getElementById('coverage-status').textContent='資料載入完成。所有判定由現有 JSON 產生；不含開發 placeholder。';
 }catch(e){document.getElementById('coverage-status').textContent='無法載入 coverage：'+e.message;}}
 window.EvidenceCoverage={classify,verification,columns};init();
})();
