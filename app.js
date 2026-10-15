const demoDocuments = [
  { id:'referral', name:'Referral.pdf', meta:'2 pages · Extracted', icon:'file-text', type:'Referral' },
  { id:'insurance', name:'Insurance Card.pdf', meta:'1 page · Duplicate found', icon:'badge-check', type:'Insurance card' },
  { id:'prescription', name:'Prescription.pdf', meta:'1 page · Extracted', icon:'notebook-tabs', type:'Prescription' },
  { id:'consent', name:'Consent Form.pdf', meta:'2 pages · Low confidence', icon:'file-signature', type:'Consent form' }
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
const documents = [];
const icdCodes=[
  {code:'G47.33',description:'Obstructive sleep apnea (adult)',primary:true},
  {code:'E66.9',description:'Obesity, unspecified'},
  {code:'I10',description:'Essential (primary) hypertension'}
];
const coveragePolicies=[
  {id:'L33718',name:'Positive Airway Pressure (PAP) Devices for the Treatment of Obstructive Sleep Apnea'},
  {id:'L33800',name:'Respiratory Assist Devices'},
  {id:'L33797',name:'Oxygen and Oxygen Equipment'}
];
const hcpcsCodes=[
  {code:'E0601',description:'Continuous positive airway pressure (CPAP) device',quantity:1,policy:'',open:true,required:true},
  {code:'E0562',description:'Humidifier, heated, used with PAP device',quantity:1,policy:'L33718',ai:true},
  {code:'A7030',description:'Full face mask used with PAP device',quantity:1,policy:'L33718',ai:true},
  {code:'A7037',description:'Tubing used with PAP device',quantity:1,policy:'L33718',ai:true}
];
const requiredDocuments=[
  {id:'prescription',name:'Standard written order (SWO)'},
  {id:'face-to-face',name:'Face-to-face clinical evaluation'},
  {id:'sleep-study',name:'Sleep study (PSG or HST) report'},
  {id:'aob',name:'Assignment of benefits (AOB)'},
  {id:'abn',name:'Advance beneficiary notice (ABN)'}
];
const existingFiles=[
  {id:'existing-insurance',name:'Insurance Card · Sep 2025.pdf',meta:'Extracted previously',icon:'badge-check',extracted:true,used:false},
  {id:'existing-consent',name:'Consent Form.pdf',meta:'Extracted previously',icon:'file-signature',extracted:true,used:true},
  {id:'existing-sleep',name:'Sleep Study · Aug 2022.pdf',meta:'Not extracted yet',icon:'file-chart-column',extracted:false,used:false}
];
const patientMatches=[
  {id:'ashlynn',initials:'AB',name:'Ashlynn Botosh',confidence:94,dob:'03/15/1978',address:'1234 Healthways Blvd, Seattle, WA 98101',phone:'(415) 220-8841',mrn:'PT-10482',reason:'Name, DOB, address, and phone match'},
  {id:'ashlyn',initials:'AB',name:'Ashlyn Botosh',confidence:81,dob:'03/15/1978',address:'1184 Healthway Blvd, Seattle, WA 98101',phone:'(415) 220-8891',mrn:'PT-08731',reason:'Similar name, same DOB, and nearby address'},
  {id:'ashley',initials:'AR',name:'Ashley Brown',confidence:68,dob:'03/16/1978',address:'202 Elm Street, Bellevue, WA 98004',phone:'(206) 555-0188',mrn:'PT-06319',reason:'Similar name and DOB from insurance document'}
];
const duplicateFindings=[
  {id:'insurance-similar',kind:'similar',upload:'Insurance Card.pdf',existing:'Insurance Card · Sep 2025.pdf',reason:'Same member ID; uploaded card has newer coverage dates',score:96,decision:'Replaced older insurance card',detail:'The uploaded card is newer. AI is extracting the updated coverage automatically.',extracting:true},
  {id:'referral-similar',kind:'similar',upload:'Referral.pdf',existing:'Referral · Jun 2025.pdf',reason:'Same diagnosis and provider; different signed encounter',score:87,decision:'Added as a new clinical document',detail:'This is a newer encounter, so AI preserved both records and extracted the upload.',extracting:false},
  {id:'consent-exact',kind:'exact',upload:'Consent Form.pdf',existing:'Consent Form.pdf',reason:'Exact file fingerprint match',score:100,decision:'Removed exact duplicate',detail:'The existing file was already extracted, so no processing was repeated.',extracting:false}
];

const paperContent = {
  referral:`<div class="paper-head">Oakwood Medical Associates · Patient Referral</div><div class="paper-row"><span>Patient</span><b>Ashlynn Botosh</b></div><div class="paper-row"><span>Date of birth</span><mark>03/15/1978</mark></div><div class="paper-row"><span>Address</span><b>1234 Healthways Blvd, Seattle, WA 98101</b></div><div class="paper-row"><span>Reason</span><b>Evaluation and treatment of obstructive sleep apnea</b></div>`,
  insurance:`<div class="paper-head">Medicare Health Insurance</div><div class="paper-row"><span>Name</span><b>Ashlynn Botosh</b></div><div class="paper-row"><span>Date of birth</span><mark>03/16/1978</mark></div><div class="paper-row"><span>Member ID</span><b>X BCB731045298 03</b></div><div class="paper-row"><span>Coverage</span><b>Medicare Part B · Active</b></div>`,
  prescription:`<div class="paper-head">Prescription / Certificate of Medical Necessity</div><div class="paper-row"><span>Diagnosis</span><b>G47.33 · Obstructive sleep apnea</b></div><div class="paper-row"><span>HCPCS</span><b>E0601 · CPAP device</b></div><div class="paper-row"><span>Provider</span><mark>Illegible signature</mark></div><div class="paper-row"><span>Frequency</span><b>Nightly during sleep</b></div>`,
  consent:`<div class="paper-head">Patient Consent Form</div><div class="paper-row"><span>Patient</span><b>Ashlynn Botosh</b></div><div class="paper-row"><span>Mobile phone</span><mark>(415) 220-8841</mark></div><div class="paper-row"><span>Consent</span><b>Signed electronically · Sep 3, 2025</b></div>`
};

const documentImages={
  referral:'assets/referral.svg',insurance:'assets/insurance.svg',prescription:'assets/prescription.svg',consent:'assets/consent.svg',
  'sleep-study':'assets/sleep-study.svg','face-to-face':'assets/referral.svg',
  'existing-insurance':'assets/insurance.svg','existing-consent':'assets/consent.svg','existing-sleep':'assets/sleep-study.svg'
};

const serviceTypes=[
  {id:'Clinical Services',icon:'stethoscope',description:'Office visits and clinical care'},
  {id:'DME',icon:'package',description:'Durable medical equipment and supplies'},
  {id:'Immunization',icon:'syringe',description:'Vaccines and administration'},
  {id:'Counselling',icon:'messages-square',description:'Behavioral and therapy sessions'}
];
const insurancePlans=[
  {name:'Medicare Part B',systemRank:'Secondary',eligibility:'Active through 12/30/2027',check:{service:'DME',at:'today at 9:42 AM'},results:{'Clinical Services':{eligible:true,detail:'20% coinsurance after Part B deductible'},DME:{eligible:true,detail:'20% coinsurance after Part B deductible'},Immunization:{eligible:true,detail:'Covered at 100% for flu, pneumococcal, and COVID-19'},Counselling:{eligible:false,detail:'Requires a Medicare-enrolled behavioral health provider'}},fields:[['Insurance type','Medicare'],['Health insurance company','Medicare Health Care Plan'],['Relationship to insured','Self'],['Member ID prefix','X'],['Member ID','BCB731045298'],['Member ID suffix','03'],['Group number','Not provided'],['Effective from','12/31/2022'],['Effective to','12/30/2027']]},
  {name:'Aetna Choice POS II',systemRank:'Primary',eligibility:'Active through 03/14/2027',check:{service:'DME',at:'today at 9:42 AM'},results:{'Clinical Services':{eligible:true,detail:'$30 copay per visit'},DME:{eligible:true,detail:'20% coinsurance · prior authorization on file'},Immunization:{eligible:true,detail:'Covered at 100% in network'},Counselling:{eligible:true,detail:'$30 copay per session'}},fields:[['Insurance type','Commercial PPO'],['Health insurance company','Aetna'],['Relationship to insured','Self'],['Member ID prefix','Z'],['Member ID','AET529187463'],['Member ID suffix','07'],['Group number','GRP-258914'],['Effective from','03/15/2025'],['Effective to','03/14/2027']]}
];

const state = { serviceType:'DME', checkingEligibility:false, checkingPlan:false, editingPlan:false, currentPlan:0, physicianName:false, signature:false, authAck:false, selected:'', pickerPatient:'', pickerSelection:new Set(), viewerMode:'preview', phase:'upload', extracting:false, extractionComplete:false, patientResolved:false, documentResolutions:new Set(), started:false, resolutionPending:false, dob:true, mobile:false, provider:false, product:false, patientLinked:false, completed:false };
const postIntakeRecommendation={
  patient:'Ashlynn Botosh',context:'Existing patient · New PAP setup',title:'New PAP therapy intake',summary:'Ashlynn has a prescription supporting PAP therapy for obstructive sleep apnea, active insurance coverage, and the clinical documents needed to begin qualification. No matching fulfilled PAP equipment order was found.',action:'Start pre-check',reason:'Confirm payer qualification, coverage, and required documentation before creating the new equipment order.',alternatives:['Create order without pre-check'],services:[{name:'PAP setup and education',reason:'Supports safe device use for a new therapy setup.'},{name:'Initial mask fitting',reason:'Helps select an appropriate interface before fulfillment.'},{name:'Compliance monitoring',reason:'Supports follow-up after therapy begins.'}],dme:[{name:'CPAP device',reason:'Supported by the reviewed PAP prescription.'},{name:'Heated humidifier',reason:'Recommended as part of the initial PAP setup.'},{name:'Mask and starter supplies',reason:'Needed to begin the prescribed therapy.'}],note:'Final coverage and item eligibility remain subject to payer review.'
};
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function icons(){ if(window.lucide) window.lucide.createIcons(); }
function toast(message){ const element=$('#toast'); element.textContent=message; element.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>element.classList.remove('show'),2200); }

