const demoDocuments = [
  { id:'referral', name:'Referral.pdf', meta:'2 pages · Extracted', icon:'file-text', type:'Referral' },
  { id:'insurance', name:'Insurance Card.jpg', meta:'1 page · Duplicate found', icon:'badge-check', type:'Insurance card' },
  { id:'prescription', name:'Prescription.pdf', meta:'1 page · Extracted', icon:'notebook-tabs', type:'Prescription' },
  { id:'prescription-2', name:'Oxygen Prescription.jpg', meta:'1 page · Extracted', icon:'notebook-tabs', type:'Prescription' },
  { id:'consent', name:'Consent Form.pdf', meta:'2 pages · Low confidence', icon:'file-signature', type:'Consent form' }
];
const recordDocument=(id,name,type,icon,date)=>({id,name,type,icon,date});
const intakeQueue=[
  {id:'ashlynn',name:'Ashlynn Botosh',mrn:'PT-10482',dob:'03/15/1978',documents:[...demoDocuments.map(file=>({...file,date:'Oct 14, 2026'})),recordDocument('sleep-study','Sleep Study.pdf','Sleep study','file-chart-column','Oct 12, 2026'),recordDocument('face-to-face','Face-to-Face Notes.pdf','Clinical notes','stethoscope','Oct 12, 2026')]},
  {id:'marcus',name:'Marcus Thornton',mrn:'PT-11207',dob:'07/02/1961',documents:[recordDocument('marcus-rx','Prescription.pdf','Prescription','notebook-tabs','Oct 15, 2026'),recordDocument('marcus-insurance','Insurance Card.jpg','Insurance card','badge-check','Oct 15, 2026')]},
  {id:'jaydon',name:'Jaydon Vetrovs',mrn:'PT-09954',dob:'11/23/1990',documents:[recordDocument('jaydon-referral','Referral.pdf','Referral','file-text','Oct 13, 2026'),recordDocument('jaydon-insurance','Insurance Card.jpg','Insurance card','badge-check','Oct 13, 2026'),recordDocument('jaydon-rx','Prescription.pdf','Prescription','notebook-tabs','Oct 13, 2026'),recordDocument('jaydon-consent','Consent Form.pdf','Consent form','file-signature','Oct 13, 2026')]}
];
const patientDirectory=[
  ...intakeQueue,
  {id:'priya',name:'Priya Shah',mrn:'PT-07718',dob:'05/09/1984',documents:[recordDocument('priya-referral','Referral.pdf','Referral','file-text','Oct 10, 2026'),recordDocument('priya-insurance','Insurance Card.jpg','Insurance card','badge-check','Oct 10, 2026'),recordDocument('priya-rx','Prescription.pdf','Prescription','notebook-tabs','Oct 10, 2026')]},
  {id:'daniel',name:'Daniel Ortiz',mrn:'PT-05561',dob:'01/30/1957',documents:[recordDocument('daniel-rx','Prescription.pdf','Prescription','notebook-tabs','Oct 8, 2026')]},
  {id:'grace',name:'Grace Liu',mrn:'PT-12093',dob:'09/18/1972',documents:[recordDocument('grace-referral','Referral.pdf','Referral','file-text','Oct 9, 2026'),recordDocument('grace-sleep','Sleep Study.pdf','Sleep study','file-chart-column','Oct 9, 2026')]}
];
const documents = [];
const coveragePolicies=[
  {id:'L33718',name:'Positive Airway Pressure (PAP) Devices for the Treatment of Obstructive Sleep Apnea'},
  {id:'L33800',name:'Respiratory Assist Devices'},
  {id:'L33797',name:'Oxygen and Oxygen Equipment'}
];
const existingFiles=[
  {id:'existing-insurance',name:'Insurance Card · Sep 2025.pdf',meta:'Extracted previously',icon:'badge-check',extracted:true,used:false},
  {id:'existing-consent',name:'Consent Form.pdf',meta:'Extracted previously',icon:'file-signature',extracted:true,used:true},
  {id:'existing-sleep',name:'Sleep Study · Aug 2022.pdf',meta:'Not extracted yet',icon:'file-chart-column',extracted:false,used:false}
];
const patientMatches=[
  {id:'ashlynn',initials:'AB',name:'Ashlynn Botosh',confidence:94,dob:'03/15/1978',address:'1234 Healthways Blvd, Suite 200, Seattle, WA 98101',phone:'(415) 220-8841',email:'ashlynn.botosh@email.com',payer:'Aetna',memberId:'W284719305',mrn:'PT-10482',reason:''},
  {id:'ashlyn',initials:'AB',name:'Ashlyn Botosh',confidence:81,dob:'03/15/1978',address:'1184 Healthway Blvd, Seattle, WA 98101',phone:'(415) 220-8891',email:'a.botosh@email.com',payer:'Aetna',memberId:'W284719377',mrn:'PT-08731',reason:'Similar name, same DOB, and nearby address'},
  {id:'ashley',initials:'AR',name:'Ashley Brown',confidence:68,dob:'03/16/1978',address:'202 Elm Street, Bellevue, WA 98004',phone:'(206) 555-0188',email:'ashley.brown@email.com',payer:'Premera Blue Cross',memberId:'PRM550018842',mrn:'PT-06319',reason:'Similar name and DOB from insurance document'}
];
const duplicateFindings=[
  {id:'insurance-similar',kind:'similar',upload:'Insurance Card.jpg',existing:'Insurance Card · Sep 2025.pdf',reason:'Same member ID; uploaded card has newer coverage dates',score:96,decision:'Replaced older insurance card',detail:'The uploaded card is newer. AI is extracting the updated coverage automatically.',extracting:true},
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
  referral:'assets/referral.svg',insurance:'assets/insurance.svg',prescription:'assets/prescription.svg','prescription-2':'assets/prescription.svg',consent:'assets/consent.svg',
  'sleep-study':'assets/sleep-study.svg','face-to-face':'assets/referral.svg',
  'sleep-test':'assets/sleep-study.svg',oximetry:'assets/sleep-study.svg','photo-id':'assets/insurance.svg','secondary-insurance':'assets/insurance.svg',
  'existing-insurance':'assets/insurance.svg','existing-consent':'assets/consent.svg','existing-sleep':'assets/sleep-study.svg'
};

const serviceTypes=[
  {id:'Clinical Services',icon:'stethoscope',description:'Office visits and clinical care'},
  {id:'DME',icon:'package',description:'Durable medical equipment and supplies'},
  {id:'Immunization',icon:'syringe',description:'Vaccines and administration'},
  {id:'Counselling',icon:'messages-square',description:'Behavioral and therapy sessions'}
];
const insurancePlans=[
  {id:'medicare',name:'Medicare Part B',systemRank:'Secondary',aiRank:'Primary',source:'Insurance Card.jpg',docId:'insurance',aiReason:'Aetna is a small-employer group plan (under 100 employees), so Medicare pays first.',response:{payer:'CMS Medicare (HETS)',trace:'HETS-26101594217',deductible:'$257.00',deductibleMet:'$257.00',oop:'Not applicable',network:'Medicare-enrolled supplier'},eligibility:'Active',status:'active',check:{service:'DME',at:'Oct 20, 2026 · 9:42 AM',discovered:{name:'Premera Blue Cross PPO',payer:'Premera Blue Cross',memberId:'PRM884210375',group:'GRP-77120',type:'Commercial PPO',dates:'01/01/2026 – 12/31/2026',note:'Not on this intake. Medicare’s response lists this as another active plan for the patient.'}},results:{'Clinical Services':{eligible:true,detail:'20% coinsurance after Part B deductible'},DME:{eligible:true,detail:'20% coinsurance after Part B deductible'},Immunization:{eligible:true,detail:'Covered at 100% for flu, pneumococcal, and COVID-19'},Counselling:{eligible:false,detail:'Requires a Medicare-enrolled behavioral health provider'}},fields:[['Insurance type','Medicare'],['Health insurance company','Medicare Health Care Plan'],['Relationship to insured','Self'],['Member ID prefix','X'],['Member ID','BCB731045298'],['Member ID suffix','03'],['Group number','Not provided'],['Effective from','12/31/2022'],['Effective to','12/30/2027']]},
  {id:'aetna',name:'Aetna Choice POS II',systemRank:'Primary',aiRank:'Secondary',source:'Insurance Card.jpg · back',docId:'insurance',aiReason:'Group number GRP-258914 is a small-employer plan, which pays after Medicare.',response:{payer:'Aetna',trace:'AET-0417-88213',deductible:'$1,500.00',deductibleMet:'$1,120.00',oop:'$4,000.00 · $1,860.00 met',network:'In network'},eligibility:'Active',status:'active',check:{service:'DME',at:'Oct 20, 2026 · 9:42 AM'},results:{'Clinical Services':{eligible:true,detail:'$30 copay per visit'},DME:{eligible:true,detail:'20% coinsurance · prior authorization on file'},Immunization:{eligible:true,detail:'Covered at 100% in network'},Counselling:{eligible:true,detail:'$30 copay per session'}},fields:[['Insurance type','Commercial PPO'],['Health insurance company','Aetna'],['Relationship to insured','Self'],['Member ID prefix','Z'],['Member ID','AET529187463'],['Member ID suffix','07'],['Group number','GRP-258914'],['Effective from','03/15/2025'],['Effective to','03/14/2027']]},
  {id:'medicaid',name:'Washington Apple Health',systemRank:null,aiRank:'Tertiary',source:'Referral.pdf · p2',docId:'referral',aiReason:'Medicaid is always the payer of last resort. This plan isn’t in the system yet.',eligibility:'Inactive',status:'inactive',check:{service:'DME',at:'Oct 20, 2026 · 9:42 AM'},response:{payer:'Washington State HCA',trace:'WAHCA-7731902',deductible:'$0.00',deductibleMet:'$0.00',oop:'Not applicable',network:'Enrolled provider'},results:{'Clinical Services':{eligible:false,detail:'Coverage ended 09/30/2026'},DME:{eligible:false,detail:'Coverage ended 09/30/2026 · member not enrolled on the date of service'},Immunization:{eligible:false,detail:'Coverage ended 09/30/2026'},Counselling:{eligible:false,detail:'Coverage ended 09/30/2026'}},fields:[['Insurance type','Medicaid'],['Health insurance company','Washington State Health Care Authority'],['Relationship to insured','Self'],['Member ID prefix','—'],['Member ID','200458812WA'],['Member ID suffix','—'],['Group number','Not provided'],['Effective from','07/01/2026'],['Effective to','09/30/2026']]}
];

insurancePlans.forEach(plan=>{if(plan.check?.discovered){plan.otherCoverage=plan.check.discovered;delete plan.check.discovered;}});
const state = { serviceType:'DME', checkingEligibility:false, checkingPlan:false, editingPlan:false, currentPlan:0, physicianName:true, signature:true, authAck:true, selected:'', pickerPatient:'', pickerSelection:new Set(), viewerMode:'preview', phase:'upload', extracting:false, extractionComplete:false, patientResolved:false, documentResolutions:new Set(), started:false, resolutionPending:false, dob:true, mobile:true, provider:true, product:true, patientLinked:false, completed:false, precheck:null, precheckAt:'', knownPatient:null, docDecisionsNeeded:2, aiEdited:new Set(), aiReviewed:new Set() };
// Conflicts AI resolved during extraction. They don't block completion, but stay listed so the user can review them.
const aiResolvedFields=[
  {id:'dobConflict',key:'dob',label:'Date of birth',detail:'Kept 03/15/1978 · insurance card showed 03/16/1978',section:'Patient demographics'},
  {id:'mobileField',key:'mobile',label:'Mobile phone number',detail:'Blurry digits matched to patient record',section:'Contact information'},
  {id:'insurance-section',key:'coverage',label:'Insurance coverage order',detail:'Medicare set as primary · differs from system',section:'Insurance information'},
  {id:'rx-rx2-item-1',key:'mapping',label:'Oxygen concentrator mapped to E1390',detail:'AI mapped the product name to a HCPCS code',section:'Prescription 2'}
];
const aiChangeFields={
  mobile:{value:'#mobileValue',label:'mobile number',row:'mobileField'}
};
const postIntakeRecommendation={
  patient:'Ashlynn Botosh',context:'Existing patient · New PAP setup',title:'New PAP therapy intake',summary:'Ashlynn has a prescription supporting PAP therapy for obstructive sleep apnea, active insurance coverage, and the clinical documents needed to begin qualification. No matching fulfilled PAP equipment order was found.',action:'Start pre-check',reason:'Confirm payer qualification, coverage, and required documentation before creating the new equipment order.',alternatives:['Create order without pre-check','Schedule setup appointment'],services:[{name:'PAP setup and education',reason:'Supports safe device use for a new therapy setup.'},{name:'Initial mask fitting',reason:'Helps select an appropriate interface before fulfillment.'},{name:'Compliance monitoring',reason:'Supports follow-up after therapy begins.'},{name:'Home oxygen setup and safety education',reason:'Needed for the new oxygen concentrator prescription.'}],dme:[{name:'CPAP device',reason:'Supported by the reviewed PAP prescription.'},{name:'Heated humidifier',reason:'Recommended as part of the initial PAP setup.'},{name:'Mask and starter supplies',reason:'Needed to begin the prescribed therapy.'},{name:'Oxygen concentrator and cannula',reason:'Supported by the reviewed oxygen prescription.'}],note:'Final coverage and item eligibility remain subject to payer review.'
};
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function icons(){ if(window.lucide) window.lucide.createIcons(); }
function toast(message){ const element=$('#toast'); element.textContent=message; element.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>element.classList.remove('show'),2200); }

function renderDocuments(){
  if(window.progressReady)saveSoon();
  renderFileList();
  renderViewerGallery();
  icons();
}

