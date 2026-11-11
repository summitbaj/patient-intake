// Pre-check · Readiness matrix (exploration).
// Rows are HCPCS codes grouped by prescription and item; columns are the six verification categories.
// A cell shows a short badge; clicking it opens the required fix under the row, with upload and re-check.
// Supplies in a PAP or oxygen bundle inherit the base device's medical criteria, so fixing the base updates them all.
(function(){
  const pmCols=[['medical','Medical criteria','stethoscope'],['dispensing','Qty & frequency','calendar-clock'],['same','Same & similar','copy-check'],['physician','Ordering physician','user-round-check'],['documents','Documents & PA','file-text'],['payer','Coverage','shield-check']];
  const pm={view:'matrix',open:null,key:null,busy:new Set()};
  pm.view='matrix';   // one table; the code-by-code detail now opens inside it
  const readOnly=typeof pcEmbed!=='undefined'&&pcEmbed;
  const sev={pass:0,warn:1,fail:2};
  const worstOf=list=>list.reduce((w,s)=>sev[s]>sev[w]?s:w,'pass');

  // Accessories inherit medical criteria from the base device on the same prescription.
  const baseCode=code=>/^A70/.test(code)?'E0601':/^A461/.test(code)?'E1390':null;
  function baseLine(line){
    const code=baseCode(line.code);if(!code)return null;
    return rxList[rxOf(line)].items.flatMap(item=>item.lines).find(l=>l.code===code)||null;
  }
  const inheritedKeys=['medical'];
  const sourceCheck=(line,key)=>{const base=inheritedKeys.includes(key)?baseLine(line):null;return {base,check:(base||line).checks.find(c=>c.key===key)};};
  const lineStatus=line=>worstOf(pmCols.map(([key])=>sourceCheck(line,key).check?.status||'pass'));

  // The few words a cell needs; the full summary is on hover and in the panel.
  function short(c){
    const s=c.summary||'';
    if(c.key==='medical'){const m=s.match(/(\d+ of \d+) criteria met/);return m?`${m[1]} met`:s.split(' · ')[0];}
    if(c.key==='dispensing')return /Not on the prescription/.test(s)?'Not stated':s.replace(/^Medicare allows /,'Max ');
    if(c.key==='same')return c.status==='pass'?(/No match/.test(s)?'No match':'No conflict'):/active rental/.test(s)?'Active rental':/already ordered/.test(s)?'Already ordered':/due/.test(s)?'Not due yet':s.split(' · ')[0];
    if(c.key==='physician')return c.status==='pass'?'Enrolled':/not verified/i.test(s)?'Not verified':'Not enrolled';
    if(c.key==='documents'){if(c.status==='pass')return s.split(' · ')[0];return /prior authorization/.test(s)?'PA missing':s.split(' · ')[0];}
    if(c.key==='payer')return c.status==='pass'?'Covered':s.split(' · ')[0];
    return s.split(' · ')[0];
  }
  const icon={pass:'circle-check',warn:'triangle-alert',fail:'circle-x'};
  const resultText={pass:'Met',warn:'Needs review',fail:'Action required'};
  const stamp=()=>{const d=new Date();return `${d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} · ${d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}`;};
  pm.checkedAt=stamp();
  const chipIcon={pass:'check',warn:'eye',fail:'circle-alert'};

  function cell(line,key){
    const {base,check}=sourceCheck(line,key);if(!check)return '<span class="pm-cell is-empty">—</span>';
    const open=pm.open===line.id&&pm.key===key;
    return `<button type="button" class="pm-cell ${check.status} ${base?'inherited':''} ${open?'is-open':''}" data-pm-cell="${line.id}:${key}" aria-expanded="${open}" title="${esc(check.summary)}"><span class="pm-badge"><i data-lucide="${icon[check.status]}"></i>${esc(short(check))}</span>${base?`<small class="pm-via"><i data-lucide="corner-down-right"></i> via ${base.code}</small>`:''}</button>`;
  }

  function panel(line){
    const key=pm.key||pmCols[0][0],{base,check}=sourceCheck(line,key),busy=pm.busy.has(line.id);
    const target=base||line,dependents=lines.filter(l=>baseLine(l)===target);
    const canUpload=!readOnly&&check.status!=='pass'&&['documents','medical','physician'].includes(key);
    // Fix actions sit with the fix, so they're in view without scrolling past the details.
    const review=!readOnly&&check.status==='warn'?`<button type="button" class="small-btn primary" data-rc-reviewed="${target.id}:${key}"><i data-lucide="check"></i> Mark Reviewed</button>`:'';
    const ecBtn=!readOnly&&key==='payer'&&/not checked/i.test(check.summary)?`<button type="button" class="small-btn primary" data-rc-ec="${line.id}"><i data-lucide="shield-check"></i> Check Eligibility</button>`:'';
    const actions=readOnly?'':`<span class="pm-fix-actions">${ecBtn}${review}${canUpload?`<label class="small-btn pm-upload"><input type="file" hidden data-pm-upload="${target.id}:${key}"><i data-lucide="upload"></i> Upload ${key==='documents'&&/prior authorization/.test(check.summary)?'Prior Authorization':'Document'}</label>`:''}<button type="button" class="small-btn ${check.status==='pass'?'':'primary'}" data-pm-recheck="${target.id}" ${busy?'disabled':''}>${busy?'<span class="spinner"></span> Re-checking…':`<i data-lucide="refresh-cw"></i> Re-check ${target.code}`}</button></span>`;
    return `<div class="pm-panel" role="region" aria-label="${line.code} ${check.label}">
      <div class="pm-panel-body">
        <header class="pm-panel-head"><div><b>${pmCols.find(([k])=>k===key)[1]} · ${line.code}</b><small>${esc(check.summary)}</small></div><span class="section-status ${pillClass[check.status]}"><i data-lucide="${icon[check.status]}"></i> ${checkPill[check.status][1]}</span></header>
        ${base?`<p class="pm-inherit"><i data-lucide="link-2"></i><span><b>Shared with ${base.code}.</b> ${line.code} is covered under the ${base.code} criteria in this ${line.item.bundle?'bundle':'prescription'}. Fix it on ${base.code} and every linked supply updates.</span><button type="button" class="text-btn" data-pm-goto="${base.id}:${key}">Open ${base.code}</button></p>`
          :dependents.length&&inheritedKeys.includes(key)?`<p class="pm-inherit is-base"><i data-lucide="link-2"></i><span><b>Base criteria for ${dependents.length} ${dependents.length===1?'supply':'supplies'}.</b> ${dependents.map(l=>l.code).join(', ')} inherit${dependents.length===1?'s':''} this result.</span></p>`:''}
        ${check.status!=='pass'&&check.action?`<div class="pm-fix ${check.status}"><i data-lucide="${check.status==='warn'?'eye':'wrench'}"></i><div><b>${check.status==='warn'?'To review':'Action required'}</b><p>${esc(check.action)}</p></div>${actions}</div>`:actions?`<div class="pm-panel-actions">${actions}</div>`:''}
        <div class="pm-detail">${check.body||''}</div>
        <p class="pm-hint"><i data-lucide="mouse-pointer-click"></i> Select another category in the row to see its details.</p>
      </div>
    </div>`;
  }

  function row(line){
    const st=lineStatus(line),open=pm.open===line.id,busy=pm.busy.has(line.id),isBase=lines.some(l=>baseLine(l)===line);
    return `<div class="pm-row-group ${open?'open':''} ${line.item?.bundle?'in-bundle':''}" id="pm-line-${line.id}">
      <div class="pm-row ${st}" role="row">
        <span role="cell"><button type="button" class="pm-expand" data-pm-row="${line.id}" aria-expanded="${open}" aria-label="${open?'Hide':'Show'} ${line.code} details"><i data-lucide="chevron-right"></i></button></span>
        <span class="pm-item" role="rowheader"><span class="pm-code">${line.code}</span><span class="pm-desc" title="${esc(line.description)}">${esc(line.description)}</span>${isBase?'<small class="pm-base"><i data-lucide="link-2"></i> Base for linked supplies</small>':''}</span>
        ${pmCols.map(([key])=>`<span role="cell">${cell(line,key)}</span>`).join('')}
        <span class="pm-result" role="cell">${busy?'<span class="pm-status busy"><span class="spinner"></span> Re-checking</span>':`<span class="rt-pill ${st}"><span class="rt-dot"></span>${resultText[st]}</span>`}</span>
      </div>
      ${open?panel(line):''}
    </div>`;
  }

  // ---------- Overview: one row per code, the six categories as chips, one status. Bundles stay together. ----------
  const rxId=ri=>`RX-${String(231+ri).padStart(4,'0')}`;
  // ---------- One table: Item | the six categories as a checklist (each opens its full detail) | Status + what to do ----------
  const catIcon={pass:'circle-check',warn:'eye',fail:'circle-x'};
  pm.cats=pm.cats||new Set();pm.seen=pm.seen||new Set();
  // A category that needs something opens on its own the first time; the user can close it.
  function autoOpen(line){return;   // categories stay closed until the user opens one
if(pm.seen.has(line.id))return;pm.seen.add(line.id);const first=pmCols.find(([key])=>{const {base,check}=sourceCheck(line,key);return check&&check.status==='fail'&&!base;})||pmCols.find(([key])=>{const {base,check}=sourceCheck(line,key);return check&&check.status!=='pass'&&!base;});if(first&&!lines.some(l=>l.id<line.id&&pm.seen.has(l.id)&&pmCols.some(([k])=>pm.cats.has(`${l.id}:${k}`))))pm.cats.add(`${line.id}:${first[0]}`);}   // open only the first problem on the page
  function actionsFor(line,key,check,base){
    if(readOnly)return '';
    if(base)return `<button type="button" class="small-btn" data-pm-goto="${base.id}:${key}"><i data-lucide="arrow-up-right"></i> Go to ${base.code}</button>`;
    const btns=[];
    if(key==='payer'&&/not checked/i.test(check.summary))btns.push(`<button type="button" class="small-btn primary" data-rc-ec="${line.id}"><i data-lucide="shield-check"></i> Check Eligibility</button>`);
    if(check.status==='warn')btns.push(`<button type="button" class="small-btn primary" data-rc-reviewed="${line.id}:${key}"><i data-lucide="check"></i> Mark Reviewed</button>`);
    if(check.status!=='pass'&&['documents','medical','physician'].includes(key))btns.push(`<a class="small-btn" href="${intakeDocsHref}"><i data-lucide="file-plus"></i> Add Document in Intake</a>`);
    btns.push(`<button type="button" class="small-btn" data-pm-recheck="${line.id}" ${pm.busy.has(line.id)?'disabled':''}><i data-lucide="refresh-cw"></i> Re-check</button>`);
    return btns.join('');
  }
  function catLine(line,key,label){
    const {base,check}=sourceCheck(line,key);if(!check)return '';
    const k=`${line.id}:${key}`,open=pm.cats.has(k);
    const summary=base?`From ${base.code}${check.status==='pass'?'':` · ${check.status==='warn'?'review':'fix'} it there`}`:check.summary;
    const body=base?`<p class="pm-inherit"><i data-lucide="link-2"></i><span><b>Shared with ${base.code}.</b> ${line.code} is covered under the ${base.code} criteria in this bundle. Review or fix it once on ${base.code} and every linked supply updates.</span></p>${check.body||''}`:(check.body||'');
    return `<li class="rt-cat ${check.status} ${open?'is-open':''}"><button type="button" class="rt-cat-head" data-rt-cat="${k}" aria-expanded="${open}"><i class="rt-cat-icon" data-lucide="${catIcon[check.status]}"></i><span class="rt-cat-name">${label}</span><span class="rt-cat-sum" title="${esc(summary)}">${esc(summary)}</span><i class="rt-chev" data-lucide="chevron-right"></i></button>
      </li>`;
  }
  // ---------- Upload from the check that needs it ----------
  // Opening a check that's missing a document shows what's needed and an upload area.
  // After a file is chosen: Uploading → Reading the document → Re-checking → result, all in place.
  pm.uploads=pm.uploads||new Map();   // "lineId:key" -> {name, stage}
  const uploadKeys=['documents','medical','physician'];
  function uploadBox(line,key,check,base){
    if(readOnly||base||!uploadKeys.includes(key))return '';
    const k=`${line.id}:${key}`,up=pm.uploads.get(k);
    if(up&&up.stage!=='done'){
      const label={uploading:'Uploading',reading:'Reading the document',checking:`Re-checking ${line.code}`}[up.stage];
      return `<div class="up-box is-busy" aria-live="polite"><span class="spinner"></span><div><b>${esc(up.name)}</b><small>${label}…</small></div></div>`;
    }
    if(up&&up.stage==='done'&&check.status==='pass')
      return `<div class="up-box is-done" aria-live="polite"><i data-lucide="circle-check"></i><div><b>${esc(up.name)} added</b><small>${esc(check.label||'Check')} is now met. The document was saved to this intake and the patient record.</small></div></div>`;
    if(check.status==='pass')return '';
    const need=check.action||check.summary||'A supporting document';
    const docLabel=key==='documents'&&/prior authorization/i.test(check.summary||'')?'Prior Authorization':'Document';
    return `<div class="up-box">
      <div class="up-need"><i data-lucide="file-plus"></i><div><b>What’s needed</b><small>${esc(need)}</small></div></div>
      <label class="up-drop" data-up-drop="${k}"><input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" data-pm-upload="${k}"><i data-lucide="upload"></i><span><b>Upload ${docLabel}</b><small>or drag a file here · PDF, JPG or PNG up to 10 MB</small></span></label>
    </div>`;
  }
  // ---------- Documents and eligibility for this readiness check ----------
  // One place, above the results, to add documents and check eligibility. Both use the intake's data:
  // the documents list is the intake's, and anything added here is saved back to the intake and the patient record.
  pm.inUploads=pm.inUploads||[];   // [{name, stage:'uploading'|'reading'|'done'}]
  pm.ecBusy=false;
  const docKeys=['documents','medical','physician'];
  // What's still needed: every unmet document-type check, grouped by what to upload.
  function stillNeeded(){
    const groups=new Map();
    lines.forEach(line=>line.checks.forEach(c=>{
      if(!docKeys.includes(c.key)||c.status==='pass'||baseLine(line)&&inheritedKeys.includes(c.key))return;
      const what=c.action||c.summary;const g=groups.get(what)||{what,codes:[],refs:[]};
      if(!g.codes.includes(line.code))g.codes.push(line.code);g.refs.push({line,c});groups.set(what,g);
    }));
    return [...groups.values()];
  }
  function inputsSection(){
    if(readOnly)return '';
    const docs=intake.documents||[],added=new Set(JSON.parse(sessionStorage.getItem('signeticPrecheckUploads')||'[]'));
    const need=stillNeeded();
    const chips=docs.map(name=>`<li class="ri-doc"><i data-lucide="file-text"></i><span>${esc(name)}</span>${added.has(name)?'<em>New</em>':''}</li>`).join('');
    const busyRows=pm.inUploads.filter(u=>u.stage!=='done').map(u=>`<li class="ri-doc is-busy"><span class="spinner"></span><span>${esc(u.name)}</span><em>${u.stage==='uploading'?'Uploading…':'Reading…'}</em></li>`).join('');
    const ps=plans();
    const ecRows=ps.map(p=>{const ec=p.eligibility,inactive=/inactive/i.test(p.status||'');
      const res=pm.ecBusy?'<span class="ri-ec-res is-busy"><span class="spinner"></span> Checking…</span>'
        :inactive?'<span class="ri-ec-res bad"><i data-lucide="circle-x"></i> Inactive · won’t be billed</span>'
        :!ec?'<span class="ri-ec-res warn"><i data-lucide="circle-alert"></i> Not checked</span>'
        :ec.eligible?`<span class="ri-ec-res ok"><i data-lucide="circle-check"></i> Active · ${esc(ec.service||'DME')} covered</span>`
        :`<span class="ri-ec-res bad"><i data-lucide="circle-x"></i> ${esc(ec.service||'DME')} not covered</span>`;
      return `<li class="ri-plan"><span class="ri-rank">${esc(p.rank||'')}</span><b>${esc(p.name)}</b>${res}<small>${ec&&!pm.ecBusy?`Checked ${esc(ec.checkedAt||'')}`:''}</small></li>`;}).join('');
    const anyUnchecked=ps.some(p=>!p.eligibility&&!/inactive/i.test(p.status||''));
    return `<section class="ri" id="riInputs">
      <div class="ri-card" id="riDocs">
        <header><span class="ri-icon"><i data-lucide="files"></i></span><div><b>Documents</b><small>${docs.length} in this intake · shared with the intake and patient record</small></div></header>
        ${need.length?`<div class="ri-need"><b>Still needed</b><ul>${need.map(g=>`<li><i data-lucide="file-plus"></i><span>${esc(g.what)}</span><small>${g.codes.join(', ')}</small></li>`).join('')}</ul></div>`:'<p class="ri-ok"><i data-lucide="circle-check"></i> No documents missing</p>'}
        <label class="ri-drop" data-ri-drop><input type="file" hidden multiple accept=".pdf,.jpg,.jpeg,.png" data-ri-upload><i data-lucide="upload"></i><span><b>Upload Documents</b><small>Drag files here or browse · PDF, JPG or PNG up to 10 MB. Affected codes are re-checked.</small></span></label>
        <ul class="ri-docs">${busyRows}${chips}</ul>
      </div>
      <div class="ri-card" id="riEc">
        <header><span class="ri-icon"><i data-lucide="shield-check"></i></span><div><b>Insurance eligibility</b><small>DME · from the intake. Check again to get today’s result.</small></div>
          <button type="button" class="small-btn ${anyUnchecked?'primary':''}" data-ri-ec ${pm.ecBusy||!ps.length?'disabled':''}><i data-lucide="${anyUnchecked?'shield-check':'refresh-cw'}"></i> ${anyUnchecked?'Check Eligibility':'Check Again'}</button></header>
        ${ps.length?`<ul class="ri-plans">${ecRows}</ul>`:'<p class="ri-ok">No insurance in this intake</p>'}
        <a class="ri-link" href="index.html">Edit insurance in the intake <i data-lucide="arrow-up-right"></i></a>
      </div>
    </section>`;
  }
  const saveIntake=()=>{try{sessionStorage.setItem('signeticIntakeFull',JSON.stringify(intake));}catch(error){}};
  function riUpload(files){
    const ok=[...files].filter(f=>/\.(pdf|jpe?g|png)$/i.test(f.name)&&f.size<=10*1048576),bad=[...files].length-ok.length;
    if(bad)toast(`${bad===1?'1 file wasn’t':`${bad} files weren’t`} added. Use PDF, JPG or PNG up to 10 MB.`);
    ok.forEach((file,n)=>{
      const u={name:file.name,stage:'uploading'};pm.inUploads.push(u);render();
      setTimeout(()=>{u.stage='reading';render();
        setTimeout(()=>{u.stage='done';
          // Saved to the intake (and from there the patient record), so the intake shows it too.
          intake.documents=[...(intake.documents||[]).filter(d=>d!==file.name),file.name];saveIntake();
          try{const list=JSON.parse(sessionStorage.getItem('signeticPrecheckUploads')||'[]');if(!list.includes(file.name))list.push(file.name);sessionStorage.setItem('signeticPrecheckUploads',JSON.stringify(list));}catch(error){}
          // Demo: the document meets the first thing still needed. Re-check the codes it affects.
          const g=stillNeeded()[0];
          if(!g){render();toast(`${file.name} added to the intake`);return;}
          g.refs.forEach(({c})=>{c.pendingPass=c.key==='documents'?'All required documents on file':c.key==='medical'?'All criteria met':'Verified';});
          recheck([...new Set(g.refs.map(r=>r.line.id))],`${file.name} added · ${g.codes.join(', ')} re-checked · ${g.refs[0].c.label} now met`);
        },900);
      },600+n*300);
    });
  }
  async function riCheckEligibility(){
    if(pm.ecBusy)return;pm.ecBusy=true;render();if($('#ecDialog')?.open)renderEcDialog();
    await new Promise(r=>setTimeout(r,1300));
    const at=stamp();
    plans().forEach(p=>{if(/inactive/i.test(p.status||''))return;p.eligibility={...(p.eligibility||{}),service:'DME',checkedAt:at,active:true,eligible:true,benefit:p.eligibility?.benefit||'Covered'};});
    saveIntake();
    try{sessionStorage.setItem('signeticPrecheckEc',JSON.stringify({at,plans:plans().map(p=>p.name)}));}catch(error){}
    // Coverage on every code comes from these results, so recompute it.
    lines.forEach(line=>{const i=line.checks.findIndex(c=>c.key==='payer');if(i>=0)line.checks[i]=payerCheck(line.code);line.status=lineStatus(line);});
    pm.ecBusy=false;pm.ecDone=true;pm.checkedAt=at;render();if($('#ecDialog')?.open)renderEcDialog();
    const active=plans().filter(p=>!/inactive/i.test(p.status||''));
    toast(`Eligibility checked · ${active.map(p=>p.name).join(' and ')} active, DME covered`);
  }
  // Documents are added in the intake (where they're extracted); this page links there.
  const intakeDocsHref='index.html?screen=review&add=docs';
  // ---------- Eligibility check: a popup over the readiness check ----------
  function ecDialog(){
    let dlg=$('#ecDialog');
    if(!dlg){dlg=document.createElement('dialog');dlg.id='ecDialog';dlg.className='confirm-dialog ec-dialog';dlg.setAttribute('aria-labelledby','ecDialogTitle');document.body.appendChild(dlg);
      dlg.addEventListener('click',event=>{if(event.target===dlg||event.target.closest('[data-ec-close]'))dlg.close();if(event.target.closest('[data-ec-run]'))riCheckEligibility();});}
    return dlg;
  }
  function renderEcDialog(){
    const dlg=ecDialog(),ps=plans(),running=pm.ecBusy;
    const row=p=>{const ec=p.eligibility,inactive=/inactive/i.test(p.status||'');
      const res=running&&!inactive?'<span class="ri-ec-res is-busy"><span class="spinner"></span> Checking…</span>'
        :inactive?'<span class="ri-ec-res bad"><i data-lucide="circle-x"></i> Inactive · won’t be billed</span>'
        :!ec?'<span class="ri-ec-res warn"><i data-lucide="circle-alert"></i> Not checked</span>'
        :ec.eligible?`<span class="ri-ec-res ok"><i data-lucide="circle-check"></i> Active · ${esc(ec.service||'DME')} covered</span>`
        :`<span class="ri-ec-res bad"><i data-lucide="circle-x"></i> ${esc(ec.service||'DME')} not covered</span>`;
      return `<li class="ri-plan"><span class="ri-rank">${esc(p.rank||'')}</span><b>${esc(p.name)}</b>${res}<small>${ec&&!(running&&!inactive)?`Last checked ${esc(ec.checkedAt||'')}`:''}</small></li>`;};
    dlg.innerHTML=`<header class="modal-head"><h2 id="ecDialogTitle">Check eligibility</h2><button type="button" class="icon-btn" data-ec-close aria-label="Close"><i data-lucide="x"></i></button></header>
      <div class="modal-body"><p class="modal-sub">Checks each insurance in this intake for DME. Coverage for every code updates with the result.</p>
        ${ps.length?`<ul class="ri-plans">${ps.map(row).join('')}</ul>`:'<p class="ri-ok">No insurance in this intake.</p>'}
        <a class="ri-link" href="index.html?screen=review">Edit insurance in the intake <i data-lucide="arrow-up-right"></i></a></div>
      <div class="confirm-actions"><button type="button" class="footer-btn" data-ec-close>${pm.ecDone?'Done':'Cancel'}</button><button type="button" class="footer-btn primary" data-ec-run ${running||!ps.length?'disabled':''}>${running?'<span class="spinner"></span> Checking…':'<i data-lucide="shield-check"></i> '+(pm.ecDone?'Check Again':'Check Eligibility')}</button></div>`;
    icons();
  }
  function openEcDialog(){pm.ecDone=false;renderEcDialog();const d=ecDialog();if(!d.open)d.showModal();}
  function tableRow(line){
    autoOpen(line);
    const st=lineStatus(line),busy=pm.busy.has(line.id),isBase=lines.some(l=>baseLine(l)===line);
    const probs=pmCols.map(([key])=>({key,...sourceCheck(line,key)})).filter(x=>x.check&&x.check.status!=='pass');
    const first=probs.find(x=>x.check.status==='fail'&&!x.base)||probs.find(x=>!x.base)||probs[0];
    const todo=busy?'':!first?'<p class="rt-todo is-done">Nothing to do</p>'
      :`<div class="rt-todo"><b>${first.check.status==='fail'?'What to do':'What to review'}</b><p>${first.base?`${first.check.label} is shared with ${first.base.code}. ${first.check.status==='warn'?'Review':'Fix'} it there.`:esc(first.check.action||first.check.summary)}</p><div class="rt-acts">${actionsFor(line,first.key,first.check,first.base)}</div>${probs.length>1?`<small>${probs.length-1} more ${probs.length-1===1?'category':'categories'} to look at</small>`:''}</div>`;
    return `<div class="rt-row ${st}" id="pm-line-${line.id}">
      <span class="rt-item"><span class="pm-code">${line.code}</span><span class="rt-desc">${esc(line.description)}</span></span>
      <ul class="rt-cats">${pmCols.map(([key,label])=>catLine(line,key,label)).join('')}</ul>
      ${(()=>{const key=pmCols.map(([k])=>k).find(k=>pm.cats.has(`${line.id}:${k}`));if(!key)return '';
        const {base,check}=sourceCheck(line,key),label=pmCols.find(([k])=>k===key)[1];
        const body=base?`<p class="pm-inherit"><i data-lucide="link-2"></i><span><b>Shared with ${base.code}.</b> ${line.code} is covered under the ${base.code} criteria in this bundle. Review or fix it once on ${base.code} and every linked supply updates.</span></p>${check.body||''}`:(check.body||'');
        return `<div class="rt-detail ${check.status}" id="rt-detail-${line.id}"><header class="rt-detail-head"><i data-lucide="${catIcon[check.status]}"></i><div><b>${label} · ${line.code}</b><small>${esc(check.summary)}</small></div><button type="button" class="icon-btn" data-rt-cat="${line.id}:${key}" aria-label="Close ${label}"><i data-lucide="x"></i></button></header>
          <div class="rt-detail-body">${body}</div></div>`;})()}
      <span class="rt-status">${busy?'<span class="pm-status busy"><span class="spinner"></span> Re-checking</span>':`<span class="rt-pill ${st}"><span class="rt-dot"></span>${resultText[st]}</span>`}</span>
    </div>`;
  }
  function renderOverview(wrap){
    const keepTop=wrap.querySelector('.pm-scroll')?.scrollTop||0;

    const count=st=>lines.filter(l=>lineStatus(l)===st).length,flaggedNow=lines.length-count('pass');
    const sub=$('#pkPatient')?.innerHTML||'';
    wrap.innerHTML=`<div class="pm-scroll">
      <section class="rh">
        <div class="rh-top"><span class="section-icon"><i data-lucide="shield-check"></i></span><div class="rh-title"><h3>Readiness check</h3><p>${sub}</p><span class="rh-checked"><i data-lucide="calendar-check"></i> Checked ${pm.checkedAt}</span>${readOnly?'':`<a class="rh-add-docs" href="${intakeDocsHref}" title="Opens the intake. New documents are extracted there, then run the readiness check again."><i data-lucide="file-plus"></i> Add documents in the intake</a>`}</div>
          ${readOnly?'':`<button type="button" class="small-btn rh-ec" data-ec-open><i data-lucide="shield-check"></i> Check Eligibility</button>`}${readOnly?'':`<button type="button" class="small-btn rh-recheck" data-pm-recheck-all><i data-lucide="refresh-cw"></i> Re-check All</button>`}</div>
      </section>
      ${rxList.map((rx,ri)=>{const ls=rx.items.flatMap(item=>item.lines),n=st=>ls.filter(l=>lineStatus(l)===st).length;return `<section class="pm-rx">
        <header class="pm-rx-head"><div><b>${rxId(ri)}</b><small>${rx.physician?`Dr. ${esc(rx.physician)}`:'Ordering physician not added'}${rx.npi?` · NPI ${esc(rx.npi)}`:''} · ${plural(ls.length,'code')}</small></div>
          <span class="rc-counts"><span class="pass"><i data-lucide="circle-check"></i> ${n('pass')} met</span>${n('warn')?`<span class="warn"><i data-lucide="eye"></i> ${n('warn')} needs review</span>`:''}${n('fail')?`<span class="fail"><i data-lucide="circle-x"></i> ${n('fail')} action required</span>`:''}</span></header>
        <div class="rt-table" role="table" aria-label="${rxId(ri)} readiness">
          <div class="rt-row rt-head" role="row"><span role="columnheader">Item</span><span role="columnheader">Readiness by category</span><span role="columnheader">Status</span></div>
          ${rx.items.map(item=>{const base=item.lines.find(l=>lines.some(x=>baseLine(x)===l));
            return `${item.bundle?`<div class="rc-bundle"><i data-lucide="boxes"></i><b>${esc(item.name)}</b><span class="pill neutral">Bundle · ${plural(item.lines.length,'code')}</span>${base?`<span class="pm-shared"><i data-lucide="link-2"></i> Supplies share ${base.code}’s medical criteria</span>`:''}</div>`:''}${item.lines.map(tableRow).join('')}`;}).join('')}
        </div>
      </section>`;}).join('')}
    </div>
    <footer class="pr-footer pm-footer"><div class="pk-footer-status ${flaggedNow?'todo':'done'}"><span class="pk-status-icon"><i data-lucide="${flaggedNow?'list-checks':'check'}"></i></span><span><b>${flaggedNow?`${count('fail')?`${plural(count('fail'),'code')} need action`:''}${count('fail')&&count('warn')?' · ':''}${count('warn')?`${plural(count('warn'),'code')} to review`:''}`:'All codes met'}</b><span class="v2-next">across ${plural(rxList.length,'prescription')}</span></span></div><p class="rh-verify"><i data-lucide="sparkles"></i><span>These results are AI-generated. <b>Verify them before you ${fromOrder?'save the order':'prepare orders'}.</b></span></p><div class="pk-footer-actions">${fromOrder?'':'<a class="footer-btn" href="patient-record.html?pane=workqueue&from=readiness"><i data-lucide="list-todo"></i> Needs Attention</a>'}<button class="footer-btn primary" type="button" data-pm-go>${fromOrder?'Save to order':'Prepare Orders'} <i data-lucide="arrow-right"></i></button></div></footer>`;
    const sc=wrap.querySelector('.pm-scroll');if(sc)sc.scrollTop=keepTop;   // re-rendering never jumps the page
    icons();
  }
  function render(){
    const wrap=$('#pmWrap');if(!wrap)return;
    if(pm.view==='matrix'){renderOverview(wrap);return;}
    const all=lines.length,flaggedNow=lines.filter(l=>lineStatus(l)!=='pass').length;
    const head=`<div class="pm-row pm-head" role="row"><span role="columnheader"><span class="sr-only">Details</span></span><span role="columnheader">Item · HCPCS</span>${pmCols.map(([,label,ic])=>`<span role="columnheader"><i data-lucide="${ic}"></i> ${label}</span>`).join('')}<span role="columnheader">Result</span></div>`;
    wrap.innerHTML=`<div class="pm-scroll">
      <div class="pm-legend"><span><b>${all-flaggedNow} of ${all}</b> codes ready</span><span class="pm-key"><i class="pass" data-lucide="circle-check"></i> Met</span><span class="pm-key"><i class="warn" data-lucide="triangle-alert"></i> Review</span><span class="pm-key"><i class="fail" data-lucide="circle-x"></i> Not met</span><span class="pm-key"><i data-lucide="corner-down-right"></i> Inherited from the base device</span></div>
      ${rxList.map((rx,ri)=>{const ls=rx.items.flatMap(item=>item.lines),bad=ls.filter(l=>lineStatus(l)!=='pass').length;return `<section class="pm-rx">
        <header class="pm-rx-head"><div><b>${esc(rx.title)}</b><small>${rx.physician?`Dr. ${esc(rx.physician)}`:'Ordering physician not added'}${rx.npi?` · NPI ${esc(rx.npi)}`:''} · ${plural(ls.length,'code')}</small></div><span class="pr-acc-badge ${bad?'todo':'ok'}">${bad?`<i data-lucide="triangle-alert"></i> ${plural(bad,'code')} flagged`:'<i data-lucide="circle-check"></i> All ready'}</span>${readOnly?'':`<button type="button" class="small-btn" data-pm-recheck-rx="${ri}"><i data-lucide="refresh-cw"></i> Re-check All</button>`}</header>
        <div class="pm-table" role="table" aria-label="${esc(rx.title)} readiness">${head}
          ${rx.items.map(item=>{
            const base=item.lines.find(l=>lines.some(x=>baseLine(x)===l));
            return `<div class="pm-group" role="row"><span class="pm-group-name">${esc(item.name)}</span><span class="pill ai-kind"><i data-lucide="sparkles"></i> ${item.bundle?`Bundle · ${item.lines.length}`:'Single'}</span>${item.bundle&&base?`<span class="pm-shared"><i data-lucide="link-2"></i> Supplies share ${base.code}’s medical criteria. Fix them once on ${base.code}.</span>`:''}${!item.lines.length?'<span class="pm-shared">No HCPCS code yet. Add one in the intake to pre-check this item.</span>':''}</div>${item.lines.map(row).join('')}`;
          }).join('')}
        </div>
      </section>`;}).join('')}
    </div>
    <footer class="pr-footer pm-footer"><div class="pk-footer-status ${flaggedNow?'todo':'done'}"><span class="pk-status-icon"><i data-lucide="${flaggedNow?'list-checks':'check'}"></i></span><span><b>${flaggedNow?`${plural(flaggedNow,'code')} flagged`:'All codes ready'}</b><span class="v2-next">across ${plural(rxList.length,'prescription')}</span></span></div><div class="pk-footer-actions">${fromOrder?'':'<a class="footer-btn" href="patient-record.html?pane=workqueue&from=readiness"><i data-lucide="list-todo"></i> Needs Attention</a>'}<button class="footer-btn primary" type="button" data-pm-go>${fromOrder?'Save to order':'Prepare Orders'} <i data-lucide="arrow-right"></i></button></div></footer>`;
    icons();
  }

  function setView(view){
    pm.view=view;try{localStorage.setItem('pcView',view);}catch(error){}
    $('#pmWrap').hidden=view!=='matrix';$('.pr-body').hidden=view==='matrix';
    $$('[data-pc-view]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.pcView===view)));
    if(view==='matrix')render();
  }

  // Re-check: applies uploaded fixes, then recomputes. Fixing a base device updates every supply that inherits from it.
  function recheck(ids,message){
    ids.forEach(id=>pm.busy.add(id));render();
    setTimeout(()=>{
      const fixed=[];
      ids.forEach(id=>{const line=lines[id];pm.busy.delete(id);
        line.checks.forEach(c=>{if(c.pendingPass){c.status='pass';c.action='';c.summary=c.pendingPass;c.body=(c.body||'').replace(' uploaded · re-checking',' uploaded · accepted on re-check');delete c.pendingPass;fixed.push({line,c});}});
        line.status=lineStatus(line);
      });
      // Inherited checks follow the base, so both views agree.
      fixed.filter(({c})=>inheritedKeys.includes(c.key)).forEach(({line,c})=>lines.filter(l=>baseLine(l)===line).forEach(dep=>{const own=dep.checks.find(k=>k.key===c.key);if(own){own.status=c.status;own.summary=c.summary;own.action='';}}));
      lines.forEach(l=>{l.status=lineStatus(l);});
      pm.checkedAt=stamp();
      render();
      if(message)toast(message);
      else if(fixed.length){const {line,c}=fixed[0],deps=lines.filter(l=>baseLine(l)===line&&inheritedKeys.includes(c.key));toast(`${line.code} re-checked · ${c.label} now met${deps.length?` · ${plural(deps.length,'linked supply')} updated`:''}`);}
      else{const line=lines[ids[0]];toast(ids.length>1?'Re-checked · nothing changed':`${line.code} re-checked · ${lineStatus(line)==='pass'?'ready':'still needs attention'}`);}
    },900);
  }

  // View switch in the pre-check header, and the matrix container beside the code-by-code layout.
  const top=$('.pr-top');
  if(top&&!$('#pmWrap')){
    if(false)top.querySelector('.pr-title')?.insertAdjacentHTML('beforeend',`<div class="pm-toggle" role="tablist" aria-label="Readiness view"><button type="button" role="tab" data-pc-view="matrix" aria-selected="false"><i data-lucide="list-checks"></i> Overview</button><button type="button" role="tab" data-pc-view="code" aria-selected="false"><i data-lucide="list"></i> By Code</button></div>`);
    $('.pr-body').insertAdjacentHTML('afterend','<div class="pm-wrap" id="pmWrap" hidden></div>');
  }
  document.addEventListener('click',event=>{
    const t=event.target;
    const v=t.closest('[data-pc-view]');if(v){setView(v.dataset.pcView);return;}
    if(!t.closest('#pmWrap'))return;
    const rtc=t.closest('[data-rt-cat]');if(rtc){const k=rtc.dataset.rtCat,id=k.split(':')[0],was=pm.cats.has(k);
      [...pm.cats].filter(x=>x.split(':')[0]===id).forEach(x=>pm.cats.delete(x));if(!was)pm.cats.add(k);
      render();
      if(!was){const row=$(`#pm-line-${id}`),sc=$('#pmWrap .pm-scroll');if(row&&sc){const top=row.getBoundingClientRect().top-sc.getBoundingClientRect().top+sc.scrollTop-12;sc.scrollTo({top,behavior:'smooth'});}}
      return;}
    if(t.closest('[data-rc-close]')){pm.open=null;render();return;}
    const rv=t.closest('[data-rc-reviewed]');
    if(rv){const [id,key]=rv.dataset.rcReviewed.split(':'),line=lines[+id],c=line.checks.find(k=>k.key===key);
      c.status='pass';c.summary=`Reviewed by you · ${c.summary}`;c.action='';
      if(inheritedKeys.includes(key))lines.filter(l=>baseLine(l)===line).forEach(dep=>{const own=dep.checks.find(k=>k.key===key);if(own){own.status='pass';own.summary=c.summary;own.action='';}});
      lines.forEach(l=>{l.status=lineStatus(l);});render();toast(`${line.code} · ${c.label} marked reviewed`);return;}
    if(t.closest('[data-ec-open]')){openEcDialog();return;}
    if(t.closest('[data-goto-docs]')){const box=$('#riDocs');box?.scrollIntoView({behavior:'smooth',block:'start'});box?.classList.add('flash');setTimeout(()=>box?.classList.remove('flash'),1400);return;}
    const ec=t.closest('[data-rc-ec]');
    if(ec){openEcDialog();return;}
    const c=t.closest('[data-pm-cell]');if(c){const [id,key]=c.dataset.pmCell.split(':');const same=pm.open===+id&&pm.key===key&&!c.classList.contains('pm-tab');pm.open=same?null:+id;pm.key=key;render();return;}
    const r=t.closest('[data-pm-row]');if(r){const id=+r.dataset.pmRow;if(pm.open===id)pm.open=null;else{pm.open=id;const line=lines[id];pm.key=(pmCols.find(([k])=>sourceCheck(line,k).check?.status!=='pass')||pmCols[0])[0];}render();return;}
    const g=t.closest('[data-pm-goto]');if(g){const [id,key]=g.dataset.pmGoto.split(':');pm.open=+id;pm.key=key;render();$(`#pm-line-${id}`)?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    const rc=t.closest('[data-pm-recheck]');if(rc){recheck([+rc.dataset.pmRecheck]);return;}
    if(t.closest('[data-pm-recheck-all]')){recheck(lines.map(l=>l.id));return;}
    const rx=t.closest('[data-pm-recheck-rx]');if(rx){const ids=rxList[+rx.dataset.pmRecheckRx].items.flatMap(item=>item.lines).map(l=>l.id);recheck(ids);return;}
    if(t.closest('[data-pm-go]')){$('#pcCreateOrder').click();}
  });
  // Upload a missing document: it's attached now and counts once the code is re-checked.
  function uploadToCheck(k,file){
    const [id,key]=k.split(':'),line=lines[+id],c=line.checks.find(x=>x.key===key);if(!c||!file)return;
    if(!/\.(pdf|jpe?g|png)$/i.test(file.name)){toast(`${file.name} wasn’t added. Use PDF, JPG or PNG.`);return;}
    if(file.size>10*1048576){toast(`${file.name} wasn’t added. The limit is 10 MB.`);return;}
    const name=file.name;
    pm.cats.add(k);pm.uploads.set(k,{name,stage:'uploading'});render();
    setTimeout(()=>{pm.uploads.set(k,{name,stage:'reading'});render();
      setTimeout(()=>{pm.uploads.set(k,{name,stage:'checking'});
        c.pendingPass=key==='documents'?'All required documents on file':key==='medical'?'All criteria met':'Verified';
        recheck([line.id]);
        setTimeout(()=>{pm.uploads.set(k,{name,stage:'done'});render();},950);
      },900);
    },700);
  }
  document.addEventListener('change',event=>{const input=event.target.closest('[data-ri-upload]');if(!input||!input.files?.length)return;riUpload(input.files);input.value='';});
  ['dragenter','dragover'].forEach(type=>document.addEventListener(type,event=>{const z=event.target.closest?.('[data-ri-drop]');if(!z)return;event.preventDefault();z.classList.add('over');}));
  ['dragleave','drop'].forEach(type=>document.addEventListener(type,event=>{const z=event.target.closest?.('[data-ri-drop]');if(!z)return;event.preventDefault();z.classList.remove('over');if(type==='drop'&&event.dataTransfer?.files?.length)riUpload(event.dataTransfer.files);}));
  document.addEventListener('change',event=>{
    const input=event.target.closest('[data-pm-upload]');if(!input||!input.files?.length)return;
    uploadToCheck(input.dataset.pmUpload,input.files[0]);input.value='';
  });
  ['dragenter','dragover'].forEach(type=>document.addEventListener(type,event=>{const z=event.target.closest?.('[data-up-drop]');if(!z)return;event.preventDefault();z.classList.add('over');}));
  ['dragleave','drop'].forEach(type=>document.addEventListener(type,event=>{const z=event.target.closest?.('[data-up-drop]');if(!z)return;event.preventDefault();z.classList.remove('over');if(type==='drop'&&event.dataTransfer?.files?.length)uploadToCheck(z.dataset.upDrop,event.dataTransfer.files[0]);}));
  window.pcMatrix={render,setView,recheck};
  setView(pm.view);
})();
