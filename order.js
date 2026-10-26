// DME Order (created from a completed patient intake)
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const icons=()=>{if(window.lucide)window.lucide.createIcons();};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600);}
const esc=value=>String(value??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// Fallback used when the page is opened directly instead of from a completed intake.
const defaultPrecheck=[
  {status:'pass',title:'Payer eligibility',detail:'Medicare Part B (primary) and Aetna Choice POS II (secondary) active for DME'},
  {status:'pass',title:'Standard written orders',detail:'2 prescriptions with HCPCS, quantity and frequency'},
  {status:'pass',title:'Medicare coverage criteria · L33718 (PAP)',detail:'AHI 18.4 on home sleep test and face-to-face visit on 10/12/2026'},
  {status:'warn',title:'Medicare coverage criteria · L33797 (oxygen)',detail:'Oxygen qualifying test results not found in uploaded documents'},
  {status:'warn',title:'Prior authorization period',detail:'PA-26-0418873 ends 04/15/2027, before the 13-month CPAP rental ends'}
];
const fallbackIntake={
  id:'INT-0023',completed:'Oct 15, 2026',
  patient:{first:'Ashlynn',middle:'',last:'Botosh',dob:'03/15/1978',gender:'Female',phone:'(415) 220-8841',home:'(206) 555-0142',email:'ashlynn.botosh@email.com',address:'1234 Healthways Blvd, Suite 200',city:'Seattle',state:'WA',zip:'98101',county:'King',mrn:'PT-10482'},
  prescriptions:[
    {title:'Prescription 1',source:'Prescription.pdf',date:'10/12/2026',physician:'Sarah Kim',npi:'1982746530',specialty:'Sleep medicine',
      icd:[{code:'G47.33',description:'Obstructive sleep apnea (adult)',primary:true},{code:'E66.9',description:'Obesity, unspecified'},{code:'I10',description:'Essential (primary) hypertension'}],
      items:[{name:'CPAP auto 5–15 cm H2O with heated humidifier, full face mask and supplies',bundle:true,lines:[{code:'E0601',description:'Continuous positive airway pressure (CPAP) device',qty:1,frequency:'Monthly rental × 13'},{code:'E0562',description:'Humidifier, heated, used with PAP device',qty:1,frequency:'Monthly rental × 13'},{code:'A7030',description:'Full face mask used with PAP device',qty:1,frequency:'1 per 3 months'},{code:'A7031',description:'Face mask cushion, replacement for full face mask',qty:1,frequency:'1 per month'},{code:'A7037',description:'Tubing used with PAP device',qty:1,frequency:'1 per 3 months'},{code:'A7038',description:'Filter, disposable, used with PAP device',qty:2,frequency:'2 per month'}]},
             {name:'Headgear used with PAP device',bundle:false,lines:[{code:'A7035',description:'Headgear used with PAP device',qty:1,frequency:'1 per 6 months'}]}]},
    {title:'Prescription 2',source:'Oxygen Prescription.jpg',date:'10/13/2026',physician:'Michael Reyes',npi:'1487265930',specialty:'Pulmonology',
      icd:[{code:'R09.02',description:'Hypoxemia',primary:true},{code:'G47.33',description:'Obstructive sleep apnea (adult)'}],
      items:[{name:'Home oxygen concentrator, 2 L/min nocturnal',bundle:false,lines:[{code:'E1390',description:'Oxygen concentrator, single delivery port',qty:1,frequency:'Monthly rental × 36'}]},
             {name:'Oxygen supplies',bundle:true,lines:[{code:'A4615',description:'Cannula, nasal',qty:2,frequency:'2 per month'},{code:'A4616',description:'Tubing (oxygen), per foot',qty:7,frequency:'7 ft per month'}]}]}
  ],
  insurance:[{rank:'Primary',name:'Medicare Part B',memberId:'X BCB731045298 03',group:'Not provided',status:'Active through 12/30/2027'},{rank:'Secondary',name:'Aetna Choice POS II',memberId:'Z AET529187463 07',group:'GRP-258914',status:'Active through 03/14/2027'},{rank:'Tertiary',name:'Washington Apple Health',memberId:'200458812WA',group:'Not provided',status:'Active through 06/30/2027'}],
  priorAuths:[{code:'E0601',number:'PA-26-0418873',payer:'Aetna Choice POS II',from:'10/15/2026',to:'04/15/2027',qty:'1 unit',frequency:'Monthly rental · 13 months'},{code:'E1390',number:'PA-26-0522190',payer:'Aetna Choice POS II',from:'10/15/2026',to:'10/14/2027',qty:'1 unit',frequency:'Monthly rental · 12 months'}],
  documents:['Referral.pdf','Insurance Card.jpg','Prescription.pdf','Oxygen Prescription.jpg','Consent Form.pdf','Face-to-Face Notes.pdf'],
  note:'Patient seen 10/12/2026 for loud snoring, witnessed apneas, and daytime sleepiness (Epworth score 14). Home sleep test on 10/08/2026 shows AHI 18.4 events/hr, consistent with moderate obstructive sleep apnea.',
  precheck:null
};
let intake=fallbackIntake;
try{const saved=sessionStorage.getItem('signeticIntakeOrder');if(saved)intake=JSON.parse(saved);}catch(error){}

// Demo product catalog
const catalog=[
  ['CPAP/APAP','','','E0601'],['AirSense 11 AutoSet','ResMed','39000','E0601'],['DreamStation 2 Auto CPAP','Philips Respironics','DSX900T11','E0601'],
  ['Luna II CPAP','3B Medical Inc','LG2000','E0601'],['Luna II Auto-CPAP','3B Medical Inc','LG2A00','E0601'],['Luna II Auto-CPAP with humidifier','3B Medical Inc','LG2A00H','E0601 + E0562'],
  ['HumidAir 11 heated humidifier','ResMed','39002','E0562'],
  ['AirFit F20 full face mask','ResMed','63401','A7030'],['Simplus full face mask','Fisher & Paykel','400467','A7030'],['DreamWear full face mask','Philips Respironics','1133375','A7030'],
  ['AirFit F20 replacement cushion','ResMed','63450','A7031'],['AirFit F20 headgear','ResMed','63462','A7035'],
  ['SlimLine tubing','ResMed','36998','A7037'],['Standard CPAP tubing, 6 ft','3B Medical Inc','CT-06','A7037'],
  ['AirSense 11 disposable filters, 2 pack','ResMed','39003','A7038'],['CPAP Pro nasal pillow system','CPAP Pro','CP12-165','A7034'],['CPAP tubing wrap','','9999','A9900'],
  ['At Home 5L oxygen concentrator','Inogen','IO-500','E1390'],['EverFlo 5L oxygen concentrator','Philips Respironics','1020000','E1390'],['Perfecto2 V oxygen concentrator','Invacare','IRC5PO2V','E1390'],
  ['Nasal cannula, adult','Salter Labs','1600-7-50','A4615'],['Oxygen supply tubing, 7 ft','Salter Labs','1607-7','A4616']
].map(([name,maker,model,code],id)=>({id,name,maker,model,code}));
const classification=code=>/^E0(601|562)/.test(code)?'PAP devices':/^A7|^A99/.test(code)?'PAP supplies':/^E1(39|40)|^A46/.test(code)?'Oxygen':'Other';
const rental=code=>/^(E0601|E0562|E1390)/.test(code);
const retail={E0601:'$85.00 / mo',E0562:'$18.00 / mo',E1390:'$195.00 / mo',A7030:'$165.00',A7031:'$60.00',A7035:'$38.00',A7037:'$32.00',A7038:'$6.00',A7034:'$95.00',A4615:'$4.00',A4616:'$1.20'};
const steps=[['patient','Patient Information'],['payment','Payment Information'],['products','Select Products'],['documentation','Documentation'],['summary','Order Summary'],['followup','Follow up']];
const order={step:'patient',maxStep:0,products:[]};
const allLines=()=>intake.prescriptions.flatMap(rx=>rx.items.flatMap(item=>item.lines.map(line=>({...line,rx:rx.title}))));
const lineFor=code=>allLines().find(line=>line.code===code);
const addedFor=code=>order.products.filter(product=>product.code.split(' + ').includes(code));
const prescribedCodes=()=>[...new Set(allLines().map(line=>line.code))];

function renderStepper(){
  const current=steps.findIndex(([id])=>id===order.step);
  $('#orderStepper').innerHTML=steps.map(([id,label],index)=>`<li class="${index<current?'done':index===current?'current':''}"><button data-step="${id}" ${index===current?'aria-current="step"':''}><span class="step-dot">${index<current?'<i data-lucide="check"></i>':''}</span><span class="step-label">${label}</span></button></li>`).join('');
}
const field=(label,value,{required=false,type='text',placeholder='',wide=false,options=null}={})=>`<label class="order-field ${wide?'wide':''}"><span>${label}${required?' <em>*</em>':''}</span>${options?`<select class="input">${options.map(o=>`<option ${o===value?'selected':''}>${esc(o)}</option>`).join('')}</select>`:`<input class="input" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}">`}</label>`;

