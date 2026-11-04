// Pre-check · Readiness matrix (exploration).
// Rows are HCPCS codes grouped by prescription and item; columns are the six verification categories.
// A cell shows a short badge; clicking it opens the required fix under the row, with upload and re-check.
// Supplies in a PAP or oxygen bundle inherit the base device's medical criteria, so fixing the base updates them all.
(function(){
  const pmCols=[['medical','Medical criteria','stethoscope'],['dispensing','Qty & frequency','calendar-clock'],['same','Same & similar','copy-check'],['physician','Ordering physician','user-round-check'],['documents','Documents & PA','file-text'],['payer','Coverage','shield-check']];
  const pm={view:'matrix',open:null,key:null,busy:new Set()};
  try{pm.view=localStorage.getItem('pcView')==='code'?'code':'matrix';}catch(error){}
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
  const resultText={pass:'Ready',warn:'Needs review',fail:'Not ready'};

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
    const actions=readOnly?'':`<span class="pm-fix-actions">${canUpload?`<label class="small-btn pm-upload"><input type="file" hidden data-pm-upload="${target.id}:${key}"><i data-lucide="upload"></i> Upload ${key==='documents'&&/prior authorization/.test(check.summary)?'Prior Authorization':'Document'}</label>`:''}<button type="button" class="small-btn ${check.status==='pass'?'':'primary'}" data-pm-recheck="${target.id}" ${busy?'disabled':''}>${busy?'<span class="spinner"></span> Re-checking…':`<i data-lucide="refresh-cw"></i> Re-check ${target.code}`}</button></span>`;
    return `<div class="pm-panel" role="region" aria-label="${line.code} ${check.label}">
      <nav class="pm-tabs" aria-label="Checks for ${line.code}">${pmCols.map(([k,label,ic])=>{const st=sourceCheck(line,k).check?.status||'pass';return `<button type="button" class="pm-tab ${k===key?'active':''}" data-pm-cell="${line.id}:${k}"><i data-lucide="${ic}"></i><span>${label}</span><i class="pm-dot ${st}" data-lucide="${icon[st]}"></i></button>`;}).join('')}</nav>
      <div class="pm-panel-body">
        <header class="pm-panel-head"><div><b>${check.label}</b><small>${esc(check.summary)}</small></div><span class="section-status ${pillClass[check.status]}"><i data-lucide="${icon[check.status]}"></i> ${checkPill[check.status][1]}</span></header>
        ${base?`<p class="pm-inherit"><i data-lucide="link-2"></i><span><b>Shared with ${base.code}.</b> ${line.code} is covered under the ${base.code} criteria in this ${line.item.bundle?'bundle':'prescription'}. Fix it on ${base.code} and every linked supply updates.</span><button type="button" class="text-btn" data-pm-goto="${base.id}:${key}">Open ${base.code}</button></p>`
          :dependents.length&&inheritedKeys.includes(key)?`<p class="pm-inherit is-base"><i data-lucide="link-2"></i><span><b>Base criteria for ${dependents.length} ${dependents.length===1?'supply':'supplies'}.</b> ${dependents.map(l=>l.code).join(', ')} inherit${dependents.length===1?'s':''} this result.</span></p>`:''}
        ${check.status!=='pass'&&check.action?`<div class="pm-fix"><i data-lucide="wrench"></i><div><b>Required fix</b><p>${esc(check.action)}</p></div>${actions}</div>`:actions?`<div class="pm-panel-actions">${actions}</div>`:''}
        <div class="pm-detail">${check.body||''}</div>
      </div>
    </div>`;
  }

  function row(line){
    const st=lineStatus(line),open=pm.open===line.id,busy=pm.busy.has(line.id),isBase=lines.some(l=>baseLine(l)===line);
    return `<div class="pm-row-group ${open?'open':''}" id="pm-line-${line.id}">
      <div class="pm-row ${st}" role="row">
        <span role="cell"><button type="button" class="pm-expand" data-pm-row="${line.id}" aria-expanded="${open}" aria-label="${open?'Hide':'Show'} ${line.code} details"><i data-lucide="chevron-right"></i></button></span>
        <span class="pm-item" role="rowheader"><span class="pm-code">${line.code}</span><span class="pm-desc" title="${esc(line.description)}">${esc(line.description)}</span>${isBase?'<small class="pm-base"><i data-lucide="link-2"></i> Base for linked supplies</small>':''}</span>
        ${pmCols.map(([key])=>`<span role="cell">${cell(line,key)}</span>`).join('')}
        <span class="pm-result" role="cell">${busy?'<span class="pm-status busy"><span class="spinner"></span> Re-checking</span>':`<span class="pm-status ${st}"><i data-lucide="${icon[st]}"></i> ${resultText[st]}</span>`}${readOnly?'':`<button type="button" class="icon-btn pm-recheck" data-pm-recheck="${line.id}" title="Re-check ${line.code}" aria-label="Re-check ${line.code}" ${busy?'disabled':''}><i data-lucide="refresh-cw"></i></button>`}</span>
      </div>
      ${open?panel(line):''}
    </div>`;
  }

  function render(){
    const wrap=$('#pmWrap');if(!wrap)return;
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
    <footer class="pr-footer pm-footer"><div class="pk-footer-status ${flaggedNow?'todo':'done'}"><span class="pk-status-icon"><i data-lucide="${flaggedNow?'list-checks':'check'}"></i></span><span><b>${flaggedNow?`${plural(flaggedNow,'code')} flagged`:'All codes ready'}</b><span class="v2-next">across ${plural(rxList.length,'prescription')}</span></span></div><div class="pk-footer-actions"><button class="footer-btn primary" type="button" data-pm-go>${fromOrder?'Save to order':'Work Queue'} <i data-lucide="arrow-right"></i></button></div></footer>`;
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
      render();
      if(message)toast(message);
      else if(fixed.length){const {line,c}=fixed[0],deps=lines.filter(l=>baseLine(l)===line&&inheritedKeys.includes(c.key));toast(`${line.code} re-checked · ${c.label} now met${deps.length?` · ${plural(deps.length,'linked supply')} updated`:''}`);}
      else{const line=lines[ids[0]];toast(ids.length>1?'Re-checked · nothing changed':`${line.code} re-checked · ${lineStatus(line)==='pass'?'ready':'still needs attention'}`);}
    },900);
  }

  // View switch in the pre-check header, and the matrix container beside the code-by-code layout.
  const top=$('.pr-top');
  if(top&&!$('#pmWrap')){
    top.querySelector('.pr-title')?.insertAdjacentHTML('beforeend',`<div class="pm-toggle" role="tablist" aria-label="Pre-check view"><button type="button" role="tab" data-pc-view="matrix" aria-selected="false"><i data-lucide="table-2"></i> Matrix</button><button type="button" role="tab" data-pc-view="code" aria-selected="false"><i data-lucide="list"></i> By Code</button></div>`);
    $('.pr-body').insertAdjacentHTML('afterend','<div class="pm-wrap" id="pmWrap" hidden></div>');
  }
  document.addEventListener('click',event=>{
    const t=event.target;
    const v=t.closest('[data-pc-view]');if(v){setView(v.dataset.pcView);return;}
    if(!t.closest('#pmWrap'))return;
    const c=t.closest('[data-pm-cell]');if(c){const [id,key]=c.dataset.pmCell.split(':');const same=pm.open===+id&&pm.key===key&&!c.classList.contains('pm-tab');pm.open=same?null:+id;pm.key=key;render();return;}
    const r=t.closest('[data-pm-row]');if(r){const id=+r.dataset.pmRow;if(pm.open===id)pm.open=null;else{pm.open=id;const line=lines[id];pm.key=(pmCols.find(([k])=>sourceCheck(line,k).check?.status!=='pass')||pmCols[0])[0];}render();return;}
    const g=t.closest('[data-pm-goto]');if(g){const [id,key]=g.dataset.pmGoto.split(':');pm.open=+id;pm.key=key;render();$(`#pm-line-${id}`)?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    const rc=t.closest('[data-pm-recheck]');if(rc){recheck([+rc.dataset.pmRecheck]);return;}
    const rx=t.closest('[data-pm-recheck-rx]');if(rx){const ids=rxList[+rx.dataset.pmRecheckRx].items.flatMap(item=>item.lines).map(l=>l.id);recheck(ids);return;}
    if(t.closest('[data-pm-go]')){$('#pcCreateOrder').click();}
  });
  // Upload a missing document: it's attached now and counts once the code is re-checked.
  document.addEventListener('change',event=>{
    const input=event.target.closest('[data-pm-upload]');if(!input||!input.files?.length)return;
    const [id,key]=input.dataset.pmUpload.split(':'),line=lines[+id],c=line.checks.find(k=>k.key===key),name=input.files[0].name;
    c.pendingPass=key==='documents'?'All required documents on file':key==='medical'?'All criteria met':'Verified';
    c.body=`<p class="pm-uploaded"><i data-lucide="paperclip"></i> ${esc(name)} uploaded · re-checking</p>${c.body||''}`;
    toast(`${name} uploaded to ${line.code}`);recheck([line.id]);
  });
  window.pcMatrix={render,setView,recheck};
  setView(pm.view);
})();
