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
// ---------- Same & similar source, physician, documents, payer coverage ----------
const plans=()=>(intake.insurance||[]);
const isMedicare=plan=>/medicare/i.test(`${plan.type||''} ${plan.name||''}`);
const activePlans=()=>plans().filter(p=>!/inactive/i.test(p.status||''));
// Same & similar only sees Signetic orders. Medicare history is checked in the DME MAC portal (Washington: Jurisdiction D, Noridian).
function sameSourceNote(){
  const medicare=plans().some(isMedicare);
  return `<div class="pc-source-note"><i data-lucide="info"></i><span><b>From Signetic records only.</b> Equipment the patient got from other suppliers isn’t included.${medicare?` Check Medicare same-or-similar history before dispensing: <a href="https://www.noridianmedicareportal.com/" target="_blank" rel="noopener">Noridian Medicare Portal</a> (Jurisdiction D, which covers ${esc(intake.patient?.state||'WA')}). Other jurisdictions use <a href="https://www.cgsmedicare.com/mycgs/" target="_blank" rel="noopener">myCGS</a>.`:' Check the payer’s portal for claims from other suppliers.'}</span></div>`;
}
function physicianCheck(rx){
  const p=rx.physicianInfo||{},name=[p.first,p.last].filter(Boolean).join(' ')||rx.physician||'',npi=p.npi||rx.npi||'';
  const yn=v=>v?'Yes':'No',found=Boolean(npi),dmeOk=p.dme!==false;
  const status=!found?C.warn:!dmeOk?C.fail:C.pass;
  return {key:'physician',label:'Ordering physician',status,
    summary:!found?'Ordering physician not verified':!dmeOk?`Dr. ${esc(p.last||name)} isn’t enrolled to order DME`:`Dr. ${esc(p.last||name)} · NPI ${esc(npi)} · enrolled for DME`,
    action:!found?'Add the ordering physician from the NPI registry in the intake.':!dmeOk?'Medicare won’t pay for DME ordered by this physician. Ask for an order from an enrolled physician.':'',
    body:`<dl class="pc-kv"><div><dt>First name</dt><dd>${esc(p.first||'—')}</dd></div><div><dt>Last name</dt><dd>${esc(p.last||'—')}</dd></div><div><dt>NPI</dt><dd>${esc(npi||'Not provided')}</dd></div><div><dt>Specialty</dt><dd>${esc(p.specialty||rx.specialty||'—')}</dd></div><div class="pc-kv-wide"><dt>Address</dt><dd>${esc(p.address||'—')}</dd></div></dl>
      <h5>Medicare enrollment (PECOS)</h5><dl class="pc-kv pc-kv-3"><div><dt>DME</dt><dd>${yn(p.dme)}</dd></div><div><dt>PMD</dt><dd>${yn(p.pmd)}</dd></div><div><dt>PARTB</dt><dd>${yn(p.partb)}</dd></div></dl>`};
}
function documentsCheck(code,rx,item){
  let docs=item.docs?item.docs.map(d=>({...d})):[
    {name:'Standard written order (SWO)',status:rx.source||'Added manually',found:true},
    {name:'Face-to-face clinical evaluation',status:'Face-to-Face Notes.pdf',found:true},
    {name:'Prior authorization',status:paFor(code)?`On file · ${paFor(code).number} · ${paFor(code).payer}`:'Not required for these codes',found:Boolean(paFor(code)),na:!paFor(code)}];
  // Happy path: the oxygen test is on file.
  if(happy)docs=docs.map(d=>/oxygen qualifying/i.test(d.name)&&!d.found?{...d,found:true,status:'Overnight Oximetry.pdf'}:d);
  const needed=docs.filter(d=>!d.na),missingReq=needed.filter(d=>!d.found&&!d.recommended),missingRec=needed.filter(d=>!d.found&&d.recommended);
  const have=needed.length-missingReq.length-missingRec.length;
  return {key:'documents',label:'Required documents',status:missingReq.length?C.fail:missingRec.length?C.warn:C.pass,
    summary:`${have} of ${needed.length} on file${missingReq.length||missingRec.length?` · ${[...missingReq,...missingRec].map(d=>d.name.replace(/ \(.*\)$/,'')).join(', ')} not found`:''}`,
    action:missingReq.length||missingRec.length?`Upload the ${[...missingReq,...missingRec].map(d=>d.name.toLowerCase().replace(/ \(.*\)$/,'')).join(' and ')} to the intake.`:'',
    body:`<ul class="pc-docs">${docs.map(d=>`<li class="${d.na?'na':d.found?'ok':'bad'}"><i data-lucide="${d.na?'file-minus':d.found?'file-check':'file-x'}"></i><span><b>${esc(d.name)}${d.recommended?` <em class="pc-rec">Recommended by Medicare · ${esc(d.recommended)}</em>`:''}</b><small>${esc(d.status)}</small></span></li>`).join('')}</ul>`};
}
// What the payer covers for a code (demo rules) and the Medicare allowable (demo DMEPOS fee schedule amounts).
const coverageFor=code=>code==='E0601'?'13-month capped rental':code==='E0562'?'Capped rental, billed with E0601':code==='E1390'?'Monthly rental, 36-month cap':oxygenSupply.test(code)?'Included in the E1390 rental':'Purchase';
const medicareAllowable={...allowable,A4615:'Included in E1390 rental',A4616:'Included in E1390 rental'};
function ecSummary(plan){const ec=plan?.eligibility;if(!ec)return 'Eligibility not checked';return `${ec.active?'Active':'Inactive'} · ${ec.service} ${ec.eligible?'covered':'not covered'} · checked ${ec.checkedAt.split(' · ')[0]}`;}
function payerCheck(code){
  const list=activePlans(),primary=list[0]||primaryPlan(),ec=primary.eligibility,pa=paFor(code);
  const medicarePrimary=isMedicare(primary),rental=/^(E0601|E0562|E1390)$/.test(code);
  let status=C.pass,summary=`${primary.name} · ${rental?'covered · rental':'covered · purchase'}`,action='';
  if(!ec){status=C.warn;summary='Eligibility not checked';action='Check eligibility for DME in the intake.';}
  else if(!ec.eligible){status=C.fail;summary=`${primary.name} · ${ec.service} not covered`;action='Check the patient’s coverage before ordering.';}
  else if(oxygenSupply.test(code)&&!happy){status=C.fail;summary='Included in the E1390 rental';action='Don’t bill separately. Supply it with the concentrator at no charge.';}
  else if(oxygenSupply.test(code)){summary='Covered with the E1390 rental';}
  else if(code==='E1390'&&!happy){status=C.warn;summary='Covered once medically qualified';action='Coverage depends on the qualifying oxygen test.';}
  const dedMet=ec?(ec.deductible===ec.deductibleMet?`Met (${esc(ec.deductible)})`:`${esc(ec.deductibleMet)} of ${esc(ec.deductible)} met`):'—';
  const rows=[
    [`Coverage for ${code}`,coverageFor(code)],
    ['Benefit',ec?esc(ec.benefit):'—'],
    ['Deductible',dedMet],
    ['Allowable',medicarePrimary?`${medicareAllowable[code]||'See fee schedule'} <span class="pc-muted">Medicare fee schedule</span>`:'Per payer contract'],
    ['Prior authorization',pa?`${esc(pa.number)} · ${esc(pa.from)} – ${esc(pa.to)}`:'Not on file']
  ];
  const others=list.slice(1).map(p=>`${esc(p.rank||'Other')}: ${esc(p.name)} · ${p.eligibility?.eligible?'active for DME':'not covered'}`);
  const ecPill=ec?`<span class="section-status ${ec.eligible?'success-visible':'danger'}">${ec.eligible?'Active · DME covered':'DME not covered'}</span>`:'<span class="section-status warning">Not checked</span>';
  return {key:'payer',label:'Payer coverage',status,summary,action,
    body:`<div class="pc-payer"><div class="pc-payer-head"><span class="pc-payer-name"><small>Primary</small>${esc(primary.name)}</span>${ecPill}</div>
      <dl class="pc-rows">${rows.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></div>
      ${others.length?`<p class="pc-payer-other">${others.join('<br>')}</p>`:''}
      ${!medicarePrimary&&medicareAllowable[code]?`<p class="pc-payer-ref">Medicare allowable for reference: ${medicareAllowable[code]}</p>`:''}
      <button type="button" class="pc-link" data-eligibility>View EC response</button>`};
}
// Eligibility responses (one per plan), opened from the page header or any payer coverage check.
function openEligibility(){
  let dlg=$('#pcEligibility');
  if(!dlg){dlg=document.createElement('dialog');dlg.id='pcEligibility';dlg.className='confirm-dialog response-dialog pc-ec-dialog';document.body.appendChild(dlg);
    dlg.addEventListener('click',e=>{if(e.target===dlg||e.target.closest('[data-ec-close]'))dlg.close();});}
  dlg.innerHTML=`<div class="pc-ec"><header class="response-head"><div><span class="eyebrow">Eligibility check · DME</span><h2>Coverage for ${esc(intake.patient.first)} ${esc(intake.patient.last)}</h2><p>From the intake review. Checked once per plan, not per item.</p></div><button class="icon-btn" data-ec-close aria-label="Close"><i data-lucide="x"></i></button></header>
    ${plans().map(p=>{const ec=p.eligibility;return `<section class="pc-ec-plan ${ec?.eligible?'eligible':'not-eligible'}"><h3><span class="pc-ec-rank">${esc(p.rank||'')}</span> ${esc(p.name)}<span class="section-status ${ec?.eligible?'success-visible':'danger'}">${ec?(ec.eligible?'Active · DME covered':'Not covered'):'Not checked'}</span></h3>
      ${ec?`<dl class="response-list">${[['Benefit',ec.benefit],['Member ID',p.memberId||'—'],['Plan dates',ec.planDates],['Deductible',`${ec.deductible} · ${ec.deductibleMet} met`],['Out-of-pocket maximum',ec.oop],['Network',ec.network],['Payer',ec.payer],['Trace number',ec.trace],['Checked',ec.checkedAt]].map(([l,v])=>`<div><dt>${l}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${ec.other?`<p class="pc-note"><b>Other insurance found:</b> ${esc(ec.other.name)} · ${esc(ec.other.memberId)} · ${esc(ec.other.dates)}. Not on this intake.</p>`:''}`:'<p class="pc-note">Eligibility wasn’t checked for this plan.</p>'}</section>`;}).join('')}</div>`;
  icons();dlg.showModal();
}
document.addEventListener('click',e=>{if(e.target.closest('[data-eligibility]')){e.preventDefault();openEligibility();}});
// Same & similar against the patient's existing Signetic orders (orders-data.js). Evidence only: the route is chosen in Fulfillment.
const orderApi=window.signeticOrders;
// Same & similar: every same HCPCS code and similar item on the patient's Signetic orders, with how it was supplied.
const similarGroups=[
  ['E0601','E0470','E0471'],['E0562','E0561'],['A7030','A7034','A7027'],['A7031','A7032','A7033'],['A7037','A4604'],['A7038','A7039'],
  ['E1390','E1391','E0424','E0439'],['E1392','E0431','E0434'],['A4615'],['A4616'],['E0570']
];
const similarTo=code=>(similarGroups.find(g=>g.includes(code))||[code]).filter(c=>c!==code);
const acquisitionLabel={purchase:'Purchase',owned:'Capped rental · now owned','rental-active':'Active rental','rental-past':'Past rental',pending:'Ordered · not delivered'};
function sameMatchesFor(code){
  const orders=orderApi?.existingOrders||[],sim=similarTo(code);
  return orders.flatMap(order=>order.items.filter(i=>i.code===code||sim.includes(i.code)).map(item=>({order,item,match:item.code===code?'same':'similar'})))
    .sort((a,b)=>(a.match==='same'?0:1)-(b.match==='same'?0:1));
}
function sameCheck(code,matches){
  const type=m=>acquisitionLabel[m.item.acquisition]||(m.item.refillable?'Purchase':'—');
  const detail=m=>m.item.refillable?`Last filled ${m.item.lastFilled} · ${m.item.limit} · ${m.item.due?'due now':`next ${m.item.nextEligible}`}`:(m.item.dates||m.item.note||'');
  const rows=matches.map(m=>`<tr><td><span class="pc-ss-match ${m.match}">${m.match==='same'?'Same':'Similar'}</span></td><td><b>${esc(m.item.code)}</b> ${esc(m.item.name)}</td><td>${esc(type(m))}</td><td>${esc(m.order.id)} · ${esc(m.order.status)}<small>${esc(m.order.title)}</small></td><td>${esc(detail(m))}</td></tr>`).join('');
  const body=`<div class="pc-ss-wrap"><table class="pc-ss"><thead><tr><th>Match</th><th>Item</th><th>Type</th><th>Order</th><th>Details</th></tr></thead><tbody>${rows}</tbody></table></div>${sameSourceNote()}`;
  const same=matches.filter(m=>m.match==='same'),similar=matches.filter(m=>m.match==='similar');
  const counts=[same.length?`${same.length} same`:'',similar.length?`${similar.length} similar`:''].filter(Boolean).join(' · ');
  const pending=matches.find(m=>m.item.acquisition==='pending'),active=matches.find(m=>m.item.acquisition==='rental-active');
  const refill=same.filter(m=>m.item.refillable),notDue=refill.length&&!refill.some(m=>m.item.due)?refill[0]:null;
  if(pending)return {key:'same',label:'Same & similar',status:C.warn,summary:`${counts} in Signetic · ${pending.item.code} already ordered on ${pending.order.id}, not delivered`,action:'Don’t order it again. Hold this item in Prepare orders.',body};
  if(active)return {key:'same',label:'Same & similar',status:C.warn,summary:`${counts} in Signetic · active rental of ${active.item.code} on ${active.order.id}`,action:'The patient already rents similar equipment. Confirm it’s being replaced before ordering.',body};
  if(notDue)return {key:'same',label:'Same & similar',status:C.warn,summary:`${counts} in Signetic · next ${code} due ${notDue.item.nextEligible}`,action:`${notDue.item.limit} allowed. Hold it until it’s due, or record a replacement reason.`,body};
  return {key:'same',label:'Same & similar',status:C.pass,summary:`${counts} in Signetic · nothing blocks this order`,body};
}
// ---------- Medical criteria (LCD checklists, demo evidence) ----------
// Status per criterion: met · review (needs a look) · missing (not found) · later (checked after setup).
const critPill={met:['success','Met'],review:['warning','Review'],missing:['danger','Not found'],later:['neutral','After setup'],pending:['neutral','Waiting on test']};
const critIcon={met:'circle-check',review:'triangle-alert',missing:'circle-x',later:'clock',pending:'hourglass'};
const notYet=c=>c.status==='later'||c.status==='pending';
const lcdLink=id=>`https://www.cms.gov/medicare-coverage-database/view/lcd.aspx?LCDid=${id.replace(/\D/g,'')}`;
function criteriaHtml(groups){
  return groups.map(g=>`<h5>${g.title}</h5>${g.note?`<p class="pc-note">${g.note}</p>`:''}<ol class="pc-criteria">${g.items.map(c=>{const [cls,label]=critPill[c.status];return `<li class="pc-crit ${c.status}"><i data-lucide="${critIcon[c.status]}" class="pc-crit-icon"></i><div class="pc-crit-copy"><b>${c.title}</b>${c.rule?`<small class="pc-crit-rule">${c.rule}</small>`:''}${c.evidence?`<p class="pc-crit-evidence"><span>${c.status==='missing'?'Looked in':'Evidence'}</span>${c.evidence}</p>`:''}${c.action?`<p class="pc-crit-action"><i data-lucide="arrow-right"></i>${c.action}</p>`:''}</div><span class="section-status ${cls} pc-crit-pill">${label}</span></li>`;}).join('')}</ol>`).join('');
}
function addDays(date,days){const [m,d,y]=date.split('/').map(Number),dt=new Date(y,m-1,d+days);return `${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}/${dt.getFullYear()}`;}
// PAP device: LCD L33718 (initial 12-week trial, then continued coverage).
function papCriteria(){
  const start='10/15/2026';
  return [
    {title:'Initial coverage · 12-week trial',items:[
      happy
        ?{status:'met',title:'Clinical evaluation before the sleep test',rule:'In-person or Medicare-approved telehealth visit before the test, with sleep history, a physical exam and the Epworth Sleepiness Scale or another validated inventory.',evidence:'Referral.pdf · Dr. Sarah Kim · 09/24/2026 · snoring, witnessed apneas, Epworth 14, BMI 33.1'}
        :{status:'review',title:'Clinical evaluation before the sleep test',rule:'In-person or Medicare-approved telehealth visit before the test, with sleep history, a physical exam and the Epworth Sleepiness Scale or another validated inventory.',evidence:'Face-to-Face Notes.pdf · 10/12/2026 · Epworth 14. This visit is after the sleep test (10/08/2026).',action:'Find the evaluation dated on or before 10/08/2026 and add it to the intake.'},
      {status:'met',title:'Qualifying sleep test',rule:'AHI or RDI ≥ 15 events/hour with at least 30 events, or 5–14 events/hour with at least 10 events plus excessive daytime sleepiness, impaired cognition, mood disorder, insomnia, hypertension, ischemic heart disease or history of stroke.',evidence:'Home sleep test (Type III) · 10/08/2026 · AHI 18.4 events/hour · 114 events over 6.2 hours'},
      {status:'met',title:'Diagnosis supports PAP therapy',rule:'Obstructive sleep apnea is on the order.',evidence:'G47.33 Obstructive sleep apnea (adult) · primary'},
      {status:'met',title:'Standard written order for the device and accessories',rule:'Patient, order date, item description, quantity, practitioner name or NPI and signature.',evidence:'Prescription.pdf · Dr. Sarah Kim · NPI 1629384756 · signed 10/12/2026'},
      {status:'later',title:'Patient instructed on use and care',rule:'The supplier documents that the patient or caregiver was shown how to use and care for the equipment.',evidence:'Record it at the setup visit.'}
    ]},
    {title:'Continued coverage · after the trial',note:`Therapy starts ${start}. The re-evaluation window is day 31 to day 90.`,items:[
      {status:'later',title:'Clinical re-evaluation shows benefit',rule:'Treating practitioner visit between day 31 and day 90 documenting improved symptoms.',evidence:`Window: ${addDays(start,30)} – ${addDays(start,89)}`},
      {status:'later',title:'Adherence to therapy',rule:'Use for at least 4 hours a night on 70% of nights (21 of 30 consecutive nights) during the trial, reviewed by the practitioner.',evidence:'Track from the device data after setup.'}
    ]}
  ];
}
// Oxygen: LCD L33797 (Group I and II).
function oxygenCriteria(){
  const test=happy
    ?{status:'met',title:'Qualifying blood gas study',rule:'Group I: SpO2 ≤ 88% or PO2 ≤ 55 mm Hg at rest, during exercise, or during sleep (sleep only qualifies when awake SpO2 ≥ 89%). Group II: SpO2 89% or PO2 56–59 mm Hg plus edema from heart failure, pulmonary hypertension or hematocrit > 56%.',evidence:'Overnight Oximetry.pdf · 10/09/2026 · awake SpO2 93% · SpO2 ≤ 88% for 41 minutes during sleep · Group I (sleep)'}
    :{status:'missing',title:'Qualifying blood gas study',rule:'Group I: SpO2 ≤ 88% or PO2 ≤ 55 mm Hg at rest, during exercise, or during sleep (sleep only qualifies when awake SpO2 ≥ 89%). Group II: SpO2 89% or PO2 56–59 mm Hg plus edema from heart failure, pulmonary hypertension or hematocrit > 56%.',evidence:'All 6 uploaded documents. The physician note (Oxygen Prescription.jpg) mentions overnight oximetry, but the test report isn’t uploaded.',action:'Upload the overnight oximetry report.'};
  return [
    {title:'Group I or II qualification',items:[
      happy
        ?{status:'met',title:'Test ordered and reviewed by the treating practitioner',rule:'The treating practitioner ordered the test at the time of need and evaluated the results.',evidence:'Oxygen Prescription.jpg · Dr. Michael Reyes · 10/13/2026 · results reviewed in the note'}
        :{status:'review',title:'Test ordered and reviewed by the treating practitioner',rule:'The treating practitioner ordered the test at the time of need and evaluated the results.',evidence:'Oxygen Prescription.jpg · Dr. Michael Reyes refers to the results, but they can’t be checked without the report.'},
      test,
      happy
        ?{status:'met',title:'Test done by a qualified provider',rule:'Performed by the treating practitioner or a qualified lab or testing provider, not the oxygen supplier.',evidence:'Overnight Oximetry.pdf · Pacific Sleep Diagnostics (IDTF)'}
        :{status:'missing',title:'Test done by a qualified provider',rule:'Performed by the treating practitioner or a qualified lab or testing provider, not the oxygen supplier.',evidence:'Needs the test report.'},
      {status:'met',title:'Home oxygen will improve the condition',rule:'The medical record shows oxygen at home is expected to improve the patient’s condition.',evidence:'Oxygen Prescription.jpg · “Prescribe stationary oxygen concentrator at 2 L/min during sleep” · reassess in 90 days'},
      {status:'met',title:'Diagnosis supports oxygen',rule:'A diagnosis of hypoxemia or a related condition, and none of the non-covered conditions (e.g. angina or dyspnea without hypoxemia).',evidence:'R09.02 Hypoxemia · primary'}
    ]},
    {title:'What this covers',items:[
      {status:happy?'met':'pending',title:'Use during sleep only',rule:'A sleep-only qualifying test covers oxygen during sleep. A portable system needs a test at rest or during exercise.',evidence:'Prescribed 2 L/min during sleep · stationary concentrator (E1390) matches'}
    ]}
  ];
}
function medicalCheck(code,icdList){
  const icd=`<h5>ICD-10 codes on the prescription</h5><ul class="pc-icd">${icdList}</ul>`;
  const source=(id,name)=>`<p class="pc-note pc-lcd">Source: Medicare LCD ${id} · ${name} · <a href="${lcdLink(id)}" target="_blank" rel="noopener">Read the full LCD</a></p>`;
  const result=(groups,lcd,name)=>{
    const all=groups.flatMap(g=>g.items),now=all.filter(c=>!notYet(c));
    const met=now.filter(c=>c.status==='met').length,missing=now.filter(c=>c.status==='missing'),review=now.filter(c=>c.status==='review');
    const first=missing[0]||review[0];
    return {key:'medical',label:'Medical criteria',status:missing.length?C.fail:review.length?C.warn:C.pass,
      summary:`${met} of ${now.length} criteria met${first?` · ${first.status==='missing'?'Not found':'Review'}: ${first.title}`:''}`,
      action:first?.action||'',
      body:`${criteriaHtml(groups)}${icd}${source(lcd,name)}`};
  };
  if(code==='E0601')return result(papCriteria(),'L33718','Positive Airway Pressure (PAP) Devices for the Treatment of Obstructive Sleep Apnea');
  if(code==='E1390')return result(oxygenCriteria(),'L33797','Oxygen and Oxygen Equipment');
  // Accessories follow the main equipment's qualification.
  const pap=papCodes.test(code),parentCode=pap?'E0601':'E1390',parent=pap?papCriteria():oxygenCriteria();
  const parentNow=parent.flatMap(g=>g.items).filter(c=>!notYet(c)),parentOk=parentNow.every(c=>c.status==='met');
  const groups=[{title:'Accessory coverage',items:[
    {status:parentOk?'met':parentNow.some(c=>c.status==='missing')?'missing':'review',title:`${parentCode} meets its coverage criteria`,rule:pap?'PAP accessories and the heated humidifier are covered only when the PAP device is covered.':'Oxygen accessories are covered only with covered oxygen equipment.',evidence:`${parentNow.filter(c=>c.status==='met').length} of ${parentNow.length} ${parentCode} criteria met · see ${parentCode} for details`,action:parentOk?'':`Resolve the ${parentCode} medical criteria first.`},
    pap?{status:'met',title:'Used with the PAP device',rule:'Item is used with a covered E0601 device.',evidence:'Prescribed with E0601 on Prescription 1'}
       :{status:'met',title:'Used with the oxygen equipment',rule:'Item is used with covered oxygen equipment.',evidence:'Prescribed with E1390 on Prescription 2'}
  ]}];
  return result(groups,pap?'L33718':'L33797',pap?'Positive Airway Pressure (PAP) Devices for the Treatment of Obstructive Sleep Apnea':'Oxygen and Oxygen Equipment');
}
// Happy path (scenario.js): the oxygen qualifying test is on file, so every code qualifies.
const happy=window.protoScenario==='happy';
function evaluate(line,rx,item){
  const code=line.code,checks=[];
  const physicianOk=Boolean(rx.npi);
  const icdList=(rx.icd||[]).map(c=>`<li><i data-lucide="check"></i><b>${c.code}</b> ${esc(c.description)}${c.primary?' <em>Primary</em>':''}</li>`).join('');
  // 1. Medical criteria: each LCD criterion with its status and the evidence found in the intake documents.
  checks.push(medicalCheck(code,icdList));
  // 2. Quantity & frequency come from the prescribed product, only when the prescription states them.
  const limit=supplyLimits[code],qty=stated(item.qty)?item.qty:'',freq=stated(item.frequency)?item.frequency:'';
  const missingDose=!happy&&!qty&&!freq;
  checks.push({key:'dispensing',label:'Quantity & frequency',status:missingDose?C.warn:C.pass,
    summary:missingDose?'Not on the prescription':limit?`Medicare allows ${limit}`:'As prescribed',
    action:missingDose?'Confirm quantity and frequency with the physician before dispensing.':'',
    body:`<dl class="pc-kv"><div><dt>On the prescription</dt><dd>${[qty?`Qty ${esc(qty)}`:'',esc(freq)].filter(Boolean).join(' · ')||'Not stated'}</dd></div><div><dt>Medicare allows</dt><dd>${esc(limit||(code==='E0601'?'1 device · 13-month capped rental':code==='E1390'?'1 concentrator · 36-month rental cap':'As prescribed'))}</dd></div></dl>`});
  // 3. Same & similar (Signetic records only)
  const sameMatches=sameMatchesFor(code);
  if(sameMatches.length){const c=sameCheck(code,sameMatches);if(happy){c.status=C.pass;c.action='';}checks.push(c);}
  else checks.push({key:'same',label:'Same & similar',status:C.pass,summary:'No match in Signetic records',
    body:`<dl class="pc-kv"><div><dt>Previous ${code} in Signetic</dt><dd>No</dd></div><div><dt>Active rental in Signetic</dt><dd>No</dd></div><div><dt>Similar equipment in Signetic</dt><dd>None identified</dd></div></dl>${sameSourceNote()}`});
  // 4. Ordering physician: the same details as the intake review (NPI registry and PECOS enrollment).
  checks.push(physicianCheck(rx));
  // 5. Required documents: the same list as the intake review for this item.
  checks.push(documentsCheck(code,rx,item));
  // 6. Payer coverage: from the eligibility check (EC) done in the intake. EC is per plan, not per item.
  checks.push(payerCheck(code));
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
        ${item.lines.length?'':'<p class="pr-nocode"><i data-lucide="info"></i> No HCPCS code yet. Add one in the review to pre-check this item.</p>'}
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
  const label=fromOrder?'Save to order':'Start fulfillment';
  $('#pcCreateOrder').innerHTML=`${label} <i data-lucide="arrow-right"></i>`;
  $('#pcCreateOrder').title=fromOrder?`${label} for ${rx.title}`:'Turn the prescriptions into orders, refills and appointments';
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
$('#pcCreateOrder').addEventListener('click',()=>!fromOrder?openPrepareOrders():createOrderFor(ui.rx));
document.addEventListener('keydown',event=>{
  if(event.target.matches('input,textarea,select'))return;
  const ls=lines,i=ui.selected;
  if(event.key==='ArrowDown'&&ls[i+1]){event.preventDefault();selectCode(ls[i+1].id);}
  if(event.key==='ArrowUp'&&ls[i-1]){event.preventDefault();selectCode(ls[i-1].id);}
});

// Header + back links
$('#pkTitle').innerHTML=`<span class="title-muted">Pre-check for</span> <span class="title-name">${esc(intake.patient.first)} ${esc(intake.patient.last)}</span>`;
$('#pkPatient').innerHTML=`${esc((activePlans()[0]||primaryPlan()).name)} · DOB ${esc(intake.patient.dob)} · From intake #${esc(intake.id)} · <button type="button" class="pc-link" data-eligibility>View EC response</button>`;
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