function patientStep(){
  const p=intake.patient;
  return `<section class="order-card"><h2>Basic Information</h2>
    <div class="order-grid">
      ${field('First Name',p.first,{required:true})}${field('Middle Name',p.middle,{placeholder:'Middle Name'})}${field('Last Name',p.last,{required:true})}
      ${field('DOB',p.dob,{required:true})}${field('Gender',p.gender,{required:true,options:['Female','Male','Other','Unknown']})}${field('Ethnicity','I’d prefer not to say',{required:true,options:['I’d prefer not to say','Hispanic or Latino','Not Hispanic or Latino']})}
      ${field('Race','I’d prefer not to say',{required:true,options:['I’d prefer not to say','American Indian or Alaska Native','Asian','Black or African American','Native Hawaiian or Other Pacific Islander','White']})}${field('Phone Number',p.phone,{required:true})}${field('Home Number',p.home,{placeholder:'xxx-xxx-xxxx'})}
      ${field('Email',p.email,{placeholder:'mail@example.com'})}
    </div>
    <h3>Notification Preference</h3>
    <div class="check-line"><label><input type="checkbox" checked> Text SMS</label><label><input type="checkbox"> Email</label></div>
    <div class="consent-box"><p><i data-lucide="info"></i> By checking above checkboxes,</p><label><input type="checkbox" checked> Patient agrees to receive order reminders to their email and/or mobile number provided above.</label><label><input type="checkbox"> Patient agrees to receive informational messages such as notifications of seasonal immunization clinics or clinical services that may be appropriate for them.</label><p><b>Signetic Pharmacy</b> adheres to HIPAA standards and would like to communicate with patient via text sms and/or email regarding order confirmation and reminders. Please note text messaging and/or email may not be completely secure and by checking the boxes, patient is consenting to receive messages in this manner.</p></div>
  </section>
  <section class="order-card"><h2>Home Address</h2>
    <div class="order-grid two">${field('Address',p.address,{required:true})}${field('City',p.city,{required:true})}</div>
    <div class="order-grid">${field('State',p.state,{required:true})}${field('County',p.county)}${field('Zip Code',p.zip,{required:true})}</div>
  </section>`;
}
function paymentStep(){
  return `<section class="order-card"><h2>Insurance</h2><div class="pay-list">${intake.insurance.map(plan=>`<article class="pay-plan"><span class="pill rank">${plan.rank}</span><div><strong>${esc(plan.name)}</strong><small>Member ID ${esc(plan.memberId||'—')} · Group ${esc(plan.group||'—')}</small></div><span class="pill success">${esc(plan.status)}</span></article>`).join('')}</div></section>`;
}
function placeholderStep(label){
  return `<section class="order-card empty-step"><i data-lucide="layout-template"></i><h2>${label}</h2><p>This step isn’t part of this prototype.</p></section>`;
}
function syncPrecheckChip(){
  const pc=intake.precheck,chip=$('#headerPrecheck'),warn=pc&&pc.results.some(r=>r.status!=='pass');
  chip.className=`precheck-chip ${pc?(warn?'warn':'pass'):'none'}`;
  chip.innerHTML=pc?`<i data-lucide="${warn?'shield-alert':'shield-check'}"></i> Pre-check: ${esc(pc.summary)}`:'<i data-lucide="shield-question"></i> Pre-check not run';
}
function productsStep(){
  const codes=prescribedCodes(),pending=codes.filter(code=>!addedFor(code).length).length;
  if(!order.products.length)return `<section class="order-card products-empty-card"><div class="products-empty"><span class="cart-icon"><i data-lucide="shopping-cart"></i></span><p>Search for DME products to add to this order</p><button class="add-products-btn" data-open-search>Add Products</button><small class="rx-hint"><i data-lucide="wand-sparkles"></i> ${codes.length} HCPCS codes from intake #${esc(intake.id)} are ready to search</small></div></section>`;
  return `<section class="order-card products-table-card"><header class="pt-head"><h2>Products (${order.products.length})</h2><div class="pt-actions">${pending?`<span class="rx-progress"><i data-lucide="wand-sparkles"></i> ${codes.length-pending} of ${codes.length} prescribed codes added</span>`:'<span class="rx-progress done"><i data-lucide="circle-check"></i> All prescribed codes added</span>'}<button class="small-btn" data-open-search><i data-lucide="plus"></i> Add Products</button></div></header>
    <div class="pt"><div class="pt-row pt-headrow"><span></span><span>Product</span><span>QTY</span><span>Billable Units</span><span>Purchase Type</span><span>Payment Preference</span><span>Retail Price</span><span></span></div>
    ${order.products.map((product,index)=>`<div class="pt-group"><div class="pt-group-head"><strong>${esc(product.name)}</strong><button class="link-btn cog"><i data-lucide="pencil"></i> Cost of goods: <em>Click to add</em></button></div>
      <div class="pt-row"><span class="pt-chev"><i data-lucide="chevron-right"></i></span><span class="pt-desc">${esc(product.code)} - ${esc((lineFor(product.code.split(' + ')[0])?.description||product.name).toUpperCase())}</span><span>${product.qty}</span><span>${product.qty}</span><span>${rental(product.code)?'Rent':'Purchase New'}</span><span>Insurance</span><span>${retail[product.code.split(' + ')[0]]||'—'}</span><span><button class="icon-btn" data-remove-product="${index}" aria-label="Remove ${esc(product.name)}" title="Remove"><i data-lucide="trash-2"></i></button></span></div></div>`).join('')}</div></section>`;
}
function renderStep(){
  const map={patient:patientStep,payment:paymentStep,products:productsStep};
  const label=steps.find(([id])=>id===order.step)[1];
  $('#orderContent').innerHTML=(map[order.step]||(()=>placeholderStep(label)))();
  renderStepper();
  const index=steps.findIndex(([id])=>id===order.step);
  $('#orderBack').disabled=index===0;
  $('#orderContinue').disabled=order.step==='products'&&!order.products.length;
  $('#orderContinue').textContent=index===steps.length-1?'Save':'Save & Continue';
  icons();
  $('#orderContent').scrollTop=0;
}
function goStep(id){order.step=id;order.maxStep=Math.max(order.maxStep,steps.findIndex(([s])=>s===id));renderStep();}

