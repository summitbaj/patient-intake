const demoDocuments = [
  { id:'referral', name:'Referral.pdf', meta:'2 pages · Extracted', icon:'file-text', type:'Referral' },
  { id:'insurance', name:'Insurance Card.pdf', meta:'1 page · Duplicate found', icon:'badge-check', type:'Insurance card' },
  { id:'prescription', name:'Prescription.pdf', meta:'1 page · Extracted', icon:'notebook-tabs', type:'Prescription' },
  { id:'consent', name:'Consent Form.pdf', meta:'2 pages · Low confidence', icon:'file-signature', type:'Consent form' }
];
const documents = [];
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
  'existing-insurance':'assets/insurance.svg','existing-consent':'assets/consent.svg','existing-sleep':'assets/sleep-study.svg'
};

const insurancePlans=[
  {name:'Medicare Part B',rank:'Primary coverage',eligibility:'Active through 12/30/2027',fields:[['Insurance type','Medicare'],['Health insurance company','Medicare Health Care Plan'],['Relationship to insured','Self'],['Member ID prefix','X'],['Member ID','BCB731045298'],['Member ID suffix','03'],['Group number','Not provided'],['Effective from','12/31/2022'],['Effective to','12/30/2027']]},
  {name:'Aetna Choice POS II',rank:'Secondary coverage',eligibility:'Active through 03/14/2026',fields:[['Insurance type','Commercial PPO'],['Health insurance company','Aetna'],['Relationship to insured','Self'],['Member ID prefix','Z'],['Member ID','AET529187463'],['Member ID suffix','07'],['Group number','GRP-258914'],['Effective from','03/15/2025'],['Effective to','03/14/2026']]}
];

const state = { selected:'', viewerMode:'preview', phase:'upload', extracting:false, extractionComplete:false, patientResolved:false, documentResolutions:new Set(), started:false, resolutionPending:false, dob:true, mobile:false, provider:false, product:false, patientLinked:false, completed:false };
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
  queue.innerHTML=documents.length?documents.map(file=>`<div><i data-lucide="file-text"></i><span><strong>${file.name}</strong><small>${file.type}</small></span><i data-lucide="check-circle"></i></div>`).join(''):'<span>No documents added yet</span>';
  $('#extractDocuments').disabled=!documents.length||state.extracting;
  icons();
}

function renderExtractionFiles(){
  $('#extractionFileList').innerHTML=documents.map(file=>`<div><i data-lucide="file-text"></i><span><strong>${file.name}</strong><small>${file.meta}</small></span>${file.processing?'<span class="spinner"></span>':'<i data-lucide="circle-check"></i>'}</div>`).join('');
  icons();
}

function renderExtractionIssues(){
  $('#extractionPatientMatches').innerHTML=patientMatches.map((patient,index)=>`<article class="extract-patient" id="extract-patient-${patient.id}"><div class="extract-patient-summary"><span class="avatar">${patient.initials}</span><span><strong>${patient.name}</strong><small>DOB ${patient.dob} · ${patient.mrn}</small></span><b>${patient.confidence}%</b></div><p>${patient.reason}</p><div class="extract-patient-details" hidden><dl><div><dt>Address</dt><dd>${patient.address}</dd></div><div><dt>Phone</dt><dd>${patient.phone}</dd></div><div><dt>Patient ID</dt><dd>${patient.mrn}</dd></div></dl></div><div class="extract-patient-actions"><button class="small-btn ${index===0?'primary':''}" data-extract-patient="${patient.id}">Select patient</button><button class="text-btn" data-extract-patient-details="${patient.id}" aria-expanded="false">View details</button></div></article>`).join('');
  const findings=[duplicateFindings[0],duplicateFindings[2]];
  $('#extractionDocumentMatches').innerHTML=findings.map(item=>`<article class="extract-document" id="extract-${item.id}"><div class="finding-type"><span>${item.kind==='exact'?'Same document':'Similar content'}</span><b>${item.score}%</b></div><strong>${item.upload}</strong><p>${item.reason}</p><small>Existing: ${item.existing}</small><div class="extract-document-actions">${item.kind==='exact'?`<button class="small-btn primary" data-extract-document="${item.id}" data-decision="existing">Use existing document</button><button class="text-btn" data-extract-document="${item.id}" data-decision="upload">Keep uploaded copy</button>`:`<button class="small-btn primary" data-extract-document="${item.id}" data-decision="replace">Replace existing</button><button class="small-btn" data-extract-document="${item.id}" data-decision="new">Add as new</button>`}</div></article>`).join('');
  icons();
}

