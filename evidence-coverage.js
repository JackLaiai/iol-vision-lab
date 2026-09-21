/* Coverage evaluates stored results, never quality, ranking, or derived clinical values. */
(() => {
 "use strict";
 const {classify,verification,columns}=window.EvidenceUtils;
 const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
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