// One list for every file in the pane: uploaded files plus the linked patient's existing files.
function renderFileList(){
  const list=$('#fileList');if(!list)return;
  const filter=state.fileFilter||'all',view=state.fileView||'list';
  const uploaded=documents,existing=state.patientLinked?existingFiles:[];
  $('#cntAll').textContent=uploaded.length+existing.length;
  $('#cntUploaded').textContent=uploaded.length;
  $('#cntExisting').textContent=existing.length;
  $$('[data-file-filter]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.fileFilter===filter));
  $$('[data-file-view]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.fileView===view));
  const items=[...(filter==='existing'?[]:uploaded.map(file=>({file,src:'uploaded'}))),...(filter==='uploaded'?[]:existing.map(file=>({file,src:'existing'})))];
  list.className=`file-list ${view}`;
  const pendingCount=documents.filter(file=>file.pendingExtract).length,bar=$('#reextractBar');
  if(bar){bar.hidden=state.phase!=='review'||(!pendingCount&&!state.reextracting);
    $('#reextractCount').textContent=state.reextracting?'Extracting…':`${pendingCount} new ${pendingCount===1?'document':'documents'} to extract`;
    $('#reextractBtn').disabled=Boolean(state.reextracting);}
  $('#viewerFiles').classList.toggle('is-empty',!items.length);
  syncSplitPreview();
  if(!items.length){list.innerHTML=`<p class="file-empty">${filter==='existing'&&!state.patientLinked?'No existing files. They appear once a patient is linked.':'No files yet'}</p>`;return;}
  list.innerHTML=items.map(({file,src})=>{
    const key=src==='existing'?`data-existing="${file.id}"`:`data-document="${file.id}"`;
    const trailing=src==='existing'
      ?`<button class="use-existing ${file.used?'on':''}" data-use-existing="${file.id}" aria-pressed="${file.used}" title="${file.used?'Remove from this intake':'Use in this intake'}">${file.used?'<i data-lucide="check"></i> In intake':'<i data-lucide="plus"></i> Add'}</button>`
      :file.uploading||file.processing?'<span class="file-state"><span class="spinner"></span></span>'
      :file.pendingExtract?`<button class="use-existing extract-one" data-extract-one="${file.id}" title="Extract this document"><i data-lucide="sparkles"></i> Extract</button>`
      :state.phase==='upload'?`<button type="button" class="queue-remove" data-remove-upload="${file.id}" aria-label="Remove ${file.name}" title="Remove"><i data-lucide="x"></i></button>`
      :`<span class="file-state">${file.processing?'<span class="spinner"></span>':'<i data-lucide="circle-check"></i>'}</span>`;
    const tag=src==='existing'?'<em class="file-tag">Existing</em>':file.pendingExtract?'<em class="file-tag is-new">New</em>':'';
    const body=view==='grid'
      ?`<button class="file-main" ${key}><span class="gallery-thumb"><img src="${imageForDocument(file)}" alt=""></span><span class="file-name"><strong>${file.name}</strong>${tag}</span><small>${file.meta}</small></button>`
      :`<button class="file-main" ${key}>${formatBadge(file.name)}<span class="doc-info"><strong>${file.name}</strong><span>${file.pendingExtract?'<em class="file-tag is-new">New</em> ':''}${file.meta}${src==='existing'?' · Existing':''}</span></span></button>`;
    return `<div class="file-item ${file.id===state.selected?'active':''} ${src}">${body}${trailing}</div>`;
  }).join('');
  icons();
}

// Before review, the preview sits beside the files and follows the selected file.
function syncSplitPreview(){
  const pane=$('#viewerPreview');
  if(state.phase==='review'){pane.classList.remove('is-empty');return;}
  const file=documents.find(item=>item.id===state.selected);
  pane.classList.toggle('is-empty',!file);
  if(!file||$('#documentImage').dataset.doc===file.id)return;
  const pages=(file.size||file.meta||'').split(' · ')[0];
  $('#previewName').textContent=file.name;
  $('#previewMeta').textContent=/page|image/.test(pages)?pages:'Page 1';
  const image=$('#documentImage');image.src=imageForDocument(file);image.alt=`${file.name} document preview`;image.dataset.doc=file.id;
}

// File icons show the format (PDF, JPG, PNG), not a guess at the document type.
const fileFormat=name=>{const ext=(name.split('.').pop()||'').toUpperCase();return ext==='JPEG'?'JPG':ext;};
const formatBadge=name=>{const format=fileFormat(name);return `<span class="doc-icon format-badge ${format==='PDF'?'is-pdf':'is-image'}" aria-hidden="true">${format}</span>`;};
function renderUploadQueue(){
  $('#extractDocuments').disabled=!documents.length||state.extracting||documents.some(file=>file.uploading);
  // Ready to extract: the button widens to "Extract documents" so the next step is obvious.
  document.dispatchEvent(new Event('intake:change'));
  $('#extractDocuments').classList.toggle('is-ready',!$('#extractDocuments').disabled&&state.phase==='upload');
  $('#cancelUpload').disabled=!documents.length||state.extracting;
  renderStartScreen();
}
const renderExtractionFiles=()=>renderFileList();

// Start screen: upload files, pull them from a patient's record, or both.
const linkedPatient=()=>patientDirectory.find(patient=>patient.id===state.knownPatient);
function renderStartScreen(){
  if(!$('#intakeStart'))return;
  const patient=linkedPatient(),count=documents.length,busy=documents.some(file=>file.uploading);
  $('#uploadList').hidden=!count;
  $('#uploadListCount').textContent=`${count} ${count===1?'document':'documents'}`;
  $('#uploadQueue').innerHTML=documents.map(file=>{
    const meta=file.uploading?'Uploading…':file.fromRecord?`${file.type} · From ${patient?.name.split(' ')[0]||'patient'}’s record`:`${file.type}${file.size?` · ${file.size}`:''}`;
    return `<div class="us-upload ${file.uploading?'is-uploading':''}">${formatBadge(file.name)}<span class="us-upload-info"><strong>${file.name}</strong><small>${meta}</small></span>${file.uploading?'<span class="spinner"></span>':`<button type="button" class="icon-btn" data-remove-upload="${file.id}" aria-label="Remove ${file.name}" title="Remove"><i data-lucide="x"></i></button>`}</div>`;
  }).join('');
  $('#dropTitle').textContent=patient?`Add more documents for ${patient.name.split(' ')[0]}`:'Drag and drop documents here';
  $('#startLead').textContent=patient?`Documents you add go to ${patient.name}’s intake. Nothing is processed until you select Extract.`:'Add prescriptions, insurance cards, referrals, and clinical records. Nothing is processed until you select Extract.';
  $('#startExtract').disabled=!count||busy||state.extracting;
  $('#startFooterNote').innerHTML=!count?'':patient?`<i data-lucide="user-round-check"></i> ${count} ${count===1?'document':'documents'} for <b>${patient.name}</b>`:`<i data-lucide="sparkles"></i> ${count} ${count===1?'document':'documents'} · AI matches the patient after extraction`;
  renderQueuePatients();
}

function recordDocsList(patient){
  const docs=patient.documents.map(file=>{const done=documents.some(item=>item.id===file.id);return `<label class="us-doc ${done?'added':''}"><input type="checkbox" data-record-doc="${file.id}" ${done||state.pickerSelection.has(file.id)?'checked':''} ${done?'disabled':''}>${formatBadge(file.name)}<span><strong>${file.name}</strong><small>${done?'Added to this intake':`${file.type} · ${file.date}`}</small></span></label>`;}).join('');
  const left=patient.documents.filter(file=>!documents.some(item=>item.id===file.id)).length,count=state.pickerSelection.size,linked=state.knownPatient===patient.id;
  const action=count?`Add ${count} ${count===1?'document':'documents'}`:linked?'':'Select patient';
  return `<div class="us-docs">${docs}<div class="us-docs-foot">${left?`<button class="text-btn" data-record-toggle>${count?'Clear all':'Select all'}</button>`:'<span>All documents added</span>'}${action?`<button class="footer-btn primary" data-record-add>${action}</button>`:''}</div></div>`;
}
function renderQueuePatients(){
  const patient=linkedPatient();
  $('#linkedPatient').hidden=!patient;$('#patientSearch').hidden=Boolean(patient);
  $('#recordListLabel').hidden=Boolean(patient);$('#recordList').hidden=Boolean(patient);
  $('#recordCardTitle').textContent=patient?'Patient for this intake':'Pull from a patient’s record';
  $('#recordCardLead').textContent=patient?'Pick more documents from their record, or upload new files alongside them.':'Patients waiting in the intake queue. Pick documents straight from their record.';
  if(patient){
    $('#linkedPatient').innerHTML=`<div class="us-linked-row"><span class="us-avatar">${patientInitials(patient.name)}</span><span class="us-who"><strong>${patient.name}</strong><small>${patient.mrn} · DOB ${patient.dob}</small></span><em class="us-linked-tag"><i data-lucide="link"></i> Linked</em><button class="text-btn" data-unlink-patient>Change</button></div><span class="us-label">Documents in their record</span>${recordDocsList(patient)}`;
    icons();return;
  }
  const query=$('#patientSearchInput').value.trim().toLowerCase();
  const list=query?patientDirectory.filter(item=>item.name.toLowerCase().includes(query)||item.mrn.toLowerCase().includes(query)):intakeQueue;
  $('#recordListLabel').textContent=query?'Search results':'In the intake queue';
  $('#recordList').innerHTML=list.length?list.map(item=>{
    const open=state.pickerPatient===item.id;
    return `<article class="us-patient ${open?'open':''}"><button class="us-patient-row" data-record-patient="${item.id}" aria-expanded="${open}"><span class="us-avatar">${patientInitials(item.name)}</span><span class="us-who"><strong>${item.name}</strong><small>${item.mrn} · DOB ${item.dob}</small></span><span class="us-count">${item.documents.length} docs</span><i data-lucide="chevron-down"></i></button>${open?recordDocsList(item):''}</article>`;
  }).join(''):'<p class="us-empty">No patients found</p>';
  icons();
}
function openRecordPicker(patientId){
  const patient=patientDirectory.find(item=>item.id===patientId);if(!patient)return;
  state.pickerPatient=patient.id;
  state.pickerSelection=new Set(patient.documents.filter(file=>!documents.some(item=>item.id===file.id)).map(file=>file.id));
  renderQueuePatients();
}
// Documents pulled from a patient's record already belong to that patient, so no patient match is needed.
function addRecordDocuments(){
  const patient=patientDirectory.find(item=>item.id===(state.knownPatient||state.pickerPatient));if(!patient)return;
  const selected=patient.documents.filter(file=>state.pickerSelection.has(file.id)&&!documents.some(item=>item.id===file.id));
  selected.forEach(file=>documents.push({...file,meta:'Ready to extract',fromRecord:true}));
  state.knownPatient=patient.id;state.pickerPatient='';state.pickerSelection=new Set();
  if(!state.selected&&documents.length)state.selected=documents[0].id;
  renderDocuments();renderUploadQueue();
  toast(selected.length?`${selected.length} ${selected.length===1?'document':'documents'} from ${patient.name} added. Add more files if you need to.`:`${patient.name} selected. Upload their documents.`);
}
function unlinkPatient(){
  const patient=linkedPatient();
  for(let index=documents.length-1;index>=0;index--)if(documents[index].fromRecord)documents.splice(index,1);
  if(!documents.some(file=>file.id===state.selected))state.selected=documents[0]?.id||'';
  state.knownPatient=null;state.pickerPatient='';state.pickerSelection=new Set();
  renderDocuments();renderUploadQueue();
  if(patient)toast(`${patient.name} unlinked. Documents from their record were removed.`);
}

// Which conflicts this intake has: a similar patient, similar documents, both, or neither.
let issuePlan={needsPatient:true,findings:[],docHint:''};
function setIssueHead(){
  const {needsPatient,findings}=issuePlan;
  const box=$('#extractionIssues');
  // A lone step doesn't need a number.
  box.classList.toggle('single-step',(needsPatient?1:0)+(findings.length?1:0)<2);
  $('#documentIssue').classList.toggle('is-active',needsPatient&&findings.length>0&&state.patientResolved);
}
function setDocLock(locked){
  $('#documentIssue').classList.toggle('is-locked',locked);
  $('#documentIssueHint').textContent=locked?'Unlocks after you choose a patient.':issuePlan.docHint;
}
function renderExtractionPatientMatches(){
  setIssueHead();if(issuePlan.findings.length&&!$('#documentIssue').hidden)setDocLock(true);
  $('#patientIssue').classList.remove('is-resolved');
  $('#patientIssue .issue-title>b').textContent='Required';
  $('#extractionPatientMatches').innerHTML=patientMatches.map((patient,index)=>`<article class="extract-patient ${index===0?'best':''}" id="extract-patient-${patient.id}"><span class="avatar">${patient.initials}</span><span class="ep-info"><strong>${patient.name}${index===0?'<em class="best-tag">Best match</em>':''}</strong><small>DOB ${patient.dob} · ${patient.mrn}</small><button class="text-btn" data-extract-patient-details="${patient.id}" aria-expanded="false">View details</button></span><button class="small-btn ${index===0?'primary':''}" data-extract-patient="${patient.id}">Select</button><section class="extract-patient-details" hidden><dl><div><dt>Address</dt><dd>${patient.address}</dd></div><div><dt>Phone</dt><dd>${patient.phone}</dd></div><div><dt>Email</dt><dd>${patient.email}</dd></div><div><dt>Primary insurance</dt><dd>${patient.payer}</dd></div><div><dt>Member ID</dt><dd>${patient.memberId}</dd></div></dl></section></article>`).join('');
  $('.create-new-patient').hidden=false;
  icons();
}
// Steps open and close like an accordion: heights animate from where they were to where they end up.
function animateSteps(change){
  const steps=[$('#patientIssue'),$('#documentIssue')],before=steps.map(el=>el.hidden?0:el.offsetHeight);
  change();
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  steps.forEach((el,index)=>{
    const after=el.hidden?0:el.offsetHeight;
    if(el.hidden||after===before[index])return;
    el.animate([{height:`${before[index]}px`,overflow:'hidden'},{height:`${after}px`,overflow:'hidden'}],{duration:340,easing:'cubic-bezier(.2,.7,.2,1)'});
  });
}
function resolvePatientIssue(title,detail){
  $('#patientIssue').classList.add('is-resolved');
  $('#patientIssue .issue-title>b').textContent='Resolved';
  $('#extractionPatientMatches').innerHTML=`<div class="issue-resolved"><i data-lucide="circle-check"></i><span><strong>${title}</strong><small>${detail}</small></span><button class="text-btn" data-change-patient>Change</button></div>`;
  $('.create-new-patient').hidden=true;
}

function renderExtractionIssues(){
  renderExtractionPatientMatches();
  const known=patientDirectory.find(patient=>patient.id===state.knownPatient);
  let findings=[duplicateFindings[0],duplicateFindings[2]];
  if(known){
    const file=documents.find(item=>/insurance/i.test(item.name))||documents[0];
    const base=file.name.replace(/\.[^.]+$/,'');
    findings=[{id:'known-duplicate',kind:'exact',upload:file.name,existing:`${base} · Aug 2026.pdf`,reason:`Exact copy of a document already stored in ${known.name}’s record`}];
  }
  let needsPatient=!known;
  // Prototype switch: ?conflicts=patient|documents|none previews the other scenarios (default shows both).
  const forced=new URLSearchParams(location.search).get('conflicts');
  if(forced==='patient'||forced==='none')findings=[];
  if(forced==='documents'||forced==='none')needsPatient=false;
  // Happy path: AI links the patient and finds no document conflicts, so there's nothing to confirm.
  if(window.protoScenario==='happy'&&!forced){findings=[];needsPatient=false;}
  issuePlan={needsPatient,findings,docHint:known?'One document is already in the patient’s record.':'Choose how to store each one.'};
  state.docDecisionsNeeded=findings.length;
  setIssueHead();
  $('#documentIssueNumber').textContent=needsPatient?'2':'1';
  setDocLock(false);
  $('#extractionDocumentMatches').innerHTML=findings.map(item=>`<article class="extract-document" id="extract-${item.id}"><i data-lucide="file-text"></i><span class="ed-info"><strong>${item.upload}</strong><span class="ed-reason">${item.reason}</span><small>On file: ${item.existing}</small></span><span class="extract-document-actions">${item.kind==='exact'?`<button class="small-btn primary" data-extract-document="${item.id}" data-decision="existing">Use existing</button><button class="small-btn" data-extract-document="${item.id}" data-decision="upload">Keep new copy</button>`:`<button class="small-btn primary" data-extract-document="${item.id}" data-decision="replace">Replace existing</button><button class="small-btn" data-extract-document="${item.id}" data-decision="new">Keep both</button>`}</span></article>`).join('');
  icons();
}

function setPhase(phase){
  state.phase=phase;
  if(phase==='review')refreshItemDocs();
  const workspace=$('#workspace');
  const body=document.body;

  workspace.classList.remove('phase-upload','phase-extraction','phase-review');
  body.classList.remove('phase-upload','phase-extraction','phase-review');

  workspace.classList.add(`phase-${phase}`);
  body.classList.add(`phase-${phase}`);
  document.dispatchEvent(new Event('intake:change'));
  $('#pageTitle').innerHTML=phase==='review'?`<span class="title-muted">Review</span> <span class="title-name">${postIntakeRecommendation.patient}</span><span class="title-muted">’s intake</span>`:'New patient intake';
  renderFileList();
  if(phase==='review'){
    syncExistingPatientFiles();
    setSourceDrawer(innerWidth>1180,true);
    openDocument(state.selected||'referral');
    // Documents pane starts closed so the review has room; source links and the rail open it.
    $('#workspace').classList.add('viewer-collapsed');
    setViewerTab('files');
    updateProgress();
  }
}

function renderExistingFiles(){
  renderFileList();
  renderViewerGallery();
  icons();
}

function syncExistingPatientFiles(){
  renderFileList();
  renderViewerGallery();
}

function renderPostIntake(){
  const recommendation=postIntakeRecommendation;
  $('#handoffPatient').textContent=recommendation.patient;
  const summary=buildIntakeSummary();
  $('#handoffContext').textContent=summary.context;
  $('#summaryTitle').textContent=summary.title;
  $('#handoffSummary').textContent=summary.lead;
  $('#nextActionTitle').textContent=recommendation.action;
  $('#nextActionReason').textContent=recommendation.reason;
  $('#recommendedAction').innerHTML=`<i data-lucide="arrow-right"></i> ${recommendation.action}`;
  $('#recommendedAction').dataset.postAction=recommendation.action;
  $('#otherActionButtons').innerHTML=recommendation.alternatives.map(action=>`<button class="secondary-action compact" data-post-action="${action}">${action}</button>`).join('');
  const recommendationItems=items=>items.map(item=>`<li><span class="recommendation-mark"><i data-lucide="sparkles"></i></span><span><b>${item.name}</b><small>${item.reason}</small></span></li>`).join('');
  $('#recommendedServices').innerHTML=recommendationItems(recommendation.services);
  $('#recommendedDme').innerHTML=recommendationItems(recommendation.dme);
  $('#handoffNote').textContent=recommendation.note;
  syncNextLock();
  icons();
}

function syncNextLock(){
  const left=requiredReviewsLeft(),lock=$('#nextLock'),button=$('#recommendedAction');
  if(!lock||!button)return;
  lock.hidden=!left;button.classList.toggle('is-locked',left>0);
  $('#nextLockText').textContent=`Finish ${left} required ${left===1?'review':'reviews'} to continue.`;
  // AI summary and recommendations only appear once the required review is complete.
  if($('#nextInsights')){$('#nextInsights').hidden=left>0;$('#nextInsightsLocked').hidden=!left;$('#otherActionsTitle')?.closest('section')?.toggleAttribute('hidden',left>0);}
}

function setSideTab(tab){
  state.sideTab=tab;
  $('#reviewList').hidden=tab!=='review';
  $('#nextPanel').hidden=tab!=='next';
  $$('[data-side-tab]').forEach(button=>button.setAttribute('aria-selected',button.dataset.sideTab===tab));
  if(tab==='next')renderPostIntake();
}

function showPostIntake(){
  state.completed=true;document.dispatchEvent(new Event('intake:change'));
  setSourceDrawer(true,true);
  setSideTab('next');
  icons();
}

// Next actions that move the intake forward need every mandatory review done first.
function requiredReviewsLeft(){return reviewItems().filter(item=>item.severity==='missing').length;}
function openReviewGate(count){
  $('#gateBody').textContent=`You can only do this once you finish all the mandatory reviews. ${count} required ${count===1?'item is':'items are'} still open.`;
  $('#gateDialog').showModal();
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
  // The Files tab lists every file; this keeps its count in sync.
  const count=documents.length+(state.patientLinked?existingFiles.length:0);
  const badge=$('#fileTabCount');if(badge)badge.textContent=count;
}

function setViewerTab(tab){
  state.viewerTab=tab;
  $('#viewerFiles').hidden=tab!=='files';
  $('#viewerPreview').hidden=tab!=='preview';
  $$('[data-viewer-tab]').forEach(button=>button.setAttribute('aria-selected',button.dataset.viewerTab===tab));
}
function setViewerMode(mode){setViewerTab(mode==='preview'?'preview':'files');}

function renderDuplicateFindings(){
  $('#duplicateFindings').innerHTML=duplicateFindings.map(item=>`<article class="match-finding ${item.kind} resolved-finding" id="finding-${item.id}"><div class="finding-type"><span>${item.kind==='exact'?'Exact document':'Similar content'}</span><b>${item.score}%</b></div><strong>${item.upload}</strong><p>${item.reason}</p><small>Existing: ${item.existing}</small><div class="system-decision"><i data-lucide="${item.extracting?'sparkles':'circle-check'}"></i><span><b>${item.decision}</b>${item.detail}</span></div></article>`).join('');
  icons();
}

function renderPatientMatches(){
  $('#patientMatches').innerHTML=patientMatches.map((patient,index)=>`<article class="patient-match" id="patient-${patient.id}"><div class="patient-summary"><span class="avatar">${patient.initials}</span><div><strong>${patient.name}</strong><span>DOB ${patient.dob} · ${patient.mrn}</span></div><b>${patient.confidence}%</b></div>${patient.reason?`<p>${patient.reason}</p>`:''}<div class="patient-details" hidden><dl><div><dt>Address</dt><dd>${patient.address}</dd></div><div><dt>Phone</dt><dd>${patient.phone}</dd></div><div><dt>Patient ID</dt><dd>${patient.mrn}</dd></div></dl></div><div class="inline-actions"><button class="small-btn ${index===0?'primary':''}" data-link-patient="${patient.id}">Link patient</button><button class="text-btn" data-patient-details="${patient.id}" aria-expanded="false">View details</button></div></article>`).join('');
  icons();
}

function setSourceDrawer(open,force=false){
  if(!open&&state.resolutionPending&&!force){toast('Resolve the patient match before continuing.');return;}
  state.drawerOpen=open;
  $('#workspace').classList.toggle('sources-collapsed',!open);
  $('#sourceScrim').hidden=!open;
  $('#sourcePanel').classList.toggle('drawer-open',open);
  icons();
}

const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
function patientInitials(name){return name.split(' ').map(part=>part[0]).join('').slice(0,2).toUpperCase();}
// The full-width files pane shrinks into the right sidebar while the review list and form slide in.
function openReview(){
  const go=()=>setPhase('review');
  if(document.startViewTransition&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.startViewTransition(go);else go();
}
function checkExtractionReady(){
  const ready=state.extractionComplete&&state.patientResolved&&state.documentResolutions.size===state.docDecisionsNeeded;
  if(!ready)return;
  const dialog=$('#resolveDialog'),wasOpen=dialog.open;
  $('#extractionWaiting').hidden=false;
  $('#extractionWaiting').innerHTML='<i data-lucide="circle-check"></i><span>All set. Opening the intake…</span>';
  icons();
  setTimeout(()=>{if(dialog.open)dialog.close();openReview();toast(wasOpen?'Intake ready. Review the extracted information.':'No conflicts found. Review the extracted information.');},wasOpen?650:0);
}

async function startExtraction(){
  if(!documents.length||state.extracting)return;
  state.started=true;state.extracting=true;state.extractionComplete=false;state.patientResolved=false;state.documentResolutions.clear();
  documents.forEach(file=>{file.processing=true;file.meta='Waiting';});
  renderExtractionIssues();
  $('#patientIssue').hidden=!issuePlan.needsPatient;$('#documentIssue').hidden=!issuePlan.findings.length;
  setDocLock(issuePlan.needsPatient&&issuePlan.findings.length>0);
  $('#extractionWaiting').hidden=true;
  setPhase('extraction');setViewerTab('files');renderUploadQueue();
  $('#extractDocuments').innerHTML='<span class="spinner"></span> Extracting…';
  $('#processing').hidden=false;
  const stages=[
    {id:'read',label:'Reading uploaded documents'},
    {id:'extract',label:'Extracting patient and order data'},
    {id:'match',label:'Matching existing patients'},
    {id:'duplicate',label:'Checking similar documents'},
    {id:'conflict',label:'Resolving field conflicts'}
  ];
  for(const [index,stage] of stages.entries()){
    const percent=(index+1)*20;
    $('#processingLabel').textContent=stage.label;
    $('#processSteps').textContent=`Step ${index+1} of ${stages.length}`;
    $('#processingPercent').textContent=`${percent}%`;$('#processingBar').style.width=`${percent}%`;
    documents.forEach(file=>{file.meta=stage.label;});renderFileList();
    await wait(700);
  }
  state.extracting=false;state.extractionComplete=true;
  documents.forEach(file=>{file.processing=false;file.meta='Extracted';});
  $('#processing').hidden=true;$('#extractDocuments').innerHTML='<i data-lucide="circle-check"></i> Extracted';renderDocuments();
  if(!issuePlan.needsPatient){
    // No similar patient to confirm (e.g. the patient is already known), so link without asking.
    state.patientResolved=true;state.patientLinked=true;syncExistingPatientFiles();setIssueHead();
  }
  if(issuePlan.needsPatient||issuePlan.findings.length){$('#resolveDialog').showModal();icons();}
  checkExtractionReady();
}

function openDocument(id){
  const retained=id==='consent'?{id:'consent',name:'Consent Form.pdf',meta:'Existing file · Extracted previously',type:'Consent form'}:null;
  const document=documents.find(item=>item.id===id) || existingFiles.find(item=>item.id===id) || retained || documents[0];
  if(!document)return;
  state.selected=document.id;
  $('#workspace').classList.remove('viewer-collapsed');
  $('#previewName').textContent=document.name;
  const pages=(document.size||document.meta||'').split(' · ')[0];
  $('#previewMeta').textContent=/page|image/.test(pages)?pages:'Page 1';
  const image=$('#documentImage');
  image.src=imageForDocument(document);
  image.alt=`${document.name} document preview`;image.dataset.doc=document.id;
  $('#sourcePreview').hidden=false;
  setViewerMode('preview');
  renderDocuments();
  const preview=$('#sourcePreview');
  preview.classList.remove('source-changed');
  requestAnimationFrame(()=>preview.classList.add('source-changed'));
}

const planRank=index=>['Primary','Secondary','Tertiary'][index]||`Plan ${index+1}`;
const planResult=plan=>plan.check?plan.results[plan.check.service]:null;
// Coverage status comes back from the eligibility check: Active or Inactive.
const planStatus=plan=>plan.check?(plan.status==='inactive'?'inactive':'active'):null;
const nowStamp=()=>{const d=new Date();return `${d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} · ${d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}`;};
const statusPill=plan=>{const st=planStatus(plan);return st?`<span class="pill ${st==='active'?'success':'danger'}"><i data-lucide="${st==='active'?'circle-check':'circle-x'}"></i> ${st==='active'?'Active':'Inactive'}</span>`:'<span class="pill neutral">Not checked</span>';};
const rankOrder=['Primary','Secondary','Tertiary'];
const orderBy=key=>[...insurancePlans].sort((a,b)=>(a[key]?rankOrder.indexOf(a[key]):9)-(b[key]?rankOrder.indexOf(b[key]):9)).map(plan=>plan.id);
const currentOrder=()=>insurancePlans.map(plan=>plan.id);
const sameOrder=(a,b)=>a.join()===b.join();
function setPlanOrder(ids,message){
  const selectedId=insurancePlans[state.currentPlan]?.id;
  const sorted=ids.map(id=>insurancePlans.find(plan=>plan.id===id));
  insurancePlans.splice(0,insurancePlans.length,...sorted);
  state.currentPlan=Math.max(0,insurancePlans.findIndex(plan=>plan.id===selectedId));
  state.aiEdited.add('coverage');
  renderInsurance();
  if(typeof renderReviewMenu==='function'&&state.phase==='review')renderReviewMenu();
  if(message)toast(message);
}
function systemPill(plan,index){
  if(!plan.systemRank)return '<span class="pill info">New · not in system</span>';
  return plan.systemRank===planRank(index)?`<span class="pill neutral">System: ${plan.systemRank}</span>`:`<span class="pill warning">System: ${plan.systemRank}</span>`;
}
function renderPlanList(){
  $('#planList').innerHTML=insurancePlans.map((plan,index)=>{
    const result=planResult(plan),checked=plan.check?.service===state.serviceType;
    const diff=plan.userAdded?'Added by you':!plan.systemRank?'New · not in system':plan.systemRank!==planRank(index)?`Was ${plan.systemRank} in system`:'';
    return `<div class="plan-row ${index===state.currentPlan?'active':''}" draggable="true" data-drag-plan="${index}" role="listitem"><span class="drag-handle" aria-hidden="true"><i data-lucide="grip-vertical"></i></span><button class="plan-item ${index===state.currentPlan?'active':''}" data-plan="${index}" aria-label="${plan.name}, ${planRank(index)}. Press Alt plus arrow keys to reorder."><span class="plan-item-copy"><strong>${plan.name}</strong><span class="plan-pills"><span class="pill rank">${planRank(index)}</span>${statusPill(plan)}</span>${diff?`<small class="plan-diff"><i data-lucide="${plan.systemRank?'arrow-left-right':'plus'}"></i> ${diff}</small>`:''}</span></button></div>`;
  }).join('');
  renderOrderHint();
}
// One-line summary under the list: whether the order came from AI, the system, or the user.
function renderOrderHint(){
  const ai=orderBy('aiRank'),system=orderBy('systemRank'),current=currentOrder();
  const usingAi=sameOrder(current,ai),allInSystem=insurancePlans.every(plan=>plan.systemRank),usingSystem=allInSystem&&sameOrder(current,system);
  const changes=insurancePlans.filter((plan,index)=>plan.systemRank!==planRank(index)).length;
  $('#orderSource').className=`pill ${usingAi?'info':'neutral'}`;
  $('#orderSource').innerHTML=usingAi?'<i data-lucide="sparkles"></i> AI sorted':usingSystem?'System order':'Custom order';
  $('#orderNotice').innerHTML=`<span>${changes?`${changes} ${changes===1?'change':'changes'} from system. `:''}Drag to reorder.</span>${usingAi?(allInSystem?'<button class="text-btn" data-order="system">Use system order</button>':''):'<button class="text-btn" data-order="ai">Reset to AI order</button>'}`;
  $('#insuranceMeta').textContent=`${insurancePlans.length} coverage plans${changes?' · order updated from system':''}`;
}
function renderEligibilityResponse(index){
  const plan=insurancePlans[index],result=planResult(plan);
  if(!result)return;
  const type=serviceTypes.find(item=>item.id===plan.check.service),active=planStatus(plan)==='active',other=plan.otherCoverage;
  const field=label=>plan.fields.find(([name])=>name===label)?.[1]||'—';
  $('#eligibilityDialogTitle').textContent=plan.name;
  $('#eligibilityDialogMeta').textContent=`${planRank(index)} coverage · ${type.id} · eligibility checked ${plan.check.at}`;
  const rows=[['Coverage status',active?'Active':'Inactive'],['Benefit',result.detail],['Member ID',`${field('Member ID prefix')} ${field('Member ID')} ${field('Member ID suffix')}`.replace(/—/g,'').trim()],['Group number',field('Group number')],['Plan dates',`${field('Effective from')} – ${field('Effective to')}`],['Deductible',`${plan.response.deductible} · ${plan.response.deductibleMet} met`],['Out-of-pocket maximum',plan.response.oop],['Network',plan.response.network],['Payer',plan.response.payer],['Trace number',plan.response.trace]];
  $('#eligibilityDialogBody').innerHTML=`<div class="response-status ${result.eligible?'eligible':'not-eligible'}"><i data-lucide="${result.eligible?'circle-check':'circle-x'}"></i><span><b>${active?'Active':'Inactive'} · ${type.id} ${result.eligible?'covered':'not covered'}</b>${result.detail}</span></div>${other?`<section class="response-other"><header><i data-lucide="search-check"></i><b>Other insurance found</b></header><dl class="response-list">${[['Plan',other.name],['Payer',other.payer],['Insurance type',other.type],['Member ID',other.memberId],['Group number',other.group],['Plan dates',other.dates]].map(([l,v])=>`<div><dt>${l}</dt><dd>${v}</dd></div>`).join('')}</dl><p>${other.note} Add it with “Add another plan” if it should be billed.</p></section>`:''}<dl class="response-list">${rows.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
  icons();
  $('#eligibilityDialog').showModal();
}

function servicePill(plan){
  const type=serviceTypes.find(item=>item.id===state.serviceType),result=planResult(plan),current=plan.check?.service===state.serviceType;
  if(!current)return `<span class="cov-chip neutral" title="Not checked for ${type.id} yet"><i data-lucide="${type.icon}"></i> ${type.id} · Not checked</span>`;
  return `<span class="cov-chip ${result.eligible?'ok':'bad'}" title="${result.detail}"><i data-lucide="${result.eligible?'circle-check':'circle-x'}"></i> ${type.id}</span>`;
}

function renderInsurance(index=state.currentPlan){
  if(index!==state.currentPlan)state.editingPlan=false;
  state.currentPlan=index;
  const plan=insurancePlans[index],result=planResult(plan);
  renderPlanList();
  $('#planName').textContent=plan.name;
  const st=planStatus(plan);
  $('#planPills').innerHTML=`<div class="cov-strip">${st?`<span class="cov-chip ${st==='active'?'ok':'bad'}"><i data-lucide="${st==='active'?'circle-check':'circle-x'}"></i> ${st==='active'?'Active':'Inactive'}</span>`:'<span class="cov-chip neutral">Status not checked</span>'}${servicePill(plan)}</div><span class="cov-checked"><i data-lucide="calendar-check"></i> ${plan.check?`Eligibility checked ${plan.check.at}`:'Eligibility not checked yet'}</span>`;
  const found=$('#planDiscovered');
  found.hidden=!(plan.check&&plan.otherCoverage&&!state.checkingPlan);
  found.innerHTML=found.hidden?'':`<i data-lucide="search-check"></i><span><b>Other insurance found during the eligibility check</b>${plan.otherCoverage.name} · ${plan.otherCoverage.note}</span><button class="small-btn" data-plan-response="${index}"><i data-lucide="file-search"></i> View response</button>`;
  const note=$('#planAiNote');
  note.hidden=plan.systemRank===plan.aiRank;
  note.innerHTML=note.hidden?'':`<i data-lucide="sparkles"></i><span><b>AI set this as ${plan.aiRank.toLowerCase()}</b>${plan.systemRank?` (system: ${plan.systemRank.toLowerCase()})`:' (not in system yet)'}. ${plan.aiReason}</span><button class="source-link" data-doc="${plan.docId}"><i data-lucide="scan-text"></i> ${plan.source}</button>`;
  const hasResponse=Boolean(plan.check)&&!state.checkingPlan;
  $('#planActions').innerHTML=`${hasResponse?`<button class="small-btn" data-plan-response="${index}"><i data-lucide="file-search"></i> View response</button>`:''}<button class="small-btn" data-plan-check ${state.checkingPlan?'disabled':''}>${state.checkingPlan?'<span class="spinner"></span> Checking…':'<i data-lucide="refresh-cw"></i> Check eligibility'}</button>`;
  $('#insuranceFields').innerHTML=plan.fields.map(([label,value],fieldIndex)=>`<label class="ins-field"><span>${label}</span><input class="ins-input" data-plan-field="${fieldIndex}" value="${value==='Not provided'?'':value.replace(/"/g,'&quot;')}" placeholder="Not provided" aria-label="${label}" autocomplete="off"></label>`).join('');
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
  button.innerHTML=state.checkingEligibility?'<span class="spinner"></span> Checking…':'<i data-lucide="refresh-cw"></i> Check eligibility';
  $('#eligibilityMeta').textContent=state.checkingEligibility?`Checking ${type.id} eligibility for all plans…`:allChecked?`All plans checked for ${type.id}`:`Not checked for ${type.id} on every plan · check all plans here or one plan at a time`;
  icons();
}

async function checkEligibility(){
  state.checkingEligibility=true;renderEligibility();
  await wait(900);
  state.checkingEligibility=false;
  const at=nowStamp();insurancePlans.forEach(plan=>{plan.check={service:state.serviceType,at};});
  renderInsurance();
  const covered=insurancePlans.filter(plan=>planResult(plan).eligible).length;
  const found=insurancePlans.filter(plan=>plan.otherCoverage).length;
  toast(`${state.serviceType} eligibility checked · ${covered} of ${insurancePlans.length} plans cover ${state.serviceType}${found?` · other insurance found on ${found} ${found===1?'plan':'plans'}`:''}`);
}

async function checkPlanEligibility(){
  const plan=insurancePlans[state.currentPlan];
  state.checkingPlan=true;renderInsurance();
  await wait(900);
  state.checkingPlan=false;plan.check={service:state.serviceType,at:nowStamp()};
  renderInsurance();
  toast(`${plan.name}: ${planStatus(plan)==='active'?'active':'inactive'} · ${state.serviceType} ${planResult(plan).eligible?'covered':'not covered'}${plan.otherCoverage?' · other insurance found':''}`);
}

function renderServiceMenu(){
  $('#serviceMenu').innerHTML=serviceTypes.map(type=>`<button class="service-option ${type.id===state.serviceType?'selected':''}" role="option" aria-selected="${type.id===state.serviceType}" data-service-type="${type.id}"><i data-lucide="${type.icon}"></i><span><strong>${type.id}</strong><small>${type.description}</small></span>${type.id===state.serviceType?'<i class="service-check" data-lucide="check"></i>':''}</button>`).join('');
  icons();
}

function issueCount(){ return [state.mobile,state.provider,state.product,state.physicianName,state.signature,state.authAck].filter(value=>!value).length; }
function reviewItems(){
  return [
    !state.mobile&&{id:'mobileField',label:'Mobile phone number',detail:'Digits look blurry',section:'Contact information',severity:'warning'},
    !state.provider&&{id:'providerField',label:'Ordering physician',detail:'Not found in the NPI registry · search to add',section:'Prescription 1',severity:'missing'},
    !state.product&&{id:'rx-rx1-item-1',label:'Medicare coverage for E0601',detail:'Choose the policy that applies',section:'Prescription 1',severity:'missing',tag:'Select'}
  ].filter(Boolean).concat(requiredFieldGaps());
}

// Required patient fields: empty values (not found, or removed by the user) become required review items.
const reqSections=[['#demographics-section','Patient demographics'],['#contact-section','Contact information']];
function requiredFieldGaps(){
  const gaps=[];
  reqSections.forEach(([sel,section])=>{
    $$(`${sel} .compact-fields>div`).forEach((cell,i)=>{
      if(!cell.querySelector('.req'))return;
      const label=(cell.querySelector('.cell-label,span')?.childNodes[0]?.textContent||'Field').trim();
      if(!cell.id)cell.id=`req-${sel.slice(1)}-${i}`;
      const select=cell.querySelector('select,input'),value=select?select.value.trim():(cell.querySelector('strong')?.textContent||'').trim();
      const empty=!value||value==='—';
      cell.classList.toggle('field-error',empty&&!select);
      cell.classList.toggle('done',Boolean(select)&&!empty);
      let msg=cell.querySelector('.field-error-msg');
      if(empty&&!select){if(!msg){msg=document.createElement('small');msg.className='field-error-msg';cell.appendChild(msg);}msg.textContent=`${label} is required`;}
      else msg?.remove();
      if(select){const hint=cell.querySelector('.miss-chip');if(hint)hint.textContent=empty?'Not found':'Added';}
      if(empty)gaps.push({id:cell.id,label,detail:select?'Not found in any document':'Required · value is empty',section,severity:'missing'});
    });
  });
  return gaps;
}
document.addEventListener('input',event=>{if(event.target.closest?.('[data-editable]')&&event.target.closest('#demographics-section,#contact-section'))updateProgress();});
document.addEventListener('change',event=>{if(event.target.id==='genderInput')updateProgress();});
document.addEventListener('input',event=>{if(event.target.id==='mobileInput')updateProgress();});

// "Your intake is mostly done" banner: says what's left and opens the left review panel.
// Review notice in the page header: a short title, one line of guidance and one action.
const requiredTitle=n=>`${n} ${n===1?'item needs':'items need'} your review`;
const requiredHint='Almost there. Finish these to unlock the next action.';
function renderGuidance(){
  const box=$('#reviewGuidance');if(!box)return;
  const required=reviewItems().filter(item=>item.severity==='missing').length;
  box.className=`header-notice ${required?'is-required':'is-clear'}`;
  box.innerHTML=required
    ?`<span class="notice-icon"><i data-lucide="list-checks"></i><b>${required}</b></span><span class="notice-copy"><strong>${requiredTitle(required)}</strong><small>${requiredHint}</small></span><button type="button" class="notice-btn" data-guidance-review>Review now <i data-lucide="arrow-right"></i></button>`
    :`<span class="notice-icon"><i data-lucide="check"></i></span><span class="notice-copy"><strong>All required items reviewed</strong><small>Nice work. You can move on to the next action.</small></span><button type="button" class="notice-btn" data-guidance-next>Next action <i data-lucide="arrow-right"></i></button>`;
  icons();
}
document.addEventListener('click',event=>{
  if(event.target.closest('[data-guidance-review]')){setSourceDrawer(true,true);setSideTab('review');return;}
  if(event.target.closest('[data-guidance-next]')){setSourceDrawer(true,true);setSideTab('next');}
});

const refreshNoticeHtml=()=>`<div class="refresh-notice"><i data-lucide="refresh-cw"></i><span><b>There may be new updates</b><small>Your changes can affect the next action.</small></span><button type="button" class="footer-btn" data-refresh-next><i data-lucide="sparkles"></i> Refresh next action</button></div>`;
function renderNextStatus(){
  const box=$('#nextStatus');if(!box||state.refreshingNext)return;
  box.innerHTML=state.nextStale?refreshNoticeHtml():'';icons();
}
// Refresh: AI re-reads the intake, then the next action pane updates in place.
async function refreshNextAction(){
  if(state.refreshingNext)return;
  state.refreshingNext=true;setSourceDrawer(true,true);setSideTab('next');
  const panel=$('#nextPanel'),box=$('#nextStatus');panel.classList.add('is-updating');
  const steps=['Reading the updated intake','Checking coverage and existing orders','Choosing the next action'];
  for(const step of steps){
    box.innerHTML=`<div class="refresh-notice is-working"><span class="spinner"></span><span><b>Updating next action</b><small>${step}…</small></span></div>`;
    await wait(850);
  }
  state.refreshingNext=false;state.nextStale=false;panel.classList.remove('is-updating');
  renderPostIntake();renderNextStatus();renderReviewMenu();
  $('#nextPanel .next-action')?.classList.add('just-updated');setTimeout(()=>$('#nextPanel .next-action')?.classList.remove('just-updated'),1600);
  toast('Next action is up to date. The recommendation hasn’t changed.');
}
document.addEventListener('click',event=>{if(event.target.closest('[data-refresh-next]'))refreshNextAction();});
function renderReviewMenu(){
  // Only missing information is required. Warnings and AI-resolved fields are optional review.
  const items=reviewItems(),reviewed=42-issueCount();
  const required=items.filter(item=>item.severity==='missing');
  const warnings=items.filter(item=>item.severity!=='missing');
  const aiItems=aiResolvedFields.filter(item=>!state.aiEdited.has(item.key)&&!state.aiReviewed.has(item.key)&&!items.some(open=>open.id===item.id));
  const count=required.length,optional=warnings.length+aiItems.length,total=count+optional;
  // Once required review is done, resolving more items can change the recommendation: offer a refresh.
  if(count)state.nextStale=false;
  else if(state.lastOptional!=null&&optional<state.lastOptional&&!state.lastRequired)state.nextStale=true;
  state.lastOptional=optional;state.lastRequired=count;
  $('#reviewTabCount').textContent=total;$('#reviewTabCount').classList.toggle('has-required',count>0);
  const rail=$('#railCount');rail.textContent=total;rail.hidden=!total;rail.classList.toggle('has-required',count>0);
  $('#reviewPopoverTitle').textContent=count?requiredTitle(count):total?'All required information is complete':'Everything is reviewed';
  $('#reviewPopoverSub').hidden=!count;$('#reviewPopoverSub').textContent=requiredHint;
  const row=item=>`<button class="review-item ${item.severity}" data-review-target="${item.id}"><span class="ri-dot" aria-hidden="true"></span><span class="review-copy"><b>${item.label}</b><small>${item.detail}</small></span><i class="review-go" data-lucide="chevron-right"></i></button>`;
  const optionalRows=[...warnings,...aiItems.map(item=>({...item,severity:'ai',tag:'AI resolved'}))];
  const done=`<div class="review-done"><i data-lucide="circle-check"></i><span><b>Required review complete</b><small>${optionalRows.length?'Optional items below are still worth a look.':'Nothing else needs your attention.'}</small></span><button class="footer-btn primary" data-side-tab="next"><i data-lucide="circle-arrow-right"></i> Next action</button></div>`
    +(state.nextStale?refreshNoticeHtml():'');
  $('#reviewItems').innerHTML=(count?`<div class="review-group"><span class="review-group-title">Required</span>${required.map(row).join('')}</div>`:done)
    +(optionalRows.length?`<div class="review-group"><span class="review-group-title">Optional</span>${optionalRows.map(row).join('')}</div>`:'');
  icons();
  syncNextLock();
  renderGuidance();
  renderNextStatus();
  document.dispatchEvent(new Event('intake:change'));
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
  const gaps=requiredFieldGaps(),gapsIn=sel=>gaps.filter(g=>$(`${sel} #${g.id}`)).length;
  const demoGaps=gapsIn('#demographics-section'),demoCells=$$('#demographics-section .compact-fields>div').length;
  $('#demoMeta')&&($('#demoMeta').textContent=`${demoCells-demoGaps} of ${demoCells} fields complete`);
  setSectionStatus('#demographics-section',!demoGaps,'danger',`${demoGaps} missing`);
  const patientStatus=$('#contact-section .section-status');
  const contactGaps=gapsIn('#contact-section');
  $('#contact-section .card-header p').textContent=`${8-patientRemaining-contactGaps} of 8 fields complete`;
  patientStatus.className=`section-status ${contactGaps?'danger':patientRemaining?'warning':'success'}`;
  patientStatus.innerHTML=contactGaps?`<i data-lucide="circle-x"></i> ${contactGaps} missing`:patientRemaining?`<i data-lucide="triangle-alert"></i> ${patientRemaining} ${patientRemaining===1?'needs':'need'} review`:'<i data-lucide="circle-check"></i> Reviewed';
  const prescriptionStatus=$('#prescription-section .section-status');
  prescriptionStatus.className=`section-status ${prescriptionRemaining?'danger':'success'}`;
  prescriptionStatus.innerHTML=prescriptionRemaining?`<i data-lucide="circle-x"></i> ${prescriptionRemaining} to resolve`:'<i data-lucide="circle-check"></i> Reviewed';
  setSectionStatus('#prior-auth-section',state.authAck,'warning','1 needs review');
  const requiredRemaining=reviewItems().filter(item=>item.severity==='missing').length;
  $('#completionCard').hidden=requiredRemaining>0;
  if(!requiredRemaining){
    const patientResult=state.patientLinked?'Existing patient linked':'Patient record ready';
    $('#completionCard p').textContent=`${patientResult}, insurance verified, prescription attached, and documents stored.`;
    $('#completionCard .completion-list span:first-child').innerHTML=`<i data-lucide="check"></i> ${patientResult}`;
  }
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
  state.provider=/^\d{10}$/.test(prescriptions[0]?.physician.npi||'');
  state.product=Boolean(prescriptions[0]?.items[0]?.policy);
  updateProgress();
}

function policyName(id){const policy=coveragePolicies.find(item=>item.id===id);return policy?`${policy.id} - ${policy.name}`:'';}
function addFiles(fileList){
  const files=[...fileList];
  if(!files.length)return;
  simulateUpload(files.map((file,index)=>({id:`upload-${Date.now()}-${index}`,name:file.name,icon:'file-text',type:file.type||'Uploaded document'})));
}

document.addEventListener('click',event=>{
  const target=event.target.closest('button,[data-doc]');
  if(!target)return;
  if(target.dataset.removeUpload){
    const index=documents.findIndex(file=>file.id===target.dataset.removeUpload);if(index<0||state.extracting)return;
    const [removed]=documents.splice(index,1);
    if(state.selected===removed.id)state.selected=documents[0]?.id||'';
    if(removed.fromRecord)state.pickerSelection.delete(removed.id);
    renderDocuments();renderUploadQueue();
    toast(`${removed.name} removed`);return;
  }
  if(target.dataset.fileFilter){state.fileFilter=target.dataset.fileFilter;renderFileList();return;}
  if(target.dataset.fileView){state.fileView=target.dataset.fileView;renderFileList();return;}
  if(target.dataset.sideTab){setSideTab(target.dataset.sideTab);return;}
  if(target.dataset.viewerTab){setViewerTab(target.dataset.viewerTab);return;}
  if(target.dataset.document){openDocument(target.dataset.document);return;}
  if(target.dataset.doc){openDocument(target.dataset.doc);return;}
  if(target.dataset.galleryDoc){openDocument(target.dataset.galleryDoc);return;}
  if(target.dataset.viewMode){setViewerMode(target.dataset.viewMode);return;}
  if(target.dataset.postAction){handlePostAction(target.dataset.postAction,target);return;}
  if(target.dataset.extractPatient){
    const patient=patientMatches.find(item=>item.id===target.dataset.extractPatient);state.patientResolved=true;state.patientLinked=true;
    syncExistingPatientFiles();
    animateSteps(()=>{resolvePatientIssue(patient.name,`${patient.mrn} · Existing patient linked`);setIssueHead();$('#documentIssue').hidden=!issuePlan.findings.length;setDocLock(false);icons();});toast(`${patient.name} linked.`);checkExtractionReady();return;
  }
  if(target.dataset.changePatient!==undefined){state.patientResolved=false;state.patientLinked=false;syncExistingPatientFiles();animateSteps(renderExtractionPatientMatches);return;}
  if(target.dataset.extractPatientDetails){const card=$(`#extract-patient-${target.dataset.extractPatientDetails}`),details=card.querySelector('.extract-patient-details'),open=details.hidden;details.hidden=!open;target.setAttribute('aria-expanded',open);target.textContent=open?'Hide details':'View details';return;}
  if(target.dataset.extractNewPatient!==undefined){state.patientResolved=true;state.patientLinked=false;syncExistingPatientFiles();animateSteps(()=>{resolvePatientIssue('Create a new patient','No existing record will be linked');setIssueHead();$('#documentIssue').hidden=!issuePlan.findings.length;setDocLock(false);icons();});checkExtractionReady();return;}
  if(target.dataset.extractDocument){
    const id=target.dataset.extractDocument;state.documentResolutions.add(id);const card=$(`#extract-${id}`);card.classList.add('resolved');card.querySelector('.extract-document-actions').innerHTML=`<span class="issue-resolved"><i data-lucide="check"></i><span><strong>${target.dataset.decision==='existing'?'Using existing document':target.dataset.decision==='replace'?'Replacing existing document':target.dataset.decision==='upload'?'Keeping new copy':'Keeping both'}</strong></span></span>`;
    if(state.documentResolutions.size===state.docDecisionsNeeded)$('#documentIssue .issue-title>b').textContent='Resolved';icons();checkExtractionReady();return;
  }
  if(target.dataset.plan!==undefined){renderInsurance(+target.dataset.plan);return;}
  if(target.dataset.planEdit!==undefined){state.editingPlan=true;renderInsurance();$('[data-plan-field]')?.focus();return;}
  if(target.dataset.planCancel!==undefined){state.editingPlan=false;renderInsurance();return;}
  if(target.dataset.planSave!==undefined){const plan=insurancePlans[state.currentPlan];$$('[data-plan-field]').forEach(input=>{plan.fields[input.dataset.planField][1]=input.value.trim()||'Not provided';});state.editingPlan=false;plan.check=null;renderInsurance();toast(`${plan.name} updated. Check eligibility again for ${state.serviceType}.`);return;}
  if(target.dataset.planCheck!==undefined){checkPlanEligibility();return;}
  if(target.dataset.order){setPlanOrder(orderBy(target.dataset.order==='ai'?'aiRank':'systemRank'),target.dataset.order==='ai'?'AI coverage order applied':'System coverage order applied');return;}
  if(target.dataset.planResponse!==undefined){renderEligibilityResponse(+target.dataset.planResponse);return;}
  if(target.dataset.existing){
    const file=existingFiles.find(item=>item.id===target.dataset.existing);
    if(!file)return;
    openDocument(file.id);
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
  if(target.dataset.authAck!==undefined){state.authAck=true;resolveFieldRow('authExpiry','Acknowledged');updateProgress();toast('Authorization gap acknowledged');return;}
  if(target.dataset.aiChange){
    const key=target.dataset.aiChange,field=aiChangeFields[key],current=$(field.value).textContent;
    const quick=field.alternatives?field.alternatives.filter(value=>value!==current).map(value=>`<button class="small-btn" data-ai-pick="${key}" data-value="${value}">Use ${value}</button>`).join(''):'';
    target.closest('.ai-decision').innerHTML=`<i data-lucide="pencil"></i><span><b>Override AI value</b><input class="input compact-override" id="override-${key}" value="${current}" aria-label="Override ${field.label}"></span>${quick}<button class="small-btn primary" data-ai-save="${key}">Save</button>`;
    icons();$(`#override-${key}`).focus();return;
  }
  if(target.dataset.aiPick){$(`#override-${target.dataset.aiPick}`).value=target.dataset.value;return;}
  if(target.dataset.aiSave){
    const key=target.dataset.aiSave,field=aiChangeFields[key],value=$(`#override-${key}`).value.trim();if(!value)return;
    $(field.value).textContent=value;state.aiEdited.add(key);if(key==='physician'&&prescriptions[0])prescriptions[0].physician.last=value;
    $(`#${field.row} .confidence`).textContent='Edited';
    target.closest('.ai-decision').innerHTML='<i data-lucide="check"></i><span><b>Manual change saved</b>This value will be recorded instead of the AI-selected value.</span>';
    icons();updateProgress();toast(`${field.label.charAt(0).toUpperCase()+field.label.slice(1)} updated`);return;
  }
  if(target.id==='changeDob'){
    target.closest('.ai-decision').innerHTML='<i data-lucide="pencil"></i><span><b>Override AI value</b><input class="input compact-override" id="dobOverride" value="03/15/1978" aria-label="Override date of birth"></span><button class="small-btn" data-save-dob>Save</button>';
    icons();$('#dobOverride').focus();return;
  }
  if(target.dataset.saveDob!==undefined){const value=$('#dobOverride').value.trim();if(!value)return;$('#dobValue').textContent=value;state.aiEdited.add('dob');$('#dobConflict .confidence').textContent='Edited';updateProgress();target.closest('.ai-decision').innerHTML='<i data-lucide="check"></i><span><b>Manual override saved</b>This value will be recorded instead of the AI-selected value.</span>';icons();toast('Date of birth override saved');return;}
  if(target.dataset.jump){document.getElementById(target.dataset.jump).scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(target.dataset.reviewTarget){
    const destination=$(`#${target.dataset.reviewTarget}`),group=destination?.closest('details');if(group)group.open=true;
    const aiItem=aiResolvedFields.find(item=>item.id===target.dataset.reviewTarget);
    if(aiItem){state.aiReviewed.add(aiItem.key);renderReviewMenu();}
    if(innerWidth<=1180)setSourceDrawer(false,true);
    // Bring the field near the top of the form and flash it so the eye lands on it.
    const flash=target.classList.contains('missing')?'flash-required':'flash-optional';
    setTimeout(()=>{
      if(!destination)return;
      destination.scrollIntoView({behavior:'smooth',block:'start'});
      destination.classList.remove('flash-required','flash-optional');void destination.offsetWidth;destination.classList.add(flash);
      destination.addEventListener('animationend',()=>destination.classList.remove(flash),{once:true});
      destination.querySelector('input,select')?.focus({preventScroll:true});
    },30);return;
  }
  if(target.dataset.match){$('#workspace').classList.remove('viewer-collapsed');setViewerTab('files');$('#matchCard').hidden=false;setTimeout(()=>$('#matchCard').scrollIntoView({block:'nearest',behavior:'smooth'}),50);return;}
});

$('#collapseSources').addEventListener('click',()=>setSourceDrawer(false));
$('#expandReview').addEventListener('click',()=>setSourceDrawer(true));
$('#checkEligibility').addEventListener('click',checkEligibility);
const setServiceMenu=open=>{$('#serviceMenu').hidden=!open;$('#serviceTrigger').setAttribute('aria-expanded',open);if(open){renderServiceMenu();$('#serviceMenu .selected')?.focus();}};
$('#serviceTrigger').addEventListener('click',()=>setServiceMenu($('#serviceMenu').hidden));
$('#serviceMenu').addEventListener('click',event=>{const option=event.target.closest('[data-service-type]');if(!option)return;state.serviceType=option.dataset.serviceType;setServiceMenu(false);renderInsurance();$('#serviceTrigger').focus();});
$('#serviceMenu').addEventListener('keydown',event=>{const options=$$('.service-option'),index=options.indexOf(document.activeElement);if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();options[(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length].focus();}if(event.key==='Escape'){setServiceMenu(false);$('#serviceTrigger').focus();}});
document.addEventListener('click',event=>{if(!event.composedPath().some(node=>node.classList?.contains('service-select')))setServiceMenu(false);});
$('#addPlan').addEventListener('click',openAddPlan);
$('#extractDocuments').addEventListener('click',startExtraction);
const cancelUpload=()=>{
  if(!documents.length&&!state.knownPatient)return;
  documents.length=0;state.selected='';state.knownPatient=null;state.pickerPatient='';state.pickerSelection=new Set();
  $('#fileInput').value='';$('#patientSearchInput').value='';
  setViewerTab('files');renderDocuments();renderUploadQueue();
  toast('Upload cancelled. Documents removed.');
};
$('#cancelUpload').addEventListener('click',cancelUpload);
$('#startExtract').addEventListener('click',startExtraction);
$('#patientSearchInput').addEventListener('input',()=>{state.pickerPatient='';renderQueuePatients();});
$('#recordCard').addEventListener('click',event=>{
  if(event.target.closest('[data-unlink-patient]')){unlinkPatient();return;}
  if(event.target.closest('[data-record-toggle]')){
    const patient=patientDirectory.find(item=>item.id===(state.knownPatient||state.pickerPatient));if(!patient)return;
    state.pickerSelection=state.pickerSelection.size?new Set():new Set(patient.documents.filter(file=>!documents.some(item=>item.id===file.id)).map(file=>file.id));
    renderQueuePatients();return;
  }
  if(event.target.closest('[data-record-add]')){addRecordDocuments();return;}
  const row=event.target.closest('[data-record-patient]');
  if(row){if(state.pickerPatient===row.dataset.recordPatient){state.pickerPatient='';renderQueuePatients();}else openRecordPicker(row.dataset.recordPatient);}
});
$('#recordCard').addEventListener('change',event=>{const id=event.target.dataset.recordDoc;if(!id)return;event.target.checked?state.pickerSelection.add(id):state.pickerSelection.delete(id);renderQueuePatients();});
['dragenter','dragover'].forEach(type=>$('#uploadStartZone').addEventListener(type,event=>{event.preventDefault();$('#uploadStartZone').classList.add('over');}));
['dragleave','drop'].forEach(type=>$('#uploadStartZone').addEventListener(type,event=>{event.preventDefault();$('#uploadStartZone').classList.remove('over');if(type==='drop')addFiles(event.dataTransfer.files);}));
$('#sourceScrim').addEventListener('click',()=>setSourceDrawer(false));
$('#resolveDialog').addEventListener('cancel',event=>event.preventDefault());
$('#backToFiles').addEventListener('click',()=>setViewerTab('files'));
$('#reextractBtn').addEventListener('click',()=>reextractDocuments());
document.addEventListener('click',event=>{const one=event.target.closest('[data-extract-one]');if(one)reextractDocuments(one.dataset.extractOne);});
// Full-screen viewer for the previewed document: zoom, fit width, fit page.
const fullView={zoom:1};
function applyFullZoom(){const image=$('#dvImage');fullView.zoom=Math.min(4,Math.max(.25,fullView.zoom));image.style.width=`${Math.round(image.naturalWidth*fullView.zoom)}px`;$('#dvZoom').textContent=`${Math.round(fullView.zoom*100)}%`;}
function fitFullView(mode){const stage=$('#dvStage'),image=$('#dvImage'),pad=64;if(!image.naturalWidth)return;const byWidth=(stage.clientWidth-pad)/image.naturalWidth,byHeight=(stage.clientHeight-pad)/image.naturalHeight;fullView.zoom=mode==='width'?byWidth:Math.min(byWidth,byHeight);fullView.fit=mode;applyFullZoom();}
function openFullView(){
  const image=$('#dvImage');
  $('#dvName').textContent=$('#previewName').textContent;$('#dvMeta').textContent=$('#previewMeta').textContent;
  image.alt=$('#documentImage').alt;
  $('#docViewer').showModal();
  const fit=()=>fitFullView('page');
  if(image.src!==$('#documentImage').src){image.onload=fit;image.src=$('#documentImage').src;}else fit();
  icons();
}
$('#openFullView').addEventListener('click',openFullView);
$('#docViewer').addEventListener('click',event=>{
  const control=event.target.closest('[data-dv]');if(!control)return;
  const action=control.dataset.dv;
  if(action==='close')$('#docViewer').close();
  else if(action==='in'||action==='out'){fullView.zoom=fullView.zoom*(action==='in'?1.25:.8);fullView.fit='';applyFullZoom();}
  else if(action==='actual'){fullView.zoom=1;fullView.fit='';applyFullZoom();}
  else fitFullView(action);
});
$('#docViewer').addEventListener('keydown',event=>{
  if(event.key==='+'||event.key==='='){event.preventDefault();$('[data-dv=in]').click();}
  if(event.key==='-'){event.preventDefault();$('[data-dv=out]').click();}
  if(event.key==='0'){event.preventDefault();fitFullView('page');}
});
addEventListener('resize',()=>{if($('#docViewer').open&&fullView.fit)fitFullView(fullView.fit);});
$('#gateDialog').addEventListener('close',()=>{if($('#gateDialog').returnValue==='review'){setSourceDrawer(true,true);setSideTab('review');}});
$('#collapseViewer').addEventListener('click',()=>{$('#workspace').classList.add('viewer-collapsed');});
$('#expandViewer').addEventListener('click',()=>{$('#workspace').classList.remove('viewer-collapsed');});
// Side panes resize by dragging their inner edge (or arrow keys on the handle). Widths are kept with the saved progress.
const paneSizes={viewer:{prop:'--viewer-w',min:300,max:680,grow:-1},review:{prop:'--review-w',min:240,max:560,grow:1}};
const setPaneWidth=(name,width)=>{const pane=paneSizes[name],value=Math.min(pane.max,Math.max(pane.min,Math.round(width)));document.documentElement.style.setProperty(pane.prop,`${value}px`);state.paneWidths={...state.paneWidths,[name]:value};};
function makeResizable(name,handle,panel){
  let drag=null;
  handle.tabIndex=0;
  handle.addEventListener('pointerdown',event=>{drag={startX:event.clientX,startWidth:panel.getBoundingClientRect().width};handle.setPointerCapture(event.pointerId);document.body.classList.add(`resizing-${name}`);event.preventDefault();});
  handle.addEventListener('pointermove',event=>{if(drag)setPaneWidth(name,drag.startWidth+(event.clientX-drag.startX)*paneSizes[name].grow);});
  const stop=()=>{if(!drag)return;drag=null;document.body.classList.remove(`resizing-${name}`);saveSoon();};
  handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);
  handle.addEventListener('keydown',event=>{if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;event.preventDefault();setPaneWidth(name,panel.getBoundingClientRect().width+(event.key==='ArrowRight'?20:-20)*paneSizes[name].grow);saveSoon();});
}
makeResizable('viewer',$('#viewerResize'),$('#documentViewer'));
makeResizable('review',$('#reviewResize'),$('#sourcePanel'));
if($('#confirmMobile'))$('#confirmMobile').addEventListener('click',resolveMobile);
if($('#fileInput'))$('#fileInput').addEventListener('change',event=>addFiles(event.target.files));
// Demo mode: "Browse & Upload Files" simulates picking files instead of opening the OS file explorer.
const demoUploadFiles=[
  {id:'referral',name:'Referral.pdf',type:'Referral',icon:'file-text',size:'2 pages · 412 KB'},
  {id:'insurance',name:'Insurance Card.jpg',type:'Insurance card',icon:'badge-check',size:'1 image · 1.4 MB'},
  {id:'prescription',name:'Prescription.pdf',type:'Prescription',icon:'notebook-tabs',size:'1 page · 238 KB'},
  {id:'prescription-2',name:'Oxygen Prescription.jpg',type:'Prescription',icon:'notebook-tabs',size:'1 image · 980 KB'},
  {id:'consent',name:'Consent Form.pdf',type:'Consent form',icon:'file-signature',size:'2 pages · 351 KB'},
  {id:'face-to-face',name:'Face-to-Face Notes.pdf',type:'Clinical notes',icon:'stethoscope',size:'2 pages · 527 KB'}
];
const extraUploadBatches=[
  [{id:'sleep-test',name:'Home Sleep Test Report.pdf',type:'Sleep study',icon:'file-chart-column',size:'4 pages · 1.2 MB'},
   {id:'photo-id',name:'Photo ID.jpg',type:'Identification',icon:'id-card',size:'1 image · 640 KB'}],
  [{id:'oximetry',name:'Overnight Oximetry.pdf',type:'Clinical record',icon:'activity',size:'3 pages · 688 KB'}],
  [{id:'medication-list',name:'Medication List.png',type:'Clinical record',icon:'pill',size:'1 image · 610 KB'},
   {id:'progress-notes',name:'Progress Notes · Oct 2026.pdf',type:'Clinical notes',icon:'clipboard-list',size:'3 pages · 455 KB'},
   {id:'secondary-insurance',name:'Secondary Insurance Card.jpg',type:'Insurance card',icon:'badge-check',size:'1 image · 1.1 MB'}]
];
function nextDemoBatch(){
  const fresh=demoUploadFiles.filter(file=>!documents.some(item=>item.id===file.id||item.name===file.name));
  if(fresh.length)return fresh;
  return extraUploadBatches.find(list=>list.every(file=>!documents.some(item=>item.id===file.id)))||[];
}
function addDemoUploads(){
  const batch=nextDemoBatch();
  if(!batch.length){toast('All of this patient’s documents are already uploaded.');return;}
  simulateUpload(batch);
}

// Files upload one after another. In review they're extracted straight into the intake.
async function simulateUpload(files){
  const inReview=state.phase==='review';
  files.forEach(file=>documents.push({...file,meta:'Uploading…',uploading:true,processing:false}));
  if(!state.selected)state.selected=documents[0].id;
  renderDocuments();renderUploadQueue();
  for(const file of files){
    await wait(450+Math.random()*450);
    const doc=documents.find(item=>item.id===file.id);if(!doc)continue;
    doc.uploading=false;
    if(inReview){doc.pendingExtract=true;doc.meta='Not extracted yet';}
    else doc.meta=`${file.size?`${file.size} · `:''}Ready to extract`;
    renderDocuments();renderUploadQueue();
  }
  if(!files.some(file=>documents.some(item=>item.id===file.id)))return;
  toast(`${files.length} ${files.length===1?'document':'documents'} uploaded and ready to extract.`);
}
// Re-extract new documents during review. AI may fill a required field; the next action may need a refresh.
async function reextractDocuments(onlyId){
  const pending=documents.filter(file=>file.pendingExtract&&(!onlyId||file.id===onlyId));if(!pending.length||state.reextracting)return;
  state.reextracting=true;
  pending.forEach(file=>{file.processing=true;file.meta='Extracting…';});renderDocuments();
  await wait(1800);
  pending.forEach(file=>{file.processing=false;file.pendingExtract=false;file.meta='Extracted · Added to this intake';});
  state.reextracting=false;
  const source=pending[0].name,wasClear=!requiredReviewsLeft();let filled='';
  if(!state.provider&&typeof pickPhysician==='function'){pickPhysician(prescriptions[0].id,'1629384756');filled='Ordering physician';}
  else{const gender=$('#genderInput'),mobile=$('#mobileInput');if(gender&&!gender.value){gender.value='Female';gender.dispatchEvent(new Event('change',{bubbles:true}));filled='Gender';}
    else if(mobile&&!mobile.value.trim()){mobile.value='(415) 220-8841';filled='Mobile number';}}
  updateProgress();
  if(wasClear)state.nextStale=true;
  renderDocuments();renderReviewMenu();
  toast(filled?`${filled} filled in from ${source}.`:`${pending.length} ${pending.length===1?'document':'documents'} extracted. No required fields changed.`);
}
$$('label[for="fileInput"]').forEach(label=>label.addEventListener('click',event=>{event.preventDefault();addDemoUploads();}));
if($('#dropZone'))['dragenter','dragover'].forEach(type=>$('#dropZone').addEventListener(type,event=>{event.preventDefault();$('#dropZone').classList.add('over');}));
if($('#dropZone'))['dragleave','drop'].forEach(type=>$('#dropZone').addEventListener(type,event=>{event.preventDefault();$('#dropZone').classList.remove('over');if(type==='drop')addFiles(event.dataTransfer.files);}));
// Cancel intake: secondary action, always confirmed. A cancelled intake is discarded and starts fresh.
$('#cancelIntake').addEventListener('click',()=>$('#cancelIntakeDialog').showModal());
$('#cancelIntakeDialog').addEventListener('close',()=>{
  if($('#cancelIntakeDialog').returnValue!=='cancel')return;
  try{sessionStorage.setItem('intakeCancelled','1');}catch(error){}
  clearProgress();location.href=location.pathname;
});
try{if(sessionStorage.getItem('intakeCancelled')){sessionStorage.removeItem('intakeCancelled');setTimeout(()=>toast('Intake cancelled. Start a new intake by uploading documents.'),300);}}catch(error){}

// ---------- Prescriptions (1…n) ----------
// Each prescription: physician, ICD-10 codes, and prescribed items. An item can be a single product or a bundle.
// Items may arrive as a HCPCS code or only a product name; AI maps product names to HCPCS.
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
  {match:/(cpap|apap).*(kit|bundle|supplies|starter)|(kit|bundle|starter).*(cpap|apap)/i,lines:['E0601','E0562','A7030','A7037','A7038']},
  {match:/oxygen.*(kit|bundle|supplies)/i,lines:['A4615','A4616']}
];
const icdCatalog={
  'G47.33':'Obstructive sleep apnea (adult)','G47.30':'Sleep apnea, unspecified','R06.83':'Snoring','E66.9':'Obesity, unspecified',
  'E66.01':'Morbid (severe) obesity due to excess calories','I10':'Essential (primary) hypertension','R09.02':'Hypoxemia',
  'J44.9':'Chronic obstructive pulmonary disease, unspecified','J96.11':'Chronic respiratory failure with hypoxia','I50.9':'Heart failure, unspecified'
};
const docTypes={swo:'Standard written order (SWO)',f2f:'Face-to-face clinical evaluation',pa:'Prior authorization'};
const medicareRecommended={L33718:{name:'Sleep study (PSG or HST) report',docId:'sleep-study'},L33797:{name:'Oxygen qualifying test results',docId:'oxygen-test'}};
const receivedDocs={};
const policyFor=code=>/^(E0601|E0562|A70)/.test(code||'')?'L33718':/^(E139|E04|A461)/.test(code||'')?'L33797':'';
const paFor=code=>{const pa=priorAuthList.find(item=>item.code===code);return pa?`${pa.number} · ${pa.payer}`:'';};
function findDoc(docId){return receivedDocs[docId]||documents.find(doc=>doc.id===docId)?.name||(docId==='sleep-study'&&state.patientLinked?'Sleep Study · Aug 2022.pdf':'');}
// FYI only: what documentation applies to an item. Nothing here blocks the intake.
function docsForItem(rx,item){
  const codes=item.lines.map(l=>l.code);
  const pa=codes.map(paFor).find(Boolean);
  const docs=[
    {name:docTypes.swo,docId:rx.docId,status:findDoc(rx.docId)||'Not found in uploads'},
    {name:docTypes.f2f,docId:'face-to-face',status:findDoc('face-to-face')||'Not found in uploads'},
    {name:docTypes.pa,docId:'',status:pa?`On file · ${pa}`:'Not required for these codes'}
  ];
  [...new Set(codes.map(policyFor).filter(Boolean))].forEach(policy=>{const rec=medicareRecommended[policy];docs.push({name:rec.name,docId:rec.docId,status:findDoc(rec.docId)||'Not found in uploads',recommended:policy});});
  return docs.map(doc=>({...doc,na:/^Not required/.test(doc.status),found:!/^Not /.test(doc.status)}));
}
// HCPCS lines carry only the code. Quantity and frequency belong to the prescribed product, and only when the prescription states them.
const line=(code,ai=false)=>({code,ai});
const prescriptions=[
  {id:'rx1',docId:'prescription',source:'Prescription.pdf',date:'10/12/2026',main:true,
    physician:{first:'Sarah',last:'Kim',npi:'1629384756',specialty:'Sleep medicine',address:'1101 Madison St, Suite 600, Seattle, WA, 98104',enrollment:['DME','PMD','Part B']},
    note:{docId:'face-to-face',source:'Face-to-Face Notes.pdf',page:'p1',signed:true,
      text:'Patient seen 10/12/2026 for loud snoring, witnessed apneas, and daytime sleepiness (Epworth score 14). Home sleep test on 10/08/2026 shows AHI 18.4 events/hr, consistent with moderate obstructive sleep apnea. Recommend auto-titrating CPAP 5–15 cm H2O with heated humidifier and full face mask. Patient educated on therapy and agrees to start. Follow up in 31–90 days to assess compliance and benefit.'},
    icd:[{code:'G47.33',description:icdCatalog['G47.33'],primary:true},{code:'E66.9',description:icdCatalog['E66.9']},{code:'I10',description:icdCatalog['I10']}],
    items:[
      {id:'item-1',name:'CPAP auto 5–15 cm H2O with heated humidifier, full face mask and supplies',bundle:true,qty:1,frequency:'Nightly during sleep',policy:'L33718',policyAi:true,
        dispense:{type:'Rental',length:'99 months (lifetime)',start:'10/15/2026'},
        lines:[line('E0601',true),line('E0562',true),line('A7030',true),line('A7031',true),line('A7037',true),line('A7038',true)]},
      {id:'item-2',name:'PAP headgear',bundle:false,qty:1,policy:'L33718',policyAi:true,
        dispense:{type:'Purchase',length:'99 months (lifetime)',start:'10/15/2026'},
        lines:[line('A7035')]}
    ]},
  {id:'rx2',docId:'prescription-2',source:'Oxygen Prescription.jpg',date:'10/13/2026',
    physician:{first:'Michael',last:'Reyes',npi:'1487265930',specialty:'Pulmonology',enrollment:['DME','Part B']},
    note:{docId:'prescription-2',source:'Oxygen Prescription.jpg',page:'p1',signed:true,
      text:'Patient seen 10/13/2026 for nocturnal hypoxemia in the setting of obstructive sleep apnea. Overnight oximetry shows SpO2 at or below 88% for 6 cumulative minutes despite PAP therapy. Prescribe stationary oxygen concentrator at 2 L/min during sleep with nasal cannula. Reassess oxygen need and saturation in 90 days.'},
    icd:[{code:'R09.02',description:icdCatalog['R09.02'],primary:true},{code:'G47.33',description:icdCatalog['G47.33']}],
    items:[
      {id:'item-1',name:'Home oxygen concentrator, 2 L/min nocturnal',bundle:false,qty:1,frequency:'During sleep',policy:'L33797',policyAi:true,
        dispense:{type:'Rental',length:'12 months',start:'10/15/2026'},
        lines:[line('E1390',true)]},
      {id:'item-2',name:'Oxygen supplies',bundle:true,policy:'L33797',policyAi:true,
        dispense:{type:'Purchase',length:'12 months',start:'10/15/2026'},
        lines:[line('A4615',true),line('A4616',true)]}
    ]}
];
const rxTitle=index=>`Prescription ${index+1}`;
const rxById=id=>prescriptions.find(rx=>rx.id===id);
const itemTitle=item=>item.bundle||!/^[A-Z]\d{4}$/.test(item.name)?item.name:`${item.name} · ${hcpcsCatalog[item.name]||'Unknown code'}`;
const chips=list=>list.map(e=>`<span class="enrollment-chip"><i data-lucide="circle-check"></i> ${e}</span>`).join('');

// ---------- Ordering physician: search the NPI registry by name or NPI ----------
const physicianDirectory=[
  {first:'Sarah',last:'Kim',npi:'1629384756',specialty:'Sleep medicine',address:'1101 Madison St, Suite 600, Seattle, WA, 98104',dme:true,pmd:true,partb:true},
  {first:'Sarah',last:'Kimball',npi:'1306627418',specialty:'Family medicine',address:'4800 Sand Point Way NE, Seattle, WA, 98105',dme:true,pmd:false,partb:true},
  {first:'Sara',last:'Kimm',npi:'1952730184',specialty:'Internal medicine',address:'16259 Sylvester Rd SW, Burien, WA, 98166',dme:false,pmd:false,partb:true},
  {first:'Michael',last:'Reyes',npi:'1487265930',specialty:'Pulmonology',address:'1600 E Jefferson St, Seattle, WA, 98122',dme:true,pmd:false,partb:true},
  {first:'Michael',last:'Reyna',npi:'1740318265',specialty:'Cardiology',address:'1229 Madison St, Seattle, WA, 98104',dme:true,pmd:true,partb:true},
  {first:'Teresa',last:'Gallardo',npi:'1144253303',specialty:'Pulmonology',address:'2677 151st Place NE, Redmond, WA, 98052',dme:true,pmd:true,partb:true},
  {first:'Andrea',last:'Hollins',npi:'1770238123',specialty:'Sleep medicine',address:'11511 NE 10th St, Bellevue, WA, 98004',dme:true,pmd:true,partb:true},
  {first:'Abigail',last:'Harlow',npi:'1760221998',specialty:'Internal medicine',address:'5300 Tallman Ave NW, Seattle, WA, 98107',dme:true,pmd:false,partb:true},
  {first:'Anand',last:'Mehta',npi:'1265194120',specialty:'Neurology',address:'550 17th Ave, Seattle, WA, 98122',dme:false,pmd:true,partb:true},
  {first:'Ana Paula',last:'Ferreira',npi:'1295293009',specialty:'Family medicine',address:'12333 NE 130th Ln, Kirkland, WA, 98034',dme:true,pmd:true,partb:true},
  {first:'Daniel',last:'Okafor',npi:'1538804417',specialty:'Pulmonology',address:'747 Broadway, Seattle, WA, 98122',dme:true,pmd:true,partb:true},
  {first:'Grace',last:'Lindqvist',npi:'1083957261',specialty:'Otolaryngology',address:'1560 N 115th St, Seattle, WA, 98133',dme:false,pmd:false,partb:true}
];
// Registry address and enrollment for physicians the AI already extracted.
physicianDirectory.forEach(doc=>prescriptions.forEach(rx=>{const p=rx.physician;if(p.npi&&p.npi===doc.npi)Object.assign(p,{address:doc.address,dme:doc.dme,pmd:doc.pmd,partb:doc.partb});}));
const physSearch={};
const yn=v=>v==null?'—':v?'Y':'N';
function searchPhysicians(f,l,n){
  f=f.trim().toLowerCase();l=l.trim().toLowerCase();n=n.trim();
  if(!f&&!l&&!n)return [];
  return physicianDirectory.filter(d=>(!f||d.first.toLowerCase().startsWith(f))&&(!l||d.last.toLowerCase().startsWith(l))&&(!n||d.npi.startsWith(n))).slice(0,8);
}
function physResultsHtml(rxId,results){
  if(!results.length)return '<p class="phys-empty">No physicians found. Check the spelling or search by NPI.</p>';
  return `<p class="phys-results-head">Click a record to add the ordering physician</p>${results.map(d=>`<button type="button" class="phys-result" role="option" data-pick-physician="${rxId}" data-npi="${d.npi}"><strong>${d.first.toUpperCase()} ${d.last.toUpperCase()}</strong><small>NPI: ${d.npi} · ${d.specialty} · ${d.address.split(', ').slice(-3).join(', ')}</small></button>`).join('')}`;
}
// The system looks up the prescription's physician in the NPI registry: either a full match or no match.
function physicianHtml(rx){
  const p=rx.physician,found=Boolean(p.npi),searching=!found||rx.changingPhysician;
  const fromRx=p.extracted?.length?`<dl class="phys-extracted">${p.extracted.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`:'';
  const card=found?`<div class="phys-card">
      <div class="phys-card-head"><strong>Physician information</strong><span class="phys-card-tags">${p.picked?'<span class="pill neutral">Selected by you</span>':'<span class="pill success"><i data-lucide="badge-check"></i> Matched in NPI registry</span>'}${searching?'':`<button type="button" class="text-btn" data-change-physician="${rx.id}">Change</button>`}</span></div>
      <div class="phys-grid"><div><span>First name</span><strong>${p.first}</strong></div><div><span>Last name</span><strong>${p.last}</strong></div><div><span>NPI</span><strong>${p.npi}</strong></div><div class="phys-address"><span>Address</span><strong>${p.address||'—'}</strong></div></div>
      <div class="phys-grid enroll"><div><span>DME</span><strong>${yn(p.dme)}</strong></div><div><span>PMD</span><strong>${yn(p.pmd)}</strong></div><div><span>PARTB</span><strong>${yn(p.partb)}</strong></div></div>
    </div>`:'';
  const notFound=!found?(rx.source&&fromRx?`<div class="phys-notfound" ${rx.main?'id="providerField"':''}>
      <div class="phys-notfound-head"><i data-lucide="user-search"></i><span><b>Couldn’t find this physician in the NPI registry</b>AI searched using what’s on the prescription. Search by name or NPI below to add the ordering physician.</span></div>
      <div class="phys-from"><span class="phys-from-label">On the prescription <button class="source-link" data-doc="${rx.docId}"><i data-lucide="scan-text"></i> ${rx.source} · p1</button></span>${fromRx}</div>
    </div>`:'<p class="phys-hint empty"><i data-lucide="search"></i> Search by name or NPI to add the ordering physician.</p>'):'';
  const search=searching?`<div class="phys-search-wrap"><p class="phys-sub">Search physician by name or NPI</p>
      <form class="phys-search" data-phys-search="${rx.id}" autocomplete="off">
        <input class="input" name="first" placeholder="First name" aria-label="Physician first name">
        <input class="input" name="last" placeholder="Last name" aria-label="Physician last name">
        <input class="input" name="npi" placeholder="Physician NPI" aria-label="Physician NPI" inputmode="numeric" maxlength="10">
        <button class="small-btn primary" type="submit">Search</button>
        <div class="phys-results" id="phys-results-${rx.id}" role="listbox" hidden></div>
      </form>${found?`<button type="button" class="text-btn" data-cancel-physician="${rx.id}">Cancel</button>`:''}</div>`:'';
  return `<details class="data-group" open><summary><span>Ordering physician</span><small>${found?(p.picked?'Added from NPI registry':'Matched in NPI registry'):'<span class="phys-status-miss">Not found in NPI registry</span>'}</small><i data-lucide="chevron-down"></i></summary>
    <div class="phys-block">${notFound}${search}${card}</div>
  </details>`;
}
function showPhysResults(rxId){
  const form=$(`[data-phys-search="${rxId}"]`),box=$(`#phys-results-${rxId}`);if(!form||!box)return;
  const results=searchPhysicians(form.first.value,form.last.value,form.npi.value);
  if(!form.first.value.trim()&&!form.last.value.trim()&&!form.npi.value.trim()){box.hidden=true;return;}
  box.innerHTML=physResultsHtml(rxId,results);box.hidden=false;icons();
}
function refreshPhysician(rx){
  const group=$(`[data-phys-search="${rx.id}"]`)?.closest('details');if(!group)return;
  group.outerHTML=physicianHtml(rx);setRxStatus(rx);icons();
}
function pickPhysician(rxId,npi){
  const rx=rxById(rxId),doc=physicianDirectory.find(d=>d.npi===npi);if(!rx||!doc)return;
  rx.physician={...doc,enrollment:[doc.dme&&'DME',doc.pmd&&'PMD',doc.partb&&'Part B'].filter(Boolean),picked:true,extracted:rx.physician.extracted};rx.changingPhysician=false;
  
  refreshPhysician(rx);
  if(rx.main)updateRequired();
  toast(`Dr. ${doc.first} ${doc.last} added as the ordering physician`);
}
$('#prescriptions').addEventListener('input',event=>{const form=event.target.closest('[data-phys-search]');if(form)showPhysResults(form.dataset.physSearch);});
$('#prescriptions').addEventListener('submit',event=>{const form=event.target.closest('[data-phys-search]');if(!form)return;event.preventDefault();event.stopImmediatePropagation();
  const box=$(`#phys-results-${form.dataset.physSearch}`);const results=searchPhysicians(form.first.value,form.last.value,form.npi.value);
  box.innerHTML=(form.first.value.trim()||form.last.value.trim()||form.npi.value.trim())?physResultsHtml(form.dataset.physSearch,results):'<p class="phys-empty">Enter a first name, last name or NPI.</p>';box.hidden=false;icons();},true);
$('#prescriptions').addEventListener('click',event=>{const b=event.target.closest('[data-pick-physician]');if(b){pickPhysician(b.dataset.pickPhysician,b.dataset.npi);return;}const c=event.target.closest('[data-change-physician],[data-cancel-physician]');if(c){const rx=rxById(c.dataset.changePhysician||c.dataset.cancelPhysician);rx.changingPhysician=Boolean(c.dataset.changePhysician);refreshPhysician(rx);if(rx.changingPhysician)$(`[data-phys-search="${rx.id}"] input`)?.focus();}});
document.addEventListener('mousedown',event=>{$$('.phys-results:not([hidden])').forEach(box=>{if(!box.closest('form').contains(event.target))box.hidden=true;});});
document.addEventListener('keydown',event=>{if(event.key==='Escape')$$('.phys-results:not([hidden])').forEach(box=>box.hidden=true);});
function icdHtml(rx){
  return `<div class="code-list">${rx.icd.map((item,i)=>`<span class="code-chip"><b>${item.code}</b><span>${item.description}</span>${item.primary?'<em>Primary</em>':''}<button type="button" class="chip-remove" data-remove-icd="${rx.id}" data-index="${i}" aria-label="Remove ${item.code}" title="Remove"><i data-lucide="x"></i></button></span>`).join('')||'<span class="empty-note">No ICD-10 codes yet</span>'}</div>
    <form class="inline-add" data-add-icd="${rx.id}"><input class="input" name="code" list="icdOptions" placeholder="ICD-10 code or diagnosis" aria-label="Add ICD-10 code" autocomplete="off"><button class="small-btn" type="submit"><i data-lucide="plus"></i> Add ICD-10 code</button></form>`;
}
// Bundle vs single item: decided by AI unless the user changed the item's codes.
function kindPill(item){
  const ai=item.kindAi!==false,n=item.lines.length;
  const label=item.bundle?`Bundle · ${n} codes`:'Single item';
  const why=item.bundle?`AI identified this as a bundle: one prescribed product made up of ${n} HCPCS codes.`:'AI identified this as a single product with one HCPCS code.';
  return ai?`<span class="pill ai-kind" title="${why}"><i data-lucide="sparkles"></i> AI: ${label}</span>`:`<span class="pill neutral" title="Set by you">${item.bundle?'<i data-lucide="boxes"></i> ':''}${label}</span>`;
}
// Required documents: show how many are on file, not just a count.
function docsButton(ref,docs){
  const needed=docs.filter(d=>!d.na),have=needed.filter(d=>d.found).length,all=have===needed.length;
  const title=`Required documents: ${have} of ${needed.length} on file${all?'':` · ${needed.length-have} not found in uploads`}`;
  return `<button type="button" class="doc-info req-docs ${all?'complete':'partial'}" data-item-docs="${ref}" title="${title}" aria-label="${title}"><i data-lucide="${all?'file-check':'file-warning'}"></i><span>Required docs</span><b>${have}/${needed.length}</b></button>`;
}
function itemHtml(rx,item){
  const ref=`${rx.id}|${item.id}`,mapped=item.lines.some(l=>l.ai),docs=docsForItem(rx,item);
  const rows=item.editing
    ?item.lines.map((l,i)=>`<div class="hcpcs-row editing"><input class="input code-input" list="hcpcsOptions" value="${l.code}" placeholder="Code" maxlength="5" aria-label="HCPCS code" data-line="${ref}|${i}" data-line-field="code"><span class="hcpcs-desc">${l.code?(hcpcsCatalog[l.code]||'Code not in catalog · verify'):'Enter a HCPCS code'}</span>${item.lines.length>1?`<button type="button" class="icon-btn" data-remove-line="${ref}|${i}" aria-label="Remove line" title="Remove"><i data-lucide="x"></i></button>`:'<span></span>'}</div>`).join('')
    :item.lines.map(l=>`<div class="hcpcs-row ${l.code?'':'unmapped'}"><span class="hcpcs-badge">${l.code||'—'}</span><span class="hcpcs-desc">${l.code?(hcpcsCatalog[l.code]||'Code not in catalog · verify'):'No HCPCS match. Select Edit to enter a code.'}${l.ai?'<i data-lucide="sparkles" class="ai-dot" aria-label="AI mapped" title="AI mapped"></i>':''}</span></div>`).join('');
  const open=item.editing||item.expanded,qty=item.qty,usage=item.frequency||'';
  const dosing=[qty?`Qty <b>${qty}</b>`:'',usage?`<span>${usage}</span>`:''].filter(Boolean).join('<span class="dot-sep"></span>')||'<span class="not-stated">Qty and frequency not on the prescription</span>';
  const count=item.lines.length,codesLabel=`${mapped?'AI selected ':''}${count} HCPCS ${count===1?'code':'codes'}`;
  return `<article class="rx-item ${open?'open':''}" id="rx-${rx.id}-${item.id}">
    <header class="rx-item-head">
      <div class="rx-item-main">
        <div class="rx-item-title"><strong>${item.bundle?item.name:(mapped||!/^[A-Z]\d{4}$/.test(item.name)?item.name:hcpcsCatalog[item.name]||item.name)}</strong>${kindPill(item)}</div>
        <p class="rx-item-meta">${dosing}${item.matchedFrom&&item.matchedFrom.toLowerCase()!==item.name.toLowerCase()?`<span class="dot-sep"></span><span class="matched-from">You searched “${item.matchedFrom}”</span>`:''}</p>
        <button type="button" class="codes-toggle" data-toggle-codes="${ref}" aria-expanded="${open}" ${item.editing?'disabled':''}><i data-lucide="sparkles"></i><span>${codesLabel}</span><i data-lucide="chevron-down" class="chev"></i></button>
      </div>
      ${docsButton(ref,docs)}
      <button type="button" class="text-btn" data-edit-item="${ref}">${item.editing?'Done':'Edit'}</button>
      <button type="button" class="icon-btn" data-remove-item="${ref}" aria-label="Remove item" title="Remove item"><i data-lucide="trash-2"></i></button>
    </header>
    ${open?`<div class="hcpcs-rows">${rows}</div>`:''}
  </article>`;
}
function itemsHtml(rx){
  return `${rx.items.some(item=>item.kindAi!==false)?'<p class="ai-kind-note"><i data-lucide="sparkles"></i><span>AI grouped the prescribed products into <b>bundles</b> and <b>single items</b> and matched their HCPCS codes. Open an item’s codes to check them.</span></p>':''}<div class="rx-items">${rx.items.map(item=>itemHtml(rx,item)).join('')||'<p class="empty-note">No items yet</p>'}</div>
    <form class="inline-add" data-add-item="${rx.id}"><i data-lucide="sparkles" class="add-spark"></i><input class="input" name="product" placeholder="Search a product name or HCPCS, e.g. nasal pillows or A7034" aria-label="Search products to add" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="suggest-${rx.id}" autocomplete="off"><button class="small-btn add-item-btn" type="submit"><i data-lucide="plus"></i> Add item</button><div class="ai-suggest" id="suggest-${rx.id}" role="listbox" hidden></div></form>
    <p class="inline-hint">AI finds the closest product in your system and fills in its HCPCS. Kits are added as a bundle.</p>`;
}
// Each prescription carries its own physician note.
function noteHtml(rx){
  const n=rx.note||{text:'',signed:true};
  const status=n.source?(n.signed?'<small class="note-sig ok"><i data-lucide="circle-check"></i> Signed</small>':'<small class="note-sig warn"><i data-lucide="triangle-alert"></i> Signature missing</small>'):'<small>Enter from the clinical notes</small>';
  const unsigned=n.source&&!n.signed?`<div class="note-message"><i data-lucide="info"></i><span><b>Physician signature not found</b> The note doesn’t appear to be signed. This doesn’t block the intake.</span><button class="source-link" data-doc="${n.docId}"><i data-lucide="scan-text"></i> ${n.source} · ${n.signaturePage||n.page}</button></div>`:'';
  return `<details class="data-group rx-note" open><summary><span>Physician note</span>${status}<i data-lucide="chevron-down"></i></summary>
    ${unsigned}
    <div class="note-body"><label class="note-label" for="note-${rx.id}">Clinical note${n.source?` <span class="note-from">· extracted from ${n.source}</span>`:''}</label><textarea class="input note-input" id="note-${rx.id}" data-rx-note="${rx.id}" rows="4" placeholder="Add the physician’s clinical note for this prescription">${n.text}</textarea>${n.source?`<button class="source-link" data-doc="${n.docId}"><i data-lucide="scan-text"></i> ${n.source} · ${n.page}</button>`:''}</div>
  </details>`;
}
function rxSectionHtml(rx,index){
  const sectionId=rx.main?'prescription-section':`rx-section-${rx.id}`;
  return `<section class="review-card rx-card" id="${sectionId}" data-rx-section="${rx.id}">
    <div class="card-header"><div><span class="section-icon"><i data-lucide="notebook-tabs"></i></span><div><h3>${rxTitle(index)}</h3><p>${rx.manual?'Added manually':`<button class="source-link" data-doc="${rx.docId}"><i data-lucide="scan-text"></i> ${rx.source}</button> · signed ${rx.date}`}</p></div></div><span class="section-status success"><i data-lucide="circle-check"></i> Reviewed</span></div>
    ${physicianHtml(rx)}
    <details class="data-group" open><summary><span>ICD-10 codes</span><small data-icd-meta="${rx.id}">${rx.icd.length} ${rx.icd.length===1?'code':'codes'}</small><i data-lucide="chevron-down"></i></summary><div data-icd="${rx.id}">${icdHtml(rx)}</div></details>
    <details class="data-group" open><summary><span>Items prescribed</span><small data-items-meta="${rx.id}">${rx.items.length} ${rx.items.length===1?'item':'items'}</small><i data-lucide="chevron-down"></i></summary><div data-items="${rx.id}">${itemsHtml(rx)}</div></details>
    ${noteHtml(rx)}
  </section>`;
}
function renderPrescriptions(){
  $('#hcpcsOptions').innerHTML=Object.entries(hcpcsCatalog).map(([code,desc])=>`<option value="${code}">${desc}</option>`).join('');
  $('#icdOptions').innerHTML=Object.entries(icdCatalog).map(([code,desc])=>`<option value="${code}">${desc}</option>`).join('');
  $('#prescriptions').innerHTML=prescriptions.map(rxSectionHtml).join('');
  prescriptions.forEach(setRxStatus);
  icons();
}
function refreshItems(rx){
  $(`[data-items="${rx.id}"]`).innerHTML=itemsHtml(rx);
  $(`[data-items-meta="${rx.id}"]`).textContent=`${rx.items.length} ${rx.items.length===1?'item':'items'}`;
  setRxStatus(rx);icons();
}
function refreshIcd(rx){
  $(`[data-icd="${rx.id}"]`).innerHTML=icdHtml(rx);
  $(`[data-icd-meta="${rx.id}"]`).textContent=`${rx.icd.length} ${rx.icd.length===1?'code':'codes'}`;
  setRxStatus(rx);icons();
}
function refreshItemDocs(){prescriptions.forEach(rx=>{if($(`[data-items="${rx.id}"]`))refreshItems(rx);});}
// Section badge for prescriptions after the first (the first is driven by updateProgress).
function setRxStatus(rx){
  if(rx.main)return;
  const status=$(`[data-rx-section="${rx.id}"] .section-status`);if(!status)return;
  const gaps=[!rx.physician.first||!rx.physician.last,!/^\d{10}$/.test(rx.physician.npi),!rx.icd.length,!rx.items.length,rx.items.some(item=>item.lines.some(l=>!l.code))].filter(Boolean).length;
  status.className=`section-status ${gaps?'danger':'success'}`;
  status.innerHTML=gaps?`<i data-lucide="circle-x"></i> ${gaps} missing`:'<i data-lucide="circle-check"></i> Reviewed';
}
// Products set up in the system. AI matches what the user types to these, with HCPCS.
const systemProducts=[
  {name:'Auto CPAP device',code:'E0601',terms:'cpap apap auto pap machine positive airway pressure sleep apnea device'},
  {name:'Heated humidifier for PAP',code:'E0562',terms:'humidifier heated water chamber pap cpap'},
  {name:'Full face mask',code:'A7030',terms:'mask full face cpap pap'},
  {name:'Full face mask cushion',code:'A7031',terms:'cushion mask seal replacement full face'},
  {name:'Nasal mask / nasal pillows',code:'A7034',terms:'nasal mask pillow pillows interface cpap'},
  {name:'PAP headgear',code:'A7035',terms:'headgear strap mask cpap pap'},
  {name:'PAP chinstrap',code:'A7036',terms:'chinstrap chin strap cpap'},
  {name:'PAP tubing',code:'A7037',terms:'tubing hose tube cpap pap'},
  {name:'Disposable PAP filter',code:'A7038',terms:'filter disposable cpap pap'},
  {name:'Non-disposable PAP filter',code:'A7039',terms:'filter reusable non-disposable foam cpap pap'},
  {name:'Stationary oxygen concentrator',code:'E1390',terms:'oxygen concentrator home stationary o2'},
  {name:'Portable oxygen concentrator',code:'E1392',terms:'portable oxygen concentrator poc o2 travel'},
  {name:'Portable gaseous oxygen system',code:'E0431',terms:'oxygen tank cylinder portable gaseous o2'},
  {name:'Nasal cannula',code:'A4615',terms:'cannula nasal oxygen o2'},
  {name:'Oxygen tubing',code:'A4616',terms:'oxygen tubing o2 hose'},
  {name:'Nebulizer with compressor',code:'E0570',terms:'nebulizer neb compressor breathing treatment'},
  {name:'Adjustable walker',code:'E0130',terms:'walker mobility rigid adjustable'},
  {name:'Semi-electric hospital bed',code:'E0260',terms:'hospital bed semi electric'},
  {name:'Standard wheelchair',code:'K0001',terms:'wheelchair standard chair mobility'},
  {name:'CPAP starter kit',bundle:true,codes:['E0601','E0562','A7030','A7037','A7038'],terms:'cpap starter kit bundle supplies setup new pap'},
  {name:'CPAP resupply kit',bundle:true,codes:['A7031','A7037','A7038'],terms:'cpap resupply supplies replacement kit bundle refill'},
  {name:'Oxygen supplies kit',bundle:true,codes:['A4615','A4616'],terms:'oxygen supplies kit bundle cannula tubing o2'}
];
const words=text=>text.toLowerCase().replace(/[^a-z0-9\s-]/g,' ').split(/\s+/).filter(w=>w.length>1);
// Best matches for a name or HCPCS typed by the user, highest confidence first.
function matchProducts(query){
  const q=query.trim();if(q.length<2)return [];
  const code=q.toUpperCase();
  if(/^[A-Z]\d{1,4}$/.test(code)){
    return systemProducts.filter(p=>!p.bundle&&p.code.startsWith(code)).slice(0,4).map(p=>({product:p,confidence:p.code===code?100:90}));
  }
  const qw=words(q);if(!qw.length)return [];
  const ruled=productRules.find(([pattern])=>pattern.test(q))?.[1];
  const wantsKit=/kit|bundle|supplies|starter|resupply/i.test(q);
  return systemProducts.map(p=>{
    const hay=`${p.name} ${p.terms}`.toLowerCase(),hw=words(hay);
    const hits=qw.filter(w=>hw.some(h=>h===w||h.startsWith(w)||(w.length>3&&h.startsWith(w.slice(0,4))))).length;
    let score=hits/qw.length;
    if(!p.bundle&&ruled===p.code)score+=.35;
    if(p.bundle)score+=wantsKit?.3:-.25;
    if(p.name.toLowerCase()===q.toLowerCase())score+=.5;
    return {product:p,score};
  }).filter(r=>r.score>.3).sort((a,b)=>b.score-a.score).slice(0,4)
    .map((r,i)=>({product:r.product,confidence:Math.max(55,Math.min(98,Math.round(60+r.score*30)-i*3))}));
}
function itemFromProduct(product,query){
  const lines=product.bundle?product.codes.map(c=>line(c,true)):[line(product.code,true)];
  return {name:product.name,bundle:Boolean(product.bundle),kindAi:true,matchedFrom:query,lines};
}
function suggestionsHtml(rxId,matches,active=0){
  if(!matches.length)return `<div class="ai-suggest-empty"><i data-lucide="search-x"></i> No close match in the system. Press Enter to add it and enter a HCPCS code.</div>`;
  return `<div class="ai-suggest-head"><i data-lucide="sparkles"></i> AI matches from your product catalog</div>`+matches.map((m,i)=>{const p=m.product;
    return `<button type="button" role="option" class="ai-suggest-row ${i===active?'active':''}" aria-selected="${i===active}" data-pick-product="${rxId}" data-product="${systemProducts.indexOf(p)}"><span class="ai-suggest-name"><strong>${p.name}</strong><small>${p.bundle?`Bundle · ${p.codes.join(', ')}`:hcpcsCatalog[p.code]||''}</small></span>${p.bundle?`<span class="hcpcs-badge bundle">${p.codes.length} codes</span>`:`<span class="hcpcs-badge">${p.code}</span>`}${i===0?`<em class="best-match">Best match · ${m.confidence}%</em>`:`<em class="match-score">${m.confidence}%</em>`}</button>`;}).join('');
}
// AI mapping of a product name (or a HCPCS code typed directly) to HCPCS lines.
function mapProduct(text){
  const value=text.trim(),code=value.toUpperCase();
  if(/^[A-Z]\d{4}$/.test(code))return {name:code,bundle:false,lines:[line(code)]};
  const bundle=bundleRules.find(rule=>rule.match.test(value));
  if(bundle)return {name:value,bundle:true,lines:bundle.lines.map(c=>line(c,true))};
  const rule=productRules.find(([pattern])=>pattern.test(value));
  return {name:value,bundle:false,lines:[line(rule?rule[1]:'',Boolean(rule))]};
}
function openItemDocs(rxId,itemId){
  const rx=rxById(rxId),item=rx.items.find(i=>i.id===itemId);if(!item)return;
  const docs=docsForItem(rx,item),index=prescriptions.indexOf(rx);
  $('#itemDocsTitle').textContent=item.bundle||item.lines.some(l=>l.ai)?item.name:`${item.name} · ${hcpcsCatalog[item.name]||''}`;
  $('#itemDocsMeta').textContent=`${rxTitle(index)} · For your information. No action is needed to complete this intake.`;
  $('#itemDocsList').innerHTML=docs.map(doc=>`<div class="fyi-doc ${doc.found?'found':''}"><i data-lucide="${doc.found?'file-check':'file'}"></i><span><strong>${doc.name}${doc.recommended?`<em class="rec-tag">Recommended by Medicare · ${doc.recommended}</em>`:''}</strong><small>${doc.status}</small></span>${doc.found&&doc.docId?`<button type="button" class="text-btn" data-view-required="${doc.docId}">View</button>`:''}</div>`).join('');
  icons();
  if(!$('#itemDocsDialog').open)$('#itemDocsDialog').showModal();
}
function addPrescription(){
  const rx={id:`rx${Date.now()}`,docId:'',source:'',date:'',manual:true,physician:{first:'',last:'',npi:'',specialty:'',enrollment:[]},icd:[],items:[],note:{text:'',signed:true}};
  prescriptions.push(rx);
  $('#prescriptions').insertAdjacentHTML('beforeend',rxSectionHtml(rx,prescriptions.length-1));
  setRxStatus(rx);icons();
  const section=$(`[data-rx-section="${rx.id}"]`);section.scrollIntoView({behavior:'smooth',block:'start'});
  section.querySelector('input')?.focus({preventScroll:true});
  toast(`${rxTitle(prescriptions.length-1)} added`);
}

$('#addPrescription').addEventListener('click',addPrescription);
$('#prescriptions').addEventListener('submit',event=>{
  event.preventDefault();
  const form=event.target,input=form.querySelector('input'),value=input.value.trim();if(!value)return;
  if(form.dataset.addIcd){
    const rx=rxById(form.dataset.addIcd),typed=value.split(/\s/)[0].toUpperCase();
    const code=icdCatalog[typed]?typed:(Object.keys(icdCatalog).find(key=>icdCatalog[key].toLowerCase().includes(value.toLowerCase()))||typed);
    if(rx.icd.some(item=>item.code===code)){toast(`${code} is already on this prescription`);return;}
    rx.icd.push({code,description:icdCatalog[code]||'Description not found · verify code',primary:!rx.icd.length});
    refreshIcd(rx);toast(`${code} added`);
    $(`[data-add-icd="${rx.id}"] input`)?.focus();return;
  }
  if(form.dataset.addItem){
    const s=suggestState[form.dataset.addItem],pick=s&&s.query===value?s.matches[s.active]:matchProducts(value)[0];
    addItemToRx(form.dataset.addItem,value,pick);
  }
});
const suggestState={};
function closeSuggest(rxId){const box=$(`#suggest-${rxId}`);if(box){box.hidden=true;box.innerHTML='';}$(`[data-add-item="${rxId}"] input`)?.setAttribute('aria-expanded','false');delete suggestState[rxId];}
function showSuggest(rxId,query){
  const box=$(`#suggest-${rxId}`);if(!box)return;
  if(query.trim().length<2){closeSuggest(rxId);return;}
  const matches=matchProducts(query);
  suggestState[rxId]={query:query.trim(),matches,active:0};
  box.innerHTML=suggestionsHtml(rxId,matches,0);box.hidden=false;
  $(`[data-add-item="${rxId}"] input`).setAttribute('aria-expanded','true');icons();
}
function addItemToRx(rxId,value,pick){
  const rx=rxById(rxId);
  const mapped=pick?itemFromProduct(pick.product,value):mapProduct(value),first=mapped.lines[0].code;
  if(pick)mapped.confidence=pick.confidence;
  rx.items.push({id:`item-${Date.now()}`,kindAi:mapped.lines.some(l=>l.ai),...mapped,policy:policyFor(first),policyAi:Boolean(policyFor(first)),dispense:{type:/^E/.test(first)?'Rental':'Purchase',length:'99 months (lifetime)',start:'10/15/2026'}});
  closeSuggest(rxId);refreshItems(rx);
  toast(pick?`AI matched “${value}” to ${mapped.name}${mapped.bundle?` · bundle of ${mapped.lines.length} codes`:` · ${first}`}`:mapped.lines[0].ai?`AI mapped “${value}” to ${first}`:first?`${first} added`:'No HCPCS match found. Enter a code.');
  $(`[data-add-item="${rx.id}"] input`)?.focus();
}
$('#prescriptions').addEventListener('input',event=>{const form=event.target.closest('[data-add-item]');if(form&&event.target.name==='product')showSuggest(form.dataset.addItem,event.target.value);});
$('#prescriptions').addEventListener('keydown',event=>{
  const form=event.target.closest('[data-add-item]');if(!form||event.target.name!=='product')return;
  const id=form.dataset.addItem,s=suggestState[id];if(!s)return;
  if(event.key==='Escape'){closeSuggest(id);return;}
  if((event.key==='ArrowDown'||event.key==='ArrowUp')&&s.matches.length){event.preventDefault();s.active=(s.active+(event.key==='ArrowDown'?1:-1)+s.matches.length)%s.matches.length;$(`#suggest-${id}`).innerHTML=suggestionsHtml(id,s.matches,s.active);icons();}
});
document.addEventListener('mousedown',event=>{Object.keys(suggestState).forEach(id=>{if(!event.target.closest(`[data-add-item="${id}"]`))closeSuggest(id);});});
$('#prescriptions').addEventListener('change',event=>{
  const el=event.target;
  if(el.dataset.line){
    const [rxId,itemId,i]=el.dataset.line.split('|'),rx=rxById(rxId),item=rx.items.find(x=>x.id===itemId),l=item.lines[+i];
    if(el.dataset.lineField==='code'){l.code=el.value.trim().toUpperCase();l.ai=false;if(!item.policy&&policyFor(l.code)){item.policy=policyFor(l.code);item.policyAi=true;}refreshItems(rx);return;}
    return;
  }
  if(el.dataset.rxNote){const rx=rxById(el.dataset.rxNote);rx.note={...(rx.note||{signed:true}),text:el.value.trim()};return;}
  if(el.dataset.rxField){const rx=rxById(el.dataset.rx);rx.physician[el.dataset.rxField]=el.value.trim();setRxStatus(rx);icons();}
});
$('#prescriptions').addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.pickProduct){const id=button.dataset.pickProduct,input=$(`[data-add-item="${id}"] input`),product=systemProducts[+button.dataset.product],m=suggestState[id]?.matches.find(x=>x.product===product);addItemToRx(id,input.value.trim(),m||{product,confidence:90});return;}
  if(button.dataset.removeIcd){const rx=rxById(button.dataset.removeIcd),[removed]=rx.icd.splice(+button.dataset.index,1);if(removed.primary&&rx.icd[0])rx.icd[0].primary=true;refreshIcd(rx);toast(`${removed.code} removed`);return;}
  if(button.dataset.editItem){const [rxId,itemId]=button.dataset.editItem.split('|'),rx=rxById(rxId),item=rx.items.find(x=>x.id===itemId);item.editing=!item.editing;refreshItems(rx);if(item.editing)$(`#rx-${rxId}-${itemId} input`)?.focus();return;}
  if(button.dataset.toggleCodes){const [rxId,itemId]=button.dataset.toggleCodes.split('|'),rx=rxById(rxId),item=rx.items.find(x=>x.id===itemId);item.expanded=!item.expanded;refreshItems(rx);return;}
  if(button.dataset.itemDocs){const [rxId,itemId]=button.dataset.itemDocs.split('|');openItemDocs(rxId,itemId);return;}
  if(button.dataset.removeItem){const [rxId,itemId]=button.dataset.removeItem.split('|'),rx=rxById(rxId);rx.items=rx.items.filter(x=>x.id!==itemId);refreshItems(rx);toast('Item removed');return;}
  if(button.dataset.removeLine){const [rxId,itemId,i]=button.dataset.removeLine.split('|'),rx=rxById(rxId),item=rx.items.find(x=>x.id===itemId);item.lines.splice(+i,1);item.kindAi=false;if(item.lines.length===1)item.bundle=false;refreshItems(rx);}
});
$('#itemDocsDialog').addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.viewRequired){$('#itemDocsDialog').close();openDocument(button.dataset.viewRequired);return;}
});


