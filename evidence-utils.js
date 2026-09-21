/* Shared structured coverage rules; extracted without changing classifications. */
(()=>{
 const A="Available", P="Partial / qualitative only", N="Not structured yet";
 const columns=["Clinical visual acuity","Numerical Defocus Curve","Qualitative / figure-only Defocus Curve","Contrast sensitivity","Spectacle independence/dependence evidence","Dysphotopsia","In-vivo optical quality","Optical bench MTF","Through-focus MTF numerical","PSF","OTF / PTF","Direct head-to-head evidence","Taiwan regulatory / market evidence"];
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
  const questionnaire=category=>params.filter(p=>p.evidenceCategory===category&&num(p.value?.count)&&num(p.value?.denominator)&&p.value.denominator>0);
  const contrastQual=sources.filter(s=>s.contrast_sensitivity?.contrast_sensitivity_available===true&&s.contrast_sensitivity?.numerical_points_available===false);
  const contrastNumeric=endpoints(/^contrast_sensitivity/);
  const mtf=arr(optical.mtf).filter(p=>ids.has(p.source)&&num(p.mtf_value));
  const through=arr(optical.throughFocusMTF).filter(p=>ids.has(p.source)&&num(p.defocus_D)&&num(p.value));
  const figures=sources.filter(s=>s.through_focus_mtf?.figure_available===true);
  const psf=arr(optical.psf).filter(p=>ids.has(p.source)&&(numbers(p.matrix)||numbers(p.values)));
  const psfQual=arr(optical.psf).filter(p=>ids.has(p.source)&&p.available===true&&!numbers(p.matrix)&&!numbers(p.values));
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
   cell(contrastNumeric.length?A:contrastQual.length?P:N,contrastNumeric.length?contrastNumeric.flatMap(sourceIds):contrastQual.map(s=>s.label),"數值 endpoint 與來源明示 figure / qualitative contrast sensitivity 分開判定；不從圖補值。"),from([...endpoints(/^spectacle_independence/),...questionnaire("spectacle_dependence")],"獨立性／依賴性原始 endpoint 依 source wording 分開保存，不互相轉算。"),from([...endpoints(/^(severity_|bothersomeness_)/),...questionnaire("dysphotopsia")],"問卷 count / denominator 或 severity / bothersomeness endpoint 存在；不把症狀比例視為 severity。"),
   from(arr(record?.in_vivo_optical_quality).filter(p=>sourceIds(p).length&&num(p.value?.mean)),"獨立 in_vivo_optical_quality 有結果；不是 bench MTF。"),
   from(mtf,"opticalEvidence.mtf 有 mtf_value 與 source。"),
   cell(through.length?A:figures.length?P:N,through.length?through.map(p=>p.source):figures.map(s=>s.label),through.length?"Through-focus 記錄含 defocus_D 與 value。":"沒有 through-focus numerical table；figure metadata 僅算 Partial。"),
   cell(psf.length?A:psfQual.length?P:N,(psf.length?psf:psfQual).map(p=>p.source),psf.length?"PSF matrix / numerical values 存在。":"只有來源報告 PSF 可用，未收錄 raw numerical matrix；不可當作 numerical PSF。"),
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

window.EvidenceUtils={classify,verification,columns};
})();
