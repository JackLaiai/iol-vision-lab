/* Coverage summary, never a treatment recommendation or pooled outcome. */
(()=>{
 "use strict";
 const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 const labels={'Available':'已有公開研究資料','Partial / qualitative only':'部分資料','Not structured yet':'目前尚未整理'};
 const ver={'Source verified':'已核對來源','Partially verified':'部分核對','Verification pending':'待核對'};
 function mount(container,product,record){
  container.replaceChildren();const coverage=window.EvidenceUtils.classify(product,record,[]),params=record?.clinicalParameters||[];
  container.append(el('h2','快速了解'),el('p','以下內容整理自目前網站已收錄的公開研究與台灣資料。'),el('p','以下狀態只表示網站資料覆蓋程度，不代表效果、研究品質或個人適用性。'));
  const grid=el('div');grid.className='patient-summary-grid';container.append(grid);
  const add=(title,status,lines,target)=>{const card=el('article');card.append(el('h3',title),el('strong',labels[status]));for(const line of lines)card.append(el('p',line));const a=el('a','查看研究資料 ↓');a.href=target;card.append(a);grid.append(card);};
  const sources=new Set((record?.sources||[]).map(s=>s.label));
  const mapped=p=>(record?.parameterSourceMap?.[p.key]||p.sourceIds||[]).some(id=>sources.has(id));
  const value=p=>Number.isFinite(p.value?.mean)||typeof p.value==='number';
  const groups=[['遠距視力',/(?:udva|cdva|ucva|bcdva)$/],['中距離視力',/(?:uiva|60_cm_binocular_ucva)$/],['近距離視力',/(?:unva|40_cm_binocular_va)$/]];
  groups.forEach(([title,pattern],i)=>{
   const matches=(coverage[0].status==='Available'?params:[]).filter(p=>pattern.test(p.key)&&mapped(p)&&value(p)&&(i!==0||!/^60_cm_/.test(p.key)));
   const lines=[];let status=matches.length?'Available':'Not structured yet';
   if(matches.length){lines.push('已收錄相關臨床視力測量。不同研究分別保存，未合併為單一效果結論。');
    if(i>0){for(const p of matches){const context=p.measurementContext||{};const cm=Number.isFinite(context.testDistanceCm)?context.testDistanceCm:Number.isFinite(context.testDistanceM)?context.testDistanceM*100:null;if(cm!==null){const ids=record.parameterSourceMap?.[p.key]||p.sourceIds||[];const line=`研究包含 ${cm} cm ${i===1?'中':'近'}距離視力（${ids.join('、')}）。`;if(!lines.includes(line))lines.push(line);}}}
   }else if(i>0&&(coverage[1].status!=='Not structured yet'||coverage[2].status!=='Not structured yet')){status='Partial / qualitative only';lines.push('有離焦曲線相關資料；不能直接代替特定距離的日常未矯正視力測量。');}else lines.push('目前網站尚未整理足夠資料');
   add(title,status,lines,matches.length?'#clinical-parameters':'#defocus-chart');
  });
  add('光暈／眩光等視覺現象',coverage[5].status,[coverage[5].status==='Not structured yet'?'目前網站尚未整理足夠資料':'已收錄相關問卷結果；severity 與 bothersomeness 分開保存，請查看各來源條件。'],'#clinical-parameters');
  const market=record?.product?.marketEvidence||[];
  const taiwan=[];
  for(const [title,pattern,catalogValue] of [['台灣許可資料',/tfda_license/,product.tfda_license_number],['NHI／特材資料',/nhi/,product.nhi_category]]){
   const items=market.filter(p=>pattern.test(p.key)&&p.value!==null&&p.value!==undefined);
   const refs=[...new Set(items.flatMap(p=>record.parameterSourceMap?.[p.key]||p.sourceIds||[]))];
   const exists=items.length||catalogValue;
   const verification=window.EvidenceUtils.verification({status:exists?'Available':'Not structured yet',refs},record);
   taiwan.push(`${title}：${exists?'已有資料':'目前尚未整理'}${verification?' · '+ver[verification]+' ('+verification+')':''}`);
  }
  add('台灣資訊',coverage[12].status,taiwan,'#product-details');
  const extra=el('p');extra.className='patient-summary-extra';extra.textContent=[[1,'逐點離焦曲線'],[3,'對比敏感度'],[4,'眼鏡獨立性'],[7,'光學平台資料']].map(([i,title])=>`${title}：${i===1&&coverage[i].status==='Partial / qualitative only'?'部分資料（僅定性／圖表證據，尚無逐點數值）':labels[coverage[i].status]}`).join('；');container.append(extra,el('p','研究平均結果不代表個人術後視覺。人工水晶體選擇仍需考量眼部狀況、生活需求與醫師評估。'));
 }
 window.PatientSummary={mount};
})();