function renderDocuments(){
  $('#documentList').innerHTML=documents.length?documents.map(document=>`<button class="document-item new-doc ${document.id===state.selected?'active':''}" data-document="${document.id}"><span class="doc-icon"><i data-lucide="${document.icon}"></i></span><span class="doc-info"><strong>${document.name}</strong><span>${document.meta}</span></span><span class="doc-state">${document.processing?'<span class="spinner"></span>':'<i data-lucide="circle-check"></i>'}</span></button>`).join(''):'<div class="empty-documents">No documents uploaded yet</div>';
  $('#fileCount').textContent=documents.length;
  $('#drawerCount').textContent=documents.length;
  renderViewerGallery();
  icons();
}

function renderUploadQueue(){
  const queue=$('#uploadQueue');
  queue.innerHTML=documents.length?documents.map(file=>`<div><i data-lucide="file-text"></i><span><strong>${file.name}</strong><small>${file.type}</small></span><i data-lucide="check-circle"></i></div>`).join(''):'';
  $('#extractDocuments').disabled=!documents.length||state.extracting;
  $('#cancelUpload').disabled=!documents.length||state.extracting;
  $('#uploadList').hidden=!documents.length;
  $('#uploadListCount').textContent=`${documents.length} ${documents.length===1?'document':'documents'}`;
  icons();
}

function renderExtractionFiles(){
  $('#extractionFileList').innerHTML=documents.map(file=>`<div><i data-lucide="file-text"></i><span><strong>${file.name}</strong><small>${file.meta}</small></span>${file.processing?'<span class="spinner"></span>':''}</div>`).join('');
  icons();
}

function renderExtractionPatientMatches(){
  $('#patientIssue').classList.remove('is-resolved');
  $('#patientIssue .issue-title>b').textContent='Required';
  $('#extractionPatientMatches').innerHTML=patientMatches.map((patient,index)=>`<article class="extract-patient ${index===0?'best':''}" id="extract-patient-${patient.id}"><div class="extract-patient-summary"><span class="avatar">${patient.initials}</span><span><strong>${patient.name}${index===0?'<em class="best-tag">Best match</em>':''}</strong><small>DOB ${patient.dob} · ${patient.mrn}</small></span></div><p class="match-reason"><i data-lucide="sparkles"></i><span>${patient.reason}</span></p><div class="extract-patient-details" hidden><dl><div><dt>Address</dt><dd>${patient.address}</dd></div><div><dt>Phone</dt><dd>${patient.phone}</dd></div><div><dt>Patient ID</dt><dd>${patient.mrn}</dd></div></dl></div><div class="extract-patient-actions"><button class="text-btn" data-extract-patient-details="${patient.id}" aria-expanded="false">View details</button><button class="small-btn ${index===0?'primary':''}" data-extract-patient="${patient.id}">Select patient</button></div></article>`).join('');
  $('.create-new-patient').hidden=false;
  icons();
}
function resolvePatientIssue(title,detail){
  $('#patientIssue').classList.add('is-resolved');
  $('#patientIssue .issue-title>b').textContent='Resolved';
  $('#extractionPatientMatches').innerHTML=`<div class="issue-resolved"><i data-lucide="circle-check"></i><span><strong>${title}</strong><small>${detail}</small></span><button class="text-btn" data-change-patient>Change</button></div>`;
  $('.create-new-patient').hidden=true;
}

function renderExtractionIssues(){
  renderExtractionPatientMatches();
  const findings=[duplicateFindings[0],duplicateFindings[2]];
  $('#extractionDocumentMatches').innerHTML=findings.map(item=>`<article class="extract-document" id="extract-${item.id}"><div class="finding-type"><span>${item.kind==='exact'?'Same document':'Similar content'}</span></div><strong>${item.upload}</strong><p>${item.reason}</p><small>Existing: ${item.existing}</small><div class="extract-document-actions">${item.kind==='exact'?`<button class="small-btn primary" data-extract-document="${item.id}" data-decision="existing">Use existing document</button><button class="text-btn" data-extract-document="${item.id}" data-decision="upload">Keep uploaded copy</button>`:`<button class="small-btn primary" data-extract-document="${item.id}" data-decision="replace">Replace existing</button><button class="small-btn" data-extract-document="${item.id}" data-decision="new">Add as new</button>`}</div></article>`).join('');
  icons();
}

function syncFooter(){
  const phase=state.completed?'':state.phase;
  $('#pageFooter').hidden=phase!=='upload'&&phase!=='review';
  $$('[data-footer-phase]').forEach(group=>{group.hidden=group.dataset.footerPhase!==phase;});
}

function setPhase(phase){
  state.phase=phase;
  if(phase==='review')renderRequiredDocuments();
  const workspace=$('#workspace');
  const body=document.body;

  workspace.classList.remove('phase-upload','phase-extraction','phase-review','intake-empty');
  body.classList.remove('phase-upload','phase-extraction','phase-review','intake-empty');

  workspace.classList.add(`phase-${phase}`);
  body.classList.add(`phase-${phase}`);
  syncFooter();
  if(phase==='upload'){
    workspace.classList.add('intake-empty');
    body.classList.add('intake-empty');
  }

  $('#intakeStart').hidden=phase!=='upload';
  $('#extractionView').hidden=phase!=='extraction';
  $('#extractionIssues').hidden=phase!=='extraction';
  $('#documentViewer').hidden=phase!=='review';
  $('#expandSources').hidden=phase!=='review';
  $('#reviewTrigger').disabled=phase!=='review';
  if(phase==='review'){
    syncExistingPatientFiles();
    setSourceDrawer(false,true);
    openDocument(state.selected||'referral');
    updateProgress();
  }
}