// ---------- Prior authorizations (multiple) ----------
const priorAuthList=[
  {id:'pa1',code:'E0601',number:'PA-26-0418873',payer:'Aetna Choice POS II',from:'10/15/2026',to:'04/15/2027',qty:'1 unit',frequency:'Monthly rental · 13 months'},
  {id:'pa2',code:'E1390',number:'PA-26-0522190',payer:'Aetna Choice POS II',from:'10/15/2026',to:'10/14/2027',qty:'1 unit',frequency:'Monthly rental · 12 months'}
];
function paCardHtml(pa){
  return `<article class="pa-card" id="pa-${pa.id}">
    <header class="pa-head"><span class="hcpcs-badge">${pa.code}</span><div><strong>${hcpcsCatalog[pa.code]||'HCPCS '+pa.code}</strong><small>${pa.number} · ${pa.payer}</small></div>${pa.added?'<span class="pill neutral">Added by you</span>':''}<button type="button" class="icon-btn" data-remove-pa="${pa.id}" aria-label="Remove prior authorization" title="Remove"><i data-lucide="trash-2"></i></button></header>
    <div class="compact-fields"><div><span>Prior authorization number</span><strong>${pa.number}</strong></div><div><span>Payer</span><strong>${pa.payer}</strong></div><div><span>Effective date</span><strong>${pa.from||'—'} – ${pa.to||'—'}</strong></div><div><span>Quantity/Amount</span><strong>${pa.qty||'—'}</strong></div><div class="wide"><span>Dispensing frequency</span><strong>${pa.frequency||'—'}</strong></div></div>
  </article>`;
}
function syncPriorAuthMeta(){
  $('#priorAuthMeta').textContent=`${priorAuthList.length} ${priorAuthList.length===1?'authorization':'authorizations'}`;
  if(!priorAuthList.length)$('#priorAuthList').innerHTML='<p class="empty-note pa-empty">No prior authorizations on file.</p>';
  else $('.pa-empty')?.remove();
  if(typeof refreshItemDocs==='function'&&$('[data-items]'))refreshItemDocs();
}
function renderPriorAuths(){$('#priorAuthList').innerHTML=priorAuthList.map(paCardHtml).join('');syncPriorAuthMeta();icons();}
const togglePaForm=open=>{const form=$('#priorAuthForm');form.hidden=!open;$('#addPriorAuthToggle').hidden=open;if(open){form.reset();$('#priorAuthError').hidden=true;form.querySelectorAll('.invalid').forEach(f=>f.classList.remove('invalid'));$('#priorAuthPayer').innerHTML=insurancePlans.map(plan=>`<option>${plan.name}</option>`).join('');form.code.focus();}};
$('#addPriorAuthToggle').addEventListener('click',()=>togglePaForm(true));
$('#cancelPriorAuth').addEventListener('click',()=>togglePaForm(false));
$('#priorAuthForm').addEventListener('input',event=>event.target.classList.remove('invalid'));
$('#priorAuthForm').addEventListener('submit',event=>{
  event.preventDefault();
  const form=event.target,required=[form.code,form.number,form.payer];
  required.forEach(f=>f.classList.toggle('invalid',!f.value.trim()));
  if(required.some(f=>!f.value.trim())){$('#priorAuthError').hidden=false;return;}
  const date=v=>{if(!v)return '';const [y,m,d]=v.split('-');return `${m}/${d}/${y}`;};
  const pa={id:`pa${Date.now()}`,code:form.code.value.trim().toUpperCase(),number:form.number.value.trim(),payer:form.payer.value,from:date(form.from.value),to:date(form.to.value),qty:form.qty.value.trim(),frequency:form.frequency.value.trim(),added:true};
  priorAuthList.push(pa);
  $('.pa-empty')?.remove();
  $('#priorAuthList').insertAdjacentHTML('beforeend',paCardHtml(pa));
  togglePaForm(false);syncPriorAuthMeta();icons();
  toast(`Prior authorization ${pa.number} added`);
});
$('#priorAuthList').addEventListener('click',event=>{
  const button=event.target.closest('[data-remove-pa]');if(!button)return;
  const index=priorAuthList.findIndex(pa=>pa.id===button.dataset.removePa);if(index<0)return;
  const [removed]=priorAuthList.splice(index,1);
  if(removed.gap){state.authAck=true;updateProgress();}
  $(`#pa-${removed.id}`).remove();syncPriorAuthMeta();
  toast(`Prior authorization ${removed.number} removed`);
});
// ---------- Post-intake: pre-check and create order ----------
const INTAKE_ID='INT-0023';
function precheckResults(){
  const npi=prescriptions[0]?.physician.npi||'';
  return [
    {status:'pass',title:'Payer eligibility',detail:`${insurancePlans.slice(0,2).map((plan,i)=>`${plan.name} (${planRank(i).toLowerCase()})`).join(' and ')} active for DME`},
    {status:'pass',title:'Standard written orders',detail:`${prescriptions.length} prescriptions with HCPCS codes${npi?` · NPI ${npi}`:''}`},
    {status:'pass',title:'Medicare coverage criteria · L33718 (PAP)',detail:'AHI 18.4 on home sleep test and face-to-face visit on 10/12/2026'},
    {status:'warn',title:'Medicare coverage criteria · L33797 (oxygen)',detail:'Oxygen qualifying test results not found in uploaded documents'},
    {status:'warn',title:'Prior authorization period',detail:'PA-26-0418873 ends 04/15/2027, before the 13-month CPAP rental ends'}
  ];
}
function precheckSummary(results){const warnings=results.filter(r=>r.status==='warn').length;return warnings?`Passed with ${warnings} ${warnings===1?'warning':'warnings'}`:'Passed';}
function renderPrecheck(){
  const results=state.precheck,section=$('#precheckResult');
  section.hidden=!results;if(!results)return;
  section.innerHTML=`<header><span class="pill ${results.some(r=>r.status==='warn')?'warning':'success'}"><i data-lucide="${results.some(r=>r.status==='warn')?'triangle-alert':'circle-check'}"></i> ${precheckSummary(results)}</span><h3 id="precheckTitle">Pre-check results</h3><small>Run ${state.precheckAt}</small></header><ul>${results.map(r=>`<li class="${r.status}"><i data-lucide="${r.status==='pass'?'circle-check':'triangle-alert'}"></i><span><b>${r.title}</b><small>${r.detail}</small></span></li>`).join('')}</ul>`;
  icons();
}
async function runPrecheck(button){
  button.disabled=true;button.innerHTML='<span class="spinner"></span> Running pre-check…';
  await wait(1200);
  state.precheck=precheckResults();state.precheckAt='just now';
  renderPrecheck();
  $('#nextActionTitle').textContent='Create order';
  $('#nextActionReason').textContent=`Pre-check ${precheckSummary(state.precheck).toLowerCase()}. Create the DME order and select products from the prescribed HCPCS codes.`;
  button.disabled=false;button.innerHTML='<i data-lucide="arrow-right"></i> Create order';button.dataset.postAction='Create order';
  $('#otherActionButtons').innerHTML='<button class="secondary-action compact" data-post-action="Run pre-check again">Run pre-check again</button>';
  icons();toast(`Pre-check ${precheckSummary(state.precheck).toLowerCase()}`);
  $('#precheckResult').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function intakeSnapshot(){
  return {
    id:INTAKE_ID,completed:'Oct 15, 2026',
    patient:{first:'Ashlynn',middle:'',last:'Botosh',dob:$('#dobValue')?.textContent.trim()||'03/15/1978',gender:$('#genderInput')?.value||'Female',phone:$('#mobileValue')?.textContent.trim()||$('#mobileInput')?.value.trim()||'(415) 220-8841',home:'(206) 555-0142',email:'ashlynn.botosh@email.com',address:'1234 Healthways Blvd, Suite 200',city:'Seattle',state:'WA',zip:'98101',county:'King',mrn:'PT-10482'},
    prescriptions:prescriptions.map((rx,i)=>({title:rxTitle(i),source:rx.source||'Added manually',date:rx.date,note:($(`#note-${rx.id}`)?.value||rx.note?.text||'').trim(),physician:`${rx.physician.first||''} ${rx.physician.last||''}`.trim(),npi:rx.physician.npi||'',specialty:rx.physician.specialty,
      icd:rx.icd.map(c=>({code:c.code,description:c.description,primary:Boolean(c.primary)})),
      items:rx.items.map(item=>({name:item.bundle||item.lines.some(l=>l.ai)||!/^[A-Z]\d{4}$/.test(item.name)?item.name:(hcpcsCatalog[item.name]||item.name),bundle:Boolean(item.bundle),qty:item.qty||'',frequency:item.frequency||'',lines:item.lines.filter(l=>l.code).map(l=>({code:l.code,description:hcpcsCatalog[l.code]||'',qty:item.qty||'—',frequency:item.frequency||'Not on prescription'}))}))})),
    insurance:insurancePlans.map((plan,i)=>({rank:planRank(i),name:plan.name,memberId:['Member ID prefix','Member ID','Member ID suffix'].map(k=>plan.fields.find(([n])=>n===k)?.[1]).filter(v=>v&&v!=='—'&&v!=='Not provided').join(' '),group:plan.fields.find(([n])=>n==='Group number')?.[1]||'',status:planStatus(plan)==='inactive'?'Inactive':'Active'})),
    priorAuths:priorAuthList.map(pa=>({code:pa.code,number:pa.number,payer:pa.payer,from:pa.from,to:pa.to,qty:pa.qty,frequency:pa.frequency})),
    documents:viewerFiles().map(file=>file.name),
    note:prescriptions.map((rx,i)=>{const text=($(`#note-${rx.id}`)?.value||rx.note?.text||'').trim();return text?`${rxTitle(i)}: ${text}`:'';}).filter(Boolean).join('\n\n'),
    precheck:state.precheck?{summary:precheckSummary(state.precheck),at:'Oct 15, 2026',results:state.precheck}:null
  };
}
function createOrder(){
  const snapshot=intakeSnapshot();
  // The patient has existing orders (With issues path): items may be refilled or added to an order, so prepare orders item by item.
  if(window.protoScenario==='issues'){
    try{sessionStorage.setItem('signeticIntakeFull',JSON.stringify(snapshot));sessionStorage.removeItem('signeticPrecheckStatus');sessionStorage.removeItem('signeticOrderPlan');}catch(error){}
    location.href='prepare-orders.html';return;
  }
  try{sessionStorage.setItem('signeticIntakeOrder',JSON.stringify(snapshot));}catch(error){}
  location.href='dme-order.html';
}
function handlePostAction(action,button){
  const left=requiredReviewsLeft();
  if(left){openReviewGate(left);return;}
  if(action==='Start pre-check'||action==='Run pre-check again'){try{sessionStorage.removeItem('signeticIntakeFull');sessionStorage.setItem('signeticIntakeOrder',JSON.stringify(intakeSnapshot()));}catch(error){}location.href='precheck.html';return;}
  if(action==='Create order'||action==='Create order without pre-check'){createOrder();return;}
  if(action==='Schedule setup appointment'){toast('Setup appointment selected · opens scheduling');return;}
  toast(`${action} selected`);
}
// ---------- AI intake summary: a few plain sentences built from the reviewed intake ----------
function buildIntakeSummary(){
  const codes=prescriptions.flatMap(rx=>rx.items.flatMap(item=>item.lines.map(l=>l.code))).filter(Boolean);
  const hasPap=codes.includes('E0601'),hasOxygen=codes.some(c=>/^E139|^E04/.test(c));
  const list=items=>items.length<2?items.join(''):`${items.slice(0,-1).join(', ')} and ${items[items.length-1]}`;
  const dx=[...new Set(prescriptions.map(rx=>rx.icd.find(c=>c.primary)?.description).filter(Boolean).map(d=>d.replace(/ \(adult\)/,'').toLowerCase()))];
  const therapy=[hasPap&&'CPAP therapy',hasOxygen&&'home oxygen'].filter(Boolean);
  const doctors=prescriptions.map(rx=>{const last=rx.physician.last;return last?`Dr. ${rx.physician.first} ${last}`:'';}).filter(Boolean);
  const name=postIntakeRecommendation.patient;
  const s1=`${name}, ${state.patientLinked?'an existing patient':'a new patient'}, is starting ${list(therapy)||'DME therapy'}${dx.length?` for ${list(dx)}`:''}${doctors.length?`, prescribed by ${list(doctors)}`:''}.`;
  const ranks=insurancePlans.map((plan,i)=>`${plan.name}${i===0?' is primary':` ${planRank(i).toLowerCase()}`}`);
  const shortName={E0601:'the CPAP',E0562:'the humidifier',E1390:'the oxygen concentrator',E1392:'the portable concentrator'};
  const paItems=[...new Set(priorAuthList.map(pa=>shortName[pa.code]||pa.code))];
  const s2=`${ranks[0]||'No insurance is on file'}${ranks.length>1?`, with ${list(ranks.slice(1))}`:''}.${paItems.length?` Prior authorization is on file for ${list(paItems)}.`:''}`;
  const watch=[];
  if(hasOxygen)watch.push('oxygen test results weren’t uploaded');
  if(priorAuthList.some(pa=>pa.gap))watch.push('the CPAP authorization ends before the rental does');
  const s3=watch.length?`Before ordering, note that ${list(watch)}.`:'';
  // Context only: how each item is ordered (new, refill, add to an order) is chosen after the pre-check.
  const s4=window.protoScenario==='issues'?'She has 3 existing orders, including refillable CPAP supplies and an open oxygen order. You’ll choose how each item is ordered after the pre-check.':'';
  return {
    title:`New ${list(therapy)||'DME'} intake`,
    context:`${state.patientLinked?'Existing patient':'New patient'} · ${prescriptions.length} ${prescriptions.length===1?'prescription':'prescriptions'}`,
    lead:`${s1} ${s2} ${s3}${s4?` ${s4}`:''}`
  };
}
// Prototype scenario (scenario.js, switched in the prototype navigator).
(function applyScenario(){
  const gender=$('#genderInput');
  if(window.protoScenario==='happy'){
    // Every required field was found in the documents.
    gender.value='Female';$('#genderField').classList.remove('missing-cell');$('#genderHint')?.remove();
    return;
  }
  // With issues: the mobile number wasn't found in any document, so it's a required field to fill in.
  const index=aiResolvedFields.findIndex(item=>item.key==='mobile');if(index>=0)aiResolvedFields.splice(index,1);
  const cell=$('#mobileField');
  cell.className='missing-cell';
  cell.innerHTML='<label class="cell-label" for="mobileInput">Mobile number<i class="req" title="Required" aria-label="required">*</i><em class="miss-chip" id="mobileHint">Not found</em></label><input class="input inline-input" id="mobileInput" type="tel" inputmode="tel" placeholder="(000) 000-0000" aria-label="Mobile number" autocomplete="off">';
})();
renderDocuments();
renderDuplicateFindings();
renderPatientMatches();
renderInsurance();
renderPrescriptions();
renderPriorAuths();
enableInlineEditing();
updateProgress();
setSourceDrawer(false);
renderUploadQueue();
setPhase('upload');
icons();

// ---------- Progress: saved in localStorage so a refresh never loses work ----------
// Prototype deep links (?screen=…) show fixed demo states, so they neither restore nor save progress.
const PROGRESS_KEY='signeticIntakeProgress';
const progressEnabled=!new URLSearchParams(location.search).get('screen');
const setFields=['documentResolutions','aiEdited','aiReviewed','pickerSelection'];
function clearProgress(){try{localStorage.removeItem(PROGRESS_KEY);}catch(error){}}
function saveProgress(){
  // The prototype navigator's Reset sets this, so a pending save can't bring cleared progress back.
  if(!progressEnabled||window.progressReset)return;
  const savedState={...state};setFields.forEach(key=>{savedState[key]=[...state[key]];});
  const editable=$$('[data-editable]').map(el=>el.textContent);
  const fields={};$$('.review-area input[id],.review-area select[id],.review-area textarea[id]').forEach(el=>{fields[el.id]=el.type==='checkbox'?el.checked:el.value;});
  const data={state:savedState,documents,existingFiles,insurancePlans,prescriptions,priorAuthList,receivedDocs,editable,fields};
  try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(data));}catch(error){}
}
let saveTimer=null;
function saveSoon(){if(!progressEnabled)return;clearTimeout(saveTimer);saveTimer=setTimeout(saveProgress,250);}
const replaceAll=(target,items)=>{target.splice(0,target.length,...items);};
function restoreProgress(){
  if(!progressEnabled)return;
  let data=null;try{data=JSON.parse(localStorage.getItem(PROGRESS_KEY));}catch(error){}
  if(!data?.state)return;
  replaceAll(documents,data.documents||[]);replaceAll(existingFiles,data.existingFiles||existingFiles);
  replaceAll(insurancePlans,data.insurancePlans||insurancePlans);replaceAll(prescriptions,data.prescriptions||prescriptions);
  replaceAll(priorAuthList,data.priorAuthList||priorAuthList);Object.assign(receivedDocs,data.receivedDocs||{});
  Object.assign(state,data.state);setFields.forEach(key=>{state[key]=new Set(data.state[key]||[]);});
  Object.assign(state,{checkingEligibility:false,checkingPlan:false,editingPlan:false,refreshingNext:false,reextracting:false});
  Object.entries(state.paneWidths||{}).forEach(([name,width])=>setPaneWidth(name,width));
  // Uploads and extraction can't resume mid-way: finished uploads stay, an interrupted extraction is ready to run again.
  documents.forEach(file=>{if(file.uploading||file.processing){file.uploading=false;file.processing=false;file.meta=state.phase==='review'?'Extracted · Added to this intake':'Ready to extract';}});
  if(state.phase==='extraction'||state.extracting){
    Object.assign(state,{phase:'upload',extracting:false,extractionComplete:false,patientResolved:false,patientLinked:false,started:false});
    state.documentResolutions.clear();documents.forEach(file=>{file.meta='Ready to extract';});
  }
  renderInsurance();renderPrescriptions();renderPriorAuths();
  $$('[data-editable]').forEach((el,index)=>{if(data.editable?.[index]!=null)el.textContent=data.editable[index];});
  Object.entries(data.fields||{}).forEach(([id,value])=>{const el=document.getElementById(id);if(!el)return;if(el.type==='checkbox')el.checked=value;else el.value=value;});
  const phase=state.phase;
  setPhase(phase);renderDocuments();renderUploadQueue();
  if(phase==='review'){
    updateProgress();
    const tab=state.viewerTab||'files';
    if(state.selected)openDocument(state.selected);
    setViewerTab(tab);
    setSourceDrawer(Boolean(state.drawerOpen),true);
    if(state.sideTab)setSideTab(state.sideTab);
  }else if(state.viewerTab==='preview'&&state.selected)openDocument(state.selected);
}
restoreProgress();
window.progressReady=true;
['click','input','change','keyup','drop'].forEach(type=>document.addEventListener(type,saveSoon,true));
addEventListener('pagehide',()=>{if(window.progressReady){clearTimeout(saveTimer);saveProgress();}});
const setNavCollapsed=collapsed=>{document.body.classList.toggle('nav-collapsed',collapsed);const toggle=$('#navToggle');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');toggle.title=toggle.getAttribute('aria-label');};
// The main navigation stays collapsed until the user opens it.
setNavCollapsed(true);
$('#navToggle').addEventListener('click',()=>setNavCollapsed(!document.body.classList.contains('nav-collapsed')));
$$('[data-nav-section]').forEach(section=>section.addEventListener('click',()=>{const open=section.parentElement.classList.toggle('open');section.setAttribute('aria-expanded',String(open));}));
$$('.shell-nav a[href="#"]').forEach(link=>link.addEventListener('click',event=>event.preventDefault()));

// Drag and drop to reorder coverage. Keyboard: Alt + Arrow Up/Down on a plan.
let dragPlan=null;
$('#insuranceFields').addEventListener('input',event=>{
  const input=event.target.closest('[data-plan-field]');if(!input)return;
  insurancePlans[state.currentPlan].fields[+input.dataset.planField][1]=input.value.trim()||'Not provided';
});
$('#insuranceFields').addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.matches('[data-plan-field]'))event.target.blur();});
$('#planList').addEventListener('dragstart',event=>{const row=event.target.closest('[data-drag-plan]');if(!row)return;dragPlan=+row.dataset.dragPlan;row.classList.add('dragging');event.dataTransfer.effectAllowed='move';try{event.dataTransfer.setData('text/plain',String(dragPlan));}catch(error){}});
$('#planList').addEventListener('dragover',event=>{if(dragPlan===null)return;event.preventDefault();const row=event.target.closest('[data-drag-plan]');$$('.plan-row.drop-above,.plan-row.drop-below').forEach(item=>item.classList.remove('drop-above','drop-below'));if(!row||+row.dataset.dragPlan===dragPlan)return;const box=row.getBoundingClientRect();row.classList.add(event.clientY<box.top+box.height/2?'drop-above':'drop-below');});
$('#planList').addEventListener('drop',event=>{
  event.preventDefault();const row=event.target.closest('[data-drag-plan]');
  if(dragPlan===null||!row)return;
  const target=+row.dataset.dragPlan,box=row.getBoundingClientRect(),below=event.clientY>=box.top+box.height/2;
  const ids=currentOrder(),[moved]=ids.splice(dragPlan,1);
  let to=target+(below?1:0);if(dragPlan<to)to--;
  ids.splice(to,0,moved);
  const name=insurancePlans[dragPlan].name;dragPlan=null;
  if(!sameOrder(ids,currentOrder()))setPlanOrder(ids,`${name} moved to ${planRank(to).toLowerCase()}`);else renderPlanList();
});
$('#planList').addEventListener('dragend',()=>{dragPlan=null;$$('.plan-row').forEach(item=>item.classList.remove('dragging','drop-above','drop-below'));});
$('#planList').addEventListener('keydown',event=>{
  if(!event.altKey||(event.key!=='ArrowUp'&&event.key!=='ArrowDown'))return;
  const button=event.target.closest('[data-plan]');if(!button)return;
  event.preventDefault();const from=+button.dataset.plan,to=from+(event.key==='ArrowUp'?-1:1);
  if(to<0||to>=insurancePlans.length)return;
  const ids=currentOrder();[ids[from],ids[to]]=[ids[to],ids[from]];
  state.currentPlan=from;setPlanOrder(ids,`${insurancePlans[from].name} moved to ${planRank(to).toLowerCase()}`);
  $(`[data-plan="${to}"]`)?.focus();
});