function setPhase(phase){
  state.phase=phase;
  const workspace=$('#workspace');
  const body=document.body;

  workspace.classList.remove('phase-upload','phase-extraction','phase-review','intake-empty');
  body.classList.remove('phase-upload','phase-extraction','phase-review','intake-empty');

  workspace.classList.add(`phase-${phase}`);
  body.classList.add(`phase-${phase}`);
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
  renderPostIntake();
  $('#postIntake').scrollIntoView({block:'start'});
}

function returnToIntakeReview(){
  state.completed=false;
  $('.review-area').classList.remove('show-post-intake');
  $('#postIntake').hidden=true;
  $('#reviewTrigger').disabled=false;
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
function startPrototype(){
  if(documents.length)return;
  demoDocuments.forEach(file=>documents.push({...file,meta:'Ready to extract'}));
  state.selected='referral';
  renderDocuments();renderUploadQueue();
  toast('Sample documents added. Select Extract when ready.');
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
    row.querySelector('i')?.setAttribute('data-lucide','check');icons();
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

function renderInsurance(index=0){
  const plan=insurancePlans[index];
  $$('.plan-item').forEach((button,buttonIndex)=>button.classList.toggle('active',buttonIndex===index));
  $('#planName').textContent=plan.name;
  $('#planRank').textContent=plan.rank;
  $('#eligibilityText').textContent=plan.eligibility;
  $('#insuranceFields').innerHTML=plan.fields.map(([label,value])=>`<div><span>${label}</span><strong>${value}</strong></div>`).join('');
  enableInlineEditing();
}

function issueCount(){ return [state.mobile,state.provider,state.product].filter(value=>!value).length; }
function reviewItems(){
  return [
    !state.mobile&&{id:'mobileField',label:'Mobile phone',detail:'Digits look blurry',section:'Patient details',severity:'warning'},
    !state.provider&&{id:'providerField',label:'Provider name',detail:'Not found in any document',section:'Prescription',severity:'missing'},
    !state.product&&{id:'productField',label:'Product selection',detail:'No specific model found',section:'Prescription',severity:'missing'}
  ].filter(Boolean);
}

function renderReviewMenu(){
  const items=reviewItems(),trigger=$('#reviewTriggerText');
  trigger.textContent=items.length?`${items.length} ${items.length===1?'thing':'things'} to review`:'No things to review';
  $('#reviewItems').innerHTML=items.length?items.map(item=>`<button class="review-item" data-review-target="${item.id}"><span class="review-dot ${item.severity}"></span><span class="review-copy"><b>${item.label}</b><small>${item.detail}</small></span><span class="review-section">${item.section}</span></button>`).join(''):'<div class="review-empty"><i data-lucide="circle-check"></i><span>All required information is ready.</span></div>';
  icons();
}

function updateProgress(){
  const remaining=issueCount();
  const reviewed=42-remaining;
  const patientRemaining=state.mobile?0:1;
  const prescriptionRemaining=[state.provider,state.product].filter(value=>!value).length;
  $('#reviewedCount').textContent=reviewed;
  const patientStatus=$('#patient-section .section-status');
  $('#patient-section .card-header p').textContent=`${24-patientRemaining} of 24 fields complete`;
  patientStatus.className=`section-status ${patientRemaining?'warning':'success'}`;
  patientStatus.innerHTML=patientRemaining?`<i data-lucide="triangle-alert"></i> ${patientRemaining} ${patientRemaining===1?'needs':'need'} review`:'<i data-lucide="circle-check"></i> Reviewed';
  const prescriptionComplete=2-prescriptionRemaining;
  const prescriptionStatus=$('#prescription-section .section-status');
  $('#prescription-section .card-header p').textContent=`${4+prescriptionComplete} of 6 fields complete`;
  prescriptionStatus.className=`section-status ${prescriptionRemaining?'danger':'success'}`;
  prescriptionStatus.innerHTML=prescriptionRemaining?`<i data-lucide="circle-x"></i> ${prescriptionRemaining} missing`:'<i data-lucide="circle-check"></i> Reviewed';
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
  $$('.compact-fields strong,.insurance-fields strong,.summary-grid strong,#dobValue').forEach(value=>{
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
  state.provider=Boolean($('#providerInput').value.trim());
  state.product=Boolean($('#productInput').value);
  $('#providerInput').closest('.resolve-row').classList.toggle('done',state.provider);
  $('#productInput').closest('.resolve-row').classList.toggle('done',state.product);
  if(state.provider&&state.product){
    $('#missingBox').style.borderColor='#9ed39e';
    $('#prescription-section .section-status').className='section-status success';
    $('#prescription-section .section-status').innerHTML='<i data-lucide="circle-check"></i> Reviewed';
    $('#prescription-section .card-header p').textContent='6 of 6 fields complete';
  }
  updateProgress();
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
    $('#patientIssue .issue-title>b').textContent='Resolved';$('#extractionPatientMatches').innerHTML=`<div class="issue-resolved"><i data-lucide="check"></i><span><strong>${patient.name}</strong><small>${patient.mrn} · Existing patient selected</small></span></div>`;$('.create-new-patient').hidden=true;$('#documentIssue').hidden=false;icons();toast(`${patient.name} selected. Review document matches next.`);setTimeout(()=>$('#documentIssue').scrollIntoView({behavior:'smooth',block:'start'}),50);checkExtractionReady();return;
  }
  if(target.dataset.extractPatientDetails){const card=$(`#extract-patient-${target.dataset.extractPatientDetails}`),details=card.querySelector('.extract-patient-details'),open=details.hidden;details.hidden=!open;target.setAttribute('aria-expanded',open);target.textContent=open?'Hide details':'View details';return;}
  if(target.dataset.extractNewPatient!==undefined){state.patientResolved=true;state.patientLinked=false;syncExistingPatientFiles();$('#patientIssue .issue-title>b').textContent='Resolved';$('#extractionPatientMatches').innerHTML='<div class="issue-resolved"><i data-lucide="check"></i><span><strong>Create a new patient</strong><small>No existing record will be linked.</small></span></div>';target.hidden=true;$('#documentIssue').hidden=false;icons();setTimeout(()=>$('#documentIssue').scrollIntoView({behavior:'smooth',block:'start'}),50);checkExtractionReady();return;}
  if(target.dataset.extractDocument){
    const id=target.dataset.extractDocument;state.documentResolutions.add(id);const card=$(`#extract-${id}`);card.classList.add('resolved');card.querySelector('.extract-document-actions').innerHTML=`<div class="issue-resolved"><i data-lucide="check"></i><span><strong>Decision saved</strong><small>${target.dataset.decision==='existing'?'Existing document will be used.':target.dataset.decision==='replace'?'Existing document will be replaced.':'Uploaded document will be stored.'}</small></span></div>`;
    if(state.documentResolutions.size===2)$('#documentIssue .issue-title>b').textContent='Resolved';icons();checkExtractionReady();return;
  }
  if(target.dataset.plan!==undefined){renderInsurance(+target.dataset.plan);return;}
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
$('#checkEligibility').addEventListener('click',()=>toast('Eligibility verified: active coverage'));
$('#addPlan').addEventListener('click',()=>toast('New insurance plan form opened'));
$('#startPrototype').addEventListener('click',startPrototype);
$('#extractDocuments').addEventListener('click',startExtraction);
$('#expandSources').addEventListener('click',()=>setSourceDrawer(!$('#sourcePanel').classList.contains('drawer-open')));
$('#sourceScrim').addEventListener('click',()=>setSourceDrawer(false));
$('#reviewTrigger').addEventListener('click',()=>{const popover=$('#reviewPopover'),open=popover.hidden;popover.hidden=!open;$('#reviewTrigger').setAttribute('aria-expanded',open);});
document.addEventListener('click',event=>{if(!event.target.closest('.review-menu')){$('#reviewPopover').hidden=true;$('#reviewTrigger').setAttribute('aria-expanded','false');}});
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
if($('#productInput'))$('#productInput').addEventListener('change',updateRequired);
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
enableInlineEditing();
updateProgress();
setSourceDrawer(false);
renderUploadQueue();
setPhase('upload');
icons();