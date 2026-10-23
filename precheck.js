// Coverage pre-check: prescriptions → items (bundle or single) → HCPCS codes.
// Each HCPCS code is pre-checked on its own. Prescriptions are accordions on the left; the selected code’s result shows on the right.
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const icons=()=>{if(window.lucide)window.lucide.createIcons();};
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600);}
const esc=value=>String(value??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// Fallback used when the page is opened directly (matches the intake prototype).
const fallbackIntake=window.signeticDemoIntake;
let intake=fallbackIntake;
// The full intake (all prescriptions) is kept separately so creating an order for one prescription doesn't drop the others.
try{
  const full=sessionStorage.getItem('signeticIntakeFull'),order=sessionStorage.getItem('signeticIntakeOrder');
  const parsed=full?JSON.parse(full):order?JSON.parse(order):null;
  // A saved single-prescription order is not the intake: fall back to the full demo intake instead.
  if(parsed&&!parsed.fromPrescription&&parsed.prescriptions?.length)intake=parsed;
}catch(error){}
const fromOrder=new URLSearchParams(location.search).get('from')==='order';
const prepareOrders=Boolean(window.signeticOrders?.existingOrders.length);

// ---------- Rules (demo) ----------
const supplyLimits={A7030:'1 per 3 months',A7031:'1 per month',A7034:'1 per 3 months',A7035:'1 per 6 months',A7036:'1 per 6 months',A7037:'1 per 3 months',A7038:'2 per month',A7039:'1 per 6 months'};
const allowable={E0601:'$85.00 / month (rental)',E0562:'$18.00 / month (rental)',A7030:'$165.00',A7031:'$60.00',A7035:'$38.00',A7037:'$32.00',A7038:'$6.00',E1390:'$195.00 / month (rental)'};
const papCodes=/^(E0601|E0562|A70)/,oxygenSupply=/^A461/;
const primaryPlan=()=>(intake.insurance||[]).find(p=>!/inactive/i.test(p.status||''))||intake.insurance?.[0]||{name:'Primary payer'};
const paFor=code=>(intake.priorAuths||[]).find(pa=>pa.code===code);
const hasDoc=pattern=>(intake.documents||[]).some(name=>pattern.test(name));
const stated=v=>v!==undefined&&v!==null&&v!==''&&v!=='—'&&!/not on prescription/i.test(String(v));

const C={pass:'pass',warn:'warn',fail:'fail'};
// Same & similar against the patient's existing Signetic orders (orders-data.js). Evidence only: the route is chosen in Prepare orders.
const orderApi=window.signeticOrders;
function sameCheck(code,matches){
  const rows=matches.map(({order,item})=>`<div><dt>${esc(order.id)} · ${esc(order.title)}</dt><dd>${esc(order.status)}${item.refillable?` · refillable · last filled ${esc(item.lastFilled)} · ${item.due?'due now':`next ${esc(item.nextEligible)}`}`:` · ${esc(item.note||'not refillable')}`}</dd></div>`).join('');
  const body=`<dl class="pc-kv pc-kv-one">${rows}</dl><p class="pc-note">From the patient’s existing orders. You choose how to order each item in Prepare orders.</p>`;
  const refillable=matches.filter(m=>m.item.refillable),open=matches.find(m=>!m.item.refillable&&m.order.editable),owned=matches.find(m=>!m.item.refillable&&!m.order.editable);
  if(open)return {key:'same',label:'Same & similar',status:C.warn,summary:`Already on ${open.order.id} (${open.order.status.toLowerCase()}, not shipped)`,action:'Don’t order it again. Hold this item in Prepare orders.',body};
  if(refillable.length&&!refillable.some(m=>m.item.due)){const m=refillable[0];return {key:'same',label:'Same & similar',status:C.warn,summary:`Last filled ${m.item.lastFilled} · next due ${m.item.nextEligible}`,action:`${m.item.limit} allowed. Hold it until it’s due, or record a replacement reason.`,body};}
  if(refillable.length)return {key:'same',label:'Same & similar',status:C.pass,summary:refillable.length>1?`Refillable and due on ${refillable.length} orders`:`Refillable on ${refillable[0].order.id} · due now`,body};
  return {key:'same',label:'Same & similar',status:C.pass,summary:`On ${owned.order.id} · ${owned.item.note||'not refillable'}`,body};
}
// Happy path (scenario.js): the oxygen qualifying test is on file, so every code qualifies.
const happy=window.protoScenario==='happy';
function evaluate(line,rx,item){
  const code=line.code,checks=[];
  const physicianOk=Boolean(rx.npi);
  const icdList=(rx.icd||[]).map(c=>`<li><i data-lucide="check"></i><b>${c.code}</b> ${esc(c.description)}${c.primary?' <em>Primary</em>':''}</li>`).join('');
  // 1. Medical criteria
  if(code==='E0601'){
    checks.push({key:'medical',label:'Medical criteria',status:C.pass,summary:'AHI 18.4 meets ≥ 15 threshold',
      body:`<h5>ICD-10 codes</h5><ul class="pc-icd">${icdList}</ul>
      <details class="pc-more"><summary>Medicare criteria · LCD L33718</summary><div><p><b>Initial coverage (12 weeks)</b> for obstructive sleep apnea when:</p><ol><li>An in-person clinical evaluation happens before the sleep test.</li><li>A qualifying sleep test shows AHI/RDI ≥ 15 events/hour (minimum 30 events), or AHI/RDI 5–14 with documented symptoms or conditions such as excessive daytime sleepiness, hypertension or ischemic heart disease.</li><li>The beneficiary or caregiver is instructed on proper use.</li></ol><p><b>Continued coverage beyond 3 months</b> needs a clinical re-evaluation between days 31 and 91 showing improved symptoms and adherence of ≥ 4 hours/night on 70% of nights in a consecutive 30-day period.</p><p><b>Coding:</b> append modifier KX when criteria are met.</p></div></details>`});
  }else if(papCodes.test(code)){
    checks.push({key:'medical',label:'Medical criteria',status:C.pass,summary:'Follows E0601 qualification',body:`<p>PAP accessories are covered when the PAP device (E0601) meets coverage criteria.</p><h5>ICD-10 codes</h5><ul class="pc-icd">${icdList}</ul>`});
  }else if(code==='E1390'&&happy){
    checks.push({key:'medical',label:'Medical criteria',status:C.pass,summary:'Overnight SpO2 86% meets ≤ 88% threshold',
      body:`<h5>ICD-10 codes</h5><ul class="pc-icd">${icdList}</ul><h5>Qualifying test</h5><dl class="pc-kv"><div><dt>Test</dt><dd>Overnight oximetry · 10/09/2026</dd></div><div><dt>Result</dt><dd>SpO2 ≤ 88% for 41 minutes during sleep</dd></div></dl>`});
  }else if(code==='E1390'){
    checks.push({key:'medical',label:'Medical criteria',status:C.fail,summary:'No qualifying oxygen test found',action:'Upload oximetry or blood gas results from within 30 days before the order.',
      body:`<h5>ICD-10 codes</h5><ul class="pc-icd">${icdList}</ul><details class="pc-more" open><summary>Medicare criteria · LCD L33797</summary><div><p>Home oxygen is covered when a qualifying test (arterial blood gas or oximetry) taken within 30 days before the initial order shows, for example, SpO2 ≤ 88% at rest, during exercise, or during sleep for at least 5 minutes, along with a qualifying diagnosis.</p></div></details>`});
  }else{
    checks.push({key:'medical',label:'Medical criteria',status:C.pass,summary:'Follows E1390 qualification',body:'<p>Oxygen accessories follow the qualification of the oxygen equipment.</p>'});
  }
  // 2. Quantity & frequency come from the prescribed product, only when the prescription states them.
  const limit=supplyLimits[code],qty=stated(item.qty)?item.qty:'',freq=stated(item.frequency)?item.frequency:'';
  const missingDose=!happy&&!qty&&!freq;
  checks.push({key:'dispensing',label:'Quantity & frequency',status:missingDose?C.warn:C.pass,
    summary:missingDose?'Not on the prescription':limit?`Medicare allows ${limit}`:'As prescribed',
    action:missingDose?'Confirm quantity and frequency with the physician before dispensing.':'',
    body:`<dl class="pc-kv"><div><dt>On the prescription</dt><dd>${[qty?`Qty ${esc(qty)}`:'',esc(freq)].filter(Boolean).join(' · ')||'Not stated'}</dd></div><div><dt>Medicare allows</dt><dd>${esc(limit||(code==='E0601'?'1 device · 13-month capped rental':code==='E1390'?'1 concentrator · 36-month rental cap':'As prescribed'))}</dd></div></dl>`});
  // 3. Same & similar
  const sameMatches=orderApi?orderApi.lineMatches(code):[];
  if(sameMatches.length)checks.push(sameCheck(code,sameMatches));
  else checks.push({key:'same',label:'Same & similar',status:C.pass,summary:papCodes.test(code)&&code.startsWith('E')?'No active equipment in last 5 years':'No duplicate in current period',
    body:`<dl class="pc-kv"><div><dt>Previous ${code} found</dt><dd>No</dd></div><div><dt>Active rental</dt><dd>No</dd></div><div><dt>Similar equipment</dt><dd>None identified</dd></div></dl><p class="pc-note">Checked against Signetic records. For Medicare, confirm in the payer portal.</p>`});
  // 4. Physician enrollment
  const doc=(rx.physician||'').trim();
  checks.push({key:'physician',label:'Physician enrollment',status:physicianOk?C.pass:C.warn,summary:physicianOk?`Dr. ${doc.split(' ').pop()} is PECOS active`:'Ordering physician not verified',action:physicianOk?'':'Add the ordering physician from the NPI registry in the intake.',
    body:`<dl class="pc-kv"><div><dt>Physician</dt><dd>${doc?`Dr. ${esc(doc)}`:'Not added'}</dd></div><div><dt>NPI</dt><dd>${esc(rx.npi||'Not provided')}</dd></div><div><dt>PECOS</dt><dd>${physicianOk?'Active':'Not verified'}</dd></div><div><dt>Enrolled for</dt><dd>DME · Part B</dd></div></dl>`});
  // 5. Documents
  const docs=[{name:'Standard written order',ok:true,file:rx.source||'Added manually'}];
  if(code==='E0601'||code==='E1390')docs.push({name:'Face-to-face evaluation',ok:true,file:code==='E0601'?'Face-to-Face Notes.pdf':(rx.source||'Oxygen Prescription.jpg')});
  if(code==='E0601')docs.push({name:'Sleep study',ok:true,file:hasDoc(/sleep/i)?'Sleep Study.pdf':'Sleep Study · Aug 2022.pdf'});
  if(code==='E1390')docs.push(happy?{name:'Oxygen qualifying test',ok:true,file:'Overnight Oximetry.pdf'}:{name:'Oxygen qualifying test',ok:false,file:'Not found in uploads'});
  const pa=paFor(code);if(pa)docs.push({name:'Prior authorization',ok:true,file:`${pa.number} · ${pa.payer}`});
  const missing=docs.filter(d=>!d.ok).length;
  checks.push({key:'documents',label:'Documents',status:missing?C.fail:C.pass,
    summary:missing?`${missing} required document missing`:`${docs.length} of ${docs.length} on file`,
    action:missing?'Upload the oxygen qualifying test results.':'',
    body:`<ul class="pc-docs">${docs.map(d=>`<li class="${d.ok?'ok':'bad'}"><i data-lucide="${d.ok?'file-check':'file-x'}"></i><span><b>${d.name}</b><small>${esc(d.file)}</small></span></li>`).join('')}</ul>`});
  // 6. Payer coverage
  const plan=primaryPlan();
  if(oxygenSupply.test(code)&&happy){
    checks.push({key:'payer',label:'Payer coverage',status:C.pass,summary:'Covered with the E1390 rental',
      body:`<p>${esc(plan.name)} covers oxygen accessories such as cannulas and tubing as part of the monthly oxygen concentrator (E1390) rental.</p>`});
  }else if(oxygenSupply.test(code)){
    checks.push({key:'payer',label:'Payer coverage',status:C.fail,summary:'Included in E1390 rental',action:'Don’t bill separately. Supply it with the concentrator at no charge.',
      body:`<p>${esc(plan.name)} includes oxygen accessories such as cannulas and tubing in the monthly payment for the oxygen concentrator (E1390). They aren’t payable as separate items.</p>`});
  }else if(code==='E1390'&&!happy){
    checks.push({key:'payer',label:'Payer coverage',status:C.warn,summary:'Covered once medically qualified',action:'Coverage depends on the qualifying oxygen test.',
      body:`<dl class="pc-kv"><div><dt>Coverage</dt><dd>${esc(plan.name)} · monthly rental, 36-month cap</dd></div><div><dt>Allowable</dt><dd>${allowable.E1390}</dd></div><div><dt>Prior authorization</dt><dd>${pa?`${esc(pa.number)} · ${esc(pa.from)} – ${esc(pa.to)}`:'Not on file'}</dd></div></dl>`});
  }else{
    const rental=code==='E0601'||code==='E0562'||code==='E1390';
    checks.push({key:'payer',label:'Payer coverage',status:C.pass,summary:rental?'Covered · capped rental':'Covered · purchase',
      body:`<dl class="pc-kv"><div><dt>Coverage</dt><dd>${esc(plan.name)} · ${code==='E0601'?'13-month capped rental':code==='E0562'?'rental billed with E0601':code==='E1390'?'monthly rental, 36-month cap':'purchase'}</dd></div><div><dt>Allowable</dt><dd>${allowable[code]||'See fee schedule'}</dd></div><div><dt>Patient responsibility</dt><dd>20% coinsurance after deductible</dd></div>${pa?`<div><dt>Prior authorization</dt><dd>${esc(pa.number)} · ${esc(pa.from)} – ${esc(pa.to)}</dd></div>`:''}</dl>`});
  }
  const status=checks.some(c=>c.status===C.fail)?'fail':checks.some(c=>c.status===C.warn)?'warn':'pass';
  const recommended=code==='E0601'?[{name:'Chinstrap (A7036)',why:'Consider if the patient breathes through the mouth.'},{name:'Non-disposable filter (A7039)',why:'Often dispensed with the device; 1 per 6 months.'}]:[];
  return {...line,checks,status,recommended};
}

// ---------- Model: prescription → item → HCPCS line ----------
const lines=[];
const rxList=intake.prescriptions.map((rx,ri)=>({...rx,ri,items:rx.items.map((item,ii)=>{
  const model={...item,ii,rxIndex:ri};
  model.lines=item.lines.filter(l=>l.code).map(line=>{const l={...evaluate(line,rx,item),rx,item:model,id:lines.length};lines.push(l);return l;});
  return model;
})}));
const worst=list=>list.some(l=>l.status==='fail')?'fail':list.some(l=>l.status==='warn')?'warn':'pass';
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
const statusText={pass:'Qualified',warn:'Needs attention',fail:'Not qualified'};
const statusIcon={pass:'circle-check',warn:'triangle-alert',fail:'circle-x'};
// Check cards follow the intake review cards: a topic icon on the left, a status pill on the right.
const checkIcon={medical:'stethoscope',dispensing:'calendar-clock',same:'copy-check',physician:'user-round-check',documents:'file-text',payer:'shield-check'};
const checkPill={pass:['success','Passed'],warn:['warning','Review'],fail:['danger','Not met']};
const pillClass={pass:'success',warn:'warning',fail:'danger'};
const firstIssue=line=>line.checks.find(c=>c.status==='fail')||line.checks.find(c=>c.status==='warn');
const issueCount=line=>line.checks.filter(c=>c.status!=='pass').length;

// ---------- State ----------
const flagged=lines.filter(l=>l.status!=='pass');
const ordered=new Set();
const ui={rx:0,selected:null,reviewed:new Set(),open:new Set(),openRx:new Set()};
const openFlagged=()=>flagged.filter(l=>!ui.reviewed.has(l.id));
const first=flagged[0]||lines[0];
const rxOf=line=>rxList.findIndex(r=>r.items.some(i=>i.lines.includes(line)));
if(first){ui.rx=rxOf(first);ui.selected=first.id;}
// Accordion: one prescription open at a time (the first with flagged codes), the others show as headers.
ui.openRx.add(ui.rx);
const isOverlay=()=>matchMedia('(max-width:1280px)').matches;
const isStacked=()=>matchMedia('(max-width:820px)').matches;

// ---------- Left: prescriptions as accordions → items → codes ----------
function renderList(){
  $('#prList').innerHTML=rxList.map((rx,i)=>{
    const ls=rx.items.flatMap(it=>it.lines),open=ls.filter(l=>l.status!=='pass'&&!ui.reviewed.has(l.id)).length,exp=ui.openRx.has(i);
    return `<section class="pr-acc ${exp?'open':''} ${ui.rx===i?'current':''}">
      <div class="pr-acc-bar">
        <button class="pr-acc-head" data-rx="${i}" aria-expanded="${exp}">
          <i data-lucide="chevron-right" class="chev"></i>
          <span class="pr-acc-title"><b>${esc(rx.title)}</b><small>${rx.physician?`Dr. ${esc(rx.physician)}`:'Ordering physician not added'}${rx.npi?` · NPI ${esc(rx.npi)}`:''}</small></span>
          <span class="pr-acc-badge ${open?'todo':'ok'}">${open?`<i data-lucide="triangle-alert"></i> ${plural(open,'code')} flagged`:'<i data-lucide="circle-check"></i> All qualified'}</span>
        </button>
      </div>
      ${exp?`<div class="pr-acc-body">${rx.items.map(item=>`<div class="pr-item">
        <p class="pr-item-name"><span>${esc(item.name)}</span><span class="pill ai-kind" title="Identified by AI"><i data-lucide="sparkles"></i> ${item.bundle?`Bundle · ${item.lines.length}`:'Single'}</span></p>
        ${item.lines.map(l=>{const n=issueCount(l),rev=ui.reviewed.has(l.id);return `<button class="pr-code ${l.status} ${ui.selected===l.id?'active':''}" data-code="${l.id}" aria-current="${ui.selected===l.id}"><i data-lucide="${rev?'check':statusIcon[l.status]}" class="st ${rev?'rev':''}"></i><span class="pr-code-copy"><b>${l.code}</b><span>${esc(l.description)}</span><small>${rev?'Reviewed':n?`${n} of ${l.checks.length} checks need attention`:`All ${l.checks.length} checks passed`}</small>${matchNote(l.code)}</span></button>`;}).join('')}
      </div>`).join('')}
      </div>`:''}
    </section>`;
  }).join('');
}

// ---------- Detail: pre-check result for the selected code ----------
// Small "Matches ORD-1042" note under codes found on the patient's existing orders.
function matchNote(code){const ids=[...new Set((orderApi?orderApi.lineMatches(code):[]).map(m=>m.order.id))];return ids.length?`<em class="pr-match"><i data-lucide="link-2"></i> Matches ${ids.join(', ')}</em>`:'';}
function renderDetail(){
  const line=lines[ui.selected],box=$('#prDetail');
  if(!line||rxOf(line)!==ui.rx){box.innerHTML='<p class="pr-empty">Select a code to see its pre-check.</p>';return;}
  const issues=line.checks.filter(c=>c.status!=='pass');
  const dose=[stated(line.item.qty)?`Qty ${esc(line.item.qty)}`:'',stated(line.item.frequency)?esc(line.item.frequency):''].filter(Boolean).join(' · ');
  box.innerHTML=`
    <button class="text-btn pr-back" data-back-list><i data-lucide="arrow-left"></i> All codes</button>
    <header class="pcd-head">
      <div><span class="pcd-rx">${esc(rxList[ui.rx].title)} · ${esc(line.item.name)}${dose?` · ${dose}`:''}</span><h2><span class="pcd-code">${line.code}</span> ${esc(line.description)}</h2></div>
      <span class="pc-status ${line.status}"><i data-lucide="${statusIcon[line.status]}"></i> ${statusText[line.status]}</span>
    </header>
    ${issues.length?`<section class="pcd-todo ${line.status}"><h3><i data-lucide="${statusIcon[line.status]}"></i> ${issues.length} of ${line.checks.length} checks ${line.status==='fail'?'aren’t met':'need attention'}</h3><p>${line.status==='fail'?'This code doesn’t qualify yet.':'This code may qualify once reviewed.'} The checks below show what’s missing and how to fix it.</p></section>`:`<section class="pcd-todo pass"><h3><i data-lucide="circle-check"></i> All ${line.checks.length} checks passed</h3><p>Nothing to resolve for this code. Expand any check below to see the details.</p></section>`}
    <div class="pcd-checks">${line.checks.map(c=>{const open=c.status!=='pass'||ui.open.has(`${line.id}-${c.key}`);return `<section class="pcd-check ${c.status}" id="check-${c.key}"><button class="pcd-check-head" data-toggle="${c.key}" aria-expanded="${open}"><span class="section-icon"><i data-lucide="${checkIcon[c.key]||'list-checks'}"></i></span><span><b>${c.label}</b><small>${esc(c.summary)}</small></span><span class="section-status ${checkPill[c.status][0]}"><i data-lucide="${statusIcon[c.status]}"></i> ${checkPill[c.status][1]}</span><i data-lucide="chevron-down" class="chev"></i></button><div class="pcd-check-body" ${open?'':'hidden'}>${c.body}${c.action?`<p class="pcd-action"><i data-lucide="arrow-right"></i> ${esc(c.action)}</p>`:''}</div></section>`;}).join('')}</div>
    ${line.recommended.length?`<section class="pcd-reco"><h3><i data-lucide="sparkles"></i> Other items to consider <span>AI suggestion · review required</span></h3><ul>${line.recommended.map(r=>`<li><b>${esc(r.name)}</b><small>${esc(r.why)}</small></li>`).join('')}</ul></section>`:''}
    `;
  box.scrollTop=0;
}

// Footer under the result panel: status for the open prescription, Back to intake and Create order.
function renderFooter(){
  const rx=rxList[ui.rx],ls=rx.items.flatMap(i=>i.lines),bad=ls.filter(l=>l.status!=='pass').length;
  $('#pkFooterStatus').className=`pk-footer-status ${bad?'todo':'done'}`;
  $('#pkFooterStatus').innerHTML=`<span class="pk-status-icon"><i data-lucide="${bad?'list-checks':'check'}"></i></span><span><b>${bad?`${plural(bad,'code')} flagged`:'All codes qualified'}</b><span class="v2-next">in ${esc(rx.title)}</span></span>`;
  const label=fromOrder?'Save to order':prepareOrders?'Prepare orders':'Create order';
  $('#pcCreateOrder').innerHTML=`${label} <i data-lucide="arrow-right"></i>`;
  $('#pcCreateOrder').title=prepareOrders&&!fromOrder?'Choose how each prescribed item is ordered':`${label} for ${rx.title}`;
}

function render(){renderList();renderDetail();renderFooter();icons();}
function selectCode(id){
  const line=lines[id];if(!line)return;
  ui.rx=rxOf(line);ui.selected=id;ui.openRx.clear();ui.openRx.add(ui.rx);
  $('#pqLayout').classList.add('show-detail');
  render();
  $(`.pr-code[data-code="${id}"]`)?.scrollIntoView({block:'nearest'});
}
function goToNext(){const next=openFlagged()[0];if(next)selectCode(next.id);return next;}

// Each prescription becomes its own order, carrying only its own pre-check results.
function precheckForRx(i){
  const ls=rxList[i].items.flatMap(it=>it.lines),n={pass:ls.filter(l=>l.status==='pass').length,warn:ls.filter(l=>l.status==='warn').length,fail:ls.filter(l=>l.status==='fail').length},parts=[];
  if(n.pass)parts.push(`${n.pass} qualified`);if(n.warn)parts.push(`${n.warn} need${n.warn===1?'s':''} attention`);if(n.fail)parts.push(`${n.fail} not qualified`);
  return {summary:parts.join(' · '),at:'just now',results:ls.map(l=>({status:l.status,title:`${l.code} · ${l.description}`,detail:l.status==='pass'?'All checks passed':l.checks.filter(c=>c.status!=='pass').map(c=>c.summary).join(' · ')}))};
}
function createOrderFor(i){
  const rx=intake.prescriptions[i];if(!rx)return;
  const order={...intake,prescriptions:[rx],priorAuths:(intake.priorAuths||[]).filter(pa=>rx.items.some(it=>it.lines.some(l=>l.code===pa.code))),precheck:precheckForRx(i),fromPrescription:rx.title};
  try{sessionStorage.setItem('signeticIntakeFull',JSON.stringify(intake));sessionStorage.setItem('signeticIntakeOrder',JSON.stringify(order));}catch(error){}
  ordered.add(i);
  location.href=fromOrder?'dme-order.html?step=products':'dme-order.html';
}

document.addEventListener('click',event=>{
  const el=event.target.closest('button');if(!el)return;
  if(el.dataset.createRx!==undefined){createOrderFor(+el.dataset.createRx);return;}
  if(el.dataset.rx!==undefined){const i=+el.dataset.rx;if(ui.openRx.has(i)){ui.openRx.delete(i);}else{ui.openRx.clear();ui.openRx.add(i);ui.rx=i;const ls=rxList[i].items.flatMap(it=>it.lines);ui.selected=(ls.find(l=>l.status!=='pass')||ls[0]).id;}render();return;}
  if(el.dataset.code!==undefined&&el.dataset.code!==''){selectCode(+el.dataset.code);return;}
  if(el.dataset.backList!==undefined){$('#pqLayout').classList.remove('show-detail');return;}
  if(el.dataset.toggle){const key=`${ui.selected}-${el.dataset.toggle}`,body=el.nextElementSibling,open=body.hidden;body.hidden=!open;el.setAttribute('aria-expanded',String(open));open?ui.open.add(key):ui.open.delete(key);return;}
  if(el.dataset.jump){const section=$(`#check-${el.dataset.jump}`);section.querySelector('.pcd-check-body').hidden=false;section.querySelector('.pcd-check-head').setAttribute('aria-expanded','true');section.scrollIntoView({behavior:'smooth',block:'start'});section.classList.add('flash');setTimeout(()=>section.classList.remove('flash'),900);return;}
});
// With existing orders, items may be refilled or added to an order, so the user prepares orders item by item.
function openPrepareOrders(){
  const status={};lines.forEach(l=>{status[l.code]=status[l.code]==='fail'||l.status==='fail'?'fail':status[l.code]==='warn'||l.status==='warn'?'warn':'pass';});
  try{sessionStorage.setItem('signeticIntakeFull',JSON.stringify(intake));sessionStorage.setItem('signeticPrecheckStatus',JSON.stringify(status));sessionStorage.removeItem('signeticOrderPlan');}catch(error){}
  location.href='prepare-orders.html';
}
$('#pcCreateOrder').addEventListener('click',()=>prepareOrders&&!fromOrder?openPrepareOrders():createOrderFor(ui.rx));
document.addEventListener('keydown',event=>{
  if(event.target.matches('input,textarea,select'))return;
  const ls=lines,i=ui.selected;
  if(event.key==='ArrowDown'&&ls[i+1]){event.preventDefault();selectCode(ls[i+1].id);}
  if(event.key==='ArrowUp'&&ls[i-1]){event.preventDefault();selectCode(ls[i-1].id);}
});

// Header + back links
$('#pkTitle').innerHTML=`<span class="title-muted">Pre-check for</span> <span class="title-name">${esc(intake.patient.first)} ${esc(intake.patient.last)}</span>`;
$('#pkPatient').textContent=`${primaryPlan().name} · DOB ${intake.patient.dob} · From intake #${intake.id}`;
// Back to the live intake page, which restores the saved session.
const backTo=fromOrder?'dme-order.html?step=products':'index.html';
$('#pcBack').href=backTo;
if(fromOrder){$('#pcBack').innerHTML='<i data-lucide="arrow-left"></i> Back to order';}

// Shell
const setNavCollapsed=collapsed=>{document.body.classList.toggle('nav-collapsed',collapsed);const toggle=$('#navToggle');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');toggle.title=toggle.getAttribute('aria-label');};
setNavCollapsed(true);
$('#navToggle').addEventListener('click',()=>setNavCollapsed(!document.body.classList.contains('nav-collapsed')));
$$('[data-nav-section]').forEach(section=>section.addEventListener('click',()=>{const open=section.parentElement.classList.toggle('open');section.setAttribute('aria-expanded',String(open));}));
$$('.shell-nav a[href="#"]').forEach(link=>link.addEventListener('click',event=>event.preventDefault()));

render();

// Pre-checking takes a moment: show progress before the results appear.
(function precheckLoader(){
  const main=$('.pr-main');if(!main)return;
  const steps=['Checking medical criteria','Verifying coverage and eligibility','Reviewing prior authorizations','Comparing with existing orders'];
  const veil=document.createElement('div');veil.className='pc-loader';veil.setAttribute('role','status');veil.setAttribute('aria-live','polite');
  veil.innerHTML=`<div class="pc-loader-card"><span class="ai-label"><i data-lucide="sparkles"></i> AI coverage pre-check</span><h2>Running pre-check</h2><p>Checking each HCPCS code against coverage rules. This takes a moment.</p><div class="progress-track"><span id="pcLoaderBar"></span></div><ul class="pc-loader-steps">${steps.map((step,index)=>`<li data-step="${index}"><span class="spinner"></span><i data-lucide="check"></i>${step}</li>`).join('')}</ul></div>`;
  main.appendChild(veil);icons();
  const items=[...veil.querySelectorAll('li')],bar=$('#pcLoaderBar'),each=750;
  items[0].classList.add('active');bar.style.width='8%';
  steps.forEach((step,index)=>setTimeout(()=>{
    items[index].classList.remove('active');items[index].classList.add('done');
    if(items[index+1])items[index+1].classList.add('active');
    bar.style.width=`${Math.round((index+1)/steps.length*100)}%`;
  },each*(index+1)));
  setTimeout(()=>{veil.classList.add('leaving');setTimeout(()=>veil.remove(),250);},each*steps.length+350);
})();
