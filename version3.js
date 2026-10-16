// Different direction — a bold, guided take on the AI patient intake (upload → pre-check).
// Same scenario and functionality as the Generic Flow, with a journey layout instead of panels.
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const icons=()=>{if(window.lucide)window.lucide.createIcons();};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const esc=value=>String(value??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const plural=(n,one,many=`${one}s`)=>`${n} ${n===1?one:many}`;
function toast(message){const el=$('#ddToast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600);}
const initials=name=>name.split(' ').map(part=>part[0]).join('').slice(0,2).toUpperCase();
const hue=id=>[...id].reduce((sum,c)=>sum+c.charCodeAt(0),0)*47%360;
const avatar=(name,id,size='')=>`<span class="dd-avatar ${size}" style="--h:${hue(id)}">${initials(name)}</span>`;

// ---------- Scenario data ----------
const demoDocuments=[
  {id:'referral',name:'Referral.pdf',meta:'2 pages · Extracted',icon:'file-text',type:'Referral'},
  {id:'insurance',name:'Insurance Card.pdf',meta:'1 page · Duplicate found',icon:'badge-check',type:'Insurance card'},
  {id:'prescription',name:'Prescription.pdf',meta:'1 page · Extracted',icon:'notebook-tabs',type:'Prescription'},
  {id:'prescription-2',name:'Oxygen Prescription.pdf',meta:'1 page · Extracted',icon:'notebook-tabs',type:'Prescription'},
  {id:'consent',name:'Consent Form.pdf',meta:'2 pages · Low confidence',icon:'file-signature',type:'Consent form'}
];
const demoUploadFiles=[
  {id:'referral',name:'Referral.pdf',type:'Referral',icon:'file-text',size:'2 pages · 412 KB'},
  {id:'insurance',name:'Insurance Card.pdf',type:'Insurance card',icon:'badge-check',size:'1 page · 186 KB'},
  {id:'prescription',name:'Prescription.pdf',type:'Prescription',icon:'notebook-tabs',size:'1 page · 238 KB'},
  {id:'prescription-2',name:'Oxygen Prescription.pdf',type:'Prescription',icon:'notebook-tabs',size:'1 page · 204 KB'},
  {id:'consent',name:'Consent Form.pdf',type:'Consent form',icon:'file-signature',size:'2 pages · 351 KB'},
  {id:'face-to-face',name:'Face-to-Face Notes.pdf',type:'Clinical notes',icon:'stethoscope',size:'2 pages · 527 KB'}
];
const recordDocument=(id,name,type,icon,date)=>({id,name,type,icon,date});
const intakeQueue=[
  {id:'ashlynn',name:'Ashlynn Botosh',mrn:'PT-10482',dob:'03/15/1978',documents:[...demoDocuments.map(file=>({...file,date:'Oct 14, 2026'})),recordDocument('sleep-study','Sleep Study.pdf','Sleep study','file-chart-column','Oct 12, 2026'),recordDocument('face-to-face','Face-to-Face Notes.pdf','Clinical notes','stethoscope','Oct 12, 2026')]},
  {id:'marcus',name:'Marcus Thornton',mrn:'PT-11207',dob:'07/02/1961',documents:[recordDocument('marcus-rx','Prescription.pdf','Prescription','notebook-tabs','Oct 15, 2026'),recordDocument('marcus-insurance','Insurance Card.pdf','Insurance card','badge-check','Oct 15, 2026')]},
  {id:'jaydon',name:'Jaydon Vetrovs',mrn:'PT-09954',dob:'11/23/1990',documents:[recordDocument('jaydon-referral','Referral.pdf','Referral','file-text','Oct 13, 2026'),recordDocument('jaydon-insurance','Insurance Card.pdf','Insurance card','badge-check','Oct 13, 2026'),recordDocument('jaydon-rx','Prescription.pdf','Prescription','notebook-tabs','Oct 13, 2026'),recordDocument('jaydon-consent','Consent Form.pdf','Consent form','file-signature','Oct 13, 2026')]}
];
const patientDirectory=[
  ...intakeQueue,
  {id:'priya',name:'Priya Shah',mrn:'PT-07718',dob:'05/09/1984',documents:[recordDocument('priya-referral','Referral.pdf','Referral','file-text','Oct 10, 2026'),recordDocument('priya-insurance','Insurance Card.pdf','Insurance card','badge-check','Oct 10, 2026'),recordDocument('priya-rx','Prescription.pdf','Prescription','notebook-tabs','Oct 10, 2026')]},
  {id:'daniel',name:'Daniel Ortiz',mrn:'PT-05561',dob:'01/30/1957',documents:[recordDocument('daniel-rx','Prescription.pdf','Prescription','notebook-tabs','Oct 8, 2026')]},
  {id:'grace',name:'Grace Liu',mrn:'PT-12093',dob:'09/18/1972',documents:[recordDocument('grace-referral','Referral.pdf','Referral','file-text','Oct 9, 2026'),recordDocument('grace-sleep','Sleep Study.pdf','Sleep study','file-chart-column','Oct 9, 2026')]}
];
const existingFiles=[
  {id:'existing-insurance',name:'Insurance Card · Sep 2025.pdf',meta:'Extracted previously',icon:'badge-check',extracted:true,used:false},
  {id:'existing-consent',name:'Consent Form.pdf',meta:'Extracted previously',icon:'file-signature',extracted:true,used:true},
  {id:'existing-sleep',name:'Sleep Study · Aug 2022.pdf',meta:'Not extracted yet',icon:'file-chart-column',extracted:false,used:false},
  {id:'existing-progress',name:'Progress Notes · Jul 2026.pdf',meta:'Not extracted yet',icon:'file-text',extracted:false,used:false}
];
const patientMatches=[
  {id:'ashlynn',name:'Ashlynn Botosh',dob:'03/15/1978',address:'1234 Healthways Blvd, Seattle, WA 98101',phone:'(415) 220-8841',mrn:'PT-10482',reason:'Name, DOB, address, and phone match'},
  {id:'ashlyn',name:'Ashlyn Botosh',dob:'03/15/1978',address:'1184 Healthway Blvd, Seattle, WA 98101',phone:'(415) 220-8891',mrn:'PT-08731',reason:'Similar name, same DOB, and nearby address'},
  {id:'ashley',name:'Ashley Brown',dob:'03/16/1978',address:'202 Elm Street, Bellevue, WA 98004',phone:'(206) 555-0188',mrn:'PT-06319',reason:'Similar name and DOB from insurance document'}
];
const duplicateFindings=[
  {id:'insurance-similar',kind:'similar',docId:'insurance',upload:'Insurance Card.pdf',existing:'Insurance Card · Sep 2025.pdf',reason:'Same member ID; uploaded card has newer coverage dates'},
  {id:'consent-exact',kind:'exact',docId:'consent',upload:'Consent Form.pdf',existing:'Consent Form.pdf',reason:'Exact file fingerprint match'}
];
const documentImages={
  referral:'assets/referral.svg',insurance:'assets/insurance.svg',prescription:'assets/prescription.svg','prescription-2':'assets/prescription.svg',consent:'assets/consent.svg',
  'sleep-study':'assets/sleep-study.svg','face-to-face':'assets/referral.svg',
  'existing-insurance':'assets/insurance.svg','existing-consent':'assets/consent.svg','existing-sleep':'assets/sleep-study.svg'
};
const imageFor=doc=>documentImages[doc.id]||(/insurance|card/i.test(doc.name)?documentImages.insurance:/prescription|rx/i.test(doc.name)?documentImages.prescription:/sleep/i.test(doc.name)?documentImages['sleep-study']:/consent/i.test(doc.name)?documentImages.consent:documentImages.referral);

const serviceTypes=[
  {id:'Clinical Services',icon:'stethoscope',description:'Office visits and clinical care'},
  {id:'DME',icon:'package',description:'Durable medical equipment and supplies'},
  {id:'Immunization',icon:'syringe',description:'Vaccines and administration'},
  {id:'Counselling',icon:'messages-square',description:'Behavioral and therapy sessions'}
];
const insurancePlans=[
  {id:'medicare',name:'Medicare Part B',systemRank:'Secondary',aiRank:'Primary',source:'Insurance Card.pdf',docId:'insurance',aiReason:'Aetna is a small-employer group plan (under 100 employees), so Medicare pays first.',response:{payer:'CMS Medicare (HETS)',trace:'HETS-26101594217',deductible:'$257.00',deductibleMet:'$257.00',oop:'Not applicable',network:'Medicare-enrolled supplier'},eligibility:'Active through 12/30/2027',check:{service:'DME',at:'today at 9:42 AM'},results:{'Clinical Services':{eligible:true,detail:'20% coinsurance after Part B deductible'},DME:{eligible:true,detail:'20% coinsurance after Part B deductible'},Immunization:{eligible:true,detail:'Covered at 100% for flu, pneumococcal, and COVID-19'},Counselling:{eligible:false,detail:'Requires a Medicare-enrolled behavioral health provider'}},fields:[['Insurance type','Medicare'],['Health insurance company','Medicare Health Care Plan'],['Relationship to insured','Self'],['Member ID prefix','X'],['Member ID','BCB731045298'],['Member ID suffix','03'],['Group number','Not provided'],['Effective from','12/31/2022'],['Effective to','12/30/2027']]},
  {id:'aetna',name:'Aetna Choice POS II',systemRank:'Primary',aiRank:'Secondary',source:'Insurance Card.pdf · back',docId:'insurance',aiReason:'Group number GRP-258914 is a small-employer plan, which pays after Medicare.',response:{payer:'Aetna',trace:'AET-0417-88213',deductible:'$1,500.00',deductibleMet:'$1,120.00',oop:'$4,000.00 · $1,860.00 met',network:'In network'},eligibility:'Active through 03/14/2027',check:{service:'DME',at:'today at 9:42 AM'},results:{'Clinical Services':{eligible:true,detail:'$30 copay per visit'},DME:{eligible:true,detail:'20% coinsurance · prior authorization on file'},Immunization:{eligible:true,detail:'Covered at 100% in network'},Counselling:{eligible:true,detail:'$30 copay per session'}},fields:[['Insurance type','Commercial PPO'],['Health insurance company','Aetna'],['Relationship to insured','Self'],['Member ID prefix','Z'],['Member ID','AET529187463'],['Member ID suffix','07'],['Group number','GRP-258914'],['Effective from','03/15/2025'],['Effective to','03/14/2027']]},
  {id:'medicaid',name:'Washington Apple Health',systemRank:null,aiRank:'Tertiary',source:'Referral.pdf · p2',docId:'referral',aiReason:'Medicaid is always the payer of last resort. This plan isn’t in the system yet.',eligibility:'Active through 06/30/2027',check:null,response:{payer:'Washington State HCA',trace:'WAHCA-7731902',deductible:'$0.00',deductibleMet:'$0.00',oop:'Not applicable',network:'Enrolled provider'},results:{'Clinical Services':{eligible:true,detail:'No copay'},DME:{eligible:true,detail:'Covers Medicare coinsurance as secondary payer'},Immunization:{eligible:true,detail:'Covered at 100%'},Counselling:{eligible:true,detail:'No copay with enrolled provider'}},fields:[['Insurance type','Medicaid'],['Health insurance company','Washington State Health Care Authority'],['Relationship to insured','Self'],['Member ID prefix','—'],['Member ID','200458812WA'],['Member ID suffix','—'],['Group number','Not provided'],['Effective from','07/01/2026'],['Effective to','06/30/2027']]}
];
// AI decisions made during extraction. They never block completion, but stay listed until reviewed.
const aiResolvedFields=[
  {id:'dobConflict',key:'dob',label:'Date of birth',detail:'Kept 03/15/1978 · card showed 03/16/1978',section:'Demographics'},
  {id:'mobileField',key:'mobile',label:'Mobile phone number',detail:'Blurry digits matched to record',section:'Contact'},
  {id:'insurance-section',key:'coverage',label:'Insurance coverage order',detail:'Medicare set as primary',section:'Insurance'},
  {id:'physicianConflict',key:'physician',label:'Physician last name',detail:'Kept Kim · notes said Kimm',section:'Prescription 1'},
  {id:'rx-rx2-item-1',key:'mapping',label:'Oxygen concentrator → E1390',detail:'AI mapped product to HCPCS',section:'Prescription 2'}
];
const aiFields={
  dob:{id:'dobConflict',label:'Date of birth',source:'dob',doc:'referral',docLabel:'Referral.pdf · p1',title:'Conflict resolved automatically',why:'Referral and prior patient history agree. The insurance card showed 03/16/1978, which AI treated as a likely scan error.',alternatives:['03/15/1978','03/16/1978']},
  mobile:{id:'mobileField',label:'Mobile number',source:'mobile',doc:'consent',docLabel:'Consent Form.pdf · p1',title:'Unclear digits resolved',why:'The last four digits were blurry on the consent form. AI matched them to the number on the patient’s existing record.'},
  physician:{id:'physicianConflict',label:'Last name',source:'physician',doc:'prescription',docLabel:'Prescription.pdf · p1',title:'Conflict resolved automatically',why:'Prescription.pdf says “Kim” and Face-to-Face Notes.pdf says “Kimm”. The NPI registry lists Dr. Sarah Kim.',alternatives:['Kim','Kimm']}
};
const postIntakeRecommendation={
  patient:'Ashlynn Botosh',action:'Start pre-check',reason:'Confirm payer qualification, coverage, and required documentation before creating the new equipment order.',
  services:[{name:'PAP setup and education',reason:'Supports safe device use for a new therapy setup.'},{name:'Initial mask fitting',reason:'Helps select an appropriate interface before fulfillment.'},{name:'Compliance monitoring',reason:'Supports follow-up after therapy begins.'},{name:'Home oxygen setup and safety education',reason:'Needed for the new oxygen concentrator prescription.'}],
  dme:[{name:'CPAP device',reason:'Supported by the reviewed PAP prescription.'},{name:'Heated humidifier',reason:'Recommended as part of the initial PAP setup.'},{name:'Mask and starter supplies',reason:'Needed to begin the prescribed therapy.'},{name:'Oxygen concentrator and cannula',reason:'Supported by the reviewed oxygen prescription.'}],
  note:'Final coverage and item eligibility remain subject to payer review.'
};
const profile={
  demographics:[['firstName','First name','Ashlynn'],['middleName','Middle name','—'],['lastName','Last name','Botosh'],['gender','Gender','Female']],
  contact:[['email','Email','ashlynn.botosh@email.com',true],['homePhone','Home phone number','(206) 555-0142'],['street','Street address','1234 Healthways Blvd, Suite 200',true],['city','City','Seattle'],['state','State/Province','WA'],['zip','ZIP code','98101']]
};

// Where each extracted value sits on each document page (SVG units, 760×980 pages).
const sourceBoxes={"referral":{"firstName":[280,241,52.9,19],"lastName":[336.7,241,46.1,19],"dob":[280,285,76.8,19],"street":[280,329,145.1,19],"city":[280,352,42.1,19],"state":[328.9,352,21.6,19],"zip":[354.4,352,37.8,19]},"insurance":{"firstName":[86,352,93.2,27],"lastName":[184.7,352,79.9,27],"dob":[430,361,98.8,24],"memberId":[103.7,431,134.6,26],"memberPrefix":[86,431,12.5,26],"memberSuffix":[243.5,431,21.9,26]},"prescription":{"firstName":[280,175,52.9,19],"lastName":[336.7,175,46.1,19],"icd":[280,221,46,19],"hcpcs":[280,267,39.7,19],"physician":[284,624,174.3,20]},"consent":{"firstName":[280,209,52.9,19],"lastName":[336.7,209,46.1,19],"mobile":[280,253,99.4,19],"email":[280,301,181.3,19]},"sleep-study":{"firstName":[270,165,52.9,19],"lastName":[326.7,165,46.1,19]}};
const sourcePage={width:760,height:980};
const sourceFieldLabels={firstName:'First name',lastName:'Last name',dob:'Date of birth',email:'Email',mobile:'Mobile number',homePhone:'Home phone number',street:'Street address',city:'City',state:'State/Province',zip:'ZIP code',gender:'Gender',middleName:'Middle name',memberId:'Member ID',memberPrefix:'Member ID prefix',memberSuffix:'Member ID suffix',physician:'Physician',icd:'ICD-10 code',hcpcs:'HCPCS code'};
const sourceConflicts={dob:{insurance:'03/16/1978'}};
const insuranceFieldByLabel={'Member ID':'memberId','Member ID prefix':'memberPrefix','Member ID suffix':'memberSuffix'};

// Prescriptions
const hcpcsCatalog={
  E0601:'Continuous positive airway pressure (CPAP) device',E0562:'Humidifier, heated, used with PAP device',
  A7030:'Full face mask used with PAP device',A7031:'Face mask cushion, replacement for full face mask',A7034:'Nasal interface (mask or cannula type)',
  A7035:'Headgear used with PAP device',A7036:'Chinstrap used with PAP device',A7037:'Tubing used with PAP device',
  A7038:'Filter, disposable, used with PAP device',A7039:'Filter, non-disposable, used with PAP device',
  E1390:'Oxygen concentrator, single delivery port',E1392:'Portable oxygen concentrator, rental',E0431:'Portable gaseous oxygen system, rental',
  A4615:'Cannula, nasal',A4616:'Tubing (oxygen), per foot',E0570:'Nebulizer, with compressor',
  E0130:'Walker, rigid, adjustable or fixed height',E0260:'Hospital bed, semi-electric',K0001:'Standard wheelchair'
};
const productRules=[
  [/portable (oxygen )?concentrator|\bpoc\b/i,'E1392'],[/concentrator/i,'E1390'],[/cannula/i,'A4615'],[/oxygen tubing/i,'A4616'],
  [/cpap|c-pap|apap|positive airway/i,'E0601'],[/humidif/i,'E0562'],[/full.?face/i,'A7030'],[/cushion/i,'A7031'],[/nasal (mask|pillow)/i,'A7034'],
  [/headgear/i,'A7035'],[/chin.?strap/i,'A7036'],[/tubing|hose/i,'A7037'],[/filter/i,'A7038'],
  [/nebuli/i,'E0570'],[/walker/i,'E0130'],[/hospital bed/i,'E0260'],[/wheelchair/i,'K0001']
];
const bundleRules=[
  {match:/(cpap|apap).*(kit|bundle|supplies|starter)|(kit|bundle|starter).*(cpap|apap)/i,lines:[['E0601',1,'Monthly rental × 13'],['E0562',1,'Monthly rental × 13'],['A7030',1,'1 per 3 months'],['A7037',1,'1 per 3 months'],['A7038',2,'2 per month']]},
  {match:/oxygen.*(kit|bundle|supplies)/i,lines:[['A4615',2,'2 per month'],['A4616',7,'7 ft per month']]}
];
const icdCatalog={
  'G47.33':'Obstructive sleep apnea (adult)','G47.30':'Sleep apnea, unspecified','R06.83':'Snoring','E66.9':'Obesity, unspecified',
  'E66.01':'Morbid (severe) obesity due to excess calories','I10':'Essential (primary) hypertension','R09.02':'Hypoxemia',
  'J44.9':'Chronic obstructive pulmonary disease, unspecified','J96.11':'Chronic respiratory failure with hypoxia','I50.9':'Heart failure, unspecified'
};
const docTypes={swo:'Standard written order (SWO)',f2f:'Face-to-face clinical evaluation',pa:'Prior authorization'};
const medicareRecommended={L33718:{name:'Sleep study (PSG or HST) report',docId:'sleep-study'},L33797:{name:'Oxygen qualifying test results',docId:'oxygen-test'}};
const policyFor=code=>/^(E0601|E0562|A70)/.test(code||'')?'L33718':/^(E139|E04|A461)/.test(code||'')?'L33797':'';
const line=(code,qty,frequency,ai=false)=>({code,qty,frequency,ai});
const prescriptions=[
  {id:'rx1',docId:'prescription',source:'Prescription.pdf',date:'10/12/2026',main:true,
    physician:{first:'Sarah',last:'Kim',npi:'',specialty:'Sleep medicine',enrollment:['DME','PMD','Part B']},
    icd:[{code:'G47.33',description:icdCatalog['G47.33'],primary:true},{code:'E66.9',description:icdCatalog['E66.9']},{code:'I10',description:icdCatalog['I10']}],
    items:[
      {id:'item-1',name:'CPAP auto 5–15 cm H2O with heated humidifier, full face mask and supplies',bundle:true,policy:'L33718',
        lines:[line('E0601',1,'Monthly rental × 13',true),line('E0562',1,'Monthly rental × 13',true),line('A7030',1,'1 per 3 months',true),line('A7031',1,'1 per month',true),line('A7037',1,'1 per 3 months',true),line('A7038',2,'2 per month',true)]},
      {id:'item-2',name:'A7035',bundle:false,policy:'L33718',lines:[line('A7035',1,'1 per 6 months')]}
    ]},
  {id:'rx2',docId:'prescription-2',source:'Oxygen Prescription.pdf',date:'10/13/2026',
    physician:{first:'Michael',last:'Reyes',npi:'1487265930',specialty:'Pulmonology',enrollment:['DME','Part B']},
    icd:[{code:'R09.02',description:icdCatalog['R09.02'],primary:true},{code:'G47.33',description:icdCatalog['G47.33']}],
    items:[
      {id:'item-1',name:'Home oxygen concentrator, 2 L/min nocturnal',bundle:false,policy:'L33797',lines:[line('E1390',1,'Monthly rental × 36',true)]},
      {id:'item-2',name:'Oxygen supplies',bundle:true,policy:'L33797',lines:[line('A4615',2,'2 per month',true),line('A4616',7,'7 ft per month',true)]}
    ]}
];
const priorAuthList=[
  {id:'pa1',code:'E0601',number:'PA-26-0418873',payer:'Aetna Choice POS II',from:'10/15/2026',to:'04/15/2027',qty:'1 unit',frequency:'Monthly rental · 13 months',gap:true,rentalEnd:'11/15/2027'},
  {id:'pa2',code:'E1390',number:'PA-26-0522190',payer:'Aetna Choice POS II',from:'10/15/2026',to:'10/14/2027',qty:'1 unit',frequency:'Monthly rental · 12 months'}
];
const INTAKE_ID='INT-0023';

// ---------- State ----------
const S={
  stage:'upload',docs:[],selected:'',pickerPatient:'',pickerSel:new Set(),knownPatient:null,
  extracting:false,extractionComplete:false,
  patientResolved:false,patientLinked:false,patientTitle:'',patientDetail:'',patientChangeable:true,patientId:'',openDetails:new Set(),
  findings:[],docDecisions:new Map(),recordDecisions:new Map(),confirmStep:'patient',
  serviceType:'DME',checkingAll:false,checkingPlan:false,editingPlan:false,currentPlan:0,
  provider:'',authAck:false,aiEdited:new Set(),aiReviewed:new Set(),editingAi:'',
  values:{dob:'03/15/1978',mobile:'(415) 220-8841',physician:'Kim'},
  listMode:'list',sourceOpen:true,reviewBuilt:false,
  pc:{items:[],selected:0,filter:'all',open:new Set()}
};
const STAGES=[['upload','Upload','upload'],['extract','Extract','scan-text'],['confirm','Confirm','user-check'],['review','Review','list-checks'],['complete','Complete','party-popper'],['precheck','Pre-check','shield-check']];
const stageIndex=id=>STAGES.findIndex(stage=>stage[0]===id);

// ---------- Journey + dock ----------
function setStage(stage){
  S.stage=stage;
  $$('.dd-view[data-stage]').forEach(view=>{view.hidden=view.dataset.stage!==stage;});
  $('#ddApp').dataset.stage=stage;
  if(stage==='review')enterReview();
  if(stage==='complete')renderComplete();
  if(stage==='precheck')enterPrecheck();
  renderJourney();renderDock();
  window.scrollTo({top:0});
  icons();
}
function renderJourney(){
  const current=stageIndex(S.stage);
  $('#ddJourney').innerHTML=STAGES.map(([id,label,icon],index)=>{
    const status=index<current?'done':index===current?'current':'todo';
    const canGo=(id==='review'&&current>3)||(id==='complete'&&current>4);
    return `<li class="dd-step ${status}"><button ${canGo?`data-act="go" data-stage="${id}" title="Go to ${label}"`:'tabindex="-1"'} aria-current="${status==='current'?'step':'false'}"><span class="dd-step-dot"><i data-lucide="${status==='done'?'check':icon}"></i></span><span class="dd-step-label">${label}</span></button></li>`;
  }).join('');
  const chip=$('#ddPatientChip');
  if(S.patientResolved&&current>=2){
    const name=S.patientLinked?S.patientTitle:'Ashlynn Botosh';
    chip.innerHTML=`${avatar(name,S.patientId||'new','sm')}<span><strong>${esc(name)}</strong><small>${S.patientLinked?'Existing patient':'New patient'}</small></span>`;
    chip.hidden=false;
  }else chip.hidden=true;
}
function renderDock(){
  const dock=$('#ddDock');let html='';
  if(S.stage==='upload'){
    const n=S.docs.length;
    html=`<span class="dd-dock-status">${n?`<span class="dd-dock-count">${n}</span> ${n===1?'document':'documents'} ready to extract`:'<i data-lucide="info"></i> Add documents to start'}</span><button class="dd-btn ghost" data-act="cancel-upload" ${n?'':'disabled'}>Cancel</button><button class="dd-btn ai" data-act="extract" ${n?'':'disabled'}><i data-lucide="sparkles"></i> Extract with AI</button>`;
  }else if(S.stage==='extract'){
    html='<span class="dd-dock-status"><span class="dd-spinner"></span> AI is preparing this intake…</span>';
  }else if(S.stage==='confirm'){
    const {ready,message,busy}=confirmState();
    html=`<span class="dd-dock-status ${ready?'ok':''}">${busy?'<span class="dd-spinner"></span>':`<i data-lucide="${ready?'circle-check':'info'}"></i>`} ${message}</span><button class="dd-btn primary" data-act="to-review" ${ready?'':'disabled'}>Continue to review <i data-lucide="arrow-right"></i></button>`;
  }else if(S.stage==='review'){
    const count=requiredItems().length;
    html=`<span class="dd-dock-status ${count?'':'ok'}">${count?`<span class="dd-dock-count req">${count}</span> required ${count===1?'item':'items'} left`:'<i data-lucide="circle-check"></i> All required fields complete'}</span><button class="dd-btn ghost" data-act="cancel-intake">Cancel intake</button><button class="dd-btn primary" data-act="complete" ${count?'disabled':''}><i data-lucide="check"></i> Looks good</button>`;
  }else if(S.stage==='precheck'){
    const n=pcCounts(),flagged=n.warn+n.fail;
    html=`<span class="dd-dock-status"><i data-lucide="sparkles"></i> ${flagged?`AI flagged ${flagged} of ${plural(n.all,'item')}`:`AI found no issues across ${plural(n.all,'item')}`}</span><button class="dd-btn ghost" data-act="go" data-stage="complete"><i data-lucide="arrow-left"></i> Back</button><button class="dd-btn primary" data-act="create-order">Create order <i data-lucide="arrow-right"></i></button>`;
  }
  dock.hidden=!html;dock.innerHTML=html;icons();
}

// ---------- 1. Upload ----------
function renderUpload(){
  const n=S.docs.length;
  $('#ddUploaded').hidden=!n;
  $('#ddUploadCount').textContent=plural(n,'document');
  $('#ddUploadTiles').innerHTML=S.docs.map((doc,index)=>`<article class="dd-tile" style="--i:${index}"><span class="dd-tile-thumb"><img src="${imageFor(doc)}" alt=""></span><span class="dd-tile-copy"><strong title="${esc(doc.name)}">${esc(doc.name)}</strong><small>${esc(doc.type)}${doc.size?` · ${esc(doc.size)}`:''}</small></span><button class="dd-icon-btn" data-act="remove-doc" data-id="${doc.id}" aria-label="Remove ${esc(doc.name)}" title="Remove"><i data-lucide="x"></i></button></article>`).join('');
  $('#ddDrop').classList.toggle('has-files',n>0);
  renderQueue();renderDock();icons();
}
function renderQueue(){
  $('#ddQueue').innerHTML=intakeQueue.map(patient=>{
    const open=S.pickerPatient===patient.id,added=patient.documents.filter(file=>S.docs.some(doc=>doc.id===file.id)).length;
    return `<article class="dd-patient ${open?'open':''} ${added?'has-added':''}"><button class="dd-patient-head" data-act="toggle-picker" data-id="${patient.id}" aria-expanded="${open}">${avatar(patient.name,patient.id)}<span class="dd-patient-copy"><strong>${esc(patient.name)}</strong><small>${patient.mrn} · DOB ${patient.dob}</small></span><span class="dd-badge ${added?'on':''}">${added?`${added}/${patient.documents.length} added`:`${patient.documents.length} docs`}</span><i data-lucide="chevron-down" class="dd-chev"></i></button>${open?pickerHtml(patient):''}</article>`;
  }).join('');
  icons();
}
function pickerHtml(patient){
  const count=S.pickerSel.size;
  return `<div class="dd-picker"><div class="dd-picker-list">${patient.documents.map(file=>{const added=S.docs.some(doc=>doc.id===file.id);return `<label class="dd-pick ${added?'added':''}"><input type="checkbox" data-pick="${file.id}" ${added||S.pickerSel.has(file.id)?'checked':''} ${added?'disabled':''}><span class="dd-check"><i data-lucide="check"></i></span><i data-lucide="${file.icon}" class="dd-pick-icon"></i><span><strong>${esc(file.name)}</strong><small>${added?'Already added':`${esc(file.type)} · ${file.date}`}</small></span></label>`;}).join('')}</div><footer><button class="dd-link" data-act="toggle-picks">${count?'Clear all':'Select all'}</button><button class="dd-btn primary sm" data-act="add-picks" ${count?'':'disabled'}>${count?`Add ${plural(count,'document')}`:'Add documents'}</button></footer></div>`;
}
function openPicker(id){
  const patient=[...intakeQueue,...patientDirectory].find(item=>item.id===id);if(!patient)return;
  if(!intakeQueue.includes(patient)){patient.fromSearch=true;intakeQueue.push(patient);}
  S.pickerPatient=patient.id;
  S.pickerSel=new Set(patient.documents.filter(file=>!S.docs.some(doc=>doc.id===file.id)).map(file=>file.id));
  $('#ddSearch').value='';$('#ddSearchResults').hidden=true;
  renderQueue();
}
function addPicks(){
  const patient=intakeQueue.find(item=>item.id===S.pickerPatient);
  const selected=patient.documents.filter(file=>S.pickerSel.has(file.id));if(!selected.length)return;
  selected.forEach(file=>S.docs.push({...file,size:`From ${patient.name.split(' ')[0]}’s record`,meta:'Ready to extract'}));
  // Documents from a patient found via search already belong to that patient, so no match is needed later.
  if(patient.fromSearch)S.knownPatient=patient.id;
  if(!S.selected)S.selected=S.docs[0].id;
  S.pickerPatient='';renderUpload();
  toast(`${plural(selected.length,'document')} from ${patient.name} ready to extract`);
}
function renderSearch(){
  const query=$('#ddSearch').value.trim().toLowerCase(),box=$('#ddSearchResults');
  if(!query&&document.activeElement!==$('#ddSearch')){box.hidden=true;return;}
  const results=patientDirectory.filter(patient=>!intakeQueue.includes(patient)&&(!query||patient.name.toLowerCase().includes(query)||patient.mrn.toLowerCase().includes(query)));
  box.hidden=false;
  box.innerHTML=results.length?results.map(patient=>`<button class="dd-result" data-act="search-pick" data-id="${patient.id}">${avatar(patient.name,patient.id,'sm')}<span><strong>${esc(patient.name)}</strong><small>DOB ${patient.dob} · ${patient.mrn}</small></span><small>${patient.documents.length} docs</small></button>`).join(''):'<p class="dd-empty">No patients found</p>';
}
function addDemoUploads(){
  const fresh=demoUploadFiles.filter(file=>!S.docs.some(doc=>doc.id===file.id));
  if(!fresh.length){toast('All sample documents are already uploaded.');return;}
  fresh.forEach(file=>S.docs.push({...file,meta:'Ready to extract'}));
  if(!S.selected)S.selected=S.docs[0].id;
  afterDocsAdded();
  toast(`${plural(fresh.length,'document')} uploaded and ready to extract`);
}
function addFiles(fileList){
  const files=[...fileList];if(!files.length)return;
  files.forEach((file,index)=>S.docs.push({id:`upload-${Date.now()}-${index}`,name:file.name,meta:'Ready to extract',icon:'file-text',type:file.type||'Uploaded document',size:`${Math.max(1,Math.round(file.size/1024))} KB`}));
  if(!S.selected)S.selected=S.docs[0].id;
  afterDocsAdded();
  toast(`${plural(files.length,'document')} ready to extract`);
}
function afterDocsAdded(){if(S.stage==='upload')renderUpload();else{renderFiles();updateSourceCount();}}

// ---------- 2. Extract ----------
const extractionStages=[
  {id:'read',label:'Read uploaded documents',icon:'file-scan'},
  {id:'extract',label:'Extract patient and order data',icon:'scan-text'},
  {id:'match',label:'Match existing patients',icon:'users'},
  {id:'duplicate',label:'Check similar documents',icon:'copy-check'},
  {id:'conflict',label:'Resolve field conflicts',icon:'git-compare-arrows'}
];
async function startExtraction(){
  if(!S.docs.length||S.extracting)return;
  Object.assign(S,{extracting:true,extractionComplete:false,patientResolved:false,patientLinked:false});
  S.docDecisions.clear();S.recordDecisions.clear();S.openDetails.clear();
  setStage('extract');
  const fan=S.docs.slice(0,5);
  $('#ddScanStack').innerHTML=fan.map((doc,index)=>`<span class="dd-scan-page" style="--i:${index};--n:${fan.length}"><img src="${imageFor(doc)}" alt=""></span>`).join('')+'<span class="dd-beam"></span>';
  $('#ddSteps').innerHTML=extractionStages.map(stage=>`<li data-step="${stage.id}"><span class="dd-step-ico"><i data-lucide="${stage.icon}"></i></span><span>${stage.label}</span></li>`).join('');
  $('#ddExtractTitle').textContent='Reading your documents…';
  icons();
  for(const [index,stage] of extractionStages.entries()){
    const row=$(`[data-step="${stage.id}"]`);row.classList.add('active');
    $('#ddExtractSub').textContent=`Step ${index+1} of ${extractionStages.length} · ${stage.label}`;
    const percent=(index+1)*20;$('#ddExtractPct').textContent=`${percent}%`;$('#ddExtractBar').style.width=`${percent}%`;
    renderExtractFiles(index);
    await wait(750);
    row.classList.remove('active');row.classList.add('done');row.querySelector('.dd-step-ico').innerHTML='<i data-lucide="check"></i>';icons();
  }
  S.extracting=false;S.extractionComplete=true;
  S.docs.forEach(doc=>{doc.meta='Extracted';});
  $('#ddExtractTitle').textContent='All done. Nice and tidy.';
  $('#ddExtractSub').textContent=`${plural(S.docs.length,'document')} extracted`;
  $('#ddApp').classList.add('extract-done');
  renderExtractFiles(5);
  prepareConfirm();
  await wait(900);
  $('#ddApp').classList.remove('extract-done');
  setStage('confirm');renderConfirm();
}
function renderExtractFiles(step){
  $('#ddExtractFiles').innerHTML=S.docs.map((doc,index)=>{const done=step>=5||index<Math.ceil((step+1)/5*S.docs.length);return `<span class="dd-file-chip ${done?'done':''}"><i data-lucide="${done?'circle-check':'loader'}"></i>${esc(doc.name)}</span>`;}).join('');
  icons();
}

// ---------- 3. Confirm ----------
function prepareConfirm(){
  const known=patientDirectory.find(patient=>patient.id===S.knownPatient);
  S.findings=[duplicateFindings[0],duplicateFindings[1]];
  if(known){
    const file=S.docs.find(item=>/insurance/i.test(item.name))||S.docs[0];
    S.findings=[{id:'known-duplicate',kind:'exact',docId:file.id,upload:file.name,existing:`${file.name.replace(/\.[^.]+$/,'')} · Aug 2026.pdf`,reason:`Exact copy of a document already stored in ${known.name}’s record`}];
    Object.assign(S,{patientResolved:true,patientLinked:true,patientTitle:known.name,patientId:known.id,patientDetail:`${known.mrn} · Selected before extraction`,patientChangeable:false});
  }
  S.confirmStep=S.patientResolved?'documents':'patient';
}
const recordFiles=()=>S.patientLinked?existingFiles.filter(file=>!file.extracted||S.recordDecisions.has(file.id)):[];
function confirmState(){
  const docsDone=S.docDecisions.size===S.findings.length;
  const files=recordFiles(),busy=files.some(file=>S.recordDecisions.get(file.id)==='add'&&!file.extracted);
  const pending=files.filter(file=>!S.recordDecisions.has(file.id)).length;
  const ready=S.extractionComplete&&S.patientResolved&&docsDone&&!busy;
  const todo=[!S.patientResolved&&'select the patient',S.patientResolved&&!docsDone&&'choose document handling'].filter(Boolean);
  const message=busy?'Extracting record documents…':ready?(pending?`Ready. ${plural(pending,'record document')} will be skipped.`:'All set. Continue to the extracted details.'):`To continue, ${todo.join(' and ')}.`;
  return {ready,message,busy,docsDone};
}
function decisionSteps(){
  const {docsDone}=confirmState(),files=recordFiles();
  const steps=[
    {id:'patient',title:'Select the patient',sub:S.patientResolved?S.patientTitle:`${patientMatches.length} possible matches`,state:S.patientResolved?'done':'todo',tag:'Required'},
    {id:'documents',title:'Document handling',sub:docsDone?'All decisions saved':`${S.docDecisions.size} of ${S.findings.length} decided`,state:docsDone?'done':S.patientResolved?'todo':'locked',tag:'Required'}
  ];
  if(files.length&&S.patientResolved){const decided=files.filter(file=>S.recordDecisions.has(file.id)).length;steps.push({id:'record',title:'From the patient’s record',sub:`${decided} of ${files.length} decided`,state:decided===files.length?'done':'todo',tag:'Optional'});}
  return steps;
}
function renderConfirm(){
  const steps=decisionSteps();
  if(!steps.some(step=>step.id===S.confirmStep))S.confirmStep='patient';
  $('#ddDecisions').innerHTML=steps.map((step,index)=>`<button class="dd-decision ${step.state} ${S.confirmStep===step.id?'current':''}" data-act="decision" data-id="${step.id}" ${step.state==='locked'?'disabled':''}><span class="dd-num">${step.state==='done'?'<i data-lucide="check"></i>':index+1}</span><span class="dd-decision-copy"><strong>${step.title}</strong><small>${esc(step.sub)}</small></span><span class="dd-tag ${step.state==='locked'?'opt':step.tag==='Required'?'req':'opt'}">${step.state==='done'?'Done':step.state==='locked'?'Locked':step.tag}</span></button>`).join('');
  const panel=$('#ddDecisionPanel');
  panel.innerHTML=S.confirmStep==='patient'?patientPanel():S.confirmStep==='documents'?documentsPanel():recordPanel();
  panel.classList.remove('swap');void panel.offsetWidth;panel.classList.add('swap');
  renderJourney();renderDock();icons();
}
function panelHead(n,title,sub,tag){return `<header class="dd-panel-head"><span class="dd-num big">${n}</span><div><h3>${title}</h3><p>${sub}</p></div><span class="dd-tag ${tag==='Required'?'req':'opt'}">${tag}</span></header>`;}
function nextButton(){
  const steps=decisionSteps(),index=steps.findIndex(step=>step.id===S.confirmStep),next=steps[index+1];
  return next&&next.state!=='locked'?`<button class="dd-btn soft" data-act="decision" data-id="${next.id}">Next: ${next.title} <i data-lucide="arrow-right"></i></button>`:'';
}
function patientPanel(){
  if(S.patientResolved)return `${panelHead(1,'Who is this intake for?','The patient this intake will be filed under.','Required')}<div class="dd-resolved">${avatar(S.patientTitle,S.patientId||'new','lg')}<div><span class="dd-resolved-kicker"><i data-lucide="circle-check"></i> Patient confirmed</span><strong>${esc(S.patientTitle)}</strong><small>${esc(S.patientDetail)}</small></div>${S.patientChangeable?'<button class="dd-btn ghost sm" data-act="change-patient">Change</button>':''}</div><div class="dd-panel-foot">${nextButton()}</div>`;
  return `${panelHead(1,'Who is this intake for?','AI found possible matches in your records. Compare, then pick one.','Required')}
  <div class="dd-match-grid">${patientMatches.map((patient,index)=>{const open=S.openDetails.has(patient.id);return `<article class="dd-match ${index===0?'best':''}">${index===0?'<span class="dd-ribbon"><i data-lucide="sparkles"></i> Best match</span>':''}${avatar(patient.name,patient.id,'lg')}<strong>${esc(patient.name)}</strong><small>DOB ${patient.dob} · ${patient.mrn}</small><p class="dd-why"><i data-lucide="sparkles"></i><span>${esc(patient.reason)}</span></p><dl class="dd-match-details" ${open?'':'hidden'}><div><dt>Address</dt><dd>${esc(patient.address)}</dd></div><div><dt>Phone</dt><dd>${patient.phone}</dd></div><div><dt>Patient ID</dt><dd>${patient.mrn}</dd></div></dl><div class="dd-match-actions"><button class="dd-link" data-act="patient-details" data-id="${patient.id}" aria-expanded="${open}">${open?'Hide details':'View details'}</button><button class="dd-btn ${index===0?'primary':'ghost'} sm" data-act="select-patient" data-id="${patient.id}">Select</button></div></article>`;}).join('')}</div>
  <button class="dd-new-patient" data-act="new-patient"><span class="dd-new-ico"><i data-lucide="user-plus"></i></span><span><strong>None of these</strong><small>Create a new patient record</small></span><i data-lucide="chevron-right"></i></button>`;
}
const decisionText={existing:'The existing document will be used.',upload:'The uploaded copy will be stored.',replace:'The existing document will be replaced.',new:'Stored as a new document.'};
function documentsPanel(){
  return `${panelHead(2,'How should we store look-alikes?',S.knownPatient?'One document is already in the patient’s record.':'AI found uploads that match documents already on file.','Required')}
  <div class="dd-vs-list">${S.findings.map(item=>{const decision=S.docDecisions.get(item.id);return `<article class="dd-vs ${decision?'decided':''}"><span class="dd-vs-kind ${item.kind}">${item.kind==='exact'?'Same document':'Similar content'}</span><div class="dd-vs-row"><div class="dd-vs-doc"><span class="dd-vs-thumb"><img src="${imageFor({id:item.docId,name:item.upload})}" alt=""></span><strong>${esc(item.upload)}</strong><small>Uploaded now</small></div><span class="dd-vs-badge">${item.kind==='exact'?'=':'≈'}</span><div class="dd-vs-doc"><span class="dd-vs-thumb old"><img src="${imageFor({id:item.docId,name:item.existing})}" alt=""></span><strong>${esc(item.existing)}</strong><small>In patient record</small></div></div><p class="dd-why"><i data-lucide="sparkles"></i><span>${esc(item.reason)}</span></p>${decision?`<div class="dd-saved"><i data-lucide="circle-check"></i><span><b>Decision saved</b> ${decisionText[decision]}</span><button class="dd-link" data-act="undo-doc" data-id="${item.id}">Change</button></div>`:`<div class="dd-vs-actions">${item.kind==='exact'?`<button class="dd-btn primary sm" data-act="doc-decision" data-id="${item.id}" data-decision="existing">Use existing document</button><button class="dd-btn ghost sm" data-act="doc-decision" data-id="${item.id}" data-decision="upload">Keep uploaded copy</button>`:`<button class="dd-btn primary sm" data-act="doc-decision" data-id="${item.id}" data-decision="replace">Replace existing</button><button class="dd-btn ghost sm" data-act="doc-decision" data-id="${item.id}" data-decision="new">Add as new</button>`}</div>`}</article>`;}).join('')}</div>
  <div class="dd-panel-foot">${nextButton()}</div>`;
}
function recordPanel(){
  return `${panelHead(3,'Anything else from their record?','These are in the patient’s record but weren’t uploaded or extracted. Add them to this intake or skip.','Optional')}
  <div class="dd-record-list">${recordFiles().map(file=>{const decision=S.recordDecisions.get(file.id);return `<article class="dd-record ${decision||''}"><span class="dd-record-thumb"><img src="${imageFor(file)}" alt=""></span><span class="dd-record-copy"><strong>${esc(file.name)}</strong><small>${decision==='add'?(file.extracted?'Extracted and added to this intake':'Extracting…'):decision==='skip'?'Skipped · stays in the patient’s record':'In the patient’s record · not extracted'}</small></span>${decision?`<span class="dd-pill ${decision==='add'?(file.extracted?'ok':'info'):'muted'}">${decision==='add'?(file.extracted?'<i data-lucide="check"></i> Added':'<span class="dd-spinner sm"></span> Extracting'):'Skipped'}</span><button class="dd-link" data-act="record-undo" data-id="${file.id}">Undo</button>`:`<button class="dd-btn ghost sm" data-act="record-decision" data-decision="skip" data-id="${file.id}">Skip</button><button class="dd-btn primary sm" data-act="record-decision" data-decision="add" data-id="${file.id}"><i data-lucide="scan-text"></i> Extract and add</button>`}</article>`;}).join('')}</div>`;
}
function selectPatient(id){
  const patient=patientMatches.find(item=>item.id===id);
  Object.assign(S,{patientResolved:true,patientLinked:true,patientTitle:patient.name,patientId:patient.id,patientDetail:`${patient.mrn} · Existing patient linked`,patientChangeable:true,confirmStep:'documents'});
  renderConfirm();toast(`${patient.name} selected. Review document matches next.`);
}

// ---------- 4. Review ----------
function viewerFiles(){
  const retained={id:'consent',name:'Consent Form.pdf',meta:'Existing file · Extracted previously',icon:'file-signature',type:'Consent form'};
  const files=[...S.docs];
  if(!files.some(file=>file.id==='consent'))files.push(retained);
  if(S.patientLinked)files.push(...existingFiles);
  return files.filter((file,index,list)=>list.findIndex(item=>item.id===file.id)===index);
}
function issueCount(){return [!/^\d{10}$/.test(S.provider),!S.authAck].filter(Boolean).length;}
function reviewItems(){
  return [
    !/^\d{10}$/.test(S.provider)&&{id:'providerField',label:'Physician NPI',detail:'Not found in any document',section:'Prescription 1',severity:'missing',tag:'Missing'},
    !S.authAck&&{id:'authExpiry',label:'Prior authorization period',detail:'Ends 7 months before the rental',section:'Prior authorization',severity:'warning',tag:'Expiring',icon:'calendar-clock'}
  ].filter(Boolean);
}
const requiredItems=()=>reviewItems().filter(item=>item.severity==='missing');
const sectionsMeta=[
  {id:'demographics-section',label:'Demographics',icon:'user-round',tone:'violet'},
  {id:'contact-section',label:'Contact',icon:'contact',tone:'sky'},
  {id:'insurance-section',label:'Insurance',icon:'shield-check',tone:'teal'},
  {id:'prescription-section',label:'Prescriptions',icon:'notebook-tabs',tone:'blue'},
  {id:'note-section',label:'Physician note',icon:'stethoscope',tone:'rose'},
  {id:'prior-auth-section',label:'Prior authorization',icon:'file-check',tone:'amber'}
];
function sectionStatus(id){
  if(id==='prescription-section'){const gaps=(/^\d{10}$/.test(S.provider)?0:1)+prescriptions.filter(rx=>!rx.main).reduce((sum,rx)=>sum+rxGaps(rx),0);return gaps?{tone:'req',text:`${gaps} to resolve`}:{tone:'ok',text:'Reviewed'};}
  if(id==='prior-auth-section')return S.authAck?{tone:'ok',text:'Reviewed'}:{tone:'warn',text:'1 to check'};
  if(id==='note-section')return {tone:'warn',text:'Signature missing'};
  return {tone:'ok',text:'Reviewed'};
}
function statusChip(id){const status=sectionStatus(id);return `<span class="dd-status ${status.tone}"><i data-lucide="${status.tone==='ok'?'circle-check':status.tone==='req'?'circle-alert':'triangle-alert'}"></i> ${status.text}</span>`;}

function enterReview(){
  if(!S.reviewBuilt){buildReview();S.reviewBuilt=true;}
  $('#ddReviewName').textContent='Ashlynn Botosh';
  $('#ddReviewChips').innerHTML=`<span class="dd-chip"><i data-lucide="cake"></i> DOB ${esc(S.values.dob)}</span><span class="dd-chip"><i data-lucide="${S.patientLinked?'link':'user-plus'}"></i> ${S.patientLinked?esc(S.patientDetail.split(' · ')[0])+' · Existing patient':'New patient record'}</span><span class="dd-chip"><i data-lucide="files"></i> ${plural(viewerFiles().length,'document')}</span>`;
  setSource(window.innerWidth>=1180);
  setListMode(S.listMode);
  openDocument(S.selected||S.docs[0]?.id||'referral');
  tagSourceFields();
  updateProgress();
}
function fieldTile([key,label,value,wide]){return `<div class="dd-field ${wide?'wide':''}" data-source-field="${key}"><span class="dd-field-label">${label}</span><strong class="dd-editable" contenteditable="plaintext-only" role="textbox" aria-label="Edit ${label}" spellcheck="false">${esc(value)}</strong></div>`;}
function aiTile(key,extraClass=''){
  const field=aiFields[key],edited=S.aiEdited.has(key),reviewed=S.aiReviewed.has(key),editing=S.editingAi===key;
  const tag=edited?'<span class="dd-ai-tag edited"><i data-lucide="pencil"></i> Edited</span>':reviewed?'<span class="dd-ai-tag checked"><i data-lucide="check"></i> Checked</span>':'<span class="dd-ai-tag"><i data-lucide="sparkles"></i> AI resolved</span>';
  const body=editing?`<div class="dd-ai-edit"><input class="dd-input" id="ddOverride" value="${esc(S.values[key])}" aria-label="Override ${field.label}">${(field.alternatives||[]).filter(value=>value!==S.values[key]).map(value=>`<button class="dd-btn ghost sm" data-act="ai-pick" data-value="${esc(value)}">Use ${esc(value)}</button>`).join('')}<button class="dd-btn ghost sm" data-act="ai-cancel">Cancel</button><button class="dd-btn primary sm" data-act="ai-save" data-key="${key}">Save</button></div>`
    :edited?'<p class="dd-ai-note"><i data-lucide="check"></i> Manual change saved. This value will be recorded instead of the AI-selected value.</p>'
    :`<p class="dd-ai-note"><b>${field.title}.</b> ${field.why}</p><div class="dd-ai-actions"><button class="dd-source-btn" data-act="open-doc" data-doc="${field.doc}"><i data-lucide="scan-text"></i> ${field.docLabel}</button><span class="dd-spacer"></span>${reviewed?'':`<button class="dd-link" data-act="ai-ok" data-key="${key}"><i data-lucide="thumbs-up"></i> Looks right</button>`}<button class="dd-link" data-act="ai-change" data-key="${key}">Change</button></div>`;
  return `<div class="dd-field ai ${edited||reviewed?'settled':''} ${extraClass}" id="${field.id}" data-source-field="${field.source}"><div class="dd-field-top"><span class="dd-field-label">${field.label}</span>${tag}</div><strong class="dd-ai-value" data-ai-value="${key}">${esc(S.values[key])}</strong>${body}</div>`;
}
function cardHead(id,title,sub,extra=''){const meta=sectionsMeta.find(section=>section.id===id);return `<header class="dd-card-head"><span class="dd-card-ico ${meta.tone}"><i data-lucide="${meta.icon}"></i></span><div><h3>${title}</h3><p>${sub}</p></div>${extra}<span data-status="${id}">${statusChip(id)}</span></header>`;}
function buildReview(){
  $('#ddSections').innerHTML=`
  <section class="dd-card" id="demographics-section">${cardHead('demographics-section','Patient demographics','5 of 5 fields complete')}<div class="dd-fields">${profile.demographics.map(fieldTile).join('')}<div class="dd-ai-slot wide" data-ai-slot="dob"></div></div></section>
  <section class="dd-card" id="contact-section">${cardHead('contact-section','Contact information','8 of 8 fields complete')}<div class="dd-fields">${profile.contact.map(fieldTile).join('')}<div class="dd-ai-slot wide" data-ai-slot="mobile"></div></div></section>
  <section class="dd-card" id="insurance-section"></section>
  <div id="ddRx"></div>
  <button class="dd-add-block" data-act="add-rx"><i data-lucide="plus"></i> Add prescription</button>
  <section class="dd-card" id="note-section">${cardHead('note-section','Physician note','Extracted from Face-to-Face Notes.pdf')}
    <div class="dd-callout warn"><i data-lucide="pen-off"></i><span><b>Physician signature not found.</b> The face-to-face note doesn’t appear to be signed. This doesn’t block the intake.</span><button class="dd-source-btn" data-act="open-doc" data-doc="face-to-face"><i data-lucide="scan-text"></i> Face-to-Face Notes.pdf · p2</button></div>
    <label class="dd-note"><span class="dd-field-label">Clinical note</span><textarea class="dd-input" id="ddNote" rows="5">Patient seen 10/12/2026 for loud snoring, witnessed apneas, and daytime sleepiness (Epworth score 14). Home sleep test on 10/08/2026 shows AHI 18.4 events/hr, consistent with moderate obstructive sleep apnea. Recommend auto-titrating CPAP 5–15 cm H2O with heated humidifier and full face mask. Patient educated on therapy and agrees to start. Follow up in 31–90 days to assess compliance and benefit.</textarea></label>
    <button class="dd-source-btn" data-act="open-doc" data-doc="face-to-face"><i data-lucide="scan-text"></i> Face-to-Face Notes.pdf · p1</button>
  </section>
  <section class="dd-card" id="prior-auth-section">${cardHead('prior-auth-section','Prior authorization','<span id="ddPaMeta"></span>')}<div class="dd-pa-list" id="ddPaList"></div>
    <button class="dd-link add" id="ddPaToggle" data-act="pa-form"><i data-lucide="plus"></i> Add prior authorization</button>
    <form class="dd-pa-form" id="ddPaForm" hidden novalidate>
      <div class="dd-form-grid">
        <label><span>HCPCS <em>*</em></span><input class="dd-input" name="code" list="ddHcpcs" maxlength="5" placeholder="e.g. E0601" required></label>
        <label><span>Authorization number <em>*</em></span><input class="dd-input" name="number" placeholder="e.g. PA-26-0000000" required></label>
        <label><span>Payer <em>*</em></span><select class="dd-input" name="payer" id="ddPaPayer" required></select></label>
        <label><span>Effective from</span><input class="dd-input" type="date" name="from"></label>
        <label><span>Effective to</span><input class="dd-input" type="date" name="to"></label>
        <label><span>Quantity/Amount</span><input class="dd-input" name="qty" placeholder="e.g. 1 unit"></label>
        <label class="wide"><span>Dispensing frequency</span><input class="dd-input" name="frequency" placeholder="e.g. Monthly rental · 13 months"></label>
      </div>
      <p class="dd-form-error" id="ddPaError" hidden>Fill in HCPCS, authorization number and payer.</p>
      <div class="dd-form-actions"><button class="dd-btn ghost sm" type="button" data-act="pa-cancel">Cancel</button><button class="dd-btn primary sm" type="submit">Add authorization</button></div>
    </form>
  </section>`;
  $('#ddHcpcs').innerHTML=Object.entries(hcpcsCatalog).map(([code,desc])=>`<option value="${code}">${desc}</option>`).join('');
  $('#ddIcd').innerHTML=Object.entries(icdCatalog).map(([code,desc])=>`<option value="${code}">${desc}</option>`).join('');
  renderAiSlots();renderInsurance();renderAllRx();renderPriorAuths();
}
function renderAiSlots(){
  $$('[data-ai-slot]').forEach(slot=>{slot.innerHTML=aiTile(slot.dataset.aiSlot);});
  $$('[data-rx-ai]').forEach(slot=>{slot.innerHTML=aiTile('physician');});
  icons();
}

// Insurance — plans are cards in a wallet; drag to set coverage order.
const planRank=index=>['Primary','Secondary','Tertiary'][index]||`Plan ${index+1}`;
const planResult=plan=>plan.check?plan.results[plan.check.service]:null;
const rankOrder=['Primary','Secondary','Tertiary'];
const orderBy=key=>[...insurancePlans].sort((a,b)=>(a[key]?rankOrder.indexOf(a[key]):9)-(b[key]?rankOrder.indexOf(b[key]):9)).map(plan=>plan.id);
const currentOrder=()=>insurancePlans.map(plan=>plan.id);
const sameOrder=(a,b)=>a.join()===b.join();
const planField=(plan,label)=>plan.fields.find(([name])=>name===label)?.[1]||'—';
const memberId=plan=>['Member ID prefix','Member ID','Member ID suffix'].map(label=>planField(plan,label)).filter(value=>value&&value!=='—'&&value!=='Not provided').join(' ');
function setPlanOrder(ids,message){
  const selectedId=insurancePlans[S.currentPlan]?.id;
  insurancePlans.splice(0,insurancePlans.length,...ids.map(id=>insurancePlans.find(plan=>plan.id===id)));
  S.currentPlan=Math.max(0,insurancePlans.findIndex(plan=>plan.id===selectedId));
  S.aiEdited.add('coverage');
  renderInsurance();updateProgress();
  if(message)toast(message);
}
function renderInsurance(index=S.currentPlan){
  if(index!==S.currentPlan)S.editingPlan=false;
  S.currentPlan=index;
  const plan=insurancePlans[index],type=serviceTypes.find(item=>item.id===S.serviceType);
  const allChecked=insurancePlans.every(item=>item.check?.service===S.serviceType);
  const ai=orderBy('aiRank'),system=orderBy('systemRank'),current=currentOrder();
  const usingAi=sameOrder(current,ai),allInSystem=insurancePlans.every(item=>item.systemRank),usingSystem=allInSystem&&sameOrder(current,system);
  const changes=insurancePlans.filter((item,i)=>item.systemRank!==planRank(i)).length;
  const hasResponse=plan.check?.service===S.serviceType&&!S.checkingPlan;
  const result=planResult(plan),checked=plan.check?.service===S.serviceType;
  const coverageTag=S.aiEdited.has('coverage')||S.aiReviewed.has('coverage')?'':'<span class="dd-ai-tag"><i data-lucide="sparkles"></i> AI set order</span>';
  const orderPill=usingAi?'<span class="dd-pill v3-ai-pill"><i data-lucide="sparkles"></i> AI sorted</span>':usingSystem?'<span class="dd-pill muted">System order</span>':'<span class="dd-pill muted">Custom order</span>';
  const orderLink=usingAi?(allInSystem?'<button class="dd-link" data-act="order" data-order="system">Use system order</button>':''):'<button class="dd-link" data-act="order" data-order="ai">Reset to AI order</button>';
  const eligPill=(item,res,on)=>on&&res?`<span class="dd-pill ${res.eligible?'ok':'bad'}">${res.eligible?'Eligible':'Not covered'}</span>`:'<span class="dd-pill muted">Not checked</span>';
  $('#insurance-section').innerHTML=`${cardHead('insurance-section','Insurance information',`${plural(insurancePlans.length,'coverage plan')}${changes?' · order updated from system':''}`)}
  <div class="v3-ins">
    <div class="v3-ins-bar">
      <label class="v3-ins-service"><span>Service type</span><span class="v3-select"><i data-lucide="${type.icon}"></i><select data-service-select aria-label="Service type">${serviceTypes.map(item=>`<option value="${item.id}" ${item.id===S.serviceType?'selected':''}>${item.id}</option>`).join('')}</select><i data-lucide="chevron-down" class="v3-select-chev"></i></span></label>
      <button class="dd-btn primary sm" data-act="check-all" ${S.checkingAll?'disabled':''}>${S.checkingAll?'<span class="dd-spinner sm"></span> Checking…':'<i data-lucide="refresh-cw"></i> Check eligibility'}</button>
      <small class="v3-ins-note">${S.checkingAll?`Checking ${type.id} for all plans…`:allChecked?`All plans checked for ${type.id} · ${insurancePlans[0].check.at}`:`Not checked for ${type.id} on every plan · check all plans here or one plan at a time`}</small>
    </div>
    <div class="v3-ins-body">
      <aside class="v3-ins-rail">
        <div class="v3-rail-head"><span>Coverage order</span>${orderPill}</div>
        <ol class="v3-plan-list" id="ddWallet">${insurancePlans.map((item,i)=>{const res=planResult(item),on=item.check?.service===S.serviceType,diff=item.userAdded?['plus','Added by you','new']:!item.systemRank?['plus','New · not in system','warn']:item.systemRank!==planRank(i)?['arrow-left-right',`Was ${item.systemRank} in system`,'warn']:['check','Matches system','muted'];return `<li class="v3-plan ${i===index?'active':''}" draggable="true" data-drag-plan="${i}"><i data-lucide="grip-vertical" class="v3-grip"></i><button class="v3-plan-btn" data-act="plan" data-i="${i}" aria-pressed="${i===index}" aria-label="${esc(item.name)}, ${planRank(i)}. Press Alt plus arrow keys to reorder."><strong>${esc(item.name)}</strong><span class="dd-pills"><span class="dd-pill rank">${planRank(i)}</span>${eligPill(item,res,on)}</span><small class="v3-plan-diff ${diff[2]}"><i data-lucide="${diff[0]}"></i> ${diff[1]}</small></button></li>`;}).join('')}</ol>
        <p class="v3-rail-note">${changes?`${plural(changes,'change')} from system. `:''}Drag to reorder.</p>
        ${orderLink?`<div class="v3-rail-link">${orderLink}</div>`:''}
        <button class="dd-link v3-add-plan" data-act="add-plan"><i data-lucide="plus"></i> Add another plan</button>
      </aside>
      <div class="v3-ins-detail">
        <div class="v3-detail-head">
          <div class="v3-detail-title"><h4>${esc(plan.name)}</h4><div class="dd-pills"><span class="dd-pill ok"><i data-lucide="circle-check"></i> Active</span>${checked?`<span class="dd-pill ${result.eligible?'info':'bad'}" title="${esc(result.detail)} · checked ${plan.check.at}"><i data-lucide="${type.icon}"></i> ${type.id} · ${result.eligible?'Eligible':'Not covered'}</span>`:`<span class="dd-pill muted"><i data-lucide="${type.icon}"></i> ${type.id} · Not checked</span>`}<span class="dd-pill rank">${planRank(index)} coverage</span>${!plan.systemRank?'<span class="dd-pill warn">New · not in system</span>':plan.systemRank!==planRank(index)?`<span class="dd-pill warn">System: ${plan.systemRank}</span>`:''}</div><p class="v3-plan-dates">${plan.eligibility}</p></div>
          <div class="dd-plan-actions">${S.editingPlan?'<button class="dd-btn ghost sm" data-act="plan-cancel">Cancel</button><button class="dd-btn primary sm" data-act="plan-save">Save</button>':`<button class="dd-btn ghost sm" data-act="plan-edit"><i data-lucide="pencil"></i> Edit</button>${hasResponse?`<button class="dd-btn ghost sm" data-act="plan-response" data-i="${index}"><i data-lucide="file-search"></i> View response</button>`:''}<button class="dd-btn ghost sm" data-act="plan-check" ${S.checkingPlan?'disabled':''}>${S.checkingPlan?'<span class="dd-spinner sm"></span> Checking…':'<i data-lucide="refresh-cw"></i> Check eligibility'}</button>`}</div>
        </div>
        ${plan.systemRank!==plan.aiRank&&plan.aiRank?`<div class="v3-ai-callout"><i data-lucide="sparkles"></i><p><b>AI set this as ${plan.aiRank.toLowerCase()}</b>${plan.systemRank?` (system: ${plan.systemRank.toLowerCase()})`:' (not in system yet)'}. ${esc(plan.aiReason)}</p><button class="v3-doc-link" data-act="open-doc" data-doc="${plan.docId}"><i data-lucide="scan-text"></i> ${esc(plan.source)}</button></div>`:''}
        <div class="v3-fields ${S.editingPlan?'editing':''}">${plan.fields.map(([label,value],i)=>S.editingPlan?`<label class="v3-cell"><span>${label}</span><input class="dd-input" data-plan-field="${i}" value="${esc(value==='Not provided'?'':value)}" placeholder="Not provided"></label>`:`<div class="v3-cell dd-field" ${insuranceFieldByLabel[label]&&/medicare/i.test(plan.name)?`data-source-field="${insuranceFieldByLabel[label]}"`:''}><span>${label}</span><strong>${esc(value)}</strong></div>`).join('')}</div>
      </div>
    </div>
  </div>`;
  icons();
}
async function checkAll(){
  S.checkingAll=true;renderInsurance();await wait(900);S.checkingAll=false;
  insurancePlans.forEach(plan=>{plan.check={service:S.serviceType,at:'just now'};});
  renderInsurance();
  toast(`${S.serviceType} eligibility checked · ${insurancePlans.filter(plan=>planResult(plan).eligible).length} of ${insurancePlans.length} plans eligible`);
}
async function checkPlan(){
  const plan=insurancePlans[S.currentPlan];
  S.checkingPlan=true;renderInsurance();await wait(900);
  S.checkingPlan=false;plan.check={service:S.serviceType,at:'just now'};renderInsurance();
  toast(`${plan.name}: ${planResult(plan).eligible?'eligible':'not covered'} for ${S.serviceType}`);
}
function showResponse(index){
  const plan=insurancePlans[index],result=planResult(plan);if(!result)return;
  const type=serviceTypes.find(item=>item.id===plan.check.service);
  $('#ddRespTitle').textContent=plan.name;
  $('#ddRespMeta').textContent=`${planRank(index)} coverage · ${type.id} · checked ${plan.check.at}`;
  const rows=[['Coverage status',plan.eligibility],['Benefit',result.detail],['Member ID',memberId(plan)],['Group number',planField(plan,'Group number')],['Plan dates',`${planField(plan,'Effective from')} – ${planField(plan,'Effective to')}`],['Deductible',`${plan.response.deductible} · ${plan.response.deductibleMet} met`],['Out-of-pocket maximum',plan.response.oop],['Network',plan.response.network],['Payer',plan.response.payer],['Trace number',plan.response.trace]];
  $('#ddRespBody').innerHTML=`<div class="dd-callout ${result.eligible?'ok':'bad'}"><i data-lucide="${result.eligible?'circle-check':'circle-x'}"></i><span><b>${result.eligible?'Eligible':'Not covered'} for ${type.id}.</b> ${esc(result.detail)}</span></div><dl class="dd-kv">${rows.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
  icons();$('#ddRespDialog').showModal();
}
const formatDate=value=>{if(!value)return '';const [y,m,d]=value.split('-');return `${m}/${d}/${y}`;};
function openAddPlan(){
  const form=$('#ddPlanForm');form.reset();$('#ddPlanError').hidden=true;
  form.querySelectorAll('.invalid,.ai-filled').forEach(field=>field.classList.remove('invalid','ai-filled'));
  const slots=insurancePlans.length+1;
  $('#ddPlanPosition').innerHTML=Array.from({length:slots},(_,i)=>`<option value="${i}" ${i===slots-1?'selected':''}>${planRank(i)}</option>`).join('');
  $('#ddScan').classList.remove('scanned');$('#ddScan').innerHTML='<i data-lucide="scan-line"></i><span><strong>Upload insurance card</strong><small>AI fills in the fields for you to review</small></span>';
  icons();$('#ddPlanDialog').showModal();form.company.focus();
}

// Prescriptions
const rxTitle=index=>`Prescription ${index+1}`;
const rxById=id=>prescriptions.find(rx=>rx.id===id);
const paFor=code=>{const pa=priorAuthList.find(item=>item.code===code);return pa?`${pa.number} · ${pa.payer}`:'';};
function findDoc(docId){return S.docs.find(doc=>doc.id===docId)?.name||(docId==='sleep-study'&&S.patientLinked?'Sleep Study · Aug 2022.pdf':'');}
function docsForItem(rx,item){
  const codes=item.lines.map(l=>l.code),pa=codes.map(paFor).find(Boolean);
  const docs=[{name:docTypes.swo,docId:rx.docId,status:findDoc(rx.docId)||'Not found in uploads'},{name:docTypes.f2f,docId:'face-to-face',status:findDoc('face-to-face')||'Not found in uploads'},{name:docTypes.pa,docId:'',status:pa?`On file · ${pa}`:'Not required for these codes'}];
  [...new Set(codes.map(policyFor).filter(Boolean))].forEach(policy=>{const rec=medicareRecommended[policy];docs.push({name:rec.name,docId:rec.docId,status:findDoc(rec.docId)||'Not found in uploads',recommended:policy});});
  return docs.map(doc=>({...doc,found:!/^Not /.test(doc.status)}));
}
function rxGaps(rx){if(rx.main)return 0;return [!rx.physician.first||!rx.physician.last,!/^\d{10}$/.test(rx.physician.npi),!rx.icd.length,!rx.items.length,rx.items.some(item=>item.lines.some(l=>!l.code))].filter(Boolean).length;}
function physicianHtml(rx){
  const p=rx.physician,npiOk=/^\d{10}$/.test(S.provider);
  if(rx.main)return `<div class="dd-sub"><span class="dd-sub-title"><i data-lucide="user-round"></i> Physician</span><div class="dd-fields">
      <div class="dd-field" data-source-field="physician"><span class="dd-field-label">First name</span><strong class="dd-editable" contenteditable="plaintext-only" role="textbox" aria-label="Edit first name">${esc(p.first)}</strong></div>
      <div class="dd-field"><span class="dd-field-label">Specialty</span><strong class="dd-editable" contenteditable="plaintext-only" role="textbox" aria-label="Edit specialty">${esc(p.specialty)}</strong></div>
      <div class="dd-ai-slot wide" data-rx-ai="1"></div>
      <label class="dd-field required ${npiOk?'done':''} wide" id="providerField" for="ddNpi"><span class="dd-field-top"><span class="dd-field-label">NPI</span><span class="dd-req-tag">${npiOk?'<i data-lucide="check"></i> Added':S.provider?'Enter all 10 digits':'<i data-lucide="circle-alert"></i> Required · not found in uploads'}</span></span><input class="dd-input big" id="ddNpi" inputmode="numeric" maxlength="10" placeholder="Type the 10-digit NPI" value="${esc(S.provider)}"></label>
    </div><div class="dd-enroll"><span class="dd-field-label">Enrollment</span>${p.enrollment.map(e=>`<span class="dd-pill ok"><i data-lucide="circle-check"></i> ${e}</span>`).join('')}<button class="dd-source-btn" data-act="open-doc" data-doc="${rx.docId}"><i data-lucide="scan-text"></i> ${rx.source} · p1</button></div></div>`;
  if(rx.manual)return `<div class="dd-sub"><span class="dd-sub-title"><i data-lucide="user-round"></i> Physician <small>Enter from the prescription</small></span><div class="dd-form-grid four">${[['first','First name',''],['last','Last name',''],['npi','NPI','10-digit NPI'],['specialty','Specialty','']].map(([key,label,ph])=>`<label><span>${label}</span><input class="dd-input" data-rx-field="${key}" data-rx="${rx.id}" value="${esc(p[key])}" ${key==='npi'?'inputmode="numeric" maxlength="10"':''} placeholder="${ph}"></label>`).join('')}</div></div>`;
  return `<div class="dd-sub"><span class="dd-sub-title"><i data-lucide="user-round"></i> Physician</span><div class="dd-fields">${[['First name',p.first],['Last name',p.last],['NPI',p.npi],['Specialty',p.specialty]].map(([label,value])=>`<div class="dd-field"><span class="dd-field-label">${label}</span><strong>${esc(value)}</strong></div>`).join('')}</div><div class="dd-enroll"><span class="dd-field-label">Enrollment</span>${p.enrollment.map(e=>`<span class="dd-pill ok"><i data-lucide="circle-check"></i> ${e}</span>`).join('')}<button class="dd-source-btn" data-act="open-doc" data-doc="${rx.docId}"><i data-lucide="scan-text"></i> ${rx.source} · p1</button></div></div>`;
}
function icdHtml(rx){
  return `<div class="dd-sub"><span class="dd-sub-title"><i data-lucide="activity"></i> ICD-10 codes <small>${plural(rx.icd.length,'code')}</small></span><div class="dd-codes">${rx.icd.map((item,i)=>`<span class="dd-code" ${rx.main&&item.code==='G47.33'?'data-source-field="icd"':''}><b>${item.code}</b><span>${esc(item.description)}</span>${item.primary?'<em>Primary</em>':''}<button type="button" data-act="remove-icd" data-rx="${rx.id}" data-index="${i}" aria-label="Remove ${item.code}" title="Remove"><i data-lucide="x"></i></button></span>`).join('')||'<span class="dd-empty">No ICD-10 codes yet</span>'}</div>
  <form class="dd-inline-add" data-add-icd="${rx.id}"><i data-lucide="search"></i><input class="dd-input" name="code" list="ddIcd" placeholder="Add an ICD-10 code or diagnosis" aria-label="Add ICD-10 code" autocomplete="off"><button class="dd-btn ghost sm" type="submit"><i data-lucide="plus"></i> Add</button></form></div>`;
}
function itemHtml(rx,item){
  const ref=`${rx.id}|${item.id}`,mapped=item.lines.some(l=>l.ai),docs=docsForItem(rx,item);
  const title=item.bundle?item.name:(mapped||!/^[A-Z]\d{4}$/.test(item.name)?item.name:hcpcsCatalog[item.name]||item.name);
  const aiTag=rx.id==='rx2'&&item.id==='item-1'&&!S.aiReviewed.has('mapping')?'<span class="dd-ai-tag"><i data-lucide="sparkles"></i> AI resolved</span>':'';
  const rows=item.editing
    ?item.lines.map((l,i)=>`<div class="dd-line editing"><input class="dd-input code" list="ddHcpcs" value="${l.code}" placeholder="Code" maxlength="5" aria-label="HCPCS code" data-line="${ref}|${i}" data-line-field="code"><span class="dd-line-desc">${l.code?(hcpcsCatalog[l.code]||'Code not in catalog · verify'):'Enter a HCPCS code'}</span><input class="dd-input qty" type="number" min="1" value="${l.qty}" aria-label="Quantity" data-line="${ref}|${i}" data-line-field="qty"><input class="dd-input freq" value="${esc(l.frequency)}" aria-label="Dispensing frequency" data-line="${ref}|${i}" data-line-field="frequency">${item.lines.length>1?`<button type="button" class="dd-icon-btn" data-act="remove-line" data-ref="${ref}|${i}" aria-label="Remove line" title="Remove"><i data-lucide="x"></i></button>`:'<span></span>'}</div>`).join('')
    :item.lines.map(l=>`<div class="dd-line ${l.code?'':'unmapped'}" ${rx.main&&l.code==='E0601'?'data-source-field="hcpcs"':''}><span class="dd-hcpcs">${l.code||'—'}</span><span class="dd-line-desc">${l.code?(hcpcsCatalog[l.code]||'Code not in catalog · verify'):'No HCPCS match. Select Edit to enter a code.'}${l.ai?'<i data-lucide="sparkles" class="dd-ai-dot" aria-label="AI mapped" title="AI mapped"></i>':''}</span><span class="dd-line-qty">× ${l.qty}</span><span class="dd-line-freq">${esc(l.frequency)}</span></div>`).join('');
  return `<article class="dd-item" id="rx-${rx.id}-${item.id}"><header><div class="dd-item-title"><strong>${esc(title)}</strong><span class="dd-pills">${item.bundle?`<span class="dd-pill muted"><i data-lucide="boxes"></i> Bundle · ${item.lines.length} items</span>`:''}${mapped?'<span class="dd-pill ai"><i data-lucide="sparkles"></i> AI mapped</span>':''}${aiTag}</span></div><button type="button" class="dd-docs-btn" data-act="item-docs" data-ref="${ref}" title="Required documents"><i data-lucide="file-text"></i> ${docs.length} docs</button><button type="button" class="dd-link" data-act="edit-item" data-ref="${ref}">${item.editing?'Done':'Edit'}</button><button type="button" class="dd-icon-btn" data-act="remove-item" data-ref="${ref}" aria-label="Remove item" title="Remove item"><i data-lucide="trash-2"></i></button></header><div class="dd-lines">${rows}</div></article>`;
}
function itemsHtml(rx){
  return `<div class="dd-sub"><span class="dd-sub-title"><i data-lucide="package"></i> Items prescribed <small>${plural(rx.items.length,'item')}</small></span><div class="dd-items">${rx.items.map(item=>itemHtml(rx,item)).join('')||'<p class="dd-empty">No items yet</p>'}</div>
  <form class="dd-inline-add" data-add-item="${rx.id}"><i data-lucide="sparkles"></i><input class="dd-input" name="product" list="ddHcpcs" placeholder="Product name or HCPCS, e.g. CPAP supplies or A7034" aria-label="Add item" autocomplete="off"><button class="dd-btn ghost sm" type="submit"><i data-lucide="plus"></i> Add item</button></form>
  <p class="dd-hint">Type a product name and AI maps it to HCPCS. Kits such as “CPAP supplies” are added as a bundle.</p></div>`;
}
function rxHtml(rx,index){
  const id=rx.main?'prescription-section':`rx-section-${rx.id}`,gaps=rx.main?(/^\d{10}$/.test(S.provider)?0:1):rxGaps(rx);
  const chip=`<span class="dd-status ${gaps?'req':'ok'}"><i data-lucide="${gaps?'circle-alert':'circle-check'}"></i> ${gaps?(rx.main?`${gaps} to resolve`:`${gaps} missing`):'Reviewed'}</span>`;
  return `<section class="dd-card dd-rx" id="${id}" data-rx-section="${rx.id}"><header class="dd-card-head"><span class="dd-card-ico blue"><i data-lucide="notebook-tabs"></i></span><div><h3>${rxTitle(index)}</h3><p>${rx.manual?'Added manually':`<button class="dd-source-btn inline" data-act="open-doc" data-doc="${rx.docId}"><i data-lucide="scan-text"></i> ${rx.source}</button> · signed ${rx.date}`}</p></div>${chip}</header>${physicianHtml(rx)}<div data-icd="${rx.id}">${icdHtml(rx)}</div><div data-items="${rx.id}">${itemsHtml(rx)}</div></section>`;
}
function renderAllRx(){$('#ddRx').innerHTML=prescriptions.map(rxHtml).join('');renderAiSlots();tagSourceFields();icons();}
function refreshRx(rx){const index=prescriptions.indexOf(rx),section=$(`[data-rx-section="${rx.id}"]`);if(!section)return;const focusId=document.activeElement?.dataset?.rxField;section.outerHTML=rxHtml(rx,index);renderAiSlots();if(focusId)$(`[data-rx="${rx.id}"][data-rx-field="${focusId}"]`)?.focus();updateProgress();icons();}
function mapProduct(text){
  const value=text.trim(),code=value.toUpperCase();
  if(/^[A-Z]\d{4}$/.test(code))return {name:code,bundle:false,lines:[line(code,1,'1 per month')]};
  const bundle=bundleRules.find(rule=>rule.match.test(value));
  if(bundle)return {name:value,bundle:true,lines:bundle.lines.map(([c,q,f])=>line(c,q,f,true))};
  const rule=productRules.find(([pattern])=>pattern.test(value));
  return {name:value,bundle:false,lines:[line(rule?rule[1]:'',1,'1 per month',Boolean(rule))]};
}
function openItemDocs(rxId,itemId){
  const rx=rxById(rxId),item=rx.items.find(i=>i.id===itemId);if(!item)return;
  const docs=docsForItem(rx,item);
  $('#ddDocsTitle').textContent=item.bundle||item.lines.some(l=>l.ai)?item.name:`${item.name} · ${hcpcsCatalog[item.name]||''}`;
  $('#ddDocsMeta').textContent=`${rxTitle(prescriptions.indexOf(rx))} · For your information. No action is needed to complete this intake.`;
  $('#ddDocsList').innerHTML=docs.map(doc=>`<div class="dd-fyi ${doc.found?'found':''}"><i data-lucide="${doc.found?'file-check':'file'}"></i><span><strong>${doc.name}${doc.recommended?` <em>Recommended by Medicare · ${doc.recommended}</em>`:''}</strong><small>${esc(doc.status)}</small></span>${doc.found&&doc.docId?`<button type="button" class="dd-link" data-act="view-required" data-doc="${doc.docId}">View</button>`:''}</div>`).join('');
  icons();if(!$('#ddDocsDialog').open)$('#ddDocsDialog').showModal();
}
function addPrescription(){
  const rx={id:`rx${Date.now()}`,docId:'',source:'',date:'',manual:true,physician:{first:'',last:'',npi:'',specialty:'',enrollment:[]},icd:[],items:[]};
  prescriptions.push(rx);
  $('#ddRx').insertAdjacentHTML('beforeend',rxHtml(rx,prescriptions.length-1));icons();
  const section=$(`[data-rx-section="${rx.id}"]`);section.scrollIntoView({behavior:'smooth',block:'start'});
  section.querySelector('input')?.focus({preventScroll:true});
  updateProgress();toast(`${rxTitle(prescriptions.length-1)} added`);
}

// Prior authorization — a timeline shows how much of the rental the authorization covers.
const toDate=value=>{const [m,d,y]=value.split('/').map(Number);return new Date(y,m-1,d);};
function paTimeline(pa){
  if(!pa.from||!pa.to)return '';
  const start=toDate(pa.from),end=toDate(pa.to),rentalEnd=pa.rentalEnd?toDate(pa.rentalEnd):end;
  const span=Math.max(1,rentalEnd-start),covered=Math.min(100,Math.round((end-start)/span*100));
  return `<div class="dd-timeline ${pa.gap&&!S.authAck?'gap':''}"><div class="dd-track"><span class="dd-covered" style="width:${covered}%"></span>${covered<100?`<span class="dd-uncovered" style="width:${100-covered}%"></span>`:''}</div><div class="dd-track-labels"><span>${pa.from}</span>${covered<100?`<span style="left:${covered}%">Auth ends ${pa.to}</span><span>Rental ends ${pa.rentalEnd}</span>`:`<span>${pa.to}</span>`}</div></div>`;
}
function paHtml(pa){
  return `<article class="dd-pa" id="pa-${pa.id}"><header><span class="dd-hcpcs">${pa.code}</span><div><strong>${esc(hcpcsCatalog[pa.code]||'HCPCS '+pa.code)}</strong><small>${esc(pa.number)} · ${esc(pa.payer)}</small></div>${pa.added?'<span class="dd-pill muted">Added by you</span>':''}<button type="button" class="dd-icon-btn" data-act="remove-pa" data-id="${pa.id}" aria-label="Remove prior authorization" title="Remove"><i data-lucide="trash-2"></i></button></header>
  ${paTimeline(pa)}
  <div class="dd-fields">${[['Authorization number',pa.number],['Payer',pa.payer],['Effective date',`${pa.from||'—'} – ${pa.to||'—'}`],['Quantity/Amount',pa.qty||'—'],['Dispensing frequency',pa.frequency||'—']].map(([label,value])=>`<div class="dd-field"><span class="dd-field-label">${label}</span><strong>${esc(value)}</strong></div>`).join('')}</div>
  ${pa.gap?`<div class="dd-callout ${S.authAck?'ok':'warn'}" id="authExpiry"><i data-lucide="${S.authAck?'circle-check':'calendar-clock'}"></i><span>${S.authAck?'<b>Acknowledged.</b> The 7-month gap is noted on this intake.':'<b>7 months not covered.</b> Request an extension from Aetna before 04/15/2027, or acknowledge to continue.'}</span>${S.authAck?'':'<button class="dd-btn primary sm" data-act="auth-ack">Acknowledge</button>'}</div>`:''}</article>`;
}
function renderPriorAuths(){
  $('#ddPaList').innerHTML=priorAuthList.length?priorAuthList.map(paHtml).join(''):'<p class="dd-empty">No prior authorizations on file.</p>';
  $('#ddPaMeta').textContent=plural(priorAuthList.length,'authorization');icons();
}
function togglePaForm(open){
  const form=$('#ddPaForm');form.hidden=!open;$('#ddPaToggle').hidden=open;
  if(open){form.reset();$('#ddPaError').hidden=true;form.querySelectorAll('.invalid').forEach(field=>field.classList.remove('invalid'));$('#ddPaPayer').innerHTML=insurancePlans.map(plan=>`<option>${esc(plan.name)}</option>`).join('');form.code.focus();}
}

// Review checklist (left) + progress
function renderChecklist(){
  const items=reviewItems(),required=items.filter(item=>item.severity==='missing'),warnings=items.filter(item=>item.severity!=='missing');
  const aiOpen=aiResolvedFields.filter(item=>!S.aiEdited.has(item.key)&&!S.aiReviewed.has(item.key));
  const total=required.length+warnings.length+aiOpen.length;
  const state=required.length?'req':total?'opt':'done';
  $('#ddChecklistHead').className=`dd-checklist-head ${state}`;
  $('#ddChecklistHead').innerHTML=`<span class="dd-big-num">${required.length||total||'<i data-lucide="check"></i>'}</span><div><strong>${required.length?`${required.length} must-fix ${required.length===1?'item':'items'}`:total?'Required info complete':'Everything reviewed'}</strong><small>${required.length?`plus ${total-required.length} optional checks`:total?`${total} optional ${total===1?'check':'checks'} left`:'Select Looks good to finish'}</small></div>`;
  const row=(item,kind)=>{const done=kind==='ai'&&(S.aiEdited.has(item.key)||S.aiReviewed.has(item.key));return `<button class="dd-todo ${kind} ${done?'done':''}" data-act="jump-review" data-target="${item.id}" ${kind==='ai'?`data-key="${item.key}"`:''}><span class="dd-todo-box">${done?'<i data-lucide="check"></i>':`<i data-lucide="${item.icon||(kind==='req'?'circle-alert':kind==='ai'?'sparkles':'triangle-alert')}"></i>`}</span><span class="dd-todo-copy"><b>${item.label}</b><small>${item.section} · ${item.detail}</small></span><i data-lucide="arrow-up-right" class="dd-todo-go"></i></button>`;};
  $('#ddTodos').innerHTML=(required.length?`<div class="dd-todo-group"><span class="dd-group-title req">Must fix</span>${required.map(item=>row(item,'req')).join('')}</div>`:'')
    +(warnings.length?`<div class="dd-todo-group"><span class="dd-group-title warn">Worth a look</span>${warnings.map(item=>row(item,'warn')).join('')}</div>`:'')
    +`<div class="dd-todo-group"><span class="dd-group-title ai">AI decisions · ${aiResolvedFields.length-aiOpen.length}/${aiResolvedFields.length} checked</span>${aiResolvedFields.map(item=>row(item,'ai')).join('')}</div>`;
  $('#ddSectionNav').innerHTML=sectionsMeta.map(section=>{const status=sectionStatus(section.id);return `<button class="dd-nav-link" data-act="jump" data-target="${section.id}"><span class="dd-dot ${status.tone}"></span>${section.label}<small>${status.tone==='ok'?'':status.text}</small></button>`;}).join('');
  icons();
}
function updateProgress(){
  if(!S.reviewBuilt)return;
  const reviewed=42-issueCount(),required=requiredItems().length,pct=Math.round(reviewed/42*100);
  $('#ddRing').style.setProperty('--p',pct);
  $('#ddRingValue').textContent=reviewed;
  $$('[data-status]').forEach(slot=>{slot.innerHTML=statusChip(slot.dataset.status);});
  const ready=$('#ddReady');ready.hidden=required>0;
  if(!required)$('#ddReadyText').textContent=`${S.patientLinked?'Existing patient linked':'Patient record ready'}, insurance verified, prescriptions attached and documents stored.`;
  renderChecklist();renderDock();icons();
}
function flash(element){if(!element)return;element.classList.remove('dd-flash');void element.offsetWidth;element.classList.add('dd-flash');}

// Source lens (right)
function setSource(open){S.sourceOpen=open;$('#ddReviewGrid').classList.toggle('source-closed',!open);$('#ddSourceRail').hidden=open;}
function setListMode(mode){S.listMode=mode;$$('[data-list-mode]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.listMode===mode));renderFiles();}
function updateSourceCount(){const n=viewerFiles().length;$('#ddFileCount').textContent=n;$('#ddRailCount').textContent=n;}
function renderFiles(){
  if(!$('#ddFiles'))return;
  const files=viewerFiles(),uploaded=files.filter(file=>!existingFiles.includes(file)),existing=files.filter(file=>existingFiles.includes(file));
  const item=file=>{const isExisting=existingFiles.includes(file);return `<div class="dd-file ${file.id===S.selected?'active':''}" data-file="${file.id}"><button class="dd-file-main" data-act="open-doc" data-doc="${file.id}"><span class="dd-file-thumb"><img src="${imageFor(file)}" alt=""></span><span class="dd-file-copy"><strong title="${esc(file.name)}">${esc(file.name)}</strong><small>${esc(file.meta||file.type||'')}</small></span></button>${isExisting?`<button class="dd-use ${file.used?'on':''}" data-act="use-existing" data-id="${file.id}" aria-pressed="${file.used}">${file.used?'<i data-lucide="check"></i> In intake':'Use'}</button>`:''}</div>`;};
  $('#ddFiles').className=`dd-files ${S.listMode}`;
  $('#ddFiles').innerHTML=`<span class="dd-files-label">Uploaded · ${uploaded.length}</span>${uploaded.map(item).join('')}${existing.length?`<span class="dd-files-label">In patient record · ${existing.length}</span>${existing.map(item).join('')}`:''}`;
  updateSourceCount();icons();
  if(hover.field)markFiles();
}
function renderDocMenu(){
  const files=viewerFiles();
  $('#ddDocMenu').innerHTML=files.map(file=>`<button class="dd-menu-opt ${file.id===S.selected?'on':''}" role="option" aria-selected="${file.id===S.selected}" data-act="menu-doc" data-doc="${file.id}"><i data-lucide="${file.icon||'file-text'}"></i><span><strong>${esc(file.name)}</strong><small>${esc(file.meta||'')}</small></span>${file.id===S.selected?'<i data-lucide="check" class="dd-menu-check"></i>':''}</button>`).join('');icons();
}
function setDocMenu(open){$('#ddDocMenu').hidden=!open;$('#ddDocTrigger').setAttribute('aria-expanded',open);if(open){renderDocMenu();$('#ddDocMenu .on')?.focus();}}
function openDocument(id,reveal=false){
  const retained=id==='consent'?{id:'consent',name:'Consent Form.pdf',meta:'Existing file · Extracted previously',icon:'file-signature'}:null;
  const doc=S.docs.find(item=>item.id===id)||existingFiles.find(item=>item.id===id)||retained||S.docs[0];if(!doc)return;
  S.selected=doc.id;
  $('#ddDocName').textContent=doc.name;$('#ddDocTrigger').title=doc.name;
  $('#ddDocMeta').textContent=(doc.size||doc.meta||'').includes('page')?(doc.size||doc.meta).split(' · ')[0]:'Page 1';
  $('#ddDocImg').src=imageFor(doc);$('#ddDocImg').alt=`${doc.name} preview`;
  if(reveal&&!S.sourceOpen)setSource(true);
  renderFiles();drawMarks();
  const lens=$('#ddLens');lens.classList.remove('changed');requestAnimationFrame(()=>lens.classList.add('changed'));
}
const hover={field:null,timer:null,clear:null};
const locations=field=>viewerFiles().filter(file=>sourceBoxes[file.id]?.[field]);
function tagSourceFields(){/* source fields are tagged in the markup */}
function drawMarks(){
  const field=hover.field,box=field&&sourceBoxes[S.selected]?.[field],layer=$('#ddMarks');
  if(!box){layer.innerHTML='';return;}
  const [x,y,w,h]=box,pad=4,conflict=sourceConflicts[field]?.[S.selected];
  layer.innerHTML=`<span class="dd-mark ${conflict?'conflict':''}" style="left:${(x-pad)/sourcePage.width*100}%;top:${(y-pad)/sourcePage.height*100}%;width:${(w+pad*2)/sourcePage.width*100}%;height:${(h+pad*2)/sourcePage.height*100}%"><em>${conflict?`Different value · ${conflict}`:sourceFieldLabels[field]||'Source'}</em></span>`;
  const stage=$('#ddPreview'),top=y/sourcePage.height*$('#ddDocImg').clientHeight;
  if(top<stage.scrollTop+24||top>stage.scrollTop+stage.clientHeight-48)stage.scrollTo({top:Math.max(0,top-stage.clientHeight/3),behavior:'smooth'});
}
function markFiles(){
  const field=hover.field,files=field?locations(field):[];
  $$('[data-file]').forEach(el=>el.classList.toggle('match',files.some(file=>file.id===el.dataset.file)));
  const bar=$('#ddMatches');
  if(!field){bar.hidden=true;return;}
  bar.hidden=false;
  bar.innerHTML=files.length?`<span><i data-lucide="scan-search"></i> ${sourceFieldLabels[field]||'Field'} found in ${plural(files.length,'document')}</span><span class="dd-match-chips">${files.map(file=>{const conflict=sourceConflicts[field]?.[file.id];return `<button class="dd-mchip ${file.id===S.selected?'on':''} ${conflict?'conflict':''}" data-act="match-doc" data-doc="${file.id}" title="${conflict?`Shows ${conflict}`:esc(file.name)}">${conflict?'<i data-lucide="triangle-alert"></i>':''}${esc(file.name)}</button>`;}).join('')}</span>`:`<span class="muted"><i data-lucide="search-x"></i> ${sourceFieldLabels[field]||'This field'} isn’t in the uploaded documents</span>`;
  icons();
}
function showFieldSource(field){
  clearTimeout(hover.timer);clearTimeout(hover.clear);
  if(S.stage!=='review'||!S.sourceOpen)field=null;
  hover.field=field;
  $$('.dd-field.hovering,.dd-code.hovering,.dd-line.hovering').forEach(el=>el.classList.remove('hovering'));
  if(field)$$(`[data-source-field="${field}"]`).forEach(el=>el.classList.add('hovering'));
  markFiles();drawMarks();
  if(!field)return;
  const files=locations(field);
  // Short hover intent so the preview doesn't flicker while the pointer passes over fields.
  if(files.length&&!files.some(file=>file.id===S.selected))hover.timer=setTimeout(()=>{if(hover.field===field){openDocument(files[0].id);markFiles();}},220);
}
const scheduleClear=()=>{clearTimeout(hover.clear);hover.clear=setTimeout(()=>showFieldSource(null),700);};

// ---------- 5. Complete ----------
function buildSummary(){
  const codes=prescriptions.flatMap(rx=>rx.items.flatMap(item=>item.lines.map(l=>l.code))).filter(Boolean);
  const hasPap=codes.includes('E0601'),hasOxygen=codes.some(c=>/^E139|^E04/.test(c));
  const list=items=>items.length<2?items.join(''):`${items.slice(0,-1).join(', ')} and ${items[items.length-1]}`;
  const dx=[...new Set(prescriptions.map(rx=>rx.icd.find(c=>c.primary)?.description).filter(Boolean).map(d=>d.replace(/ \(adult\)/,'').toLowerCase()))];
  const therapy=[hasPap&&'CPAP therapy',hasOxygen&&'home oxygen'].filter(Boolean);
  const doctors=prescriptions.map(rx=>{const last=rx.main?S.values.physician:rx.physician.last;return last?`Dr. ${rx.physician.first} ${last}`:'';}).filter(Boolean);
  const s1=`${postIntakeRecommendation.patient}, ${S.patientLinked?'an existing patient':'a new patient'}, is starting ${list(therapy)||'DME therapy'}${dx.length?` for ${list(dx)}`:''}${doctors.length?`, prescribed by ${list(doctors)}`:''}.`;
  const ranks=insurancePlans.map((plan,i)=>`${plan.name}${i===0?' is primary':` ${planRank(i).toLowerCase()}`}`);
  const shortName={E0601:'the CPAP',E0562:'the humidifier',E1390:'the oxygen concentrator',E1392:'the portable concentrator'};
  const paItems=[...new Set(priorAuthList.map(pa=>shortName[pa.code]||pa.code))];
  const s2=`${ranks[0]||'No insurance is on file'}${ranks.length>1?`, with ${list(ranks.slice(1))}`:''}.${paItems.length?` Prior authorization is on file for ${list(paItems)}.`:''}`;
  const watch=['the face-to-face note is unsigned'];
  if(hasOxygen)watch.push('oxygen test results weren’t uploaded');
  if(priorAuthList.some(pa=>pa.gap))watch.push('the CPAP authorization ends before the rental does');
  return {title:`New ${list(therapy)||'DME'} intake`,context:`${S.patientLinked?'Existing patient':'New patient'} · ${plural(prescriptions.length,'prescription')}`,lead:`${s1} ${s2} Before ordering, note that ${list(watch)}.`,watch};
}
function renderComplete(){
  const summary=buildSummary(),rec=postIntakeRecommendation;
  $('#ddDoneName').textContent=rec.patient;
  $('#ddDoneContext').textContent=summary.context;
  $('#ddSummaryTitle').textContent=summary.title;
  $('#ddSummaryText').textContent=summary.lead;
  $('#ddWatch').innerHTML=summary.watch.map(item=>`<li><i data-lucide="eye"></i>${esc(item.charAt(0).toUpperCase()+item.slice(1))}</li>`).join('');
  $('#ddNextReason').textContent=rec.reason;
  const recoList=items=>items.map(item=>`<li><span class="dd-reco-ico"><i data-lucide="sparkles"></i></span><span><b>${esc(item.name)}</b><small>${esc(item.reason)}</small></span></li>`).join('');
  $('#ddRecoServices').innerHTML=recoList(rec.services);$('#ddRecoDme').innerHTML=recoList(rec.dme);
  $('#ddDoneNote').textContent=rec.note;
  icons();
}
function confetti(){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const layer=$('#ddConfetti'),colors=['#4F46E5','#8B5CF6','#06B6D4','#22C55E','#F59E0B','#F43F5E'];
  layer.innerHTML=Array.from({length:90},(_,i)=>`<span style="--x:${Math.random()*100}vw;--d:${(Math.random()*0.8+1.4).toFixed(2)}s;--delay:${(Math.random()*0.4).toFixed(2)}s;--r:${Math.round(Math.random()*720-360)}deg;--c:${colors[i%colors.length]};--w:${Math.round(Math.random()*6+6)}px"></span>`).join('');
  setTimeout(()=>{layer.innerHTML='';},2800);
}
function snapshot(){
  return {
    id:INTAKE_ID,completed:'Oct 15, 2026',
    patient:{first:'Ashlynn',middle:'',last:'Botosh',dob:S.values.dob,gender:'Female',phone:S.values.mobile,home:'(206) 555-0142',email:'ashlynn.botosh@email.com',address:'1234 Healthways Blvd, Suite 200',city:'Seattle',state:'WA',zip:'98101',county:'King',mrn:'PT-10482'},
    prescriptions:prescriptions.map((rx,i)=>({title:rxTitle(i),source:rx.source||'Added manually',date:rx.date,physician:`${rx.physician.first} ${rx.main?S.values.physician:rx.physician.last}`.trim(),npi:rx.main?S.provider:rx.physician.npi,specialty:rx.physician.specialty,
      icd:rx.icd.map(c=>({code:c.code,description:c.description,primary:Boolean(c.primary)})),
      items:rx.items.map(item=>({name:item.bundle||item.lines.some(l=>l.ai)||!/^[A-Z]\d{4}$/.test(item.name)?item.name:(hcpcsCatalog[item.name]||item.name),bundle:Boolean(item.bundle),lines:item.lines.filter(l=>l.code).map(l=>({code:l.code,description:hcpcsCatalog[l.code]||'',qty:l.qty,frequency:l.frequency}))}))})),
    insurance:insurancePlans.map((plan,i)=>({rank:planRank(i),name:plan.name,memberId:memberId(plan),group:planField(plan,'Group number'),status:plan.eligibility})),
    priorAuths:priorAuthList.map(pa=>({code:pa.code,number:pa.number,payer:pa.payer,from:pa.from,to:pa.to,qty:pa.qty,frequency:pa.frequency})),
    documents:viewerFiles().map(file=>file.name),
    note:$('#ddNote')?.value||'',precheck:null
  };
}
function createOrder(precheck){
  const data=snapshot();if(precheck)data.precheck=precheck;
  try{sessionStorage.setItem('signeticIntakeOrder',JSON.stringify(data));}catch(error){}
  location.href='dme-order.html';
}

// ---------- 6. Pre-check — a board of items sorted by result ----------
const supplyLimits={A7030:'1 per 3 months',A7031:'1 per month',A7034:'1 per 3 months',A7035:'1 per 6 months',A7036:'1 per 6 months',A7037:'1 per 3 months',A7038:'2 per month',A7039:'1 per 6 months'};
const allowable={E0601:'$85.00 / month (rental)',E0562:'$18.00 / month (rental)',A7030:'$165.00',A7031:'$60.00',A7035:'$38.00',A7037:'$32.00',A7038:'$6.00',E1390:'$195.00 / month (rental)'};
const papCodes=/^(E0601|E0562|A70)/,oxygenSupply=/^A461/;
function evaluate(lineItem,rx,intake){
  const code=lineItem.code,checks=[],physicianOk=Boolean(rx.npi),plan=intake.insurance[0]||{name:'Primary payer'};
  const pa=intake.priorAuths.find(item=>item.code===code),hasDoc=pattern=>intake.documents.some(name=>pattern.test(name));
  const icdList=rx.icd.map(c=>`<li><i data-lucide="check"></i><b>${c.code}</b> ${esc(c.description)}${c.primary?' <em>Primary</em>':''}</li>`).join('');
  if(code==='E0601')checks.push({key:'medical',label:'Medical criteria',status:'pass',summary:'AHI 18.4 meets ≥ 15 threshold',body:`<h5>ICD-10 codes</h5><ul class="dd-icd">${icdList}</ul><details class="dd-more"><summary>Medicare criteria · LCD L33718</summary><div><p><b>Initial coverage (12 weeks)</b> for obstructive sleep apnea when:</p><ol><li>An in-person clinical evaluation happens before the sleep test.</li><li>A qualifying sleep test shows AHI/RDI ≥ 15 events/hour (minimum 30 events), or AHI/RDI 5–14 with documented symptoms or conditions such as excessive daytime sleepiness, hypertension or ischemic heart disease.</li><li>The beneficiary or caregiver is instructed on proper use.</li></ol><p><b>Continued coverage beyond 3 months</b> needs a clinical re-evaluation between days 31 and 91 showing improved symptoms and adherence of ≥ 4 hours/night on 70% of nights in a consecutive 30-day period.</p><p><b>Coding:</b> append modifier KX when criteria are met.</p></div></details>`});
  else if(papCodes.test(code))checks.push({key:'medical',label:'Medical criteria',status:'pass',summary:'Follows E0601 qualification',body:`<p>PAP accessories are covered when the PAP device (E0601) meets coverage criteria.</p><h5>ICD-10 codes</h5><ul class="dd-icd">${icdList}</ul>`});
  else if(code==='E1390')checks.push({key:'medical',label:'Medical criteria',status:'fail',summary:'No qualifying oxygen test found',action:'Upload oximetry or blood gas results from within 30 days before the order.',body:`<h5>ICD-10 codes</h5><ul class="dd-icd">${icdList}</ul><details class="dd-more" open><summary>Medicare criteria · LCD L33797</summary><div><p>Home oxygen is covered when a qualifying test (arterial blood gas or oximetry) taken within 30 days before the initial order shows, for example, SpO2 ≤ 88% at rest, during exercise, or during sleep for at least 5 minutes, along with a qualifying diagnosis.</p></div></details>`});
  else checks.push({key:'medical',label:'Medical criteria',status:'pass',summary:'Follows E1390 qualification',body:'<p>Oxygen accessories follow the qualification of the oxygen equipment.</p>'});
  const limit=supplyLimits[code];
  checks.push({key:'dispensing',label:'Quantity & frequency',status:'pass',summary:limit?`Within Medicare limit (${limit})`:/rental/i.test(lineItem.frequency)?`${lineItem.frequency.replace('Monthly rental ×','Monthly rental,')}${/×/.test(lineItem.frequency)?' months':''}`:'Within allowed quantity',body:`<dl class="dd-kv"><div><dt>Prescribed</dt><dd>Qty ${lineItem.qty} · ${esc(lineItem.frequency)}</dd></div><div><dt>Medicare allows</dt><dd>${esc(limit||(code==='E0601'?'1 device · 13-month capped rental':code==='E1390'?'1 concentrator · 36-month rental cap':'As prescribed'))}</dd></div></dl>`});
  checks.push({key:'same',label:'Same & similar',status:'pass',summary:papCodes.test(code)&&code.startsWith('E')?'No active equipment in last 5 years':'No duplicate in current period',body:`<dl class="dd-kv"><div><dt>Previous ${code} found</dt><dd>No</dd></div><div><dt>Active rental</dt><dd>No</dd></div><div><dt>Similar equipment</dt><dd>None identified</dd></div></dl><p class="dd-hint">Checked against Signetic records. For Medicare, confirm in the payer portal.</p>`});
  checks.push({key:'physician',label:'Physician enrollment',status:physicianOk?'pass':'warn',summary:physicianOk?`Dr. ${rx.physician.split(' ').pop()} is PECOS active`:'NPI missing · PECOS not verified',action:physicianOk?'':'Add the physician’s NPI in the intake to verify PECOS enrollment.',body:`<dl class="dd-kv"><div><dt>Physician</dt><dd>Dr. ${esc(rx.physician)}</dd></div><div><dt>NPI</dt><dd>${esc(rx.npi||'Not provided')}</dd></div><div><dt>PECOS</dt><dd>${physicianOk?'Active':'Not verified'}</dd></div><div><dt>Enrolled for</dt><dd>DME · Part B</dd></div></dl>`});
  const docs=[{name:'Standard written order',ok:true,file:rx.source}];
  if(code==='E0601'||code==='E1390')docs.push({name:'Face-to-face evaluation',ok:code!=='E0601',warn:code==='E0601',file:code==='E0601'?'Face-to-Face Notes.pdf · not signed':'Face-to-Face Notes.pdf'});
  if(code==='E0601')docs.push({name:'Sleep study',ok:true,file:hasDoc(/sleep/i)?'Sleep Study.pdf':'Sleep Study · Aug 2022.pdf'});
  if(code==='E1390')docs.push({name:'Oxygen qualifying test',ok:false,file:'Not found'});
  if(pa)docs.push({name:'Prior authorization',ok:true,file:`${pa.number} · ${pa.payer}`});
  const docFail=docs.some(d=>!d.ok&&!d.warn),docWarn=docs.some(d=>d.warn);
  checks.push({key:'documents',label:'Documents',status:docFail?'fail':docWarn?'warn':'pass',summary:docFail?`${docs.filter(d=>!d.ok&&!d.warn).length} required document missing`:docWarn?'Face-to-face note not signed':`${docs.length} of ${docs.length} on file`,action:docFail?'Upload the oxygen qualifying test results.':docWarn?`Request a signed, dated face-to-face note from Dr. ${rx.physician.split(' ').pop()}.`:'',body:`<ul class="dd-docs">${docs.map(d=>`<li class="${d.ok?'ok':d.warn?'warn':'bad'}"><i data-lucide="${d.ok?'file-check':d.warn?'file-warning':'file-x'}"></i><span><b>${d.name}</b><small>${esc(d.file)}</small></span></li>`).join('')}</ul>`});
  if(oxygenSupply.test(code))checks.push({key:'payer',label:'Payer coverage',status:'fail',summary:'Included in E1390 rental',action:'Don’t bill separately. Supply it with the concentrator at no charge.',body:`<p>${esc(plan.name)} includes oxygen accessories such as cannulas and tubing in the monthly payment for the oxygen concentrator (E1390). They aren’t payable as separate items.</p>`});
  else if(code==='E0601'&&pa)checks.push({key:'payer',label:'Payer coverage',status:'warn',summary:'Covered · authorization ends early',action:`Request an extension of ${pa.number} before ${pa.to}.`,body:`<dl class="dd-kv"><div><dt>Coverage</dt><dd>${esc(plan.name)} · 13-month capped rental</dd></div><div><dt>Allowable</dt><dd>${allowable.E0601}</dd></div><div><dt>Patient responsibility</dt><dd>20% coinsurance after deductible</dd></div><div><dt>Prior authorization</dt><dd>${esc(pa.number)} · ends ${esc(pa.to)}, 7 months before the rental ends</dd></div></dl>`});
  else if(code==='E1390')checks.push({key:'payer',label:'Payer coverage',status:'warn',summary:'Covered once medically qualified',action:'Coverage depends on the qualifying oxygen test.',body:`<dl class="dd-kv"><div><dt>Coverage</dt><dd>${esc(plan.name)} · monthly rental, 36-month cap</dd></div><div><dt>Allowable</dt><dd>${allowable.E1390}</dd></div><div><dt>Prior authorization</dt><dd>${pa?`${esc(pa.number)} · ${esc(pa.from)} – ${esc(pa.to)}`:'Not on file'}</dd></div></dl>`});
  else{const rental=code==='E0562';checks.push({key:'payer',label:'Payer coverage',status:'pass',summary:rental?'Covered · rental with E0601':'Covered · purchase',body:`<dl class="dd-kv"><div><dt>Coverage</dt><dd>${esc(plan.name)} · ${rental?'rental billed with E0601':'purchase'}</dd></div><div><dt>Allowable</dt><dd>${allowable[code]||'See fee schedule'}</dd></div><div><dt>Patient responsibility</dt><dd>20% coinsurance after deductible</dd></div></dl>`});}
  const status=checks.some(c=>c.status==='fail')?'fail':checks.some(c=>c.status==='warn')?'warn':'pass';
  const recommended=code==='E0601'?[{name:'Chinstrap (A7036)',why:'Consider if the patient breathes through the mouth.'},{name:'Non-disposable filter (A7039)',why:'Often dispensed with the device; 1 per 6 months.'}]:[];
  return {...lineItem,rx,checks,status,recommended};
}
const pcText={pass:'Qualified',warn:'Needs attention',fail:'Not qualified'};
const pcIcon={pass:'circle-check',warn:'triangle-alert',fail:'circle-x'};
function pcCounts(){const items=S.pc.items;return {all:items.length,pass:items.filter(i=>i.status==='pass').length,warn:items.filter(i=>i.status==='warn').length,fail:items.filter(i=>i.status==='fail').length};}
function enterPrecheck(){
  const intake=snapshot();S.pc.intake=intake;
  S.pc.items=intake.prescriptions.flatMap(rx=>rx.items.flatMap(item=>item.lines.map(lineItem=>evaluate(lineItem,rx,intake))));
  S.pc.items.forEach((item,i)=>{item.id=i;});
  S.pc.selected=Math.max(0,S.pc.items.findIndex(item=>item.status!=='pass'));S.pc.filter='all';
  $('#ddPcPatient').textContent=`${intake.patient.first} ${intake.patient.last} · ${intake.insurance[0]?.name||'No insurance'} · DOB ${intake.patient.dob}`;
  renderPrecheck();
}
function renderPrecheck(){
  const n=pcCounts();
  $('#ddPcStats').innerHTML=[['all','Total items','list'],['fail','Not qualified','circle-x'],['warn','Needs attention','triangle-alert'],['pass','Qualified','circle-check']].map(([key,label,icon])=>`<button class="dd-stat ${key} ${S.pc.filter===key?'on':''}" data-act="pc-filter" data-filter="${key}" aria-pressed="${S.pc.filter===key}"><i data-lucide="${icon}"></i><b>${String(n[key]).padStart(2,'0')}</b><span>${label}</span></button>`).join('');
  $('#ddBoard').innerHTML=['fail','warn','pass'].map(status=>{const items=S.pc.items.filter(item=>item.status===status),dim=S.pc.filter!=='all'&&S.pc.filter!==status;return `<section class="dd-col ${status} ${dim?'dim':''}"><header><i data-lucide="${pcIcon[status]}"></i><strong>${pcText[status]}</strong><span>${items.length}</span></header><div class="dd-col-body">${items.map(item=>{const issues=item.checks.filter(c=>c.status!=='pass').length;return `<button class="dd-pc-card ${S.pc.selected===item.id?'on':''}" data-act="pc-item" data-id="${item.id}" aria-current="${S.pc.selected===item.id}"><span class="dd-pc-top"><span class="dd-hcpcs">${item.code}</span><small>${esc(item.rx.title)}</small></span><strong>${esc(item.description)}</strong><span class="dd-pc-meter">${item.checks.map(c=>`<span class="${c.status}"></span>`).join('')}</span><small>${issues?`${issues} of ${item.checks.length} checks need attention`:`All ${item.checks.length} checks passed`}</small></button>`;}).join('')||'<p class="dd-empty">Nothing here</p>'}</div></section>`;}).join('');
  renderPcDetail();renderDock();icons();
}
function renderPcDetail(){
  const item=S.pc.items[S.pc.selected];if(!item)return;
  const issues=item.checks.filter(c=>c.status!=='pass');
  $('#ddPcDetail').innerHTML=`<header class="dd-pcd-head ${item.status}"><span class="dd-pc-badge"><i data-lucide="${pcIcon[item.status]}"></i> ${pcText[item.status]}</span><h2><span class="dd-hcpcs lg">${item.code}</span>${esc(item.description)}</h2><p>${esc(item.rx.title)} · Dr. ${esc(item.rx.physician)} · Qty ${item.qty} · ${esc(item.frequency)}</p></header>
  ${issues.length?`<section class="dd-pcd-todo ${item.status}"><h3>${item.status==='fail'?'Why it doesn’t qualify':'What needs attention'}</h3>${issues.map(c=>`<button class="dd-pcd-issue ${c.status}" data-act="pc-jump" data-key="${c.key}"><i data-lucide="${pcIcon[c.status]}"></i><span><b>${c.label}:</b> ${esc(c.summary)}${c.action?`<small>${esc(c.action)}</small>`:''}</span><i data-lucide="chevron-right" class="go"></i></button>`).join('')}</section>`:`<section class="dd-pcd-todo pass"><h3><i data-lucide="party-popper"></i> All ${item.checks.length} checks passed</h3><p>Nothing to resolve for this item. Expand any check below to see the details.</p></section>`}
  <div class="dd-pcd-checks">${item.checks.map(c=>{const open=c.status!=='pass'||S.pc.open.has(`${item.id}-${c.key}`);return `<section class="dd-pcd-check ${c.status}" id="pc-check-${c.key}"><button class="dd-pcd-check-head" data-act="pc-toggle" data-key="${c.key}" aria-expanded="${open}"><i data-lucide="${pcIcon[c.status]}" class="st"></i><span><b>${c.label}</b><small>${esc(c.summary)}</small></span><span class="dd-mini ${c.status}">${c.status==='pass'?'Pass':c.status==='warn'?'Review':'Fail'}</span><i data-lucide="chevron-down" class="chev"></i></button><div class="dd-pcd-body" ${open?'':'hidden'}>${c.body}${c.action?`<p class="dd-pcd-action"><i data-lucide="arrow-right"></i> ${esc(c.action)}</p>`:''}</div></section>`;}).join('')}</div>
  ${item.recommended.length?`<section class="dd-pcd-reco"><h3><i data-lucide="sparkles"></i> Other items to consider <span>AI suggestion · review required</span></h3><ul>${item.recommended.map(r=>`<li><b>${esc(r.name)}</b><small>${esc(r.why)}</small></li>`).join('')}</ul></section>`:''}`;
  $('#ddPcDetail').scrollTop=0;icons();
}
function precheckForOrder(){
  const n=pcCounts(),parts=[];
  if(n.pass)parts.push(`${n.pass} qualified`);if(n.warn)parts.push(`${n.warn} need${n.warn===1?'s':''} attention`);if(n.fail)parts.push(`${n.fail} not qualified`);
  return {summary:parts.join(' · '),at:'just now',results:S.pc.items.map(i=>({status:i.status,title:`${i.code} · ${i.description}`,detail:i.status==='pass'?'All checks passed':i.checks.filter(c=>c.status!=='pass').map(c=>c.summary).join(' · ')}))};
}

// ---------- Events ----------
document.addEventListener('click',event=>{
  const el=event.target.closest('[data-act]');if(!el||el.disabled)return;
  const act=el.dataset.act,id=el.dataset.id;
  switch(act){
    // journey
    case 'go':if(el.dataset.stage==='review'){setStage('review');}else setStage(el.dataset.stage);return;
    // upload
    case 'browse':event.preventDefault();addDemoUploads();return;
    case 'remove-doc':{const index=S.docs.findIndex(doc=>doc.id===id);const [removed]=S.docs.splice(index,1);if(S.selected===id)S.selected=S.docs[0]?.id||'';if(!S.docs.length)S.knownPatient=null;renderUpload();toast(`${removed.name} removed`);return;}
    case 'cancel-upload':S.docs.length=0;S.selected='';S.knownPatient=null;S.pickerPatient='';renderUpload();toast('Upload cancelled. Documents removed.');return;
    case 'toggle-picker':S.pickerPatient===id?(S.pickerPatient='',renderQueue()):openPicker(id);return;
    case 'toggle-picks':{const patient=intakeQueue.find(item=>item.id===S.pickerPatient);S.pickerSel=S.pickerSel.size?new Set():new Set(patient.documents.filter(file=>!S.docs.some(doc=>doc.id===file.id)).map(file=>file.id));renderQueue();return;}
    case 'add-picks':addPicks();return;
    case 'search-pick':openPicker(id);return;
    case 'extract':startExtraction();return;
    // confirm
    case 'decision':S.confirmStep=id;renderConfirm();return;
    case 'patient-details':S.openDetails.has(id)?S.openDetails.delete(id):S.openDetails.add(id);renderConfirm();return;
    case 'select-patient':selectPatient(id);return;
    case 'new-patient':Object.assign(S,{patientResolved:true,patientLinked:false,patientTitle:'Create a new patient',patientId:'new',patientDetail:'No existing record will be linked',patientChangeable:true,confirmStep:'documents'});renderConfirm();return;
    case 'change-patient':Object.assign(S,{patientResolved:false,patientLinked:false,confirmStep:'patient'});S.recordDecisions.clear();existingFiles.forEach(file=>{if(file.id!=='existing-insurance'&&file.id!=='existing-consent'){file.used=false;file.extracted=false;file.meta='Not extracted yet';}});renderConfirm();return;
    case 'doc-decision':{S.docDecisions.set(id,el.dataset.decision);const steps=decisionSteps(),done=S.docDecisions.size===S.findings.length;if(done&&steps.some(step=>step.id==='record'))S.confirmStep='record';renderConfirm();return;}
    case 'undo-doc':S.docDecisions.delete(id);renderConfirm();return;
    case 'record-decision':{const file=existingFiles.find(item=>item.id===id);S.recordDecisions.set(id,el.dataset.decision);if(el.dataset.decision==='add'){file.used=true;file.meta='Extracting for this intake…';setTimeout(()=>{file.extracted=true;file.meta='Extracted for this intake';if(S.stage==='confirm')renderConfirm();toast(`${file.name} extracted and added`);},900);}renderConfirm();return;}
    case 'record-undo':{const file=existingFiles.find(item=>item.id===id);if(S.recordDecisions.get(id)==='add'){file.used=false;file.extracted=false;file.meta='Not extracted yet';}S.recordDecisions.delete(id);renderConfirm();return;}
    case 'to-review':setStage('review');toast('Review the extracted information.');return;
    // review: AI fields
    case 'ai-ok':S.aiReviewed.add(el.dataset.key);renderAiSlots();updateProgress();toast(`${aiFields[el.dataset.key].label} marked as checked`);return;
    case 'ai-change':S.editingAi=el.dataset.key;renderAiSlots();$('#ddOverride')?.focus();return;
    case 'ai-pick':$('#ddOverride').value=el.dataset.value;return;
    case 'ai-cancel':S.editingAi='';renderAiSlots();return;
    case 'ai-save':{const key=el.dataset.key,value=$('#ddOverride').value.trim();if(!value)return;S.values[key]=value;S.aiEdited.add(key);S.editingAi='';renderAiSlots();updateProgress();if(key==='dob')enterReviewChips();toast(`${aiFields[key].label} updated`);return;}
    case 'jump-review':{const target=$(`#${el.dataset.target}`);if(el.dataset.key&&!S.aiEdited.has(el.dataset.key)){S.aiReviewed.add(el.dataset.key);renderAiSlots();if(el.dataset.key==='coverage')renderInsurance();if(el.dataset.key==='mapping')refreshRx(rxById('rx2'));updateProgress();}const dest=$(`#${el.dataset.target}`)||target;dest?.scrollIntoView({behavior:'smooth',block:'center'});flash(dest);setTimeout(()=>dest?.querySelector('input,select')?.focus({preventScroll:true}),350);return;}
    case 'jump':{const target=$(`#${el.dataset.target}`);target?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    // insurance
    case 'service':S.serviceType=id;renderInsurance();return;
    case 'check-all':checkAll();return;
    case 'plan':renderInsurance(+el.dataset.i);return;
    case 'plan-edit':S.editingPlan=true;renderInsurance();$('[data-plan-field]')?.focus();return;
    case 'plan-cancel':S.editingPlan=false;renderInsurance();return;
    case 'plan-save':{const plan=insurancePlans[S.currentPlan];$$('[data-plan-field]').forEach(input=>{plan.fields[input.dataset.planField][1]=input.value.trim()||'Not provided';});S.editingPlan=false;plan.check=null;renderInsurance();toast(`${plan.name} updated. Check eligibility again for ${S.serviceType}.`);return;}
    case 'plan-check':checkPlan();return;
    case 'plan-response':showResponse(+el.dataset.i);return;
    case 'order':setPlanOrder(orderBy(el.dataset.order==='ai'?'aiRank':'systemRank'),el.dataset.order==='ai'?'AI coverage order applied':'System coverage order applied');return;
    case 'add-plan':openAddPlan();return;
    // prescriptions
    case 'add-rx':addPrescription();return;
    case 'remove-icd':{const rx=rxById(el.dataset.rx),[removed]=rx.icd.splice(+el.dataset.index,1);if(removed.primary&&rx.icd[0])rx.icd[0].primary=true;refreshRx(rx);toast(`${removed.code} removed`);return;}
    case 'edit-item':{const [rxId,itemId]=el.dataset.ref.split('|'),rx=rxById(rxId),item=rx.items.find(x=>x.id===itemId);item.editing=!item.editing;refreshRx(rx);if(item.editing)$(`#rx-${rxId}-${itemId} input`)?.focus();return;}
    case 'item-docs':{const [rxId,itemId]=el.dataset.ref.split('|');openItemDocs(rxId,itemId);return;}
    case 'remove-item':{const [rxId,itemId]=el.dataset.ref.split('|'),rx=rxById(rxId);rx.items=rx.items.filter(x=>x.id!==itemId);refreshRx(rx);toast('Item removed');return;}
    case 'remove-line':{const [rxId,itemId,i]=el.dataset.ref.split('|'),rx=rxById(rxId),item=rx.items.find(x=>x.id===itemId);item.lines.splice(+i,1);if(item.lines.length===1)item.bundle=false;refreshRx(rx);return;}
    case 'view-required':$('#ddDocsDialog').close();openDocument(el.dataset.doc,true);return;
    // prior auth
    case 'auth-ack':S.authAck=true;renderPriorAuths();updateProgress();toast('Authorization gap acknowledged');return;
    case 'remove-pa':{const index=priorAuthList.findIndex(pa=>pa.id===id);const [removed]=priorAuthList.splice(index,1);if(removed.gap)S.authAck=true;renderPriorAuths();prescriptions.forEach(refreshRx);updateProgress();toast(`Prior authorization ${removed.number} removed`);return;}
    case 'pa-form':togglePaForm(true);return;
    case 'pa-cancel':togglePaForm(false);return;
    // source lens
    case 'open-doc':openDocument(el.dataset.doc,true);return;
    case 'menu-doc':setDocMenu(false);openDocument(el.dataset.doc);$('#ddDocTrigger').focus();return;
    case 'match-doc':clearTimeout(hover.clear);openDocument(el.dataset.doc);markFiles();return;
    case 'list-mode':setListMode(el.dataset.listMode);return;
    case 'toggle-source':setSource(!S.sourceOpen);return;
    case 'add-docs':addDemoUploads();return;
    case 'use-existing':{const file=existingFiles.find(item=>item.id===id);file.used=!file.used;if(file.used&&!file.extracted){file.meta='Extracting for this intake…';renderFiles();setTimeout(()=>{file.extracted=true;file.meta='Extracted for this intake';renderFiles();toast(`${file.name} is ready for this intake`);},900);}else{renderFiles();toast(file.used?`${file.name} added to this intake`:`${file.name} removed from this intake`);}return;}
    // complete
    case 'cancel-intake':$('#ddCancelDialog').showModal();return;
    case 'complete':setStage('complete');confetti();toast('Intake completed successfully');return;
    case 'start-precheck':setStage('precheck');return;
    case 'order-direct':createOrder();return;
    // pre-check
    case 'pc-filter':{S.pc.filter=el.dataset.filter;const first=S.pc.items.find(item=>S.pc.filter==='all'||item.status===S.pc.filter);if(first&&S.pc.filter!=='all'&&S.pc.items[S.pc.selected].status!==S.pc.filter)S.pc.selected=first.id;renderPrecheck();return;}
    case 'pc-item':S.pc.selected=+id;renderPrecheck();return;
    case 'pc-toggle':{const key=`${S.pc.selected}-${el.dataset.key}`,body=el.nextElementSibling,open=body.hidden;body.hidden=!open;el.setAttribute('aria-expanded',String(open));open?S.pc.open.add(key):S.pc.open.delete(key);return;}
    case 'pc-jump':{const section=$(`#pc-check-${el.dataset.key}`);section.querySelector('.dd-pcd-body').hidden=false;section.querySelector('.dd-pcd-check-head').setAttribute('aria-expanded','true');section.scrollIntoView({behavior:'smooth',block:'nearest'});flash(section);return;}
    case 'create-order':createOrder(precheckForOrder());return;
  }
});
function enterReviewChips(){if(S.stage==='review')$('#ddReviewChips .dd-chip')&&( $('#ddReviewChips .dd-chip').innerHTML=`<i data-lucide="cake"></i> DOB ${esc(S.values.dob)}`,icons());}

// Upload drop zone and search
$('#ddDrop').addEventListener('click',event=>{event.preventDefault();addDemoUploads();});
$('#ddDrop').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();addDemoUploads();}});
['dragenter','dragover'].forEach(type=>$('#ddDrop').addEventListener(type,event=>{event.preventDefault();$('#ddDrop').classList.add('over');}));
['dragleave','drop'].forEach(type=>$('#ddDrop').addEventListener(type,event=>{event.preventDefault();$('#ddDrop').classList.remove('over');if(type==='drop')addFiles(event.dataTransfer.files);}));
$('#ddSearch').addEventListener('input',renderSearch);
$('#ddSearch').addEventListener('focus',renderSearch);
$('#ddSearch').addEventListener('keydown',event=>{if(event.key==='Escape'){$('#ddSearch').value='';$('#ddSearchResults').hidden=true;$('#ddSearch').blur();}});
document.addEventListener('click',event=>{if(!event.composedPath().some(node=>node.classList?.contains('dd-search-wrap')))$('#ddSearchResults').hidden=true;});
$('#ddQueue').addEventListener('change',event=>{const id=event.target.dataset.pick;if(!id)return;event.target.checked?S.pickerSel.add(id):S.pickerSel.delete(id);renderQueue();});