function renderExistingFiles(){
  $('#existingCount').textContent=existingFiles.length;
  $('#existingList').innerHTML=existingFiles.map(file=>`<article class="existing-file-row ${file.used?'in-use':''}"><button class="document-item existing-file" data-existing="${file.id}"><span class="doc-icon"><i data-lucide="${file.icon}"></i></span><span class="doc-info"><strong>${file.name}</strong><span>${file.meta}</span></span><span class="doc-state ${file.extracted?'':'pending-state'}">${file.extracted?'<i data-lucide="circle-check"></i>':'<i data-lucide="sparkles"></i>'}</span></button><button class="use-existing" data-use-existing="${file.id}" aria-pressed="${file.used}">${file.used?'<i data-lucide="check"></i> In this intake':'Use in intake'}</button></article>`).join('');
  $('#drawerCount').textContent=documents.length+existingFiles.length;
  renderViewerGallery();
  icons();
}

function syncExistingPatientFiles(){
  $('#existingSection').hidden=!state.patientLinked;
  if(state.patientLinked)renderExistingFiles();
  else $('#drawerCount').textContent=documents.length;
}

function renderPostIntake(){
  const recommendation=postIntakeRecommendation;
  $('#handoffPatient').textContent=recommendation.patient;
  $('#handoffContext').textContent=recommendation.context;
  $('#summaryTitle').textContent=recommendation.title;
  $('#handoffSummary').textContent=recommendation.summary;
  $('#nextActionTitle').textContent=recommendation.action;
  $('#nextActionReason').textContent=recommendation.reason;
  $('#recommendedAction').innerHTML=`<i data-lucide="arrow-right"></i> ${recommendation.action}`;
  $('#recommendedAction').dataset.postAction=recommendation.action;
  $('#otherActionButtons').innerHTML=recommendation.alternatives.map(action=>`<button class="secondary-action compact" data-post-action="${action}">${action}</button>`).join('');
  const recommendationItems=items=>items.map(item=>`<li><span class="recommendation-mark"><i data-lucide="sparkles"></i></span><span><b>${item.name}</b><small>${item.reason}</small></span></li>`).join('');
  $('#recommendedServices').innerHTML=recommendationItems(recommendation.services);
  $('#recommendedDme').innerHTML=recommendationItems(recommendation.dme);
  $('#handoffNote').textContent=recommendation.note;
  icons();
}

function showPostIntake(){
  state.completed=true;
  $('.review-area').classList.add('show-post-intake');
  $('#postIntake').hidden=false;
  $('#completeIntake').innerHTML='<i data-lucide="check"></i> Intake completed';
  $('#completeIntake').disabled=true;
  $('#reviewTrigger').disabled=true;
  syncFooter();
  renderPostIntake();
  $('#postIntake').scrollIntoView({block:'start'});
}

function returnToIntakeReview(){
  state.completed=false;
  $('.review-area').classList.remove('show-post-intake');
  $('#postIntake').hidden=true;
  $('#reviewTrigger').disabled=false;
  syncFooter();
  updateProgress();
  $('.review-intro').scrollIntoView({block:'start'});
}

function viewerFiles(){
  const retained={id:'consent',name:'Consent Form.pdf',meta:'Existing file · Extracted previously',icon:'file-signature',type:'Consent form'};
  const available=[...documents];
  if(!available.some(file=>file.id==='consent'))available.push(retained);
  if(state.patientLinked)available.push(...existingFiles);
  return available.filter((file,index,list)=>list.findIndex(item=>item.id===file.id)===index);
}

function imageForDocument(document){
  return documentImages[document.id] || (/insurance|card/i.test(document.name)?documentImages.insurance:/prescription|rx/i.test(document.name)?documentImages.prescription:documentImages.referral);
}

function renderViewerGallery(){
  const gallery=$('#documentGallery');if(!gallery)return;
  gallery.innerHTML=viewerFiles().map(file=>`<button class="gallery-item ${file.id===state.selected?'active':''}" data-gallery-doc="${file.id}"><span class="gallery-thumb"><img src="${imageForDocument(file)}" alt="${file.name} thumbnail"></span><span><strong>${file.name}</strong><small>${file.meta}</small></span>${file.id===state.selected?'<i data-lucide="check-circle"></i>':''}</button>`).join('');
  icons();
}