// Add another plan
const formatDate=value=>{if(!value)return '';const [y,m,d]=value.split('-');return `${m}/${d}/${y}`;};
function openAddPlan(){
  const form=$('#addPlanForm');form.reset();$('#addPlanError').hidden=true;
  form.querySelectorAll('.invalid').forEach(field=>field.classList.remove('invalid'));
  const slots=insurancePlans.length+1;
  $('#addPlanPosition').innerHTML=Array.from({length:slots},(_,index)=>`<option value="${index}" ${index===slots-1?'selected':''}>${planRank(index)}</option>`).join('');
  $('#scanCard').classList.remove('scanned');$('#scanCard').innerHTML='<i data-lucide="scan-line"></i><span><strong>Upload insurance card</strong><small>AI fills in the fields for you to review</small></span>';
  icons();$('#addPlanDialog').showModal();form.company.focus();
}
$$('[data-close-add-plan]').forEach(button=>button.addEventListener('click',()=>$('#addPlanDialog').close()));
$('#scanCard').addEventListener('click',async()=>{
  const card=$('#scanCard'),form=$('#addPlanForm');
  card.innerHTML='<span class="spinner"></span><span><strong>Reading insurance card…</strong><small>Extracting plan details</small></span>';
  await wait(900);
  Object.entries({company:'Premera Blue Cross',plan:'Premera Blue Cross PPO',type:'Commercial PPO',relationship:'Spouse',prefix:'PBC',member:'884215093',suffix:'01',group:'GRP-77120',from:'2026-01-01',to:'2026-12-31'}).forEach(([name,value])=>{form[name].value=value;form[name].classList.add('ai-filled');});
  card.classList.add('scanned');
  card.innerHTML='<i data-lucide="sparkles"></i><span><strong>Premera Card.jpg · fields filled by AI</strong><small>Review the highlighted fields before adding</small></span>';
  icons();
});
$('#addPlanForm').addEventListener('input',event=>{event.target.classList.remove('invalid','ai-filled');});
$('#addPlanForm').addEventListener('submit',event=>{
  event.preventDefault();
  const form=event.target,required=['company','plan','type','member','from'].map(name=>form[name]);
  required.forEach(field=>field.classList.toggle('invalid',!field.value.trim()));
  const missing=required.filter(field=>!field.value.trim());
  $('#addPlanError').hidden=!missing.length;
  if(missing.length){missing[0].focus();return;}
  const value=name=>form[name].value.trim(),to=formatDate(value('to'));
  const plan={id:`added-${Date.now()}`,name:value('plan'),systemRank:null,aiRank:null,userAdded:true,source:'Added manually',docId:'insurance',aiReason:'',
    eligibility:'Active',status:'active',check:null,
    response:{payer:value('company'),trace:`TRN-${String(Date.now()).slice(-9)}`,deductible:'$500.00',deductibleMet:'$0.00',oop:'$3,000.00 · $0.00 met',network:'In network'},
    results:Object.fromEntries(serviceTypes.map(type=>[type.id,{eligible:true,detail:'Active coverage · see response for cost share'}])),
    fields:[['Insurance type',value('type')],['Health insurance company',value('company')],['Relationship to insured',value('relationship')],['Member ID prefix',value('prefix')||'—'],['Member ID',value('member')],['Member ID suffix',value('suffix')||'—'],['Group number',value('group')||'Not provided'],['Effective from',formatDate(value('from'))],['Effective to',to||'Not provided']]};
  const position=+form.position.value,ids=currentOrder();
  insurancePlans.push(plan);ids.splice(position,0,plan.id);
  $('#addPlanDialog').close();
  state.currentPlan=position;setPlanOrder(ids);state.currentPlan=position;renderInsurance(position);
  toast(`${plan.name} added as ${planRank(position).toLowerCase()} coverage`);
  if(form.checkNow.checked)checkPlanEligibility();
});