// Review inputs
$('#ddSections').addEventListener('input',event=>{
  if(event.target.id==='ddNpi'){
    event.target.value=event.target.value.replace(/\D/g,'');S.provider=event.target.value;
    const ok=/^\d{10}$/.test(S.provider),field=$('#providerField');
    field.classList.toggle('done',ok);
    field.querySelector('.dd-req-tag').innerHTML=ok?'<i data-lucide="check"></i> Added':S.provider?'Enter all 10 digits':'<i data-lucide="circle-alert"></i> Required · not found in uploads';
    const chip=$('#prescription-section .dd-card-head .dd-status');chip.className=`dd-status ${ok?'ok':'req'}`;chip.innerHTML=`<i data-lucide="${ok?'circle-check':'circle-alert'}"></i> ${ok?'Reviewed':'1 to resolve'}`;
    if(ok)toast('NPI added');
    updateProgress();
  }
});
$('#ddSections').addEventListener('submit',event=>{
  event.preventDefault();
  const form=event.target;
  if(form.id==='ddPaForm'){
    const required=[form.code,form.number,form.payer];
    required.forEach(field=>field.classList.toggle('invalid',!field.value.trim()));
    if(required.some(field=>!field.value.trim())){$('#ddPaError').hidden=false;return;}
    const pa={id:`pa${Date.now()}`,code:form.code.value.trim().toUpperCase(),number:form.number.value.trim(),payer:form.payer.value,from:formatDate(form.from.value),to:formatDate(form.to.value),qty:form.qty.value.trim(),frequency:form.frequency.value.trim(),added:true};
    priorAuthList.push(pa);togglePaForm(false);renderPriorAuths();prescriptions.forEach(rx=>refreshRx(rx));
    toast(`Prior authorization ${pa.number} added`);return;
  }
  const input=form.querySelector('input'),value=input?.value.trim();if(!value)return;
  if(form.dataset.addIcd){
    const rx=rxById(form.dataset.addIcd),typed=value.split(/\s/)[0].toUpperCase();
    const code=icdCatalog[typed]?typed:(Object.keys(icdCatalog).find(key=>icdCatalog[key].toLowerCase().includes(value.toLowerCase()))||typed);
    if(rx.icd.some(item=>item.code===code)){toast(`${code} is already on this prescription`);return;}
    rx.icd.push({code,description:icdCatalog[code]||'Description not found · verify code',primary:!rx.icd.length});
    refreshRx(rx);toast(`${code} added`);$(`[data-add-icd="${rx.id}"] input`)?.focus();return;
  }
  if(form.dataset.addItem){
    const rx=rxById(form.dataset.addItem),mapped=mapProduct(value),first=mapped.lines[0].code;
    rx.items.push({id:`item-${Date.now()}`,...mapped,policy:policyFor(first)});
    refreshRx(rx);
    toast(mapped.bundle?`Added as a bundle of ${mapped.lines.length} items`:mapped.lines[0].ai?`AI mapped “${value}” to ${first}`:first?`${first} added`:'No HCPCS match found. Enter a code.');
    $(`[data-add-item="${rx.id}"] input`)?.focus();
  }
});
$('#ddSections').addEventListener('change',event=>{
  const el=event.target;
  if(el.matches('[data-service-select]')){S.serviceType=el.value;renderInsurance();return;}
  if(el.dataset.line){
    const [rxId,itemId,i]=el.dataset.line.split('|'),rx=rxById(rxId),item=rx.items.find(x=>x.id===itemId),l=item.lines[+i];
    if(el.dataset.lineField==='code'){l.code=el.value.trim().toUpperCase();l.ai=false;if(!item.policy&&policyFor(l.code))item.policy=policyFor(l.code);refreshRx(rx);return;}
    l[el.dataset.lineField]=el.dataset.lineField==='qty'?Math.max(1,+el.value||1):el.value.trim();return;
  }
  if(el.dataset.rxField){const rx=rxById(el.dataset.rx);rx.physician[el.dataset.rxField]=el.value.trim();refreshRx(rx);}
});
$('#ddPaList')?.addEventListener('input',()=>{});
document.addEventListener('input',event=>{if(event.target.closest('#ddPaForm'))event.target.classList.remove('invalid');});

