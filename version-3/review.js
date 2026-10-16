const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const icons = () => window.lucide?.createIcons();
const escapeHtml = value => String(value ?? '').replace(/[&<>"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[character]));

const documents = [
  {id:'referral',name:'Referral.pdf',type:'Referral',pages:2,image:'../assets/referral.svg',origin:'uploaded',status:'Extracted'},
  {id:'insurance',name:'Insurance Card.pdf',type:'Insurance card',pages:1,image:'../assets/insurance.svg',origin:'uploaded',status:'Extracted'},
  {id:'prescription',name:'Prescription.pdf',type:'Prescription',pages:1,image:'../assets/prescription.svg',origin:'uploaded',status:'Extracted'},
  {id:'consent',name:'Consent Form.pdf',type:'Consent form',pages:2,image:'../assets/consent.svg',origin:'uploaded',status:'Extracted'},
  {id:'sleep-study',name:'Sleep Study · Aug 2022.pdf',type:'Sleep study',pages:3,image:'../assets/sleep-study.svg',origin:'existing',status:'Extracted previously',eligible:true,inIntake:true},
  {id:'old-insurance',name:'Insurance Card · Sep 2025.pdf',type:'Insurance card',pages:1,image:'../assets/insurance.svg',origin:'existing',status:'Extracted previously',eligible:true,inIntake:false},
  {id:'progress-notes',name:'Progress Notes · Jul 2026.pdf',type:'Clinical notes',pages:4,image:'../assets/referral.svg',origin:'existing',status:'Needs extraction',eligible:true,inIntake:false}
];

const flowState = {
  phase:'upload',
  queued:[],
  extractionComplete:false,
  patientChoice:null,
  documentChoice:null
};
const extractionStages = [
  ['file-scan','Read uploaded documents'],
  ['scan-text','Extract patient and order details'],
  ['users','Match existing patients'],
  ['copy-check','Check similar documents'],
  ['git-compare-arrows','Resolve field conflicts']
];
const uploadedDocuments = () => documents.filter(item => item.origin === 'uploaded' && flowState.queued.some(queued => queued.documentId === item.id));
const availableDocuments = () => [...uploadedDocuments(),...(state?.patientLinked ? documents.filter(item => item.origin === 'existing') : [])];

const sections = [
  {id:'patient',title:'Patient information',icon:'user-round',fields:[
    {id:'firstName',label:'First name',value:'Ashlynn',status:'reviewed',document:'referral',page:1},
    {id:'lastName',label:'Last name',value:'Botosh',status:'reviewed',document:'referral',page:1},
    {id:'dob',label:'Date of birth',value:'03/15/1978',status:'needs-review',reason:'Insurance card shows 03/16/1978. AI kept the value matching the referral and patient record.',document:'referral',page:1}
  ]},
  {id:'contact',title:'Contact information',icon:'contact',fields:[
    {id:'mobile',label:'Mobile phone',value:'(415) 220-8841',status:'reviewed',document:'consent',page:1},
    {id:'email',label:'Email address',value:'',status:'missing',reason:'Required for intake notifications and not found in the source documents.',document:'consent',page:1,required:true},
    {id:'address',label:'Street address',value:'1234 Healthways Blvd, Suite 200',status:'reviewed',document:'referral',page:1}
  ]},
  {id:'insurance',title:'Insurance and coverage',icon:'shield-check',fields:[
    {id:'payer',label:'Primary payer',value:'Medicare Part B',status:'reviewed',document:'insurance',page:1},
    {id:'memberId',label:'Member ID',value:'X BCB731045298 03',status:'reviewed',document:'insurance',page:1},
    {id:'coverageOrder',label:'Coverage order',value:'Medicare primary · Aetna secondary',status:'needs-review',reason:'AI changed the order from the patient record based on coordination-of-benefits rules.',document:'insurance',page:1}
  ]},
  {id:'prescription',title:'Prescription or order details',icon:'notebook-tabs',fields:[
    {id:'orderDate',label:'Order date',value:'10/12/2026',status:'reviewed',document:'prescription',page:1},
    {id:'npi',label:'Ordering provider NPI',value:'',status:'missing',reason:'A valid 10-digit NPI is required and was not legible on the prescription.',document:'prescription',page:1,required:true},
    {id:'frequency',label:'Therapy frequency',value:'Nightly',status:'reviewed',document:'prescription',page:1}
  ]},
  {id:'diagnosis',title:'Diagnosis and clinical information',icon:'activity',fields:[
    {id:'diagnosisCode',label:'Primary diagnosis',value:'G47.33 · Obstructive sleep apnea',status:'reviewed',document:'sleep-study',page:2},
    {id:'ahi',label:'AHI',value:'18.4 events/hour',status:'needs-review',reason:'Confirm the qualifying result against page 2 of the sleep study.',document:'sleep-study',page:2}
  ]},
  {id:'provider',title:'Provider and referral information',icon:'stethoscope',fields:[
    {id:'providerName',label:'Referring provider',value:'Sarah Kim, MD',status:'reviewed',document:'referral',page:1},
    {id:'practice',label:'Practice',value:'Northwest Sleep Medicine',status:'reviewed',document:'referral',page:1},
    {id:'providerPhone',label:'Provider phone',value:'(206) 555-0194',status:'reviewed',document:'referral',page:2}
  ]},
  {id:'equipment',title:'Equipment or requested services',icon:'package-check',fields:[
    {id:'device',label:'Primary equipment',value:'E0601 · Auto CPAP device',status:'reviewed',document:'prescription',page:1},
    {id:'humidifier',label:'Accessory',value:'E0562 · Heated humidifier',status:'reviewed',document:'prescription',page:1},
    {id:'service',label:'Requested service',value:'PAP setup and education',status:'reviewed',document:'referral',page:2}
  ]}
];

const state = {
  drawerOpen:false,selectedDocument:'referral',viewerMode:'preview',viewerOpen:true,viewerWidth:420,page:1,zoom:100,
  patientLinked:true,completed:false,issuesOpen:false,fields:Object.fromEntries(sections.flatMap(section => section.fields.map(field => [field.id,{...field,sectionId:section.id,sectionTitle:section.title}])))
};
const fieldList = () => Object.values(state.fields);
const unresolvedFields = () => fieldList().filter(field => field.status !== 'reviewed');
const documentById = id => documents.find(document => document.id === id);
const statusMeta = status => ({
  reviewed:{label:'Reviewed',icon:'circle-check'},
  'needs-review':{label:'Needs review',icon:'triangle-alert'},
  missing:{label:'Missing required information',icon:'circle-alert'}
}[status]);

function announce(message){
  const region = $('#liveRegion');
  region.textContent = message;
  region.classList.add('visible');
  clearTimeout(announce.timer);
  announce.timer = setTimeout(() => region.classList.remove('visible'),2600);
}

function renderSections(){
  $('#reviewSections').innerHTML = sections.map(section => {
    const fields = section.fields.map(field => state.fields[field.id]);
    const sectionIssues = fields.filter(field => field.status !== 'reviewed').length;
    const sectionStatus = sectionIssues ? `<span class="status-label needs-review"><i data-lucide="triangle-alert"></i> ${sectionIssues} to review</span>` : '<span class="status-label reviewed"><i data-lucide="circle-check"></i> Reviewed</span>';
    return `<section class="review-section" id="section-${section.id}" aria-labelledby="heading-${section.id}">
      <header class="section-header"><div class="section-heading"><span><i data-lucide="${section.icon}"></i></span><div><h3 id="heading-${section.id}">${section.title}</h3><p>${fields.length} extracted fields</p></div></div>${sectionStatus}</header>
      <div class="field-list">${fields.map(renderField).join('')}</div>
    </section>`;
  }).join('');
  icons();
}

function renderField(field){
  const meta = statusMeta(field.status);
  const attention = field.status === 'reviewed' ? '' : ` attention ${field.status === 'missing' ? 'missing-required' : ''}`;
  const reviewButton = field.status === 'needs-review' ? `<button class="review-button" type="button" data-review-field="${field.id}"><i data-lucide="check"></i> Mark reviewed</button>` : '';
  return `<div class="field-row${attention}" id="field-${field.id}" data-field-id="${field.id}">
    <div class="field-meta"><label for="input-${field.id}">${escapeHtml(field.label)}</label><span class="status-label ${field.status}"><i data-lucide="${meta.icon}"></i> ${meta.label}</span></div>
    <div class="field-control"><input class="field-input" id="input-${field.id}" data-input-field="${field.id}" value="${escapeHtml(field.value)}" ${field.required ? 'required' : ''} aria-invalid="${field.status === 'missing'}">${field.reason ? `<small class="field-reason">${escapeHtml(field.reason)}</small>` : ''}</div>
    <div class="field-actions">${reviewButton}<button class="source-button" type="button" data-source-document="${field.document}" data-source-page="${field.page}"><i data-lucide="file-search"></i> ${escapeHtml(documentById(field.document).name)} · p${field.page}</button></div>
  </div>`;
}

function renderIssues(){
  const issues = unresolvedFields();
  $('#issueCount').textContent = issues.length;
  $('#completeButton').disabled = issues.length > 0 || state.completed;
  $('#reviewStatus').textContent = state.completed ? 'Intake completed' : issues.length ? `${issues.length} fields need attention` : 'Ready to complete';
  const popover = $('#issuesPopover');
  popover.innerHTML = `<div class="popover-heading"><strong>${issues.length ? `${issues.length} unresolved fields` : 'Review complete'}</strong><span>${issues.length ? 'Select an issue to go directly to the field.' : 'All required information has been reviewed.'}</span></div>` + (issues.length ? issues.map(field => {
    const missing = field.status === 'missing';
    return `<button class="issue-item ${missing ? 'missing' : 'review'}" type="button" data-jump-field="${field.id}"><i data-lucide="${missing ? 'circle-alert' : 'triangle-alert'}"></i><span class="issue-copy"><b>${escapeHtml(field.sectionTitle)} · ${escapeHtml(field.label)}</b><span>${escapeHtml(field.reason)}</span><small>${statusMeta(field.status).label}</small></span><span class="issue-go">Go to</span></button>`;
  }).join('') : '<div class="issues-empty"><i data-lucide="circle-check"></i> No unresolved fields</div>');
  icons();
}

function renderDrawer(){
  const groups = [
    {id:'uploaded',title:'Uploaded documents',items:uploadedDocuments()},
    ...(state.patientLinked ? [{id:'existing',title:'Existing patient documents',items:documents.filter(document => document.origin === 'existing')}] : [])
  ];
  $('#documentCount').textContent = groups.reduce((count, group) => count + group.items.length,0);
  $('#drawerContent').innerHTML = groups.map(group => `<section class="drawer-group" aria-labelledby="drawer-${group.id}"><div class="group-heading"><h3 id="drawer-${group.id}">${group.title}</h3><span>${group.items.length} files</span></div>${group.items.map(document => {
    const existingAction = document.origin === 'existing' && document.eligible ? `<button class="add-existing ${document.inIntake ? 'added' : ''}" type="button" data-add-existing="${document.id}" aria-pressed="${document.inIntake}">${document.inIntake ? 'In intake' : 'Add'}</button>` : '';
    return `<div class="drawer-document ${state.selectedDocument === document.id ? 'selected' : ''}"><button class="drawer-document document-select" type="button" data-select-document="${document.id}"><span class="document-thumb"><img src="${document.image}" alt=""></span><span class="document-copy"><strong>${escapeHtml(document.name)}</strong><span>${escapeHtml(document.type)} · ${document.pages} ${document.pages === 1 ? 'page' : 'pages'}</span><small class="${document.status.includes('Needs') ? 'pending' : 'extracted'}">${escapeHtml(document.status)}</small></span></button>${existingAction}</div>`;
  }).join('')}</section>`).join('');
  icons();
}

function setDrawer(open){
  state.drawerOpen = open;
  $('#documentDrawer').classList.toggle('open',open);
  $('#documentDrawer').setAttribute('aria-hidden',String(!open));
  $('#drawerScrim').hidden = !open;
  const toggle = $('#drawerToggle');
  toggle.setAttribute('aria-expanded',String(open));
  toggle.setAttribute('aria-label',open ? 'Close document drawer' : 'Open document drawer');
  toggle.title = open ? 'Close document drawer' : 'Open document drawer';
  toggle.innerHTML = `<i data-lucide="${open ? 'panel-left-close' : 'panel-left-open'}"></i><span class="count-badge" id="documentCount">${availableDocuments().length}</span>`;
  icons();
  if(open) $('#drawerClose').focus();
}

function renderViewer(){
  const selectedDocument = documentById(state.selectedDocument);
  $('#viewerTitle').textContent = selectedDocument.name;
  $('#pageLabel').textContent = `Page ${state.page} of ${selectedDocument.pages}`;
  $('#previousPage').disabled = state.page <= 1;
  $('#nextPage').disabled = state.page >= selectedDocument.pages;
  $('#zoomLabel').textContent = `${state.zoom}%`;
  const image = $('#documentImage');
  image.src = selectedDocument.image;
  image.alt = `${selectedDocument.name}, page ${state.page}`;
  image.style.width = `${state.zoom}%`;
  $('#previewPanel').hidden = state.viewerMode !== 'preview';
  $('#galleryPanel').hidden = state.viewerMode !== 'gallery';
  $('#previewTab').setAttribute('aria-selected',String(state.viewerMode === 'preview'));
  $('#galleryTab').setAttribute('aria-selected',String(state.viewerMode === 'gallery'));
  $('#galleryPanel').innerHTML = availableDocuments().map(item => `<button class="gallery-item ${item.id === state.selectedDocument ? 'selected' : ''}" type="button" data-gallery-document="${item.id}"><span class="document-thumb"><img src="${item.image}" alt=""></span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.type)} · ${item.pages} ${item.pages === 1 ? 'page' : 'pages'}</small></button>`).join('');
  document.documentElement.style.setProperty('--viewer-width',`${state.viewerWidth}px`);
  icons();
}

function setViewerOpen(open){
  state.viewerOpen = open;
  const mobile = window.matchMedia('(max-width: 980px)').matches;
  $('#workspace').classList.toggle('viewer-open',mobile && open);
  $('#workspace').classList.toggle('viewer-collapsed',!mobile && !open);
  $('#viewerRestore').hidden = open;
  const button = $('#viewerCollapse');
  button.setAttribute('aria-expanded',String(open));
  button.setAttribute('aria-label',mobile ? 'Close document viewer' : 'Collapse document viewer');
  button.title = button.getAttribute('aria-label');
  button.innerHTML = `<i data-lucide="${mobile ? 'x' : 'panel-right-close'}"></i>`;
  icons();
}

function selectDocument(id,{mode=state.viewerMode,page=1,open=true}={}){
  const document = documentById(id); if(!document) return;
  state.selectedDocument = id; state.viewerMode = mode; state.page = Math.min(page,document.pages);
  if(open) setViewerOpen(true);
  renderViewer(); renderDrawer();
}

function saveField(id,value){
  const field = state.fields[id]; if(!field) return;
  const trimmed = value.trim();
  if(field.required){
    const valid = id === 'npi' ? /^\d{10}$/.test(trimmed) : trimmed.length > 0;
    field.status = valid ? 'reviewed' : 'missing';
  }
  field.value = trimmed;
  renderSections(); renderIssues();
  const input = $(`#input-${id}`); input?.focus({preventScroll:true});
  announce(field.status === 'reviewed' ? `${field.label} saved and marked reviewed.` : `${field.label} saved. Required information is still missing.`);
}

function markReviewed(id){
  const field = state.fields[id]; if(!field) return;
  field.status = 'reviewed';
  renderSections(); renderIssues();
  $(`#field-${id}`)?.scrollIntoView({block:'center'});
  announce(`${field.label} marked reviewed. ${unresolvedFields().length} issues remain.`);
}

function jumpToField(id){
  state.issuesOpen = false; $('#issuesPopover').hidden = true; $('#issuesTrigger').setAttribute('aria-expanded','false');
  const row = $(`#field-${id}`); row?.scrollIntoView({behavior:'smooth',block:'center'}); row?.classList.add('field-flash');
  setTimeout(() => row?.classList.remove('field-flash'),1200);
  setTimeout(() => $(`#input-${id}`)?.focus({preventScroll:true}),350);
}

function completeIntake(){
  if(unresolvedFields().length) return;
  state.completed = true;
  $('#reviewContent').hidden = true;
  $('#handoff').hidden = false;
  $('#handoff').innerHTML = `<div class="handoff-heading"><div><span class="complete-kicker"><i data-lucide="circle-check"></i> Intake completed</span><h2 id="handoffTitle">Ashlynn Botosh</h2><p>DOB 03/15/1978 · Patient ID PT-10482</p></div><button class="secondary-button" type="button" id="returnToReview"><i data-lucide="arrow-left"></i> Return to reviewed intake</button></div>
    <section class="summary-block"><span class="summary-icon"><i data-lucide="sparkles"></i></span><div><span class="eyebrow">AI intake summary</span><h3>Coverage and PAP order are ready for operational review</h3><p>Ashlynn has active Medicare and Aetna coverage with a reviewed prescription supporting PAP therapy for obstructive sleep apnea. The ordering provider NPI and qualifying sleep-study result have been confirmed.</p><small><i data-lucide="shield-check"></i> Based on reviewed intake data</small></div></section>
    <section class="next-action"><div><span class="eyebrow">Recommended next action</span><h3>Start pre-check</h3><p>Confirm payer qualification, coverage, and required documentation before creating the equipment order.</p></div><button class="primary-button" type="button" data-handoff-action="precheck"><i data-lucide="shield-check"></i> Start pre-check</button></section>
    <div class="secondary-actions"><span>Other valid actions</span><button class="secondary-button" type="button" data-handoff-action="direct-order">Create order without pre-check</button><button class="secondary-button" type="button" data-handoff-action="refill">Refill existing order</button></div>
    <section class="recommendations"><h3>Recommended for this intake</h3><div class="recommendation-columns"><div class="recommendation-group"><h4>Services</h4><ul><li><i data-lucide="circle-check"></i><span><b>PAP setup and education</b><small>Supports safe use for a new therapy setup.</small></span></li><li><i data-lucide="circle-check"></i><span><b>Initial mask fitting</b><small>Confirms the appropriate interface before fulfillment.</small></span></li></ul></div><div class="recommendation-group"><h4>DME items</h4><ul><li><i data-lucide="circle-check"></i><span><b>Auto CPAP device</b><small>Supported by the reviewed prescription.</small></span></li><li><i data-lucide="circle-check"></i><span><b>Heated humidifier and starter supplies</b><small>Included in the initial PAP setup.</small></span></li></ul></div></div></section>`;
  renderIssues(); icons(); window.scrollTo({top:0,behavior:'smooth'}); announce('Patient intake completed.');
}

function returnToReview(){
  state.completed = false; $('#handoff').hidden = true; $('#reviewContent').hidden = false; renderIssues(); icons(); announce('Returned to the reviewed intake.');
}

function toggleIssues(){
  state.issuesOpen = !state.issuesOpen; $('#issuesPopover').hidden = !state.issuesOpen; $('#issuesTrigger').setAttribute('aria-expanded',String(state.issuesOpen));
  if(state.issuesOpen) $('#issuesPopover button')?.focus();
}

function renderPhaseProgress(){
  const phaseIndex = {upload:0,extract:1,review:2}[flowState.phase];
  $$('#phaseProgress li').forEach((item,index) => {
    item.classList.toggle('current',index === phaseIndex);
    item.classList.toggle('done',index < phaseIndex);
    item.querySelector('span').textContent = index < phaseIndex ? '✓' : String(index + 1);
  });
}

function setPhase(phase){
  flowState.phase = phase;
  $('#flow').hidden = phase === 'review';
  $('#uploadView').hidden = phase !== 'upload';
  $('#extractionView').hidden = phase !== 'extract';
  $('#workspace').hidden = phase !== 'review';
  $('#documentDrawer').hidden = phase !== 'review';
  $('#drawerToggle').hidden = phase !== 'review';
  $('#issuesWrap').hidden = phase !== 'review';
  $('#completeButton').hidden = phase !== 'review';
  renderPhaseProgress();
  if(phase === 'upload') $('#reviewStatus').textContent = 'Add documents';
  if(phase === 'extract') $('#reviewStatus').textContent = flowState.extractionComplete ? 'Decisions required' : 'Extracting documents';
  if(phase === 'review'){
    state.patientLinked = flowState.patientChoice === 'existing';
    const available = availableDocuments();
    if(available.length && !available.some(item => item.id === state.selectedDocument)) state.selectedDocument = available[0].id;
    const patientStatus = $('.patient-context .status-label');
    patientStatus.innerHTML = state.patientLinked ? '<i data-lucide="link"></i> Existing patient linked' : '<i data-lucide="user-plus"></i> New patient record';
    renderDrawer(); renderViewer(); renderIssues(); setViewerOpen(window.innerWidth > 980); icons();
  }
}

function renderUploadQueue(){
  $('#queueCount').textContent = flowState.queued.length;
  $('#extractButton').disabled = flowState.queued.length === 0;
  $('#uploadQueue').innerHTML = flowState.queued.length ? flowState.queued.map(item => `<div class="queued-file"><span><i data-lucide="file-text"></i></span><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.meta)}</small></span><button class="remove-file" type="button" data-remove-upload="${item.id}" aria-label="Remove ${escapeHtml(item.name)}" title="Remove"><i data-lucide="x"></i></button></div>`).join('') : '<div class="queue-empty">No documents added yet.</div>';
  icons();
}

function addSampleDocuments(){
  const samples = documents.filter(item => item.origin === 'uploaded');
  samples.forEach(item => {
    if(!flowState.queued.some(queued => queued.documentId === item.id)) flowState.queued.push({id:item.id,name:item.name,meta:`${item.type} · Ready to extract`,documentId:item.id});
  });
  renderUploadQueue();
  announce(`${samples.length} sample documents ready to extract.`);
}

function addPatientRecord(patientId,button){
  if(patientId !== 'ashlynn'){
    announce('This Version 3 scenario continues with Ashlynn Botosh.');
    return;
  }
  addSampleDocuments();
  $$('.patient-record').forEach(item => item.classList.toggle('selected',item === button));
  button.querySelector('.lucide')?.setAttribute('data-lucide','check');
  icons();
}

function addLocalFiles(fileList){
  [...fileList].forEach((file,index) => {
    const id = `local-${Date.now()}-${index}`;
    const fallback = documents[index % 4];
    documents.push({id,name:file.name,type:file.type || 'Uploaded document',pages:1,image:fallback.image,origin:'uploaded',status:'Extracted'});
    flowState.queued.push({id,name:file.name,meta:`${Math.max(1,Math.round(file.size / 1024))} KB · Ready to extract`,documentId:id});
  });
  renderUploadQueue();
  announce(`${fileList.length} ${fileList.length === 1 ? 'document' : 'documents'} ready to extract.`);
}

function updateContinueState(){
  const decisionsComplete = flowState.patientChoice && (flowState.patientChoice === 'new' || flowState.documentChoice);
  $('#continueReview').disabled = !(flowState.extractionComplete && decisionsComplete);
}

async function startExtraction(){
  if(!flowState.queued.length) return;
  setPhase('extract');
  $('#extractionSteps').innerHTML = extractionStages.map(([icon,label],index) => `<li data-extraction-step="${index}"><span class="step-icon"><i data-lucide="${icon}"></i></span>${label}</li>`).join('');
  icons();
  for(let index = 0; index < extractionStages.length; index += 1){
    const item = $(`[data-extraction-step="${index}"]`);
    item.classList.add('active');
    const percentage = (index + 1) * 20;
    $('#progressBar').style.width = `${percentage}%`;
    $('.progress-track').setAttribute('aria-valuenow',String(percentage));
    $('#progressValue').textContent = `${percentage}%`;
    await new Promise(resolve => setTimeout(resolve,420));
    item.classList.remove('active'); item.classList.add('done');
    item.querySelector('.step-icon').innerHTML = '<i data-lucide="check"></i>'; icons();
  }
  flowState.extractionComplete = true;
  $('#extractionTitle').textContent = 'Extraction complete';
  $('#extractionMessage').textContent = 'Review the remaining patient and document decisions.';
  $('#reviewStatus').textContent = 'Decisions required';
  updateContinueState();
  announce('Document extraction complete. Finish the required decisions to continue.');
}

function choosePatient(choice){
  flowState.patientChoice = choice;
  state.patientLinked = choice === 'existing';
  $('#patientActions').hidden = true;
  $('#patientDecision').hidden = false;
  $('#patientDecision').innerHTML = choice === 'existing' ? '<i data-lucide="circle-check"></i> Ashlynn Botosh linked to this intake.' : '<i data-lucide="circle-check"></i> A new patient record will be created.';
  $('#duplicateDecision').hidden = choice !== 'existing';
  if(choice === 'new') flowState.documentChoice = 'new';
  icons(); updateContinueState();
}

function chooseDocument(choice){
  flowState.documentChoice = choice;
  $('#duplicateDecision .match-actions').innerHTML = `<span class="status-label reviewed"><i data-lucide="circle-check"></i>${choice === 'existing' ? 'Existing insurance card will be used' : 'Uploaded insurance card will be kept'}</span>`;
  icons(); updateContinueState(); announce('Document handling decision saved.');
}

function handleClick(event){
  const target = event.target.closest('button'); if(!target) return;
  if(target.id === 'addSamples') addSampleDocuments();
  if(target.dataset.addRecord) addPatientRecord(target.dataset.addRecord,target);
  if(target.id === 'extractButton') startExtraction();
  if(target.id === 'continueReview') setPhase('review');
  if(target.dataset.removeUpload){flowState.queued = flowState.queued.filter(item => item.id !== target.dataset.removeUpload);renderUploadQueue();}
  if(target.dataset.patientChoice) choosePatient(target.dataset.patientChoice);
  if(target.dataset.documentChoice) chooseDocument(target.dataset.documentChoice);
  if(target.id === 'drawerToggle') setDrawer(!state.drawerOpen);
  if(target.id === 'drawerClose' || target.id === 'drawerScrim') setDrawer(false);
  if(target.id === 'issuesTrigger') toggleIssues();
  if(target.id === 'completeButton') completeIntake();
  if(target.id === 'viewerCollapse') setViewerOpen(false);
  if(target.id === 'viewerRestore') setViewerOpen(true);
  if(target.id === 'previewTab'){state.viewerMode='preview';renderViewer();}
  if(target.id === 'galleryTab'){state.viewerMode='gallery';renderViewer();}
  if(target.id === 'previousPage'){state.page=Math.max(1,state.page-1);renderViewer();}
  if(target.id === 'nextPage'){state.page=Math.min(documentById(state.selectedDocument).pages,state.page+1);renderViewer();}
  if(target.id === 'zoomOut'){state.zoom=Math.max(60,state.zoom-10);renderViewer();}
  if(target.id === 'zoomIn'){state.zoom=Math.min(180,state.zoom+10);renderViewer();}
  if(target.id === 'returnToReview') returnToReview();
  if(target.dataset.selectDocument){selectDocument(target.dataset.selectDocument,{mode:'preview'}); if(window.innerWidth <= 980)setDrawer(false);}
  if(target.dataset.galleryDocument) selectDocument(target.dataset.galleryDocument,{mode:'preview'});
  if(target.dataset.sourceDocument) selectDocument(target.dataset.sourceDocument,{mode:'preview',page:Number(target.dataset.sourcePage)});
  if(target.dataset.reviewField) markReviewed(target.dataset.reviewField);
  if(target.dataset.jumpField) jumpToField(target.dataset.jumpField);
  if(target.dataset.addExisting){
    const document = documentById(target.dataset.addExisting); document.inIntake = !document.inIntake; renderDrawer(); announce(`${document.name} ${document.inIntake ? 'added to' : 'removed from'} this intake.`);
  }
  if(target.dataset.handoffAction) announce(`${target.textContent.trim()} selected. Patient and reviewed intake context preserved.`);
}

document.addEventListener('click',handleClick);
document.addEventListener('change',event => {if(event.target.matches('[data-input-field]'))saveField(event.target.dataset.inputField,event.target.value);});
document.addEventListener('keydown',event => {
  if(event.key === 'Escape'){if(state.drawerOpen)setDrawer(false);else if(state.issuesOpen)toggleIssues();else if(window.innerWidth <= 980 && state.viewerOpen)setViewerOpen(false);}
  if(event.target.id === 'resizeHandle' && ['ArrowLeft','ArrowRight'].includes(event.key)){
    event.preventDefault(); state.viewerWidth = Math.min(620,Math.max(320,state.viewerWidth + (event.key === 'ArrowLeft' ? 20 : -20))); event.target.setAttribute('aria-valuenow',state.viewerWidth); renderViewer();
  }
});

document.addEventListener('pointerdown',event => {
  if(event.target.id !== 'resizeHandle') return;
  const move = pointerEvent => {state.viewerWidth=Math.min(620,Math.max(320,window.innerWidth-pointerEvent.clientX));$('#resizeHandle').setAttribute('aria-valuenow',state.viewerWidth);renderViewer();};
  const stop = () => {document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',stop);announce(`Document viewer width ${state.viewerWidth} pixels.`);};
  document.addEventListener('pointermove',move); document.addEventListener('pointerup',stop);
});

window.addEventListener('resize',() => setViewerOpen(window.innerWidth > 980 ? state.viewerOpen : false));

function setNavCollapsed(collapsed){
  document.body.classList.toggle('nav-collapsed',collapsed);
  const toggle = $('#navToggle');
  toggle.setAttribute('aria-expanded',String(!collapsed));
  toggle.setAttribute('aria-label',collapsed ? 'Expand navigation' : 'Collapse navigation');
  toggle.title = toggle.getAttribute('aria-label');
}

setNavCollapsed(true);
$('#navToggle').addEventListener('click',() => setNavCollapsed(!document.body.classList.contains('nav-collapsed')));
$$('[data-nav-section]').forEach(section => section.addEventListener('click',() => {
  const open = section.parentElement.classList.toggle('open');
  section.setAttribute('aria-expanded',String(open));
}));
$$('.shell-nav a[href="#"]').forEach(link => link.addEventListener('click',event => event.preventDefault()));
$('#shellBack').addEventListener('click',() => history.back());
$('#shellRefresh').addEventListener('click',() => location.reload());

$('#fileInput').addEventListener('change',event => addLocalFiles(event.target.files));
$('#dropZone').addEventListener('keydown',event => {if(event.key === 'Enter' || event.key === ' '){event.preventDefault();$('#fileInput').click();}});
$('#dropZone').addEventListener('dragover',event => {event.preventDefault();event.currentTarget.classList.add('dragging');});
$('#dropZone').addEventListener('dragleave',event => event.currentTarget.classList.remove('dragging'));
$('#dropZone').addEventListener('drop',event => {event.preventDefault();event.currentTarget.classList.remove('dragging');addLocalFiles(event.dataTransfer.files);});

renderSections(); renderIssues(); renderDrawer(); renderViewer();
renderUploadQueue(); setPhase('upload');
icons();