// Product search panel
const search={code:'',results:null,activeChip:''};
function renderChips(){
  const codes=prescribedCodes();
  const active=search.activeChip&&lineFor(search.activeChip);
  $('#rxChips').innerHTML=`<header><span><i data-lucide="wand-sparkles"></i> From Prescription <button class="link-btn" data-open-intake="details">#${esc(intake.id)}</button></span><small>Click to pre-fill HCPCS code</small></header>
    <div class="chip-row">${codes.map(code=>{const added=addedFor(code).length;const line=lineFor(code);return `<button type="button" class="rx-chip ${added?'added':''} ${search.activeChip===code?'active':''}" data-chip="${code}" title="${esc(line.description)} · Qty ${line.qty} · ${esc(line.frequency)}">${added?'<i data-lucide="check"></i>':''}${code}</button>`;}).join('')}</div>
    ${active?`<p class="chip-detail"><b>${esc(active.code)}</b> ${esc(active.description)} · Qty ${active.qty} · ${esc(active.frequency)} · ${esc(active.rx)}</p>`:''}`;
}
function runSearch(){
  const form=$('#searchForm'),q=name=>form[name].value.trim().toLowerCase();
  const code=q('code'),name=q('name'),model=q('model'),maker=form.maker.value,cls=form.cls.value;
  search.results=catalog.filter(p=>(!code||p.code.toLowerCase().includes(code))&&(!name||p.name.toLowerCase().includes(name))&&(!model||p.model.toLowerCase().includes(model))&&(!maker||p.maker===maker)&&(!cls||classification(p.code)===cls));
  renderResults();
}
function renderResults(){
  if(!search.results){$('#searchResults').innerHTML='';return;}
  const rows=search.results;
  $('#searchResults').innerHTML=`<p class="results-count">Showing <b>${rows.length}</b> ${rows.length===1?'product':'products'}</p>${rows.length?`<div class="rt"><div class="rt-row rt-head"><span>Product Name</span><span>Manufacturer</span><span>Model No.</span><span>HCPCS Code</span><span></span></div>${rows.map(p=>{const added=order.products.some(item=>item.id===p.id);const prescribed=p.code.split(' + ').some(c=>lineFor(c));return `<div class="rt-row ${added?'added':''}"><span>${esc(p.name.toUpperCase())}${prescribed?' <i data-lucide="wand-sparkles" class="rx-mark" title="Matches a prescribed HCPCS code"></i>':''}</span><span>${esc(p.maker.toUpperCase())}</span><span>${esc(p.model)}</span><span>${esc(p.code)}</span><span><button class="add-btn" data-add-product="${p.id}" ${added?'disabled':''} aria-label="${added?'Added':'Add'} ${esc(p.name)}" title="${added?'Added':'Add to order'}"><i data-lucide="${added?'check':'plus'}"></i></button></span></div>`;}).join('')}</div>`:'<p class="empty-note">No products match. Try a different HCPCS code or name.</p>'}`;
  icons();
}
function syncSearchButton(){const form=$('#searchForm');$('#searchBtn').disabled=!['code','name','model','maker','cls'].some(n=>form[n].value.trim());}
function openSearch(){
  const makers=[...new Set(catalog.map(p=>p.maker).filter(Boolean))].sort();
  $('#makerSelect').innerHTML='<option value="">Select...</option>'+makers.map(m=>`<option>${esc(m)}</option>`).join('');
  $('#clsSelect').innerHTML='<option value="">Select...</option>'+['PAP devices','PAP supplies','Oxygen','Other'].map(c=>`<option>${c}</option>`).join('');
  renderChips();renderResults();syncSearchButton();
  $('#searchPanel').hidden=false;$('#drawerScrim').hidden=false;$('#drawerScrim').classList.add('full');
  void $('#searchPanel').offsetWidth;$('#searchPanel').classList.add('open');
  icons();$('#searchForm').code.focus();
}
function closeSearch(){$('#searchPanel').classList.remove('open');$('#drawerScrim').hidden=true;$('#drawerScrim').classList.remove('full');setTimeout(()=>{$('#searchPanel').hidden=true;},180);}