// Field ↔ source highlighting
$('#ddReviewGrid').addEventListener('mouseover',event=>{
  const cell=event.target.closest('[data-source-field]');
  if(cell){if(cell.dataset.sourceField!==hover.field)showFieldSource(cell.dataset.sourceField);else clearTimeout(hover.clear);return;}
  if(event.target.closest('#ddSource')){clearTimeout(hover.clear);return;}
  if(hover.field)scheduleClear();
});
$('#ddReviewGrid').addEventListener('mouseleave',()=>{if(hover.field)scheduleClear();});
$('#ddReviewGrid').addEventListener('focusin',event=>{const cell=event.target.closest('[data-source-field]');if(cell)showFieldSource(cell.dataset.sourceField);});
$('#ddDocTrigger').addEventListener('click',()=>setDocMenu($('#ddDocMenu').hidden));
$('#ddDocMenu').addEventListener('keydown',event=>{const options=$$('.dd-menu-opt'),index=options.indexOf(document.activeElement);if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();options[(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length]?.focus();}if(event.key==='Escape'){setDocMenu(false);$('#ddDocTrigger').focus();}});
document.addEventListener('click',event=>{if(!event.composedPath().some(node=>node.classList?.contains('dd-doc-picker')))setDocMenu(false);});
// Resize the source lens
let lensDrag=null;
$('#ddLensResize').addEventListener('pointerdown',event=>{lensDrag={x:event.clientX,w:$('#ddSource').getBoundingClientRect().width};document.body.classList.add('dd-resizing');event.preventDefault();});
document.addEventListener('pointermove',event=>{if(lensDrag)document.documentElement.style.setProperty('--dd-lens-w',`${Math.min(640,Math.max(300,lensDrag.w-(event.clientX-lensDrag.x)))}px`);});
const stopLens=()=>{lensDrag=null;document.body.classList.remove('dd-resizing');};
document.addEventListener('pointerup',stopLens);document.addEventListener('pointercancel',stopLens);
$('#ddLensResize').addEventListener('dblclick',()=>document.documentElement.style.removeProperty('--dd-lens-w'));