// Prototype navigator (proto-nav.js) deep links: ?screen=extract-both|extract-docs|review|complete
(function(){
  const screen=new URLSearchParams(location.search).get('screen');
  if(!screen)return;
  const load=()=>{demoUploadFiles.forEach(file=>{if(!documents.some(item=>item.id===file.id))documents.push({...file,meta:'Extracted',processing:false});});if(!state.selected)state.selected=documents[0].id;renderDocuments();renderUploadQueue();};
  if(screen==='uploaded'){load();documents.forEach(file=>{file.meta=`${file.size} · Ready to extract`;});renderDocuments();renderUploadQueue();}
  else if(screen==='uploaded-patient'){
    // Demo: three documents pulled from Ashlynn's record, plus one uploaded file.
    state.knownPatient='ashlynn';state.pickerSelection=new Set(['referral','insurance','prescription']);addRecordDocuments();
    documents.push({...extraUploadBatches[0][0],meta:'Ready to extract'});renderDocuments();renderUploadQueue();$('#toast').classList.remove('show');
  }
  else if(screen==='extract-both'||screen==='extract-docs'){
    load();documents.forEach(file=>{file.meta='Ready to extract';});
    if(screen==='extract-docs')state.knownPatient='ashlynn';
    renderUploadQueue();startExtraction();
  }else if(['review','review-new','review-done','complete','complete-ready','complete-stale'].includes(screen)){
    load();state.extractionComplete=true;state.patientResolved=true;state.patientLinked=true;state.knownPatient='ashlynn';
    setPhase('review');
    if(screen==='review-new'){[...extraUploadBatches[0],...extraUploadBatches[1]].forEach(file=>documents.push({...file,meta:'Not extracted yet',pendingExtract:true,processing:false}));setViewerTab('files');}
    if(['review-done','complete-ready','complete-stale'].includes(screen)){
      // Demo: the two required items (gender, ordering physician) are already filled in.
      $('#genderInput').value='Female';if($('#mobileInput'))$('#mobileInput').value='(415) 220-8841';$('#toast').classList.remove('show');
    }
    if(screen==='complete-stale')state.nextStale=true;
    updateProgress();renderDocuments();
    if(screen.startsWith('complete'))showPostIntake();
    if(new URLSearchParams(location.search).get('side')==='review'){setSourceDrawer(true,true);setSideTab('review');}
  }
})();