// Intake drawer
function detailsTab(){
  const p=intake.patient;
  return `<section class="drawer-section"><h3>Patient</h3><dl class="kv"><div><dt>Name</dt><dd>${esc(p.first)} ${esc(p.last)}</dd></div><div><dt>DOB</dt><dd>${esc(p.dob)}</dd></div><div><dt>Patient ID</dt><dd>${esc(p.mrn)}</dd></div><div><dt>Mobile</dt><dd>${esc(p.phone)}</dd></div><div class="wide"><dt>Address</dt><dd>${esc(p.address)}, ${esc(p.city)}, ${esc(p.state)} ${esc(p.zip)}</dd></div></dl></section>
  <section class="drawer-section"><h3>Insurance <small>coverage order</small></h3>${intake.insurance.map(plan=>`<div class="d-row"><span class="pill rank">${plan.rank}</span><span><b>${esc(plan.name)}</b><small>${esc(plan.memberId)} · ${esc(plan.status)}</small></span></div>`).join('')}</section>
  ${intake.prescriptions.map(rx=>`<section class="drawer-section"><h3>${esc(rx.title)} <small>${esc(rx.source)}${rx.date?` · ${esc(rx.date)}`:''}</small></h3>
    <p class="d-meta">Dr. ${esc(rx.physician)}${rx.specialty?` · ${esc(rx.specialty)}`:''} · NPI ${esc(rx.npi||'—')}</p>
    <div class="d-chips">${rx.icd.map(c=>`<span class="d-chip" title="${esc(c.description)}"><b>${c.code}</b> ${esc(c.description)}${c.primary?' <em>Primary</em>':''}</span>`).join('')}</div>
    ${rx.items.map(item=>`<div class="d-item"><b>${esc(item.name)}${item.bundle?' <span class="pill neutral">Bundle</span>':''}</b>${item.lines.map(line=>`<div class="d-line"><span class="code-chip-sm">${line.code}</span><span>${esc(line.description)}</span><small>Qty ${line.qty} · ${esc(line.frequency)}</small></div>`).join('')}</div>`).join('')}
  </section>`).join('')}
  <section class="drawer-section"><h3>Prior Authorizations</h3>${intake.priorAuths.length?intake.priorAuths.map(pa=>`<div class="d-row"><span class="code-chip-sm">${pa.code}</span><span><b>${esc(pa.number)}</b><small>${esc(pa.payer)} · ${esc(pa.from||'—')} – ${esc(pa.to||'—')}</small></span></div>`).join(''):'<p class="d-meta">None on file</p>'}</section>
  <section class="drawer-section"><h3>Documents</h3><ul class="d-docs">${intake.documents.map(name=>`<li><i data-lucide="file-text"></i> ${esc(name)}</li>`).join('')}</ul></section>
  ${intake.note?`<section class="drawer-section"><h3>Clinical Note</h3><p class="d-note">${esc(intake.note)}</p></section>`:''}`;
}
function precheckTab(){
  const pc=intake.precheck;
  if(!pc)return `<div class="drawer-empty"><i data-lucide="shield-question"></i><h3>Pre-Check Wasn’t Run</h3><p>This order was created without a pre-check. Run one to confirm payer eligibility, coverage criteria and documentation.</p><a class="footer-btn primary" href="precheck.html?from=order"><i data-lucide="shield-check"></i> Run Pre-Check</a></div>`;
  const warn=pc.results.some(r=>r.status!=='pass');
  return `<div class="pc-summary ${warn?'warn':'pass'}"><i data-lucide="${warn?'shield-alert':'shield-check'}"></i><span><b>${esc(pc.summary)}</b><small>Run ${esc(pc.at)} during intake ${esc(intake.id)}</small></span></div>
    <a class="open-precheck" href="precheck.html?from=order"><i data-lucide="external-link"></i> Open full pre-check</a>
    <ul class="pc-list">${pc.results.map(r=>`<li class="${r.status}"><i data-lucide="${r.status==='pass'?'circle-check':r.status==='fail'?'circle-x':'triangle-alert'}"></i><span><b>${esc(r.title)}</b><small>${esc(r.detail)}</small></span></li>`).join('')}</ul>`;
}
function renderDrawer(tab){
  $$('[data-drawer-tab]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.drawerTab===tab)));
  $('#intakeDrawerBody').innerHTML=tab==='precheck'?precheckTab():detailsTab();
  $('#intakeDrawerBody').scrollTop=0;
  icons();
}
function openDrawer(tab='details'){
  $('#intakeDrawer').hidden=false;$('#drawerScrim').hidden=false;
  void $('#intakeDrawer').offsetWidth;$('#intakeDrawer').classList.add('open');
  renderDrawer(tab);$('#closeIntakeDrawer').focus();
}
function closeDrawer(){$('#intakeDrawer').classList.remove('open');$('#drawerScrim').hidden=true;setTimeout(()=>{$('#intakeDrawer').hidden=true;},180);}
function syncHeader(){
  $('#orderForName').textContent=`${intake.patient.first} ${intake.patient.last}`;
  $('#orderForDob').textContent=intake.patient.dob;
  $('#intakeIdLink').textContent=`#${intake.id}`;
  $('#intakeDrawerTitle').textContent=`#${intake.id}`;
  $('#intakeDrawerMeta').textContent=`${intake.patient.first} ${intake.patient.last} · Completed ${intake.completed}`;
  const pc=intake.precheck;
  $('#precheckTabBadge').className=`tab-badge ${pc?(pc.results.some(r=>r.status!=='pass')?'warn':'pass'):'none'}`;
  syncPrecheckChip();icons();
  $('#precheckTabBadge').textContent=pc?(pc.results.some(r=>r.status==='fail')?'Issues':pc.results.some(r=>r.status==='warn')?'Warnings':'Passed'):'Not run';
}

document.addEventListener('click',async event=>{
  const el=event.target.closest('button,a');if(!el)return;
  if(el.dataset.step){goStep(el.dataset.step);return;}
  if(el.dataset.openIntake){if(!$('#searchPanel').hidden)closeSearch();openDrawer(el.dataset.openIntake);return;}
  if(el.dataset.openSearch!==undefined){openSearch();return;}
  if(el.dataset.chip){const form=$('#searchForm');form.reset();form.code.value=el.dataset.chip;search.activeChip=el.dataset.chip;renderChips();syncSearchButton();runSearch();icons();return;}
  if(el.dataset.drawerTab){renderDrawer(el.dataset.drawerTab);return;}
  if(el.dataset.addProduct){
    const product=catalog[+el.dataset.addProduct],line=lineFor(product.code.split(' + ')[0]);
    order.products.push({...product,qty:line?.qty||1,frequency:line?.frequency||''});
    renderStep();renderChips();renderResults();icons();toast(`${product.name} added`);return;
  }
  if(el.dataset.removeProduct!==undefined){const [removed]=order.products.splice(+el.dataset.removeProduct,1);renderStep();toast(`${removed.name} removed`);return;}
  if(el.id==='runPrecheck'){
    el.disabled=true;el.innerHTML='<span class="spinner"></span> Running pre-check…';
    await wait(1200);
    const warnings=defaultPrecheck.filter(r=>r.status==='warn').length;
    intake.precheck={summary:`Passed with ${warnings} warnings`,at:'just now',results:defaultPrecheck};
    try{sessionStorage.setItem('signeticIntakeOrder',JSON.stringify(intake));}catch(error){}
    syncHeader();renderDrawer('precheck');toast(`Pre-check ${intake.precheck.summary.toLowerCase()}`);
  }
});
$('#closeIntakeDrawer').addEventListener('click',closeDrawer);
$('#drawerScrim').addEventListener('click',()=>{if(!$('#searchPanel').hidden)closeSearch();else closeDrawer();});
$('#closeSearch').addEventListener('click',closeSearch);
$('#searchForm').addEventListener('input',()=>{search.activeChip='';syncSearchButton();});
$('#searchForm').addEventListener('change',syncSearchButton);
$('#searchForm').addEventListener('submit',event=>{event.preventDefault();if(!$('#searchBtn').disabled)runSearch();});
$('#clearSearch').addEventListener('click',()=>{$('#searchForm').reset();search.results=null;search.activeChip='';renderChips();renderResults();syncSearchButton();icons();});
document.addEventListener('keydown',event=>{if(event.key!=='Escape'||document.querySelector('dialog[open]'))return;if(!$('#searchPanel').hidden)closeSearch();else if(!$('#intakeDrawer').hidden)closeDrawer();});
$('#orderBack').addEventListener('click',()=>{const index=steps.findIndex(([id])=>id===order.step);if(index>0)goStep(steps[index-1][0]);});
$('#orderContinue').addEventListener('click',()=>{const index=steps.findIndex(([id])=>id===order.step);if(index<steps.length-1){goStep(steps[index+1][0]);toast('Saved');}else toast('Order saved');});
$('#cancelOrder').addEventListener('click',()=>$('#cancelOrderDialog').showModal());
$('#cancelOrderDialog').addEventListener('close',()=>{if($('#cancelOrderDialog').returnValue!=='cancel')return;toast('Order cancelled');setTimeout(()=>{location.href='index.html';},900);});

// Shell
const setNavCollapsed=collapsed=>{document.body.classList.toggle('nav-collapsed',collapsed);const toggle=$('#navToggle');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');toggle.title=toggle.getAttribute('aria-label');};
// The main navigation stays collapsed until the user opens it.
setNavCollapsed(true);
$('#navToggle').addEventListener('click',()=>setNavCollapsed(!document.body.classList.contains('nav-collapsed')));
$$('[data-nav-section]').forEach(section=>section.addEventListener('click',()=>{const open=section.parentElement.classList.toggle('open');section.setAttribute('aria-expanded',String(open));}));
$$('.shell-nav a[href="#"]').forEach(link=>link.addEventListener('click',event=>event.preventDefault()));
$('#shellBack').addEventListener('click',()=>history.back());
$('#shellRefresh').addEventListener('click',()=>location.reload());

const startStep=new URLSearchParams(location.search).get('step');
syncHeader();
goStep(steps.some(([id])=>id===startStep)?startStep:'patient');

// Opened from Order actions (prepare-orders.html): show where the order came from and a way back.
(function(){
  let action=null;try{action=JSON.parse(sessionStorage.getItem('signeticOrderAction'));}catch(error){}
  if(!action||action.route!=='new'||intake.fromAction!==action.id)return;
  const box=$('#orderFromIntake'),items=(intake.prescriptions[0]?.items||[]).map(it=>esc(it.name)).join(' · ');
  box.innerHTML=`<i data-lucide="sparkles"></i><span><b>From intake #${esc(intake.id)} · New order for ${esc(action.rxTitle)}</b>${items}</span><a class="footer-btn" href="prepare-orders.html?done=${encodeURIComponent(action.id)}">Done, Back to Fulfillment</a>`;
  box.hidden=false;icons();
})();