// Coverage wallet: drag cards to reorder. Keyboard: Alt + Arrow Left/Right (or Up/Down).
let dragPlan=null;
$('#ddSections').addEventListener('dragstart',event=>{const card=event.target.closest('[data-drag-plan]');if(!card)return;dragPlan=+card.dataset.dragPlan;card.classList.add('dragging');event.dataTransfer.effectAllowed='move';try{event.dataTransfer.setData('text/plain',String(dragPlan));}catch(error){}});
$('#ddSections').addEventListener('dragover',event=>{if(dragPlan===null)return;const card=event.target.closest('[data-drag-plan]');if(!card)return;event.preventDefault();$$('.v3-plan.drop-before,.v3-plan.drop-after').forEach(item=>item.classList.remove('drop-before','drop-after'));if(+card.dataset.dragPlan===dragPlan)return;const box=card.getBoundingClientRect();card.classList.add(event.clientY<box.top+box.height/2?'drop-before':'drop-after');});
$('#ddSections').addEventListener('drop',event=>{
  const card=event.target.closest('[data-drag-plan]');if(dragPlan===null||!card)return;event.preventDefault();
  const target=+card.dataset.dragPlan,box=card.getBoundingClientRect(),after=event.clientY>=box.top+box.height/2;
  const ids=currentOrder(),[moved]=ids.splice(dragPlan,1);let to=target+(after?1:0);if(dragPlan<to)to--;ids.splice(to,0,moved);
  const name=insurancePlans[dragPlan].name;dragPlan=null;
  if(!sameOrder(ids,currentOrder()))setPlanOrder(ids,`${name} moved to ${planRank(to).toLowerCase()}`);else renderInsurance();
});
$('#ddSections').addEventListener('dragend',()=>{dragPlan=null;$$('.v3-plan').forEach(item=>item.classList.remove('dragging','drop-before','drop-after'));});
$('#ddSections').addEventListener('keydown',event=>{
  const button=event.target.closest('[data-act="plan"]');if(!button||!event.altKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
  event.preventDefault();const from=+button.dataset.i,to=from+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1);
  if(to<0||to>=insurancePlans.length)return;
  const ids=currentOrder();[ids[from],ids[to]]=[ids[to],ids[from]];S.currentPlan=from;
  setPlanOrder(ids,`${insurancePlans[from].name} moved to ${planRank(to).toLowerCase()}`);$(`[data-act="plan"][data-i="${to}"]`)?.focus();
});