// "AI resolved" info popover: explains how a value was resolved, on demand.
(function(){
  let openBtn=null;
  const close=()=>{if(!openBtn)return;const pop=openBtn.closest('.ai-cell').querySelector('.ai-pop');pop.hidden=true;openBtn.setAttribute('aria-expanded','false');openBtn=null;};
  const place=btn=>{
    const pop=btn.closest('.ai-cell').querySelector('.ai-pop'),r=btn.getBoundingClientRect();
    pop.hidden=false;pop.style.visibility='hidden';
    const w=pop.offsetWidth,h=pop.offsetHeight;
    let left=Math.min(Math.max(12,r.left-12),innerWidth-w-12);
    let top=r.bottom+8;if(top+h>innerHeight-12&&r.top-h-8>12)top=r.top-h-8;
    pop.style.left=left+'px';pop.style.top=top+'px';pop.style.visibility='visible';
  };
  document.addEventListener('click',event=>{
    const btn=event.target.closest('[data-ai-info]');
    if(btn){const same=openBtn===btn;close();if(!same){openBtn=btn;btn.setAttribute('aria-expanded','true');place(btn);}return;}
    if(openBtn&&!event.target.closest('.ai-pop'))close();
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&openBtn){const b=openBtn;close();b.focus();}});
  addEventListener('scroll',close,true);addEventListener('resize',close);
})();
