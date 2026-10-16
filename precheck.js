// Coverage pre-check: review every prescribed item, one at a time.
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const icons=()=>{if(window.lucide)window.lucide.createIcons();};
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600);}
const esc=value=>String(value??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// Fallback used when the page is opened directly.
const fallbackIntake={
  id:'INT-0023',completed:'Oct 15, 2026',
  patient:{first:'Ashlynn',middle:'',last:'Botosh',dob:'03/15/1978',gender:'Female',phone:'(415) 220-8841',home:'(206) 555-0142',email:'ashlynn.botosh@email.com',address:'1234 Healthways Blvd, Suite 200',city:'Seattle',state:'WA',zip:'98101',county:'King',mrn:'PT-10482'},
  prescriptions:[
    {title:'Prescription 1',source:'Prescription.pdf',date:'10/12/2026',physician:'Sarah Kim',npi:'1982746530',specialty:'Sleep medicine',
      icd:[{code:'G47.33',description:'Obstructive sleep apnea (adult)',primary:true},{code:'E66.9',description:'Obesity, unspecified'},{code:'I10',description:'Essential (primary) hypertension'}],
      items:[{name:'CPAP auto 5–15 cm H2O with heated humidifier, full face mask and supplies',bundle:true,lines:[{code:'E0601',description:'Continuous positive airway pressure (CPAP) device',qty:1,frequency:'Monthly rental × 13'},{code:'E0562',description:'Humidifier, heated, used with PAP device',qty:1,frequency:'Monthly rental × 13'},{code:'A7030',description:'Full face mask used with PAP device',qty:1,frequency:'1 per 3 months'},{code:'A7031',description:'Face mask cushion, replacement for full face mask',qty:1,frequency:'1 per month'},{code:'A7037',description:'Tubing used with PAP device',qty:1,frequency:'1 per 3 months'},{code:'A7038',description:'Filter, disposable, used with PAP device',qty:2,frequency:'2 per month'}]},
             {name:'Headgear used with PAP device',bundle:false,lines:[{code:'A7035',description:'Headgear used with PAP device',qty:1,frequency:'1 per 6 months'}]}]},
    {title:'Prescription 2',source:'Oxygen Prescription.pdf',date:'10/13/2026',physician:'Michael Reyes',npi:'1487265930',specialty:'Pulmonology',
      icd:[{code:'R09.02',description:'Hypoxemia',primary:true},{code:'G47.33',description:'Obstructive sleep apnea (adult)'}],
      items:[{name:'Home oxygen concentrator, 2 L/min nocturnal',bundle:false,lines:[{code:'E1390',description:'Oxygen concentrator, single delivery port',qty:1,frequency:'Monthly rental × 36'}]},
             {name:'Oxygen supplies',bundle:true,lines:[{code:'A4615',description:'Cannula, nasal',qty:2,frequency:'2 per month'},{code:'A4616',description:'Tubing (oxygen), per foot',qty:7,frequency:'7 ft per month'}]}]}
  ],
  insurance:[{rank:'Primary',name:'Medicare Part B',memberId:'X BCB731045298 03',group:'Not provided',status:'Active through 12/30/2027'},{rank:'Secondary',name:'Aetna Choice POS II',memberId:'Z AET529187463 07',group:'GRP-258914',status:'Active through 03/14/2027'},{rank:'Tertiary',name:'Washington Apple Health',memberId:'200458812WA',group:'Not provided',status:'Active through 06/30/2027'}],
  priorAuths:[{code:'E0601',number:'PA-26-0418873',payer:'Aetna Choice POS II',from:'10/15/2026',to:'04/15/2027',qty:'1 unit',frequency:'Monthly rental · 13 months'},{code:'E1390',number:'PA-26-0522190',payer:'Aetna Choice POS II',from:'10/15/2026',to:'10/14/2027',qty:'1 unit',frequency:'Monthly rental · 12 months'}],
  documents:['Referral.pdf','Insurance Card.pdf','Prescription.pdf','Oxygen Prescription.pdf','Consent Form.pdf','Face-to-Face Notes.pdf'],
  note:'Patient seen 10/12/2026 for loud snoring, witnessed apneas, and daytime sleepiness (Epworth score 14). Home sleep test on 10/08/2026 shows AHI 18.4 events/hr, consistent with moderate obstructive sleep apnea.',
  precheck:null
};
let intake=fallbackIntake;
try{const saved=sessionStorage.getItem('signeticIntakeOrder');if(saved)intake=JSON.parse(saved);}catch(error){}
const fromOrder=new URLSearchParams(location.search).get('from')==='order';

// ---------- Rules (demo) ----------
// Medicare max replacement frequency for PAP supplies and whether an item is billed on its own.
const supplyLimits={A7030:'1 per 3 months',A7031:'1 per month',A7034:'1 per 3 months',A7035:'1 per 6 months',A7036:'1 per 6 months',A7037:'1 per 3 months',A7038:'2 per month',A7039:'1 per 6 months'};
const allowable={E0601:'$85.00 / month (rental)',E0562:'$18.00 / month (rental)',A7030:'$165.00',A7031:'$60.00',A7035:'$38.00',A7037:'$32.00',A7038:'$6.00',E1390:'$195.00 / month (rental)'};
const papCodes=/^(E0601|E0562|A70)/,oxygenSupply=/^A461/;
const primaryPlan=()=>intake.insurance[0]||{name:'Primary payer'};
const paFor=code=>intake.priorAuths.find(pa=>pa.code===code);
const hasDoc=pattern=>intake.documents.some(name=>pattern.test(name));

const C={pass:'pass',warn:'warn',fail:'fail'};
function evaluate(line,rx){
  const code=line.code,checks=[];
  const physicianOk=Boolean(rx.npi);
  const icdList=rx.icd.map(c=>`<li><i data-lucide="check"></i><b>${c.code}</b> ${esc(c.description)}${c.primary?' <em>Primary</em>':''}</li>`).join('');
  // 1. Medical criteria
  if(code==='E0601'){
    checks.push({key:'medical',label:'Medical criteria',status:C.pass,summary:'AHI 18.4 meets ≥ 15 threshold',
      body:`<h5>ICD-10 codes</h5><ul class="pc-icd">${icdList}</ul>
      <details class="pc-more"><summary>Medicare criteria · LCD L33718</summary><div><p><b>Initial coverage (12 weeks)</b> for obstructive sleep apnea when:</p><ol><li>An in-person clinical evaluation happens before the sleep test.</li><li>A qualifying sleep test shows AHI/RDI ≥ 15 events/hour (minimum 30 events), or AHI/RDI 5–14 with documented symptoms or conditions such as excessive daytime sleepiness, hypertension or ischemic heart disease.</li><li>The beneficiary or caregiver is instructed on proper use.</li></ol><p><b>Continued coverage beyond 3 months</b> needs a clinical re-evaluation between days 31 and 91 showing improved symptoms and adherence of ≥ 4 hours/night on 70% of nights in a consecutive 30-day period.</p><p><b>Coding:</b> append modifier KX when criteria are met.</p></div></details>`});
  }else if(papCodes.test(code)){
    checks.push({key:'medical',label:'Medical criteria',status:C.pass,summary:'Follows E0601 qualification',body:`<p>PAP accessories are covered when the PAP device (E0601) meets coverage criteria.</p><h5>ICD-10 codes</h5><ul class="pc-icd">${icdList}</ul>`});
  }else if(code==='E1390'){
    checks.push({key:'medical',label:'Medical criteria',status:C.fail,summary:'No qualifying oxygen test found',action:'Upload oximetry or blood gas results from within 30 days before the order.',
      body:`<h5>ICD-10 codes</h5><ul class="pc-icd">${icdList}</ul><details class="pc-more" open><summary>Medicare criteria · LCD L33797</summary><div><p>Home oxygen is covered when a qualifying test (arterial blood gas or oximetry) taken within 30 days before the initial order shows, for example, SpO2 ≤ 88% at rest, during exercise, or during sleep for at least 5 minutes, along with a qualifying diagnosis.</p></div></details>`});
  }else{
    checks.push({key:'medical',label:'Medical criteria',status:C.pass,summary:'Follows E1390 qualification',body:'<p>Oxygen accessories follow the qualification of the oxygen equipment.</p>'});
  }
  // 2. Dispensing limits
  const limit=supplyLimits[code];
  checks.push({key:'dispensing',label:'Quantity & frequency',status:C.pass,
    summary:limit?`Within Medicare limit (${limit})`:/rental/i.test(line.frequency)?`${line.frequency.replace('Monthly rental ×','Monthly rental,')}${/×/.test(line.frequency)?' months':''}`:'Within allowed quantity',
    body:`<dl class="pc-kv"><div><dt>Prescribed</dt><dd>Qty ${line.qty} · ${esc(line.frequency)}</dd></div><div><dt>Medicare allows</dt><dd>${esc(limit||(code==='E0601'?'1 device · 13-month capped rental':code==='E1390'?'1 concentrator · 36-month rental cap':'As prescribed'))}</dd></div></dl>`});
  // 3. Same & similar
  checks.push({key:'same',label:'Same & similar',status:C.pass,summary:papCodes.test(code)&&code.startsWith('E')?'No active equipment in last 5 years':'No duplicate in current period',
    body:`<dl class="pc-kv"><div><dt>Previous ${code} found</dt><dd>No</dd></div><div><dt>Active rental</dt><dd>No</dd></div><div><dt>Similar equipment</dt><dd>None identified</dd></div></dl><p class="pc-note">Checked against Signetic records. For Medicare, confirm in the payer portal.</p>`});
  // 4. Physician enrollment
  checks.push({key:'physician',label:'Physician enrollment',status:physicianOk?C.pass:C.warn,summary:physicianOk?`Dr. ${rx.physician.split(' ').pop()} is PECOS active`:'NPI missing · PECOS not verified',action:physicianOk?'':'Add the physician’s NPI in the intake to verify PECOS enrollment.',
    body:`<dl class="pc-kv"><div><dt>Physician</dt><dd>Dr. ${esc(rx.physician)}</dd></div><div><dt>NPI</dt><dd>${esc(rx.npi||'Not provided')}</dd></div><div><dt>PECOS</dt><dd>${physicianOk?'Active':'Not verified'}</dd></div><div><dt>Enrolled for</dt><dd>DME · Part B</dd></div></dl>`});
  // 5. Documents
  const docs=[{name:'Standard written order',ok:true,file:rx.source}];
  if(code==='E0601'||code==='E1390')docs.push({name:'Face-to-face evaluation',ok:code!=='E0601',warn:code==='E0601',file:code==='E0601'?'Face-to-Face Notes.pdf · not signed':'Face-to-Face Notes.pdf'});
  if(code==='E0601')docs.push({name:'Sleep study',ok:true,file:hasDoc(/sleep/i)?'Sleep Study.pdf':'Sleep Study · Aug 2022.pdf'});
  if(code==='E1390')docs.push({name:'Oxygen qualifying test',ok:false,file:'Not found'});
  const pa=paFor(code);if(pa)docs.push({name:'Prior authorization',ok:true,file:`${pa.number} · ${pa.payer}`});
  const docFail=docs.some(d=>!d.ok&&!d.warn),docWarn=docs.some(d=>d.warn);
  checks.push({key:'documents',label:'Documents',status:docFail?C.fail:docWarn?C.warn:C.pass,
    summary:docFail?`${docs.filter(d=>!d.ok&&!d.warn).length} required document missing`:docWarn?'Face-to-face note not signed':`${docs.length} of ${docs.length} on file`,
    action:docFail?'Upload the oxygen qualifying test results.':docWarn?'Request a signed, dated face-to-face note from Dr. '+rx.physician.split(' ').pop()+'.':'',
    body:`<ul class="pc-docs">${docs.map(d=>`<li class="${d.ok?'ok':d.warn?'warn':'bad'}"><i data-lucide="${d.ok?'file-check':d.warn?'file-warning':'file-x'}"></i><span><b>${d.name}</b><small>${esc(d.file)}</small></span></li>`).join('')}</ul>`});
  // 6. Payer coverage
  const plan=primaryPlan();
  if(oxygenSupply.test(code)){
    checks.push({key:'payer',label:'Payer coverage',status:C.fail,summary:'Included in E1390 rental',action:'Don’t bill separately. Supply it with the concentrator at no charge.',
      body:`<p>${esc(plan.name)} includes oxygen accessories such as cannulas and tubing in the monthly payment for the oxygen concentrator (E1390). They aren’t payable as separate items.</p>`});
  }else if(code==='E0601'&&pa){
    checks.push({key:'payer',label:'Payer coverage',status:C.warn,summary:'Covered · authorization ends early',action:`Request an extension of ${pa.number} before ${pa.to}.`,
      body:`<dl class="pc-kv"><div><dt>Coverage</dt><dd>${esc(plan.name)} · 13-month capped rental</dd></div><div><dt>Allowable</dt><dd>${allowable.E0601}</dd></div><div><dt>Patient responsibility</dt><dd>20% coinsurance after deductible</dd></div><div><dt>Prior authorization</dt><dd>${esc(pa.number)} · ends ${esc(pa.to)}, 7 months before the rental ends</dd></div></dl>`});
  }else if(code==='E1390'){
    checks.push({key:'payer',label:'Payer coverage',status:C.warn,summary:'Covered once medically qualified',action:'Coverage depends on the qualifying oxygen test.',
      body:`<dl class="pc-kv"><div><dt>Coverage</dt><dd>${esc(plan.name)} · monthly rental, 36-month cap</dd></div><div><dt>Allowable</dt><dd>${allowable.E1390}</dd></div><div><dt>Prior authorization</dt><dd>${pa?`${esc(pa.number)} · ${esc(pa.from)} – ${esc(pa.to)}`:'Not on file'}</dd></div></dl>`});
  }else{
    const isRental=code==='E0562';
    checks.push({key:'payer',label:'Payer coverage',status:C.pass,summary:isRental?'Covered · rental with E0601':'Covered · purchase',
      body:`<dl class="pc-kv"><div><dt>Coverage</dt><dd>${esc(plan.name)} · ${isRental?'rental billed with E0601':'purchase'}</dd></div><div><dt>Allowable</dt><dd>${allowable[code]||'See fee schedule'}</dd></div><div><dt>Patient responsibility</dt><dd>20% coinsurance after deductible</dd></div></dl>`});
  }
  const status=checks.some(c=>c.status===C.fail)?'fail':checks.some(c=>c.status===C.warn)?'warn':'pass';
  const recommended=code==='E0601'?[{name:'Chinstrap (A7036)',why:'Consider if the patient breathes through the mouth.'},{name:'Non-disposable filter (A7039)',why:'Often dispensed with the device; 1 per 6 months.'}]:[];
  return {...line,rx,checks,status,recommended};
}
const items=intake.prescriptions.flatMap(rx=>rx.items.flatMap(item=>item.lines.map(line=>evaluate(line,rx))));
items.forEach((item,i)=>item.id=i);
const ui={selected:items.findIndex(i=>i.status!=='pass'),filter:'all',open:new Set()};
if(ui.selected<0)ui.selected=0;

const statusText={pass:'Qualified',warn:'Needs attention',fail:'Not qualified'};
const statusIcon={pass:'circle-check',warn:'triangle-alert',fail:'circle-x'};
const counts=()=>({all:items.length,pass:items.filter(i=>i.status==='pass').length,warn:items.filter(i=>i.status==='warn').length,fail:items.filter(i=>i.status==='fail').length});
const issueCount=item=>item.checks.filter(c=>c.status!=='pass').length;

function renderStats(){
  const n=counts();
  $('#pcStats').innerHTML=[['all','Total items'],['pass','Qualified'],['warn','Needs attention'],['fail','Not qualified']].map(([key,label])=>`<button class="pc-stat ${key} ${ui.filter===key?'active':''}" data-filter="${key}" aria-pressed="${ui.filter===key}"><b>${String(n[key]).padStart(2,'0')}</b><span>${label}</span></button>`).join('');
  const flagged=n.warn+n.fail;
  $('#pcFooterStatus').textContent=flagged?`AI flagged ${flagged} of ${items.length} ${items.length===1?'item':'items'}`:`AI found no issues across ${items.length} items`;
}
function renderList(){
  const visible=item=>ui.filter==='all'||item.status===ui.filter;
  $('#pcList').innerHTML=intake.prescriptions.map(rx=>{
    const rows=items.filter(i=>i.rx===rx&&visible(i));
    if(!rows.length)return '';
    return `<section class="pc-rx"><header><strong>${esc(rx.title)}</strong><span>Dr. ${esc(rx.physician)}${rx.npi?` · NPI ${esc(rx.npi)}`:''}</span></header>${rows.map(item=>{const issues=issueCount(item);return `<button class="pc-item ${item.status} ${ui.selected===item.id?'active':''}" data-item="${item.id}" aria-current="${ui.selected===item.id}"><span class="pc-item-icon"><i data-lucide="${statusIcon[item.status]}"></i></span><span class="pc-item-copy"><span class="pc-item-top"><b>${item.code}</b></span><span class="pc-item-desc">${esc(item.description)}</span><small>${issues?`${issues} of ${item.checks.length} checks need attention`:`All ${item.checks.length} checks passed`}</small></span></button>`;}).join('')}</section>`;
  }).join('')||'<p class="pc-empty">No items in this group.</p>';
}
function renderDetail(){
  const item=items[ui.selected];if(!item)return;
  const issues=item.checks.filter(c=>c.status!=='pass');
  $('#pcDetail').innerHTML=`
    <header class="pcd-head">
      <div><span class="pcd-rx">${esc(item.rx.title)} · Qty ${item.qty} · ${esc(item.frequency)}</span><h2><span class="pcd-code">${item.code}</span> ${esc(item.description)}</h2></div>
      <span class="pc-status ${item.status}"><i data-lucide="${statusIcon[item.status]}"></i> ${statusText[item.status]}</span>
    </header>
    ${issues.length?`<section class="pcd-todo ${item.status}"><h3>${item.status==='fail'?'Why it doesn’t qualify':'What needs attention'}</h3><ul>${issues.map(c=>`<li><button class="pcd-todo-link" data-jump="${c.key}"><i data-lucide="${statusIcon[c.status]}"></i><span><b>${c.label}:</b> ${esc(c.summary)}${c.action?`<small>${esc(c.action)}</small>`:''}</span><i data-lucide="chevron-right" class="go"></i></button></li>`).join('')}</ul></section>`:`<section class="pcd-todo pass"><h3><i data-lucide="circle-check"></i> All ${item.checks.length} checks passed</h3><p>Nothing to resolve for this item. Expand any check below to see the details.</p></section>`}
    <div class="pcd-checks">${item.checks.map(c=>{const open=c.status!=='pass'||ui.open.has(`${item.id}-${c.key}`);return `<section class="pcd-check ${c.status}" id="check-${c.key}"><button class="pcd-check-head" data-toggle="${c.key}" aria-expanded="${open}"><i data-lucide="${statusIcon[c.status]}" class="st"></i><span><b>${c.label}</b><small>${esc(c.summary)}</small></span><span class="pc-mini ${c.status}">${c.status==='pass'?'Pass':c.status==='warn'?'Review':'Fail'}</span><i data-lucide="chevron-down" class="chev"></i></button><div class="pcd-check-body" ${open?'':'hidden'}>${c.body}${c.action?`<p class="pcd-action"><i data-lucide="arrow-right"></i> ${esc(c.action)}</p>`:''}</div></section>`;}).join('')}</div>
    ${item.recommended.length?`<section class="pcd-reco"><h3><i data-lucide="sparkles"></i> Other items to consider <span>AI suggestion · review required</span></h3><ul>${item.recommended.map(r=>`<li><b>${esc(r.name)}</b><small>${esc(r.why)}</small></li>`).join('')}</ul></section>`:''}`;
}
function render(){renderStats();renderList();renderDetail();icons();}
function select(id,focus=true){ui.selected=+id;render();if(focus){$('#pcDetail').scrollTop=0;window.matchMedia('(max-width:900px)').matches&&$('#pcDetail').scrollIntoView({behavior:'smooth',block:'start'});}}

function precheckForOrder(){
  const n=counts(),parts=[];
  if(n.pass)parts.push(`${n.pass} qualified`);if(n.warn)parts.push(`${n.warn} need${n.warn===1?'s':''} attention`);if(n.fail)parts.push(`${n.fail} not qualified`);
  return {summary:parts.join(' · '),at:'just now',results:items.map(i=>({status:i.status==='pass'?'pass':i.status==='warn'?'warn':'fail',title:`${i.code} · ${i.description}`,detail:i.status==='pass'?'All checks passed':i.checks.filter(c=>c.status!=='pass').map(c=>c.summary).join(' · ')}))};
}

document.addEventListener('click',event=>{
  const el=event.target.closest('button');if(!el)return;
  if(el.dataset.filter){ui.filter=el.dataset.filter;const first=items.find(i=>ui.filter==='all'||i.status===ui.filter);if(first&&!(ui.filter==='all'||items[ui.selected].status===ui.filter))ui.selected=first.id;render();return;}
  if(el.dataset.item!==undefined){select(el.dataset.item);return;}
  if(el.dataset.toggle){const key=`${ui.selected}-${el.dataset.toggle}`,body=el.nextElementSibling,open=body.hidden;body.hidden=!open;el.setAttribute('aria-expanded',String(open));open?ui.open.add(key):ui.open.delete(key);return;}
  if(el.dataset.jump){const section=$(`#check-${el.dataset.jump}`);const body=section.querySelector('.pcd-check-body');body.hidden=false;section.querySelector('.pcd-check-head').setAttribute('aria-expanded','true');section.scrollIntoView({behavior:'smooth',block:'start'});section.classList.add('flash');setTimeout(()=>section.classList.remove('flash'),900);return;}
});
document.addEventListener('keydown',event=>{
  if(event.target.matches('input,textarea,select'))return;
  if(event.key==='ArrowDown'||event.key==='j'){const next=items[ui.selected+1];if(next){event.preventDefault();select(next.id,false);$(`[data-item="${next.id}"]`)?.focus();}}
  if(event.key==='ArrowUp'||event.key==='k'){const prev=items[ui.selected-1];if(prev){event.preventDefault();select(prev.id,false);$(`[data-item="${prev.id}"]`)?.focus();}}
});
$('#pcCreateOrder').addEventListener('click',()=>{
  intake.precheck=precheckForOrder();
  try{sessionStorage.setItem('signeticIntakeOrder',JSON.stringify(intake));}catch(error){}
  location.href=fromOrder?'dme-order.html?step=products':'dme-order.html';
});

// Header
const plan=primaryPlan();
$('#pcPatient').textContent=`${intake.patient.first} ${intake.patient.last} · ${plan.name} · DOB ${intake.patient.dob}`;
$('#pcIntakeId').textContent=`#${intake.id}`;
if(fromOrder){$('#pcBack').href='dme-order.html?step=products';$('#pcBackLink').href='dme-order.html?step=products';$('#pcCreateOrder').textContent='Save & return to order';}

// Shell
const setNavCollapsed=collapsed=>{document.body.classList.toggle('nav-collapsed',collapsed);const toggle=$('#navToggle');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');toggle.title=toggle.getAttribute('aria-label');};
setNavCollapsed(true);
$('#navToggle').addEventListener('click',()=>setNavCollapsed(!document.body.classList.contains('nav-collapsed')));
$$('[data-nav-section]').forEach(section=>section.addEventListener('click',()=>{const open=section.parentElement.classList.toggle('open');section.setAttribute('aria-expanded',String(open));}));
$$('.shell-nav a[href="#"]').forEach(link=>link.addEventListener('click',event=>event.preventDefault()));
$('#shellBack').addEventListener('click',()=>history.back());
$('#shellRefresh').addEventListener('click',()=>location.reload());

render();