// Dialogs
$$('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
$('#ddScan').addEventListener('click',async()=>{
  const card=$('#ddScan'),form=$('#ddPlanForm');
  card.innerHTML='<span class="dd-spinner"></span><span><strong>Reading insurance card…</strong><small>Extracting plan details</small></span>';
  await wait(900);
  Object.entries({company:'Premera Blue Cross',plan:'Premera Blue Cross PPO',type:'Commercial PPO',relationship:'Spouse',prefix:'PBC',member:'884215093',suffix:'01',group:'GRP-77120',from:'2026-01-01',to:'2026-12-31'}).forEach(([name,value])=>{form[name].value=value;form[name].classList.add('ai-filled');});
  card.classList.add('scanned');
  card.innerHTML='<i data-lucide="sparkles"></i><span><strong>Premera Card.jpg · fields filled by AI</strong><small>Review the highlighted fields before adding</small></span>';icons();
});
$('#ddPlanForm').addEventListener('input',event=>event.target.classList.remove('invalid','ai-filled'));
$('#ddPlanForm').addEventListener('submit',event=>{
  event.preventDefault();
  const form=event.target,required=['company','plan','type','member','from'].map(name=>form[name]);
  required.forEach(field=>field.classList.toggle('invalid',!field.value.trim()));
  const missing=required.filter(field=>!field.value.trim());
  $('#ddPlanError').hidden=!missing.length;if(missing.length){missing[0].focus();return;}
  const value=name=>form[name].value.trim(),to=formatDate(value('to'));
  const plan={id:`added-${Date.now()}`,name:value('plan'),systemRank:null,aiRank:null,userAdded:true,source:'Added manually',docId:'insurance',aiReason:'',
    eligibility:to?`Active through ${to}`:'Active · no end date',check:null,
    response:{payer:value('company'),trace:`TRN-${String(Date.now()).slice(-9)}`,deductible:'$500.00',deductibleMet:'$0.00',oop:'$3,000.00 · $0.00 met',network:'In network'},
    results:Object.fromEntries(serviceTypes.map(type=>[type.id,{eligible:true,detail:'Active coverage · see response for cost share'}])),
    fields:[['Insurance type',value('type')],['Health insurance company',value('company')],['Relationship to insured',value('relationship')],['Member ID prefix',value('prefix')||'—'],['Member ID',value('member')],['Member ID suffix',value('suffix')||'—'],['Group number',value('group')||'Not provided'],['Effective from',formatDate(value('from'))],['Effective to',to||'Not provided']]};
  const position=+form.position.value,ids=currentOrder();
  insurancePlans.push(plan);ids.splice(position,0,plan.id);
  $('#ddPlanDialog').close();
  S.currentPlan=position;setPlanOrder(ids);renderInsurance(position);
  toast(`${plan.name} added as ${planRank(position).toLowerCase()} coverage`);
  if(form.checkNow.checked)checkPlan();
});
$('#ddCancelDialog').addEventListener('close',()=>{
  if($('#ddCancelDialog').returnValue!=='cancel')return;
  try{sessionStorage.setItem('ddIntakeCancelled','1');}catch(error){}
  location.reload();
});
try{if(sessionStorage.getItem('ddIntakeCancelled')){sessionStorage.removeItem('ddIntakeCancelled');setTimeout(()=>toast('Intake cancelled. Start a new intake by uploading documents.'),300);}}catch(error){}

// Pre-check keyboard: j/k or arrows move between items
document.addEventListener('keydown',event=>{
  if(S.stage!=='precheck'||event.target.matches('input,textarea,select'))return;
  const order=['fail','warn','pass'].flatMap(status=>S.pc.items.filter(item=>item.status===status));
  const index=order.findIndex(item=>item.id===S.pc.selected);
  const next=event.key==='ArrowDown'||event.key==='j'?order[index+1]:event.key==='ArrowUp'||event.key==='k'?order[index-1]:null;
  if(next){event.preventDefault();S.pc.selected=next.id;renderPrecheck();$(`[data-act="pc-item"][data-id="${next.id}"]`)?.focus();}
});

// Shell
const setNavCollapsed=collapsed=>{document.body.classList.toggle('nav-collapsed',collapsed);const toggle=$('#navToggle');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');toggle.title=toggle.getAttribute('aria-label');};
setNavCollapsed(true);
$('#navToggle').addEventListener('click',()=>setNavCollapsed(!document.body.classList.contains('nav-collapsed')));
$$('[data-nav-section]').forEach(section=>section.addEventListener('click',()=>{const open=section.parentElement.classList.toggle('open');section.setAttribute('aria-expanded',String(open));}));
$$('.shell-nav a[href="#"]').forEach(link=>link.addEventListener('click',event=>event.preventDefault()));
$('#shellBack').addEventListener('click',()=>history.back());
$('#shellRefresh').addEventListener('click',()=>location.reload());

renderUpload();
setStage('upload');