function setViewerMode(mode){
  state.viewerMode=mode;
  $('#paperPreview').hidden=mode!=='preview';
  $('#documentGallery').hidden=mode!=='gallery';
  $$('[data-view-mode]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.viewMode===mode));
  if(mode==='gallery')renderViewerGallery();
}

function renderDuplicateFindings(){
  $('#duplicateFindings').innerHTML=duplicateFindings.map(item=>`<article class="match-finding ${item.kind} resolved-finding" id="finding-${item.id}"><div class="finding-type"><span>${item.kind==='exact'?'Exact document':'Similar content'}</span><b>${item.score}%</b></div><strong>${item.upload}</strong><p>${item.reason}</p><small>Existing: ${item.existing}</small><div class="system-decision"><i data-lucide="${item.extracting?'sparkles':'circle-check'}"></i><span><b>${item.decision}</b>${item.detail}</span></div></article>`).join('');
  icons();
}

function renderPatientMatches(){
  $('#patientMatches').innerHTML=patientMatches.map((patient,index)=>`<article class="patient-match" id="patient-${patient.id}"><div class="patient-summary"><span class="avatar">${patient.initials}</span><div><strong>${patient.name}</strong><span>DOB ${patient.dob} · ${patient.mrn}</span></div><b>${patient.confidence}%</b></div><p>${patient.reason}</p><div class="patient-details" hidden><dl><div><dt>Address</dt><dd>${patient.address}</dd></div><div><dt>Phone</dt><dd>${patient.phone}</dd></div><div><dt>Patient ID</dt><dd>${patient.mrn}</dd></div></dl></div><div class="inline-actions"><button class="small-btn ${index===0?'primary':''}" data-link-patient="${patient.id}">Link patient</button><button class="text-btn" data-patient-details="${patient.id}" aria-expanded="false">View details</button></div></article>`).join('');
  icons();
}

function setSourceDrawer(open,force=false){
  if(!open&&state.resolutionPending&&!force){toast('Resolve the patient match before continuing.');return;}
  $('#workspace').classList.toggle('sources-collapsed',!open);
  $('#sourceScrim').hidden=!open;
  $('#sourcePanel').classList.toggle('drawer-open',open);
  $('#expandSources').setAttribute('aria-label',open?'Close document sidebar':'Open document sidebar');
  $('#expandSources').setAttribute('title',open?'Close document sidebar':'Open document sidebar');
  $('#expandSources').setAttribute('aria-expanded',open);
  $('#expandSources').querySelector('i')?.setAttribute('data-lucide',open?'panel-left-close':'panel-left-open');
  icons();
}

const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
function patientInitials(name){return name.split(' ').map(part=>part[0]).join('').slice(0,2).toUpperCase();}
function renderQueuePatients(){
  $('#queuePatients').innerHTML=intakeQueue.map(patient=>{const added=patient.documents.filter(file=>documents.some(item=>item.id===file.id)).length;return `<button class="queue-patient ${state.pickerPatient===patient.id?'active':''}" data-queue-patient="${patient.id}" aria-expanded="${state.pickerPatient===patient.id}"><span class="patient-initials">${patientInitials(patient.name)}</span><strong>${patient.name}</strong><small>${added?`${added} of ${patient.documents.length} added`:`${patient.documents.length} docs`}</small></button>`;}).join('')+`<button class="queue-patient find-patient" id="findPatient"><i data-lucide="search"></i> Find another patient</button>`;
  icons();
}
function openRecordPicker(patientId){
  const patient=[...intakeQueue,...patientDirectory].find(item=>item.id===patientId);
  if(!patient)return;
  if(!intakeQueue.includes(patient))intakeQueue.push(patient);
  state.pickerPatient=patient.id;
  state.pickerSelection=new Set(patient.documents.filter(file=>!documents.some(item=>item.id===file.id)).map(file=>file.id));
  $('#patientSearch').hidden=true;
  $('#recordPicker').hidden=false;
  $('#recordPickerInitials').textContent=patientInitials(patient.name);
  $('#recordPickerTitle').textContent=patient.name;
  $('#recordPickerMeta').textContent=`${patient.mrn} · ${patient.documents.length} documents in record`;
  renderRecordPicker();renderQueuePatients();
}
function renderRecordPicker(){
  const patient=intakeQueue.find(item=>item.id===state.pickerPatient);
  if(!patient)return;
  $('#recordPickerList').innerHTML=patient.documents.map(file=>{const added=documents.some(item=>item.id===file.id);return `<label class="record-doc ${added?'added':''}"><input type="checkbox" data-record-doc="${file.id}" ${added||state.pickerSelection.has(file.id)?'checked':''} ${added?'disabled':''}><i data-lucide="${file.icon}"></i><span><strong>${file.name}</strong><small>${added?'Already added':`${file.type} · ${file.date}`}</small></span></label>`;}).join('');
  const count=state.pickerSelection.size;
  $('#addRecordDocs').disabled=!count;
  $('#addRecordDocs').textContent=count?`Add ${count} ${count===1?'document':'documents'}`:'Add documents';
  $('#toggleRecordDocs').textContent=count?'Clear all':'Select all';
  icons();
}
function closeRecordPicker(){state.pickerPatient='';$('#recordPicker').hidden=true;renderQueuePatients();}
function addRecordDocuments(){
  const patient=intakeQueue.find(item=>item.id===state.pickerPatient);
  const selected=patient.documents.filter(file=>state.pickerSelection.has(file.id));
  if(!selected.length)return;
  selected.forEach(file=>documents.push({...file,meta:'Ready to extract'}));
  if(!state.selected)state.selected=documents[0].id;
  closeRecordPicker();
  renderDocuments();renderUploadQueue();
  toast(`${selected.length} ${selected.length===1?'document':'documents'} from ${patient.name} ready to extract.`);
}
function renderPatientSearch(){
  const query=$('#patientSearchInput').value.trim().toLowerCase();
  const results=patientDirectory.filter(patient=>!intakeQueue.includes(patient)&&(!query||patient.name.toLowerCase().includes(query)||patient.mrn.toLowerCase().includes(query)));
  $('#patientSearchResults').innerHTML=results.length?results.map(patient=>`<button class="search-result" role="option" data-search-patient="${patient.id}"><span class="patient-initials">${patientInitials(patient.name)}</span><span><strong>${patient.name}</strong><small>DOB ${patient.dob} · ${patient.mrn}</small></span><small>${patient.documents.length} docs</small></button>`).join(''):'<p class="search-empty">No patients found</p>';
}

function checkExtractionReady(){
  const ready=state.extractionComplete&&state.patientResolved&&state.documentResolutions.size===2;
  if(!ready)return;
  $('#extractionWaiting').innerHTML='<i data-lucide="circle-check"></i><span>All issues resolved. Opening review…</span>';
  icons();
  setTimeout(()=>{setPhase('review');toast('Extraction complete. Review the extracted information.');},650);
}

async function startExtraction(){
  if(!documents.length||state.extracting)return;
  state.started=true;state.extracting=true;state.extractionComplete=false;state.patientResolved=false;state.documentResolutions.clear();
  documents.forEach(file=>{file.processing=true;file.meta='Waiting';});
  renderExtractionIssues();renderExtractionFiles();
  $('#patientIssue').hidden=true;$('#documentIssue').hidden=true;
  $('#extractionWaiting').innerHTML='<span class="spinner"></span><span>Extraction is running. Issues will appear here.</span>';
  setPhase('extraction');
  const stages=[
    {id:'read',label:'Reading uploaded documents'},
    {id:'extract',label:'Extracting patient and order data'},
    {id:'match',label:'Matching existing patients'},
    {id:'duplicate',label:'Checking similar documents'},
    {id:'conflict',label:'Resolving field conflicts'}
  ];
  for(const [index,stage] of stages.entries()){
    const rows=$$('.extraction-steps li');rows.forEach(row=>row.classList.remove('active'));
    const row=$(`[data-extract-step="${stage.id}"]`);row.classList.add('active');
    $('#demoStatus').textContent=stage.label;
    $('#extractionProgressText').textContent=`Step ${index+1} of ${stages.length}`;
    const percent=(index+1)*20;$('#extractionPercent').textContent=`${percent}%`;$('#extractionBar').style.width=`${percent}%`;
    documents.forEach(file=>{file.meta=stage.label;});renderExtractionFiles();
    await wait(700);
    row.classList.remove('active');row.classList.add('done');
    row.querySelector('.step-marker').innerHTML='<i data-lucide="check"></i>';icons();
    if(index===2)$('#patientIssue').hidden=false;
  }
  state.extracting=false;state.extractionComplete=true;
  documents.forEach(file=>{file.processing=false;file.meta='Extracted';});renderDocuments();renderExtractionFiles();
  $('#extractionSpinner').outerHTML='<i data-lucide="circle-check" id="extractionSpinner"></i>';
  $('#demoStatus').textContent='Extraction complete';$('#extractionSummary').textContent='Resolve any remaining issues to continue to review.';
  $('#extractionWaiting').innerHTML='<span class="spinner"></span><span>Extraction complete. Waiting for required issues.</span>';
  icons();checkExtractionReady();
}

function openDocument(id){
  const retained=id==='consent'?{id:'consent',name:'Consent Form.pdf',meta:'Existing file · Extracted previously',type:'Consent form'}:null;
  const document=documents.find(item=>item.id===id) || existingFiles.find(item=>item.id===id) || retained || documents[0];
  if(!document)return;
  state.selected=document.id;
  $('#previewName').textContent=document.name;
  $('#previewMeta').textContent=document.meta.includes('page')?document.meta.split(' · ')[0]:'Page 1';
  const image=$('#documentImage');
  image.src=imageForDocument(document);
  image.alt=`${document.name} document preview`;
  $('#sourcePreview').hidden=false;
  setViewerMode('preview');
  renderDocuments();
  const preview=$('#sourcePreview');
  preview.classList.remove('source-changed');
  requestAnimationFrame(()=>preview.classList.add('source-changed'));
}

const planRank=index=>index===0?'Primary':index===1?'Secondary':'Tertiary';
const planResult=plan=>plan.check?plan.results[plan.check.service]:null;
function renderPlanList(){
  $('#planList').innerHTML=insurancePlans.map((plan,index)=>{const result=planResult(plan),current=plan.check?.service===state.serviceType;return `<button class="plan-item ${index===state.currentPlan?'active':''}" data-plan="${index}"><span class="plan-item-copy"><strong>${plan.name}</strong><span class="plan-pills"><span class="pill rank">${planRank(index)}</span><span class="pill ${plan.systemRank===planRank(index)?'neutral':'warning'}">System: ${plan.systemRank}</span>${current&&result?`<span class="pill ${result.eligible?'success':'danger'}">${result.eligible?'Eligible':'Not covered'}</span>`:'<span class="pill neutral">Not checked</span>'}</span></span><i data-lucide="chevron-right"></i></button>`;}).join('');
  const mismatch=insurancePlans.some((plan,index)=>plan.systemRank!==planRank(index));
  $('#orderNotice').hidden=!mismatch;
  $('#orderNotice').innerHTML=mismatch?'<i data-lucide="arrow-down-up"></i><span><b>Order differs from system</b>The system lists Aetna as primary. Documents show Medicare Part B as primary.</span><button class="text-btn" data-swap-order>Swap order</button>':'';
}

function servicePill(plan){
  const type=serviceTypes.find(item=>item.id===state.serviceType),result=planResult(plan),current=plan.check?.service===state.serviceType;
  if(!current)return `<span class="pill neutral" title="Not checked for ${type.id} yet"><i data-lucide="${type.icon}"></i> ${type.id} · Not checked</span>`;
  return `<span class="pill ${result.eligible?'info':'danger'}" title="${result.detail} · checked ${plan.check.at}"><i data-lucide="${type.icon}"></i> ${type.id} · ${result.eligible?'Eligible':'Not covered'}</span>`;
}

function renderInsurance(index=state.currentPlan){
  if(index!==state.currentPlan)state.editingPlan=false;
  state.currentPlan=index;
  const plan=insurancePlans[index],result=planResult(plan);
  renderPlanList();
  $('#planName').textContent=plan.name;
  $('#planPills').innerHTML=`<span class="pill success"><i data-lucide="circle-check"></i> Active</span>${servicePill(plan)}<span class="pill rank">${planRank(index)} coverage</span><span class="pill ${plan.systemRank===planRank(index)?'neutral':'warning'}">System: ${plan.systemRank}</span><span class="plan-dates">${plan.eligibility}</span>`;
  $('#planActions').innerHTML=state.editingPlan?'<button class="small-btn" data-plan-cancel>Cancel</button><button class="small-btn primary" data-plan-save>Save</button>':`<button class="small-btn" data-plan-edit><i data-lucide="pencil"></i> Edit</button><button class="small-btn" data-plan-check ${state.checkingPlan?'disabled':''}>${state.checkingPlan?'<span class="spinner"></span> Checking…':`<i data-lucide="refresh-cw"></i> Check ${state.serviceType}`}</button>`;
  $('#insuranceFields').classList.toggle('editing',state.editingPlan);
  $('#insuranceFields').innerHTML=plan.fields.map(([label,value],fieldIndex)=>state.editingPlan?`<label><span>${label}</span><input class="input" data-plan-field="${fieldIndex}" value="${value==='Not provided'?'':value}" placeholder="Not provided"></label>`:`<div><span>${label}</span><strong>${value}</strong></div>`).join('');
  renderEligibility();
}

function renderEligibility(){
  const type=serviceTypes.find(item=>item.id===state.serviceType);
  $('#serviceTriggerText').textContent=type.id;
  $('#serviceTrigger').querySelector('[data-lucide]:first-child')?.setAttribute('data-lucide',type.icon);
  const allChecked=insurancePlans.every(plan=>plan.check?.service===state.serviceType);
  const button=$('#checkEligibility');
  button.disabled=allChecked||state.checkingEligibility;
  button.classList.toggle('primary',!allChecked&&!state.checkingEligibility);
  button.innerHTML=state.checkingEligibility?'<span class="spinner"></span> Checking…':'<i data-lucide="refresh-cw"></i> Check all plans';
  $('#eligibilityMeta').textContent=state.checkingEligibility?`Checking ${type.id} eligibility for all plans…`:allChecked?`All plans checked for ${type.id} · ${insurancePlans[0].check.at}`:`Not checked for ${type.id} on every plan · check all plans or one plan at a time`;
  icons();
}

async function checkEligibility(){
  state.checkingEligibility=true;renderEligibility();
  await wait(900);
  state.checkingEligibility=false;
  insurancePlans.forEach(plan=>{plan.check={service:state.serviceType,at:'just now'};});
  renderInsurance();
  const covered=insurancePlans.filter(plan=>planResult(plan).eligible).length;
  toast(`${state.serviceType} eligibility checked · ${covered} of ${insurancePlans.length} plans eligible`);
}

async function checkPlanEligibility(){
  const plan=insurancePlans[state.currentPlan];
  state.checkingPlan=true;renderInsurance();
  await wait(900);
  state.checkingPlan=false;plan.check={service:state.serviceType,at:'just now'};
  renderInsurance();
  toast(`${plan.name}: ${planResult(plan).eligible?'eligible':'not covered'} for ${state.serviceType}`);
}

function renderServiceMenu(){
  $('#serviceMenu').innerHTML=serviceTypes.map(type=>`<button class="service-option ${type.id===state.serviceType?'selected':''}" role="option" aria-selected="${type.id===state.serviceType}" data-service-type="${type.id}"><i data-lucide="${type.icon}"></i><span><strong>${type.id}</strong><small>${type.description}</small></span>${type.id===state.serviceType?'<i class="service-check" data-lucide="check"></i>':''}</button>`).join('');
  icons();
}

function issueCount(){ return [state.mobile,state.provider,state.product,state.physicianName,state.signature,state.authAck].filter(value=>!value).length; }
function reviewItems(){
  return [
    !state.mobile&&{id:'mobileField',label:'Mobile phone number',detail:'Digits look blurry',section:'Contact information',severity:'warning'},
    !state.provider&&{id:'providerField',label:'Physician NPI',detail:'Not found in any document',section:'Prescription',severity:'missing'},
    !state.physicianName&&{id:'physicianConflict',label:'Physician last name',detail:'Kim and Kimm found in different documents',section:'Prescription',severity:'warning',icon:'git-compare-arrows',tag:'Conflict'},
    !state.product&&{id:'productField',label:'Medicare coverage for E0601',detail:'Choose the policy that applies',section:'Prescription',severity:'missing',tag:'Select'},
    !state.signature&&{id:'signatureField',label:'Physician signature',detail:'Not found on the face-to-face note',section:'Physician note',severity:'missing',icon:'pen-line'},
    !state.authAck&&{id:'authExpiry',label:'Prior authorization period',detail:'Ends 7 months before the rental',section:'Prior authorization',severity:'warning',icon:'calendar-clock',tag:'Expiring'}
  ].filter(Boolean);
}

function renderReviewMenu(){
  const items=reviewItems(),count=items.length,reviewed=42-issueCount();
  $('#reviewTrigger').classList.toggle('all-clear',!count);
  $('#reviewCount').innerHTML=count?count:'<i data-lucide="check"></i>';
  $('#reviewTriggerText').textContent=count?`${count===1?'thing':'things'} to review`:'All reviewed';
  $('#reviewPopoverTitle').textContent=count?`${count} ${count===1?'item needs':'items need'} your attention`:'Everything is reviewed';
  const sections=[...new Set(items.map(item=>item.section))];
  $('#reviewItems').innerHTML=count?sections.map(section=>`<div class="review-group"><span class="review-group-title">${section}</span>${items.filter(item=>item.section===section).map(item=>`<button class="review-item ${item.severity}" data-review-target="${item.id}"><span class="review-icon"><i data-lucide="${item.icon||(item.severity==='missing'?'circle-alert':'triangle-alert')}"></i></span><span class="review-copy"><b>${item.label}</b><small>${item.detail}</small></span><span class="review-tag">${item.tag||(item.severity==='missing'?'Missing':'Check')}</span><i class="review-go" data-lucide="chevron-right"></i></button>`).join('')}</div>`).join(''):'<div class="review-empty"><i data-lucide="circle-check"></i><span>All required fields are complete. Select Looks good to finish.</span></div>';
  $('#reviewPopoverFoot').innerHTML=`<span>${reviewed} of 42 fields reviewed</span><span class="review-progress"><span style="width:${Math.round(reviewed/42*100)}%"></span></span>`;
  $('#footerReviewStatus').textContent=count?`${count} ${count===1?'item':'items'} left to review`:'All fields reviewed';
  icons();
}

function setSectionStatus(section,done,kind,label){
  const status=$(`${section} .section-status`);
  status.className=`section-status ${done?'success':kind}`;
  status.innerHTML=done?'<i data-lucide="circle-check"></i> Reviewed':`<i data-lucide="${kind==='danger'?'circle-x':'triangle-alert'}"></i> ${label}`;
}
function resolveFieldRow(id,badge){
  const row=$(`#${id}`);
  row.classList.add('resolved');
  row.querySelector('.confidence').textContent=badge;
  row.querySelector('.suggestion').hidden=true;
}

function updateProgress(){
  const remaining=issueCount();
  const reviewed=42-remaining;
  const patientRemaining=state.mobile?0:1;
  const prescriptionRemaining=[state.provider,state.product,state.physicianName].filter(value=>!value).length;
  $('#reviewedCount').textContent=reviewed;
  const patientStatus=$('#contact-section .section-status');
  $('#contact-section .card-header p').textContent=`${8-patientRemaining} of 8 fields complete`;
  patientStatus.className=`section-status ${patientRemaining?'warning':'success'}`;
  patientStatus.innerHTML=patientRemaining?`<i data-lucide="triangle-alert"></i> ${patientRemaining} ${patientRemaining===1?'needs':'need'} review`:'<i data-lucide="circle-check"></i> Reviewed';
  const prescriptionStatus=$('#prescription-section .section-status');
  prescriptionStatus.className=`section-status ${prescriptionRemaining?'danger':'success'}`;
  prescriptionStatus.innerHTML=prescriptionRemaining?`<i data-lucide="circle-x"></i> ${prescriptionRemaining} to resolve`:'<i data-lucide="circle-check"></i> Reviewed';
  setSectionStatus('#note-section',state.signature,'danger','1 missing');
  setSectionStatus('#prior-auth-section',state.authAck,'warning','1 needs review');
  $('#completeIntake').disabled=remaining>0;
  $('#completionCard').hidden=remaining>0;
  if(!remaining){
    const patientResult=state.patientLinked?'Existing patient linked':'Patient record ready';
    $('#completionCard p').textContent=`${patientResult}, insurance verified, prescription attached, and documents stored.`;
    $('#completionCard .completion-list span:first-child').innerHTML=`<i data-lucide="check"></i> ${patientResult}`;
  }
  $('#completeIntake').innerHTML=remaining?'<i data-lucide="check"></i> Looks good':'<i data-lucide="check"></i> Looks good';
  renderReviewMenu();
  icons();
}

function enableInlineEditing(){
  $$('.compact-fields strong,.summary-grid strong,#dobValue').forEach(value=>{
    value.contentEditable='plaintext-only';
    value.setAttribute('role','textbox');
    value.setAttribute('aria-label',`Edit ${value.previousElementSibling?.textContent||'value'}`);
    value.dataset.editable='true';
  });
}

function resolveMobile(){
  if(!$('#mobileInput').value.trim())return;
  state.mobile=true;
  $('#mobileField').classList.add('resolved');
  $('#mobileField .confidence').textContent='Reviewed';
  $('#mobileField .suggestion').hidden=true;
  updateProgress();
  toast('Mobile number confirmed');
}

function updateRequired(){
  const npi=$('#providerInput').value.trim();
  state.provider=/^\d{10}$/.test(npi);
  state.product=Boolean(hcpcsCodes.find(item=>item.required)?.policy);
  $('#providerField').classList.toggle('done',state.provider);
  $('#providerHint').textContent=state.provider?'NPI added':npi?'Enter all 10 digits':'Not found in uploaded documents';
  $('#physicianMeta').textContent=state.provider?'6 of 6 fields':'5 of 6 fields';
  updateProgress();
}

function renderIcdCodes(){
  $('#icdMeta').textContent=`${icdCodes.length} codes`;
  $('#icdList').innerHTML=icdCodes.map(item=>`<span class="code-chip"><b>${item.code}</b><span>${item.description}</span>${item.primary?'<em>Primary</em>':''}</span>`).join('')+'<button class="source-link" data-doc="referral"><i data-lucide="scan-text"></i> Referral.pdf · p1</button>';
  icons();
}

function policyName(id){const policy=coveragePolicies.find(item=>item.id===id);return policy?`${policy.id} - ${policy.name}`:'';}
function renderHcpcs(){
  const pending=hcpcsCodes.filter(item=>!item.policy).length;
  $('#hcpcsMeta').textContent=`${hcpcsCodes.length} codes${pending?` · ${pending} need coverage`:''}`;
  $('#hcpcsList').innerHTML=hcpcsCodes.map((item,index)=>`<article class="hcpcs-card ${item.open?'open':''} ${item.policy?'':'pending'}" ${item.required?'id="productField"':''}>
    <button class="hcpcs-head" data-hcpcs-toggle="${index}" aria-expanded="${Boolean(item.open)}"><span class="hcpcs-code">${item.code}</span><span class="hcpcs-copy"><strong>${item.description}</strong><small>${item.policy?`${item.ai?'AI selected · ':''}${policyName(item.policy)}`:'Medicare coverage not selected'}</small></span><span class="hcpcs-qty">Qty ${item.quantity}</span>${item.policy?'<span class="hcpcs-state done"><i data-lucide="circle-check"></i></span>':'<span class="hcpcs-state missing">Required</span>'}<i class="hcpcs-chevron" data-lucide="chevron-down"></i></button>
    <div class="coverage-box" ${item.open?'':'hidden'}>
      <strong class="coverage-title">Medicare Coverage Requirements</strong>
      <p>Coverage criteria depend on the intended use of the product. Please review the policies and select the one that applies. Check the Medicare criteria to confirm the patient is medically eligible and the product is covered. <b>Products that are statutorily non-covered by Medicare are explained in the criteria. If the patient has another type of insurance, different coverage criteria may apply.</b></p>
      <fieldset class="coverage-options"><legend>Please choose the one that applies:</legend>${coveragePolicies.map(policy=>`<label class="coverage-option"><input type="radio" name="coverage-${item.code}" value="${policy.id}" data-hcpcs-policy="${index}" ${item.policy===policy.id?'checked':''}><span>${policy.id} - ${policy.name}${item.policy===policy.id?'<small>Please review the <a href="#" data-coverage-link>detailed criteria guidelines</a> and <a href="#" data-coverage-link>policy article</a></small>':''}</span></label>`).join('')}</fieldset>
    </div>
  </article>`).join('');
  icons();
}

function renderRequiredDocuments(){
  const rows=requiredDocuments.map(item=>({...item,file:item.file||documents.find(file=>file.id===item.id)?.name}));
  const missing=rows.filter(item=>!item.file).length;
  $('#requiredDocsMeta').textContent=missing?`${missing} to upload`:'All received';
  $('#requiredDocs').innerHTML=rows.map(item=>`<div class="required-doc ${item.file?'received':'missing'}"><i data-lucide="${item.file?'file-check':'file-x'}"></i><span><strong>${item.name}</strong><small>${item.file?`Received · ${item.file}`:'Not in uploaded documents'}</small></span>${item.file?`<button class="text-btn" data-document="${documents.find(file=>file.name===item.file)?.id||''}">View</button>`:`<button class="small-btn" data-upload-required="${item.id}"><i data-lucide="upload"></i> Upload</button>`}</div>`).join('');
  icons();
}

function addFiles(fileList){
  const files=[...fileList];
  if(!files.length)return;
  files.forEach((file,index)=>documents.push({id:`upload-${Date.now()}-${index}`,name:file.name,meta:'Ready to extract',icon:'file-text',type:file.type||'Uploaded document',processing:false}));
  if(!state.selected)state.selected=documents[0].id;
  renderDocuments();renderUploadQueue();
  toast(`${files.length} ${files.length===1?'document':'documents'} ready to extract.`);
}

document.addEventListener('click',event=>{
  const target=event.target.closest('button,[data-doc]');
  if(!target)return;
  if(target.dataset.document){openDocument(target.dataset.document);return;}
  if(target.dataset.doc){openDocument(target.dataset.doc);return;}
  if(target.dataset.galleryDoc){openDocument(target.dataset.galleryDoc);return;}
  if(target.dataset.viewMode){setViewerMode(target.dataset.viewMode);return;}
  if(target.dataset.postAction){toast(`${target.dataset.postAction} selected`);return;}
  if(target.dataset.extractPatient){
    const patient=patientMatches.find(item=>item.id===target.dataset.extractPatient);state.patientResolved=true;state.patientLinked=true;
    syncExistingPatientFiles();
    resolvePatientIssue(patient.name,`${patient.mrn} · Existing patient linked`);$('#documentIssue').hidden=false;icons();toast(`${patient.name} selected. Review document matches next.`);setTimeout(()=>$('#documentIssue').scrollIntoView({behavior:'smooth',block:'start'}),50);checkExtractionReady();return;
  }
  if(target.dataset.changePatient!==undefined){state.patientResolved=false;state.patientLinked=false;syncExistingPatientFiles();renderExtractionPatientMatches();return;}
  if(target.dataset.extractPatientDetails){const card=$(`#extract-patient-${target.dataset.extractPatientDetails}`),details=card.querySelector('.extract-patient-details'),open=details.hidden;details.hidden=!open;target.setAttribute('aria-expanded',open);target.textContent=open?'Hide details':'View details';return;}
  if(target.dataset.extractNewPatient!==undefined){state.patientResolved=true;state.patientLinked=false;syncExistingPatientFiles();resolvePatientIssue('Create a new patient','No existing record will be linked');$('#documentIssue').hidden=false;icons();setTimeout(()=>$('#documentIssue').scrollIntoView({behavior:'smooth',block:'start'}),50);checkExtractionReady();return;}
  if(target.dataset.extractDocument){
    const id=target.dataset.extractDocument;state.documentResolutions.add(id);const card=$(`#extract-${id}`);card.classList.add('resolved');card.querySelector('.extract-document-actions').innerHTML=`<div class="issue-resolved"><i data-lucide="check"></i><span><strong>Decision saved</strong><small>${target.dataset.decision==='existing'?'Existing document will be used.':target.dataset.decision==='replace'?'Existing document will be replaced.':'Uploaded document will be stored.'}</small></span></div>`;
    if(state.documentResolutions.size===2)$('#documentIssue .issue-title>b').textContent='Resolved';icons();checkExtractionReady();return;
  }
  if(target.dataset.plan!==undefined){renderInsurance(+target.dataset.plan);return;}
  if(target.dataset.planEdit!==undefined){state.editingPlan=true;renderInsurance();$('[data-plan-field]')?.focus();return;}
  if(target.dataset.planCancel!==undefined){state.editingPlan=false;renderInsurance();return;}
  if(target.dataset.planSave!==undefined){const plan=insurancePlans[state.currentPlan];$$('[data-plan-field]').forEach(input=>{plan.fields[input.dataset.planField][1]=input.value.trim()||'Not provided';});state.editingPlan=false;plan.check=null;renderInsurance();toast(`${plan.name} updated. Check eligibility again for ${state.serviceType}.`);return;}
  if(target.dataset.planCheck!==undefined){checkPlanEligibility();return;}
  if(target.dataset.swapOrder!==undefined){insurancePlans.reverse();state.currentPlan=0;renderInsurance(0);toast('Coverage order swapped');return;}
  if(target.dataset.existing){
    const file=existingFiles.find(item=>item.id===target.dataset.existing);
    if(!file)return;
    toast(file.extracted?`${file.name} was extracted previously.`:`${file.name} has not been extracted. Add it to this intake to extract it.`);
    return;
  }
  if(target.dataset.useExisting){
    const file=existingFiles.find(item=>item.id===target.dataset.useExisting);if(!file)return;
    file.used=!file.used;
    if(file.used&&!file.extracted){file.meta='Extracting for this intake…';renderExistingFiles();setTimeout(()=>{file.extracted=true;file.meta='Extracted for this intake';renderExistingFiles();toast(`${file.name} is ready for this intake`);},900);}else{renderExistingFiles();toast(file.used?`${file.name} added to this intake`:`${file.name} removed from this intake`);}return;
  }
  if(target.dataset.patientDetails){const card=$(`#patient-${target.dataset.patientDetails}`),details=card.querySelector('.patient-details'),open=details.hidden;details.hidden=!open;target.setAttribute('aria-expanded',open);target.textContent=open?'Hide details':'View details';return;}
  if(target.dataset.linkPatient){
    const patient=patientMatches.find(item=>item.id===target.dataset.linkPatient);state.patientLinked=true;
    $('#matchCard').hidden=true;syncExistingPatientFiles();
    updateProgress();toast(`${patient.name} linked.`);return;
  }
  if(target.dataset.matchNew!==undefined){state.patientLinked=false;$('#matchCard').hidden=true;syncExistingPatientFiles();updateProgress();toast('New patient selected.');return;}
  if(target.dataset.signature){state.signature=true;$('#signatureValue').textContent=target.dataset.signature==='signed'?'Signed 10/12/2026':'Requested from Dr. Sarah Kim';resolveFieldRow('signatureField',target.dataset.signature==='signed'?'Marked as signed':'Signature requested');updateProgress();toast(target.dataset.signature==='signed'?'Signature marked as present':'Signature request sent to Dr. Sarah Kim');return;}
  if(target.dataset.authAck!==undefined){state.authAck=true;resolveFieldRow('authExpiry','Acknowledged');updateProgress();toast('Authorization gap acknowledged');return;}
  if(target.dataset.hcpcsToggle!==undefined){const item=hcpcsCodes[target.dataset.hcpcsToggle];item.open=!item.open;renderHcpcs();return;}
  if(target.dataset.uploadRequired){$('#requiredDocInput').dataset.requiredId=target.dataset.uploadRequired;$('#requiredDocInput').click();return;}
  if(target.id==='changeDob'){
    target.closest('.ai-decision').innerHTML='<i data-lucide="pencil"></i><span><b>Override AI value</b><input class="input compact-override" id="dobOverride" value="03/15/1978" aria-label="Override date of birth"></span><button class="small-btn" data-save-dob>Save</button>';
    icons();$('#dobOverride').focus();return;
  }
  if(target.dataset.saveDob!==undefined){const value=$('#dobOverride').value.trim();if(!value)return;$('#dobValue').textContent=value;target.closest('.ai-decision').innerHTML='<i data-lucide="check"></i><span><b>Manual override saved</b>This value will be recorded instead of the AI-selected value.</span>';icons();toast('Date of birth override saved');return;}
  if(target.dataset.jump){document.getElementById(target.dataset.jump).scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(target.dataset.reviewTarget){
    const destination=$(`#${target.dataset.reviewTarget}`),group=destination?.closest('details');if(group)group.open=true;
    $('#reviewPopover').hidden=true;$('#reviewTrigger').setAttribute('aria-expanded','false');
    setTimeout(()=>{destination?.scrollIntoView({behavior:'smooth',block:'center'});destination?.querySelector('input,select')?.focus({preventScroll:true});},30);return;
  }
  if(target.dataset.match){setSourceDrawer(true);$('#matchCard').hidden=false;setTimeout(()=>$('#matchCard').scrollIntoView({block:'nearest',behavior:'smooth'}),50);return;}
});

$('#collapseSources').addEventListener('click',()=>setSourceDrawer(false));
$('#checkEligibility').addEventListener('click',checkEligibility);
const setServiceMenu=open=>{$('#serviceMenu').hidden=!open;$('#serviceTrigger').setAttribute('aria-expanded',open);if(open){renderServiceMenu();$('#serviceMenu .selected')?.focus();}};
$('#serviceTrigger').addEventListener('click',()=>setServiceMenu($('#serviceMenu').hidden));
$('#serviceMenu').addEventListener('click',event=>{const option=event.target.closest('[data-service-type]');if(!option)return;state.serviceType=option.dataset.serviceType;setServiceMenu(false);renderInsurance();$('#serviceTrigger').focus();});
$('#serviceMenu').addEventListener('keydown',event=>{const options=$$('.service-option'),index=options.indexOf(document.activeElement);if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();options[(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length].focus();}if(event.key==='Escape'){setServiceMenu(false);$('#serviceTrigger').focus();}});
document.addEventListener('click',event=>{if(!event.composedPath().some(node=>node.classList?.contains('service-select')))setServiceMenu(false);});
$('#addPlan').addEventListener('click',()=>toast('New insurance plan form opened'));
$('#queuePatients').addEventListener('click',event=>{
  if(event.target.closest('#findPatient')){closeRecordPicker();$('#patientSearch').hidden=false;$('#patientSearchInput').value='';renderPatientSearch();$('#patientSearchInput').focus();return;}
  const chip=event.target.closest('[data-queue-patient]');
  if(chip)state.pickerPatient===chip.dataset.queuePatient?closeRecordPicker():openRecordPicker(chip.dataset.queuePatient);
});
$('#patientSearchInput').addEventListener('input',renderPatientSearch);
$('#patientSearchInput').addEventListener('keydown',event=>{if(event.key==='Escape')$('#patientSearch').hidden=true;});
$('#closePatientSearch').addEventListener('click',()=>{$('#patientSearch').hidden=true;});
$('#patientSearchResults').addEventListener('click',event=>{const result=event.target.closest('[data-search-patient]');if(result)openRecordPicker(result.dataset.searchPatient);});
$('#recordPickerList').addEventListener('change',event=>{const id=event.target.dataset.recordDoc;if(!id)return;event.target.checked?state.pickerSelection.add(id):state.pickerSelection.delete(id);renderRecordPicker();});
$('#toggleRecordDocs').addEventListener('click',()=>{const patient=intakeQueue.find(item=>item.id===state.pickerPatient);state.pickerSelection=state.pickerSelection.size?new Set():new Set(patient.documents.filter(file=>!documents.some(item=>item.id===file.id)).map(file=>file.id));renderRecordPicker();});
$('#addRecordDocs').addEventListener('click',addRecordDocuments);
$('#closeRecordPicker').addEventListener('click',closeRecordPicker);
['dragenter','dragover'].forEach(type=>$('#uploadStartZone').addEventListener(type,event=>{event.preventDefault();$('#uploadStartZone').classList.add('over');}));
['dragleave','drop'].forEach(type=>$('#uploadStartZone').addEventListener(type,event=>{event.preventDefault();$('#uploadStartZone').classList.remove('over');if(type==='drop')addFiles(event.dataTransfer.files);}));
renderQueuePatients();
$('#extractDocuments').addEventListener('click',startExtraction);
$('#cancelUpload').addEventListener('click',()=>{
  if(!documents.length)return;
  documents.length=0;state.selected='';
  closeRecordPicker();$('#patientSearch').hidden=true;$('#fileInput').value='';
  renderDocuments();renderUploadQueue();
  toast('Upload cancelled. Documents removed.');
});
$('#expandSources').addEventListener('click',()=>setSourceDrawer(!$('#sourcePanel').classList.contains('drawer-open')));
$('#sourceScrim').addEventListener('click',()=>setSourceDrawer(false));
$('#reviewTrigger').addEventListener('click',()=>{const popover=$('#reviewPopover'),open=popover.hidden;popover.hidden=!open;$('#reviewTrigger').setAttribute('aria-expanded',open);});
document.addEventListener('click',event=>{if(!event.composedPath().some(node=>node.classList?.contains('review-menu'))){$('#reviewPopover').hidden=true;$('#reviewTrigger').setAttribute('aria-expanded','false');}});
$('#collapseViewer').addEventListener('click',()=>{$('#workspace').classList.add('viewer-collapsed');});
$('#expandViewer').addEventListener('click',()=>{$('#workspace').classList.remove('viewer-collapsed');});
let viewerDrag=null;
$('#viewerResize').tabIndex=0;
$('#viewerResize').addEventListener('pointerdown',event=>{viewerDrag={startX:event.clientX,startWidth:$('#documentViewer').getBoundingClientRect().width};document.body.classList.add('resizing-viewer');event.preventDefault();});
document.addEventListener('pointermove',event=>{if(!viewerDrag)return;const width=Math.min(680,Math.max(300,viewerDrag.startWidth+viewerDrag.startX-event.clientX));document.documentElement.style.setProperty('--viewer-w',`${width}px`);});
const stopViewerResize=()=>{viewerDrag=null;document.body.classList.remove('resizing-viewer');};
document.addEventListener('pointerup',stopViewerResize);document.addEventListener('pointercancel',stopViewerResize);
$('#viewerResize').addEventListener('keydown',event=>{if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;event.preventDefault();const current=$('#documentViewer').getBoundingClientRect().width,change=event.key==='ArrowLeft'?20:-20;document.documentElement.style.setProperty('--viewer-w',`${Math.min(680,Math.max(300,current+change))}px`);});
if($('#confirmMobile'))$('#confirmMobile').addEventListener('click',resolveMobile);
if($('#providerInput'))$('#providerInput').addEventListener('input',updateRequired);
$('#physicianConflict').addEventListener('change',event=>{if(event.target.dataset.physicianName===undefined)return;state.physicianName=true;resolveFieldRow('physicianConflict',`Resolved · ${event.target.value}`);updateProgress();});
$('#hcpcsList').addEventListener('change',event=>{const index=event.target.dataset.hcpcsPolicy;if(index===undefined)return;const item=hcpcsCodes[index];item.policy=event.target.value;item.ai=false;renderHcpcs();updateRequired();});
$('#hcpcsList').addEventListener('click',event=>{if(event.target.closest('[data-coverage-link]')){event.preventDefault();toast('Opens the Medicare coverage policy');}});
$('#addHcpcsToggle').addEventListener('click',()=>{$('#addHcpcsForm').hidden=false;$('#addHcpcsToggle').hidden=true;$('#newHcpcsCode').focus();});
const closeHcpcsForm=()=>{$('#addHcpcsForm').reset();$('#addHcpcsForm').hidden=true;$('#addHcpcsToggle').hidden=false;};
$('#cancelHcpcs').addEventListener('click',closeHcpcsForm);
$('#addHcpcsForm').addEventListener('submit',event=>{
  event.preventDefault();
  const code=$('#newHcpcsCode').value.trim().toUpperCase();
  if(hcpcsCodes.some(item=>item.code===code)){toast(`${code} is already on this prescription`);return;}
  hcpcsCodes.push({code,description:$('#newHcpcsDescription').value.trim(),quantity:Number($('#newHcpcsQty').value)||1,policy:'',open:true});
  closeHcpcsForm();renderHcpcs();toast(`${code} added. Choose the Medicare coverage that applies.`);
});
$('#requiredDocInput').addEventListener('change',event=>{
  const file=event.target.files[0],required=requiredDocuments.find(item=>item.id===event.target.dataset.requiredId);
  if(!file||!required)return;
  const id=`required-${required.id}`;
  documents.push({id,name:file.name,meta:required.name,icon:'file-check',type:required.name,processing:false});
  required.file=file.name;
  event.target.value='';
  renderDocuments();renderRequiredDocuments();
  toast(`${file.name} added to documents as ${required.name}`);
});
if($('#fileInput'))$('#fileInput').addEventListener('change',event=>addFiles(event.target.files));
if($('#dropZone'))['dragenter','dragover'].forEach(type=>$('#dropZone').addEventListener(type,event=>{event.preventDefault();$('#dropZone').classList.add('over');}));
if($('#dropZone'))['dragleave','drop'].forEach(type=>$('#dropZone').addEventListener(type,event=>{event.preventDefault();$('#dropZone').classList.remove('over');if(type==='drop')addFiles(event.dataTransfer.files);}));
if($('#completeIntake'))$('#completeIntake').addEventListener('click',()=>{
  showPostIntake();
  toast('Intake completed successfully');
});
if($('#returnToReview'))$('#returnToReview').addEventListener('click',returnToIntakeReview);

renderDocuments();
renderDuplicateFindings();
renderPatientMatches();
renderInsurance();
renderIcdCodes();
renderHcpcs();
renderRequiredDocuments();
enableInlineEditing();
updateProgress();
setSourceDrawer(false);
renderUploadQueue();
setPhase('upload');
icons();
const setNavCollapsed=collapsed=>{document.body.classList.toggle('nav-collapsed',collapsed);const toggle=$('#navToggle');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');toggle.title=toggle.getAttribute('aria-label');};
setNavCollapsed(window.matchMedia('(max-width:900px)').matches);
$('#navToggle').addEventListener('click',()=>setNavCollapsed(!document.body.classList.contains('nav-collapsed')));
$$('[data-nav-section]').forEach(section=>section.addEventListener('click',()=>{const open=section.parentElement.classList.toggle('open');section.setAttribute('aria-expanded',String(open));}));
$$('.shell-nav a[href="#"]').forEach(link=>link.addEventListener('click',event=>event.preventDefault()));
$('#shellBack').addEventListener('click',()=>history.back());
$('#shellRefresh').addEventListener('click',()=>location.reload());
