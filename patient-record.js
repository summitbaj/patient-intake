// Patient record (model-driven Contact form) with the Work Queue in a side pane.
// The Work Queue is everything to follow up on for this patient: the next steps from the intake just completed,
// kept in their own group, and other open follow-ups on the patient's orders (prior authorizations, signatures, deliveries...).
// Intake steps use the same plan as Fulfillment (orders-data.js), so a step done in either place is done in both.
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const icons=()=>{if(window.lucide)window.lucide.createIcons();};
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600);}
const esc=value=>String(value??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// Lower-case the first letter for use mid-sentence, but leave acronyms (PAP, SWO) alone.
const lcFirst=t=>/^[A-Z][a-z]/.test(t)?t.charAt(0).toLowerCase()+t.slice(1):t;
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;

const api=window.signeticOrders;
const intake=api.getIntake();
const params=new URLSearchParams(location.search);
const WQ_KEY='signeticWorkQueue';
const wq=(()=>{try{return JSON.parse(sessionStorage.getItem(WQ_KEY))||{done:[]};}catch(error){return {done:[]};}})();
const saveWq=()=>{try{sessionStorage.setItem(WQ_KEY,JSON.stringify(wq));}catch(error){}};
const ui={showDone:false,openId:null};

// ---------- Intake steps (same routing as Fulfillment) ----------
const items=intake.prescriptions.flatMap((rx,ri)=>rx.items.map((item,ii)=>({key:`${ri}-${item.id||ii}`,ri,rx,item,suggested:api.suggestRoute(item)})));
let plan=api.getPlan();
plan.routes=plan.routes||{};plan.done=plan.done||[];plan.ordered=plan.ordered||{};plan.pending=plan.pending||{};plan.appts=plan.appts||{};
items.forEach(entry=>{if(!plan.routes[entry.key]){const s=entry.suggested;plan.routes[entry.key]={route:s.route,target:s.route==='new'?'n1':s.target||''};}});
items.forEach(e=>{if(plan.routes[e.key]?.route==='new')plan.routes[e.key].target='n1';});
api.savePlan(plan);
// A finished order or refill comes back with ?done=<action id>.
const returned=params.get('done');
if(returned){
  (plan.pending[returned]||[]).forEach(key=>{plan.ordered[key]=returned;});
  if(!plan.done.includes(returned))plan.done.push(returned);
  delete plan.pending[returned];api.savePlan(plan);
  history.replaceState(null,'','patient-record.html?pane=workqueue');
  setTimeout(()=>toast(returned.startsWith('new')?'Order created':returned.startsWith('refill')?'Refill done':'Order updated'),100);
}
const route=entry=>plan.routes[entry.key];
const pendingFor=entry=>Object.entries(plan.pending||{}).some(([id,keys])=>id.startsWith('new')&&keys.includes(entry.key));
const ordered=entry=>Boolean(plan.ordered[entry.key]);
const rxLabel=ri=>{const rx=intake.prescriptions[ri];const last=(rx.physician||'').split(' ').pop();return `Rx ${ri+1}${last?` · Dr. ${last}`:''}`;};

// ---------- Tasks ----------
// Every task has: a short title, one meta line, a due/status, and ONE primary action. Details live one click away.
function intakeTasks(){
  const tasks=[];
  intake.prescriptions.forEach((rx,ri)=>{
    const list=items.filter(e=>e.ri===ri);
    // New orders: a prescription can produce more than one (items ordered separately).
    // Items to order: every new item on the prescription, in one task. The user picks which items go on each order;
    // the rest stay here until they're ordered too.
    const news=list.filter(e=>route(e).route==='new');
    if(news.length){
      const left=news.filter(e=>!ordered(e));
      tasks.push({id:`new-${ri}`,kind:'new',ri,entries:news,icon:'file-plus',title:'Items to order',
        meta:left.length===news.length?'':`${left.length} of ${news.length} left to order`,
        lines:news.map(e=>({text:e.item.name,sub:ordered(e)?`Order ${plan.ordered[e.key]} created`:pendingFor(e)?'Being ordered in another tab':api.codesOf(e.item).join(', '),done:ordered(e),pending:!ordered(e)&&pendingFor(e)})),action:'Create Order',done:!left.length});
    }
    list.filter(e=>['refill','add'].includes(route(e).route)).forEach(e=>{
      const r=route(e),order=api.orderById(r.target);
      tasks.push({id:`${r.route}-${ri}-${r.target||e.key}`,kind:r.route,ri,entries:[e],target:r.target,order,icon:r.route==='refill'?'refresh-cw':'list-plus',
        title:`${r.route==='refill'?'Refill':'Add to'} ${order?.id||'order'}`,meta:order?order.title:'',lines:[{text:e.item.name,sub:api.codesOf(e.item).join(', ')}],
        action:r.route==='refill'?'Open Refill':'Open Order',done:ordered(e)});
    });
    // Duplicates: already on an open order. Shown so nobody orders them twice; not a to-do.
    list.filter(e=>route(e).route==='hold').forEach(e=>{
      const m=api.codesOf(e.item).flatMap(code=>api.lineMatches(code)).find(x=>x.order.editable);
      const id=`dup-${e.key}`,res=wq.resolved?.[id];
      tasks.push({id,kind:'dup',ri,entries:[e],order:m?.order,icon:'copy',title:'Possible duplicate',meta:res||(m?`Already on ${m.order.id} · not shipped yet`:'Already on an open order'),lines:[{text:e.item.name,sub:api.codesOf(e.item).join(', ')}],
        why:`${e.item.name} is already on ${m?`${m.order.id} (${m.order.title}), which hasn’t shipped`:'an open order'}. Decide whether this prescription is covered by that order.`,done:Boolean(res)});
    });
    [...new Set(list.flatMap(e=>(e.item.docs||[]).filter(d=>!d.found&&!d.na).map(d=>d.name)))].forEach(name=>{
      const id=`doc-${ri}-${name}`;
      tasks.push({id,kind:'doc',ri,icon:'file-up',title:`Upload ${lcFirst(name)}`,meta:'Not in the patient record yet',
        why:`Needed for ${list.filter(e=>(e.item.docs||[]).some(d=>d.name===name&&!d.found&&!d.na)).map(e=>e.item.name).join(', ')}.`,action:'Upload',canMark:true,done:wq.done.includes(id)});
    });
  });
  return tasks;
}

// Other follow-ups on this patient (demo data; in Signetic these come from orders, PAs, documents and billing).
const followUps=[
  {id:'fu-pa-0987',group:'orders',kind:'pa',icon:'shield-alert',title:'Upload PA renewal · ORD-0987',meta:'PAP supplies · Aetna',why:'Aetna’s authorization for PAP supplies expired on 10/20/2026. Upload the renewed PA so resupply can continue.',due:'Overdue',dueState:'overdue',action:'Upload PA',canMark:true}
].map(f=>({...f,get done(){return wq.done.includes(f.id);}}));
const allTasks=()=>[...intakeTasks(),...followUps];

// Pre-check results for this intake, if it was run (from the pre-check page; demo results for the demo intake).
function precheck(){
  let status=null;try{status=JSON.parse(sessionStorage.getItem('signeticPrecheckStatus'));}catch(error){}
  if(!status&&intake.id==='INT-0023')status={E0601:'pass',E0562:'pass',A7030:'pass',A7031:'pass',A7037:'pass',A7038:'pass',A7036:'warn',A7035:'pass',A4615:'pass',A4616:'pass',E1390:'warn'};
  if(!status)return null;
  return {status,date:intake.precheck?.at||'Oct 15, 2026',flagged:Object.values(status).filter(v=>v!=='pass').length};
}
// What's ready for one item: pre-check, prior authorization, required documents.
function itemReadiness(e,pc){
  const codes=api.codesOf(e.item),out=[];
  if(pc){const s=codes.map(c=>pc.status[c]).filter(Boolean),worst=s.includes('fail')?'fail':s.includes('warn')?'warn':s.length?'pass':'';
    out.push(worst==='pass'?['ok','shield-check','Qualified']:worst==='fail'?['bad','circle-x','Not qualified']:worst==='warn'?['warn','triangle-alert','Pre-check: review']:['none','shield','Not pre-checked']);}
  else out.push(['none','shield','Not pre-checked']);
  const pa=(intake.priorAuths||[]).find(x=>codes.includes(x.code));
  const paDoc=(e.item.docs||[]).find(d=>/prior auth/i.test(d.name));
  out.push(pa?['ok','file-check','PA on file']:paDoc&&!paDoc.na&&!paDoc.found?['warn','file-warning','PA missing']:['none','file','PA not required']);
  const missing=(e.item.docs||[]).filter(d=>!d.found&&!d.na&&!/prior auth/i.test(d.name));
  out.push(missing.length?['warn','file-warning',`Missing: ${missing.map(d=>d.name).join(', ')}`]:['ok','files','Documents complete']);
  return out;
}

// Option A: one status per item, one word per task.
function itemStatus(e,pc){
  const r=itemReadiness(e,pc),bad=r.find(([c])=>c==='bad'),warn=r.find(([c])=>c==='warn');
  if(bad)return ['warn',bad[2]];
  if(warn)return ['warn',warn[2]==='Pre-check: review'?'Pre-check needs review':warn[2]];
  if(r[0][0]==='none')return ['none','Not pre-checked'];
  return ['ok','Ready'];
}
function taskStatusWord(t){
  if(t.kind!=='new'||t.done)return null;
  const pc=precheck(),left=t.entries.filter(e=>!ordered(e)&&!pendingFor(e));if(!left.length)return null;
  const st=left.map(e=>itemStatus(e,pc)),n=st.filter(([c])=>c==='warn').length;
  return n?['warn',`${n} to check`]:st.some(([c])=>c==='none')?['none','Not pre-checked']:['ok','Ready'];
}
// ---------- Render: a list of one-line tasks, or one task's detail ----------
const dueOrder={overdue:0,soon:1,later:2};
function taskRow(t){
  const word=null;   // no status word on intake rows; status lives in the item detail
  const due=word?`<span class="wq-due is-${word[0]==='ok'?'done':word[0]==='warn'?'soon':'later'}">${esc(word[1])}</span>`:t.info?`<span class="wq-due is-info">${esc(t.status||'')}</span>`:t.done?'<span class="wq-due is-done">Done</span>':t.due?`<span class="wq-due is-${t.dueState}">${esc(t.due)}</span>`:'';
  return `<li><button type="button" class="wq-row ${t.done?'is-done':''} ${t.info?'is-info':''}" data-wq-open="${esc(t.id)}"><span class="wq-ico is-${t.kind}"><i data-lucide="${t.done?'check':t.icon}"></i></span><span class="wq-text"><b>${esc(t.title)}</b>${t.meta?`<small>${esc(t.meta)}</small>`:''}${t.lines?`<span class="wq-lines">${t.lines.map(l=>`<span class="wq-line ${l.done?'is-done':''} ${l.pending?'is-pending':''}">${l.done?'<i data-lucide="check"></i>':l.pending?'<i data-lucide="loader" class="wq-spin"></i>':'<i class="wq-dot"></i>'}<span>${esc(l.text)}${l.sub?` <em>${esc(l.sub)}</em>`:''}</span></span>`).join('')}</span>`:''}</span>${due}<i class="wq-chev" data-lucide="chevron-right"></i></button></li>`;
}
function taskGroup(title,list,{link='',note=''}={}){
  const open=list.filter(t=>!t.done),done=list.filter(t=>t.done);
  if(!list.length)return '';
  return `<section class="wq-group"><header class="wq-group-head"><h3>${title} <span class="wq-count">${open.length||''}</span></h3>${link}</header>
    ${open.length?`<ul class="wq-rows">${open.map(taskRow).join('')}</ul>`:'<p class="wq-empty"><i data-lucide="circle-check"></i> Nothing left to do here</p>'}
    ${note}
    ${done.length?`<button type="button" class="wq-more" data-wq-show-done>${ui.showDone?'Hide':'Show'} completed (${done.length})</button>${ui.showDone?`<ul class="wq-rows">${done.map(taskRow).join('')}</ul>`:''}`:''}</section>`;
}
function listView(){
  const intakeList=intakeTasks(),others=[...followUps].sort((a,b)=>dueOrder[a.dueState]-dueOrder[b.dueState]);
  const open=intakeList.filter(t=>!t.done&&!t.info).length;
  // Intake → one block per prescription, each with its new orders, refills, duplicates and missing documents.
  const stepOrder={dup:0,doc:1,new:2,refill:3,add:3};
  const rxBlocks=intake.prescriptions.map((rx,ri)=>{
    const list=intakeList.filter(t=>t.ri===ri);if(!list.length)return '';
    const todo=list.filter(t=>!t.done),done=list.filter(t=>t.done);
    return `<div class="wq-rx-group"><h4>RX-${String(231+ri).padStart(4,'0')} <span>Dr. ${esc(rx.physician||'')}${rx.date?` · ${esc(rx.date)}`:''}</span></h4>
      <ul class="wq-rows">${[...todo.filter(t=>!t.info),...todo.filter(t=>t.info)].map(taskRow).join('')}${ui.showDone?done.map(taskRow).join(''):''}</ul></div>`;
  }).join('');
  const doneCount=intakeList.filter(t=>t.done).length;
  const intakeHtml=`<section class="wq-group"><header class="wq-group-head"><h3>From the intake <span class="wq-date">${esc(intake.completed||'')}</span> <span class="wq-count">${open||''}</span>${params.get('from')==='intake'?' <span class="wq-new">New</span>':''}</h3></header>
    ${rxBlocks}${doneCount?`<button type="button" class="wq-more" data-wq-show-done>${ui.showDone?'Hide':'Show'} completed (${doneCount})</button>`:''}</section>`;
  // Same rows for the rest, grouped by where the work comes from.
  return intakeHtml+taskGroup('Orders',others.filter(t=>t.group==='orders'));
}
// Needs Attention tab: one table, most urgent first. Each row says what to do, for which items, and when.
const wqType={new:['Create order','file-plus'],refill:['Refill','refresh-cw'],add:['Add to order','list-plus'],dup:['Check duplicate','copy'],doc:['Upload document','file-up'],pa:['Upload PA','shield-alert']};
const wqWhat={new:'Create the order',refill:'Refill the order',add:'Add to the order',dup:'Confirm it isn’t a duplicate',doc:'Upload the document',pa:'Upload the renewed PA'};
function tableView(){
  const list=allTasks().filter(t=>!t.info);
  const rank=t=>t.done?3:t.dueState==='overdue'?0:t.kind==='dup'||t.kind==='doc'?1:2;
  const rows=[...list].sort((a,b)=>rank(a)-rank(b));
  const forOf=t=>t.ri!=null?`RX-${String(231+t.ri).padStart(4,'0')}`:(t.title.match(/ORD-\d+/)||[''])[0];
  const open=list.filter(t=>!t.done).length;
  return `<table class="na-table"><thead><tr><th>Task</th><th>Items</th><th>For</th><th>Due</th><th></th></tr></thead><tbody>${rows.map(t=>{
    const [type,ic]=wqType[t.kind]||[t.title,t.icon];
    const what=t.kind==='pa'||t.kind==='doc'?t.title.replace(/ · ORD-\d+/,''):wqWhat[t.kind]||t.title;
    const items=(t.lines||[]).map(l=>`<li class="${l.done?'is-done':''}">${esc(l.text)}${l.sub?` <em>${esc(l.sub)}</em>`:''}</li>`).join('');
    return `<tr class="${t.done?'is-done':''} ${t.dueState==='overdue'&&!t.done?'is-overdue':''}">
      <td><span class="na-task"><span class="wq-ico is-${t.kind}"><i data-lucide="${t.done?'check':ic}"></i></span><span><b>${esc(what)}</b><small>${esc(t.meta||(t.lines?.length?`${t.lines.length} ${t.lines.length===1?'item':'items'}`:type))}</small></span></span></td>
      <td>${items?`<ul class="na-items">${items}</ul>`:'<span class="na-muted">—</span>'}</td>
      <td><span class="na-for">${esc(forOf(t))}</span></td>
      <td>${t.done?'<span class="na-due is-done">Done</span>':t.due?`<span class="na-due is-${t.dueState||''}">${esc(t.due)}</span>`:'<span class="na-muted">—</span>'}</td>
      <td class="na-act"><button type="button" class="na-btn ${t.done?'':'primary'}" data-wq-open="${esc(t.id)}">${t.done?'View':esc(t.action||'Open')}</button></td>
    </tr>`;}).join('')}</tbody></table>${open?'':'<p class="na-empty"><i data-lucide="circle-check"></i> All caught up.</p>'}`;
}
function paneView(){
  const list=allTasks().filter(t=>!t.info);
  const rank=t=>t.done?3:t.dueState==='overdue'?0:t.kind==='dup'||t.kind==='doc'?1:2;
  const forOf=t=>t.ri!=null?`RX-${String(231+t.ri).padStart(4,'0')}`:(t.title.match(/ORD-\d+/)||[''])[0];
  const rows=[...list].sort((a,b)=>rank(a)-rank(b)).filter(t=>ui.showDone||!t.done);
  const done=list.filter(t=>t.done).length;
  return `<ul class="na-cards">${rows.map(t=>{
    const [type,ic]=wqType[t.kind]||[t.title,t.icon];
    const what=t.kind==='pa'||t.kind==='doc'?t.title.replace(/ · ORD-\d+/,''):wqWhat[t.kind]||t.title;
    const items=(t.lines||[]).map(l=>`<li class="${l.done?'is-done':''}">${esc(l.text)}${l.sub?` <em>${esc(l.sub)}</em>`:''}</li>`).join('');
    return `<li class="na-card ${t.done?'is-done':''} ${t.dueState==='overdue'&&!t.done?'is-overdue':''}">
      <div class="na-card-top"><span class="wq-ico is-${t.kind}"><i data-lucide="${t.done?'check':ic}"></i></span><span class="na-card-title"><b>${esc(what)}</b><small>${esc(t.meta||(t.lines?.length?`${t.lines.length} ${t.lines.length===1?'item':'items'}`:type))}</small></span>${t.done?'<span class="na-due is-done">Done</span>':t.due?`<span class="na-due is-${t.dueState||''}">${esc(t.due)}</span>`:''}</div>
      ${items?`<ul class="na-items">${items}</ul>`:''}
      <div class="na-card-foot"><span class="na-for">${esc(forOf(t))}</span><button type="button" class="na-btn ${t.done?'':'primary'}" data-wq-open="${esc(t.id)}">${t.done?'View':esc(t.action||'Open')}</button></div>
    </li>`;}).join('')}</ul>${done?`<button type="button" class="na-show-done" data-na-done>${ui.showDone?'Hide':'Show'} ${done} done</button>`:''}${rows.some(t=>!t.done)?'':'<p class="na-empty"><i data-lucide="circle-check"></i> All caught up.</p>'}`;
}
function detailView(id){
  if(id==='intake')return detailShell('Intake details',`Completed ${esc(intake.completed||'')}`,intakeDetails(),'<a class="wq-btn" href="index.html?screen=complete">Open Full Intake</a>');
  const t=allTasks().find(x=>x.id===id);if(!t)return listView();
  let body='';
  if(t.kind==='new'){
    const rx=intake.prescriptions[t.ri],left=t.entries.filter(e=>!ordered(e)&&!pendingFor(e)),doneList=t.entries.filter(ordered);
    if(!ui.sel||ui.selFor!==t.id){ui.sel=new Set(left.map(e=>e.key));ui.selFor=t.id;}
    body=`<p class="wq-d-lead">Select the items for this order. Items you leave unselected stay here to order later.</p>
      <p class="wq-pc-link">${precheck()?`<a class="wq-link" href="precheck.html" target="_blank" rel="noopener">View pre-check <i data-lucide="external-link"></i></a>`:`<a class="wq-link" href="precheck.html" target="_blank" rel="noopener">Run pre-check <i data-lucide="external-link"></i></a>`}</p>
      <ul class="wq-checks">${left.map(e=>`<li><label><input type="checkbox" ${ui.sel.has(e.key)?'checked':''} data-wq-pick="${e.key}"><span><b>${esc(e.item.name)}</b><small>${esc(api.codesOf(e.item).join(', '))}${e.item.qty?` · Qty ${esc(e.item.qty)}`:''}${e.item.frequency?` · ${esc(e.item.frequency)}`:''}</small>${(([c,txt])=>`<em class="wq-item-status is-${c}">${esc(txt)}</em>`)(itemStatus(e,precheck()))}</span></label></li>`).join('')}</ul>
      ${doneList.length?`<p class="wq-d-small wq-ordered"><i data-lucide="circle-check"></i> Already ordered: ${doneList.map(e=>esc(e.item.name)).join(', ')}</p>`:''}
      ${dl([['Prescription',`${rx.title} · ${rx.date||''}`],['Physician',`Dr. ${rx.physician||''}`],['Diagnoses',(rx.icd||[]).map(c=>c.code).join(', ')]])}`;
  }else if(t.kind==='refill'||t.kind==='add'){
    const e=t.entries[0];
    body=`<p class="wq-d-lead">${t.kind==='refill'?`${esc(e.item.name)} is refillable on ${esc(t.order?.id||'')} and due now.`:`${esc(e.item.name)} can be added to ${esc(t.order?.id||'')}, which hasn’t shipped.`}</p>
      ${dl([['Order',t.order?`${t.order.id} · ${t.order.title}`:'—'],['Items',api.codesOf(e.item).join(', ')],['Prescription',`${intake.prescriptions[t.ri].title} · Dr. ${intake.prescriptions[t.ri].physician}`]])}`;
  }else if(t.kind==='dup'){
    const e=t.entries[0];
    const oid=t.order?.id||'the existing order';
    const choices=[
      ['keep',`Keep ${oid}`,`Same item, already ordered. Link this prescription to ${oid}; nothing new is ordered.`],
      ['update',`Update ${oid}`,`The new prescription changes something (settings, quantity, physician). Open ${oid} to edit it.`],
      ['new','Order anyway',`It’s a separate need, like a second unit or a replacement. Move it to Items to order.`]
    ];
    if(!ui.dupChoice||ui.dupFor!==t.id){ui.dupChoice='keep';ui.dupFor=t.id;}
    body=`<p class="wq-d-lead">${esc(t.why)}</p>
      <div class="wq-compare"><div><span>New prescription</span><b>${esc(e.item.name)}</b><small>${esc(api.codesOf(e.item).join(', '))}${e.item.frequency?` · ${esc(e.item.frequency)}`:''} · Dr. ${esc(intake.prescriptions[t.ri].physician||'')}</small></div>
        <div><span>On ${esc(oid)}</span><b>${esc((t.order?.items||[]).find(i=>api.codesOf(e.item).includes(i.code))?.name||t.order?.title||'')}</b><small>${esc(t.order?.statusNote||'')} · Dr. ${esc(t.order?.physician||'')}</small></div></div>
      ${t.done?'':`<fieldset class="wq-choices"><legend>How do you want to resolve it?</legend>${choices.map(([v,l,d])=>`<label class="${ui.dupChoice===v?'is-on':''}"><input type="radio" name="dupChoice" value="${v}" ${ui.dupChoice===v?'checked':''} data-wq-dup-choice><span><b>${esc(l)}</b><small>${esc(d)}</small></span></label>`).join('')}</fieldset>`}`;
  }else body=`<p class="wq-d-lead">${esc(t.why||'')}</p>${t.due?dl([['Due',t.due]]):''}`;
  // A single item ordered on its own can go back on the prescription's main order.
  const canCombine=false;
  if(t.kind==='dup'){
    const label={keep:`Keep ${t.order?.id||'Order'}`,update:`Open ${t.order?.id||'Order'}`,new:'Move to Items to Order'}[ui.dupChoice];
    return detailShell('Possible duplicate',t.entries[0].item.name,body,t.done?`<span class="wq-done-msg"><i data-lucide="circle-check"></i> ${esc(t.meta)}</span><button type="button" class="wq-btn" data-wq-dup-undo="${t.id}">Undo</button>`:`<button type="button" class="wq-btn is-primary" data-wq-dup-resolve="${t.id}">${esc(label)}</button>`);
  }
  const actions=t.done?'<span class="wq-done-msg"><i data-lucide="circle-check"></i> Done</span>':`<button type="button" class="wq-btn is-primary" data-wq-act="${esc(t.id)}" ${t.kind==='new'&&!ui.sel?.size?'disabled':''}>${esc(t.kind==='new'?`Create Order (${plural(ui.sel?.size||0,'item')})`:t.action)}</button>${t.canMark?`<button type="button" class="wq-btn" data-wq-done="${esc(t.id)}">Mark as Done</button>`:''}`+(canCombine?`<button type="button" class="wq-btn" data-wq-combine="${t.entries[0].key}">Combine With Other Items</button>`:'');
  return detailShell(t.title,t.meta,body,actions);
}
const dl=rows=>`<dl class="wq-dl">${rows.filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
function detailShell(title,meta,body,actions){
  return `<div class="wq-detail"><button type="button" class="wq-back" data-wq-back><i data-lucide="arrow-left"></i> Needs Attention</button>
    <h3 class="wq-d-title">${esc(title)}</h3><p class="wq-d-meta">${esc(meta)}</p>${body}</div><footer class="wq-d-actions">${actions}</footer>`;
}
function intakeDetails(){
  return intake.prescriptions.map(r=>`<div class="wq-block"><h4>${esc(r.title)}</h4>${dl([['Physician',`Dr. ${r.physician||''}${r.npi?` · NPI ${r.npi}`:''}`],['Diagnoses',(r.icd||[]).map(c=>`${c.code}${c.primary?' (primary)':''}`).join(', ')],['Items',r.items.map(it=>it.name).join('; ')]])}</div>`).join('')
    +`<div class="wq-block"><h4>Insurance</h4>${dl((intake.insurance||[]).map(p=>[p.rank,p.name]))}</div>`
    +`<div class="wq-block"><h4>Documents</h4><p class="wq-d-small">${esc((intake.documents||[]).join(', '))}</p></div>`;
}
function render(){
  const open=allTasks().filter(t=>!t.done&&!t.info).length,overdue=followUps.filter(t=>!t.done&&t.dueState==='overdue').length;
  $('#wqBadge').textContent=open||'';$('#wqBadge').hidden=!open;
  $('#wqPaneSub').textContent=open?`${open} open${overdue?` · ${overdue} overdue`:''}`:'All caught up';
  const box=$('#workQueue');
  box.classList.toggle('is-detail',Boolean(ui.openId));
  box.innerHTML=ui.openId?detailView(ui.openId):paneView();
  icons();
}

// ---------- Actions ----------
function openIntakeStep(step){
  const rx=intake.prescriptions[step.ri],entries=step.entries.filter(e=>!ordered(e)),picked=entries.map(e=>e.item);
  const actionId=step.kind==='new'?`${step.id}-${Date.now()}`:step.id;
  const orderId=step.kind==='new'?`ORD-${1061+createdOrders.length+Math.floor(Math.random()*5)}`:'';
  if(step.kind==='new'){entries.forEach(e=>{plan.ordered[e.key]=orderId;});plan.done.push(actionId);}
  else plan.pending[actionId]=entries.map(e=>e.key);
  api.savePlan(plan);
  // returnTo brings the user back to the Work Queue when the order or refill is done.
  api.setAction({id:actionId,route:step.kind,target:step.kind==='new'?'':step.target,rxTitle:rx.title,physician:rx.physician,icd:rx.icd,items:picked,intakeId:intake.id,orderId,returnTo:'patient-record.html?pane=workqueue'});
  if(step.kind==='new'){
    const codes=picked.flatMap(it=>api.codesOf(it));
    const order={...intake,prescriptions:[{...rx,items:picked}],priorAuths:(intake.priorAuths||[]).filter(pa=>codes.includes(pa.code)),fromAction:actionId};
    try{sessionStorage.setItem('signeticIntakeFull',JSON.stringify(intake));sessionStorage.setItem('signeticIntakeOrder',JSON.stringify(order));}catch(error){}
    // A new tab copies this tab's session, so the order screen gets the items. When it's saved there, it tells this tab.
    const tab=window.open('dme-order.html','_blank');
    if(!tab){location.href='dme-order.html';return;}
    createdOrders.unshift({id:orderId,title:`${rx.title} · ${picked.length===1?picked[0].name:`${picked.length} items`}`,items:picked.flatMap(it=>it.lines.map(l=>({code:l.code,name:l.description||it.name})))});
    try{sessionStorage.setItem(CREATED_KEY,JSON.stringify(createdOrders));}catch(error){}
    ui.openId=null;ui.sel=null;render();renderOrders();toast(`Order ${orderId} created · opened in a new tab`);return;
  }
  location.href=`existing-order.html?mode=${step.kind}&order=${step.target}`;
}
const CREATED_KEY='signeticCreatedOrders';
const createdOrders=(()=>{try{return JSON.parse(sessionStorage.getItem(CREATED_KEY))||[];}catch(error){return [];}})();
function orderCreatedElsewhere(raw){
  let ev=null;try{ev=JSON.parse(raw);}catch(error){return;}
  if(!ev||!plan.pending[ev.actionId])return;
  const keys=plan.pending[ev.actionId];
  keys.forEach(key=>{plan.ordered[key]=ev.orderId;});
  delete plan.pending[ev.actionId];if(!plan.done.includes(ev.actionId))plan.done.push(ev.actionId);api.savePlan(plan);
  createdOrders.unshift({id:ev.orderId,title:ev.title||'New order',items:ev.products||[]});
  try{sessionStorage.setItem(CREATED_KEY,JSON.stringify(createdOrders));}catch(error){}
  render();renderOrders();
  const ri=items.find(e=>e.key===keys[0])?.ri;
  const row=$(`[data-wq-open="new-${ri}"]`);if(row){row.classList.remove('wq-flash');void row.offsetWidth;row.classList.add('wq-flash');}
  toast(`${ev.orderId} created · ${plural(keys.length,'item')} ordered`);
}
addEventListener('storage',event=>{if(event.key==='signeticOrderEvent'&&event.newValue)orderCreatedElsewhere(event.newValue);});
function markDone(id,message){if(!wq.done.includes(id))wq.done.push(id);saveWq();ui.openId=null;render();if(message)toast(message);}
document.addEventListener('click',event=>{
  const tab=event.target.closest('[data-tab]');if(tab){showTab(tab.dataset.tab);return;}
  if(event.target.closest('[data-wq-toggle]')){setPane(!document.body.classList.contains('pane-open'));return;}
  const openRow=event.target.closest('[data-wq-open]');if(openRow){ui.openId=openRow.dataset.wqOpen;ui.sel=null;ui.selFor=null;ui.dupFor=null;render();$('.sp-body').scrollTop=0;return;}
  if(event.target.closest('[data-wq-back]')){ui.openId=null;render();return;}
  const resolveDup=event.target.closest('[data-wq-dup-resolve]');
  if(resolveDup){
    const t=intakeTasks().find(x=>x.id===resolveDup.dataset.wqDupResolve),e=t.entries[0],oid=t.order?.id||'the order';
    wq.resolved=wq.resolved||{};
    if(ui.dupChoice==='new'){plan.routes[e.key]={route:'new',target:'n1'};api.savePlan(plan);ui.openId=null;render();toast(`${e.item.name} moved to Items to order`);return;}
    if(ui.dupChoice==='update'){wq.resolved[t.id]=`Updating ${oid}`;saveWq();window.open(`existing-order.html?mode=add&order=${encodeURIComponent(t.order?.id||'')}`,'_blank');ui.openId=null;render();toast(`${oid} opened in a new tab`);return;}
    wq.resolved[t.id]=`Linked to ${oid}`;saveWq();ui.openId=null;render();toast(`Prescription linked to ${oid}. Nothing new ordered.`);return;
  }
  const undoDup=event.target.closest('[data-wq-dup-undo]');
  if(undoDup){delete wq.resolved[undoDup.dataset.wqDupUndo];saveWq();render();return;}
  const anyway=event.target.closest('[data-wq-order-anyway]');
  if(anyway){const e=items.find(x=>x.key===anyway.dataset.wqOrderAnyway);const used=items.filter(x=>x.ri===e.ri&&route(x).route==='new').map(x=>+String(route(x).target).slice(1)||0);plan.routes[e.key]={route:'new',target:'n1'};api.savePlan(plan);ui.openId=null;render();toast(`${e.item.name} moved to Items to order`);return;}
  const combine=event.target.closest('[data-wq-combine]');
  if(combine){const e=items.find(x=>x.key===combine.dataset.wqCombine);plan.routes[e.key]={route:'new',target:'n1'};api.savePlan(plan);ui.openId=`new-${e.ri}-n1`;render();toast(`${e.item.name} is back on the order`);return;}
  if(event.target.closest('[data-wq-show-done]')){ui.showDone=!ui.showDone;render();return;}
  const done=event.target.closest('[data-wq-done]');if(done){markDone(done.dataset.wqDone,'Marked as done');return;}
  const act=event.target.closest('[data-wq-act]');if(!act)return;
  const task=allTasks().find(t=>t.id===act.dataset.wqAct);if(!task)return;
  if(task.kind==='new'){openIntakeStep({...task,id:`new-${task.ri}-n1`,entries:task.entries.filter(e=>ui.sel?.has(e.key))});return;}
  if(['refill','add'].includes(task.kind)){openIntakeStep(task);return;}
  markDone(task.id,`${task.action}: opens in Signetic`);
});
// Unchecking an item on a new order moves it to its own order (a new task); checking puts it back.
document.addEventListener('change',event=>{
  if(event.target.matches('[data-wq-dup-choice]')){ui.dupChoice=event.target.value;render();return;}
  const box=event.target.closest('[data-wq-pick]');if(!box)return;
  if(box.checked)ui.sel.add(box.dataset.wqPick);else ui.sel.delete(box.dataset.wqPick);
  const btn=$('.wq-d-actions [data-wq-act]');if(btn){btn.disabled=!ui.sel.size;btn.textContent=`Create Order (${plural(ui.sel.size,'item')})`;}
});

// ---------- Tabs ----------
function showTab(name){
  $$('.rec-tabs [role=tab]').forEach(t=>t.setAttribute('aria-selected',String(t.dataset.tab===name)));
  const known=['general','orders','documents','intakes'];
  $$('.rec-tab-panel').forEach(p=>{p.hidden=p.dataset.panel!==(known.includes(name)?name:'other');});
  const url=new URL(location.href);if(name==='general')url.searchParams.delete('tab');else url.searchParams.set('tab',name);history.replaceState(null,'',url);
}

// ---------- General tab: the existing contact form ----------
const p=intake.patient;
const field=(label,value,{req=false,select=false,icon=''}={})=>`<div class="rec-field"><label>${label}${req?'<i class="rec-req">*</i>':''}</label><span class="rec-input ${select?'is-select':''}">${esc(value||'---')}${select?'<i data-lucide="chevron-down"></i>':icon?`<i data-lucide="${icon}"></i>`:''}</span></div>`;
$('#recName').innerHTML=`${esc(p.first)} ${esc(p.last)} <small>- Saved</small>`;
$('#recMrn').textContent=p.mrn||'PT-10482';$('#recPhone').textContent=p.phone||'---';
document.title=`${p.first} ${p.last} · Contact | Signetic`;
$('#recContact').innerHTML=[field('Contact Type','Patient',{select:true}),field('Race','Asian',{select:true}),field('First Name',p.first,{req:true}),field('Ethnicity','I’d prefer not to say',{select:true}),
  field('Middle Name',p.middle),field('Primary Language','English',{select:true}),field('Last Name',p.last,{req:true}),field('Medical Record Number',p.mrn),
  field('Date of Birth',p.dob,{icon:'calendar'}),field('Confirmation Code','PZM2SE'),field('Gender',p.gender,{select:true}),field('Marketing Notification Email','No',{select:true}),
  field('Home Phone',p.home,{icon:'phone'}),field('Marketing Notification SMS','No',{select:true}),field('Mobile Phone',p.phone,{icon:'phone'}),'<div></div>',field('Email',p.email)].join('');
$('#recAddress').innerHTML=[field('Street',p.address),field('State/Province',p.state),field('City',p.city),field('County',p.county||'King'),field('ZIP Code',p.zip)].join('');

// ---------- DME Orders tab: the existing grid ----------
const price={E0601:'$1,140.00',E0562:'$310.00',A7030:'$165.00',A7031:'$58.00',A7035:'$32.00',A7037:'$29.00',A7038:'$6.00',A7034:'$98.00',E1390:'$2,450.00',E0570:'$140.00',E0439:'$415.00'};
const purchase={owned:'Rental - capped',purchase:'Purchase - new',pending:'Rental - monthly','rental-past':'Rental - ended'};
function renderOrders(){
$('#recOrders').innerHTML=`<table class="rec-table"><thead><tr>${['HCPCS Code','Delivery Date','Qty','Billable Unit','Retail Price','Payment Preference','Purchase Type'].map(h=>`<th>${h} <i data-lucide="chevron-down"></i></th>`).join('')}</tr></thead><tbody>${[...createdOrders.map(o=>({id:o.id,title:o.title,status:'New',items:o.items.map(p=>({code:p.code,name:p.name,acquisition:'purchase',dates:''}))})),...api.existingOrders].map(order=>`<tr class="rec-group ${order.status==='New'?'is-new':''}"><td colspan="7"><a href="#">${esc(order.id)}</a> · ${esc(order.title.toUpperCase())} <span>${esc(order.status)}</span></td></tr>${order.items.map(item=>`<tr><td><span class="rec-code">${esc(item.code)}</span>${esc(item.name.toUpperCase())}</td><td>${esc((item.dates||'').match(/\d\d\/\d\d\/\d{4}/)?.[0]||item.lastFilled||'-')}</td><td>1</td><td>1.00</td><td>${price[item.code]||'$0.00'}</td><td>Insurance</td><td>${purchase[item.acquisition]||'Purchase - new'}</td></tr>`).join('')}`).join('')}</tbody></table>`;
  icons();
}
renderOrders();

// ---------- Documents tab: the existing grid, plus anything uploaded with "Upload Only" ----------
const docRows=[
  ...(()=>{try{return JSON.parse(sessionStorage.getItem('signeticRecordUploads')||'[]');}catch(error){return [];}})().map(d=>({name:d.name,type:'Not classified',status:'Active',exp:'',uploaded:d.uploadedAt,assoc:'Patient',isNew:true})),
  {name:'Prescription.pdf',type:'Prescriptions/Physician Orders',status:'Active',exp:'Oct 12, 2027',uploaded:'Oct 14, 2026',assoc:'Product Orders'},
  {name:'Oxygen Prescription.jpg',type:'Prescriptions/Physician Orders',status:'Active',exp:'Oct 13, 2027',uploaded:'Oct 14, 2026',assoc:'Product Orders'},
  {name:'Insurance Card.jpg',type:'Insurance Card',status:'Active',exp:'Mar 14, 2027',uploaded:'Oct 14, 2026',assoc:'Insurance'},
  {name:'Face-to-Face Notes.pdf',type:'Medical Record',status:'Active',exp:'',uploaded:'Oct 12, 2026',assoc:'Product Orders'},
  {name:'Referral.pdf',type:'Referral',status:'Active',exp:'',uploaded:'Oct 14, 2026',assoc:'Patient'},
  {name:'Consent Form.pdf',type:'Consent',status:'Active',exp:'',uploaded:'Oct 14, 2026',assoc:'Patient'},
  {name:'Delivery ticket ORD-1050.pdf',type:'Proof of Delivery',status:'Active',exp:'',uploaded:'Oct 13, 2026',assoc:'Delivery Tickets'},
  {name:'Oxygen CMN ORD-0755.pdf',type:'Certificate of Medical Necessity',status:'Expired',exp:'Feb 28, 2024',uploaded:'Mar 2, 2023',assoc:'Product Orders'},
  {name:'Sleep Study · Aug 2022.pdf',type:'Medical Record',status:'Active',exp:'',uploaded:'Aug 18, 2022',assoc:'Patient'}
];
function renderDocs(){
  const q=($('#docSearch')?.value||'').trim().toLowerCase();
  const rows=docRows.filter(d=>!q||d.name.toLowerCase().includes(q)||d.type.toLowerCase().includes(q));
  $('#recDocs').innerHTML=`<table class="rec-table rec-doc-table"><thead><tr>${['Document Name','Document Type','Document Status','Expiration Date','Uploaded On','Associated With'].map((h,i)=>`<th>${h}${[0,1,4].includes(i)?' <i data-lucide="chevron-down"></i>':''}</th>`).join('')}</tr></thead><tbody>${rows.map(d=>`<tr class="${d.isNew?'is-new':''}"><td><span class="rec-doc-name"><i data-lucide="eye"></i><a href="#">${esc(d.name)}</a>${d.isNew?'<span class="rec-doc-new">New</span>':''}</span></td><td><span class="rec-type ${d.type==='Not classified'?'is-none':''}"><span></span>${esc(d.type)}</span></td><td><span class="rec-status is-${d.status.toLowerCase()}"><span></span>${d.status}</span></td><td>${d.exp?esc(d.exp):'<span class="rec-noexp"><i data-lucide="ban"></i> No Expiry</span>'}</td><td>${esc(d.uploaded)}</td><td><span class="rec-assoc">${esc(d.assoc)}</span></td></tr>`).join('')||'<tr><td colspan="6" class="rec-empty">No documents match.</td></tr>'}</tbody></table>`;
  icons();
}
renderDocs();
$('#docSearch').addEventListener('input',renderDocs);

// ---------- Intakes tab: every intake for this patient ----------
// ---------- Prescriptions tab: intake summary so far, and every prescription with its own readiness check ----------
const rxSvc=rx=>{const codes=rx.items.flatMap(item=>api.codesOf(item));return codes.includes('E0601')?'CPAP therapy':codes.includes('E1390')?'Home oxygen':rx.items[0]?.name||'Prescription';};
const shortItems=rx=>{const names=rx.items.map(it=>it.name.split(/,| \d| with /)[0].trim());return names.length>3?`${names.slice(0,3).join(', ')} +${names.length-3} more`:names.join(', ');};
const rxRows=[
  ...intake.prescriptions.filter(rx=>rx.items.length).map((rx,i)=>({id:`rx-${i}`,rxId:`RX-${String(231+i).padStart(4,'0')}`,service:rxSvc(rx),items:rx.items.map(item=>({...item,lines:(item.lines||[]).map(l=>({...l}))})),doctor:rx.physician||'',npi:rx.npi||'',icd:(rx.icd||[]).map(c=>({...c})),physician:rx.physician?`Dr. ${rx.physician}`:'—',specialty:rx.specialty||'',source:rx.source||'Entered manually',date:rx.date||'—',status:'Active',readiness:'Not checked'})),
  {id:'rx-resupply',rxId:'RX-0198',service:'PAP resupply',doctor:'Sarah Kim',npi:'1629384756',icd:[{code:'G47.33',description:'Obstructive sleep apnea (adult)',primary:true}],physician:'Dr. Sarah Kim',specialty:'Sleep medicine',source:'Prescription · Mar 2026.pdf',date:'03/18/2026',status:'Active',readiness:'Ready',checked:'Nov 3, 2026',
    items:[{name:'Nasal mask',qty:1,frequency:'1 per 3 months',lines:[{code:'A7034',description:'Nasal interface (mask or cannula type) used with PAP device'}]},{name:'PAP headgear',qty:1,frequency:'1 per 6 months',lines:[{code:'A7035',description:'Headgear used with PAP device'}]}]},
  {id:'rx-neb',rxId:'RX-0112',service:'Nebulizer',doctor:'Michael Reyes',npi:'1487265930',icd:[{code:'J44.9',description:'Chronic obstructive pulmonary disease, unspecified',primary:true}],physician:'Dr. Michael Reyes',specialty:'Pulmonology',source:'Prescription · Feb 2025.pdf',date:'02/01/2025',status:'Expired',readiness:'—',
    items:[{name:'Nebulizer with compressor',qty:1,frequency:'As needed',lines:[{code:'E0570',description:'Nebulizer, with compressor'}]}]}
];
const rxOpen=new Set();let rxEditing=null;
// The patient's one intake. While it's open (not complete), its prescriptions wait for review and it can be resumed from here.
const intakeProgress=(()=>{try{return JSON.parse(localStorage.getItem('signeticIntakeProgress'));}catch(error){return null;}})();
const intakeOpen=params.get('intake')==='open'||Boolean(intakeProgress&&intakeProgress.state&&(intakeProgress.state.phase!=='upload'||(intakeProgress.documents||[]).length)&&!intakeProgress.state.everCompleted&&!intakeProgress.state.completed);
if(intakeOpen)rxRows.filter(r=>r.id.startsWith('rx-')&&/^rx-\d/.test(r.id)).forEach(r=>{r.status='Pending review';r.readiness='—';});
function renderIntakeBanner(){
  const box=$('#recIntakeBanner');if(!box)return;
  box.hidden=!intakeOpen;if(!intakeOpen)return;
  const ps=intakeProgress?.state||{},docs=(intakeProgress?.documents||[]).length||(intake.documents||[]).length;
  const step=ps.phase==='review'?'In review':ps.phase==='extraction'?'Confirming patient and documents':'Documents uploaded';
  box.innerHTML=`<i data-lucide="file-clock"></i><span class="rib-copy"><b>Intake in progress</b><small>${esc(step)} · ${plural(docs,'document')}. This is ${esc(p.first)}’s intake; new documents are added to it. Finish it to check readiness for its prescriptions.</small></span><a class="rib-btn" href="index.html"><i data-lucide="arrow-right"></i> Resume Intake</a>`;
}
const rxCodes=r=>[...new Set(r.items.flatMap(item=>api.codesOf(item)))];
function renderPrescriptionsTab(){
  const pending=rxRows.filter(r=>r.status==='Pending review');
  const active=rxRows.filter(r=>r.status==='Active'),expired=rxRows.filter(r=>r.status==='Expired');
  const ins=(intake.insurance||[]).filter(plan=>plan.status==='Active').map(plan=>`${plan.name} (${plan.rank.toLowerCase()})`);
  const unchecked=active.filter(r=>r.readiness==='Not checked');
  $('#ihSummary').innerHTML=`<div class="ih-ai"><i data-lucide="sparkles"></i><div><b>Intake summary so far</b><p>${esc(p.first)} has ${plural(active.length,'active prescription')}${active.length?` (${active.map(r=>esc(r.rxId)).join(', ')})`:''}.${ins.length?` Insurance on file: ${ins.map(esc).join(', ')}.`:''} ${intakeOpen?` The intake is still in progress; ${plural(pending.length,'prescription')} from it ${pending.length===1?'is':'are'} waiting for review.`:` The intake was completed ${esc(intake.completed||'')} from ${plural((intake.documents||[]).length,'document')}.`}${unchecked.length?` ${unchecked.map(r=>esc(r.rxId)).join(' and ')} ${unchecked.length===1?'hasn’t':'haven’t'} been checked for readiness yet.`:''}</p></div></div>`;
  const ready=r=>r.status==='Pending review'?'<span class="ih-muted">After intake</span>':r.readiness==='Ready'?`<span class="rec-intake-status is-completed">Ready</span><small class="ih-when">${esc(r.checked||'')}</small>`:r.readiness==='Not checked'?'<span class="ih-muted">Not checked</span>':'<span class="ih-muted">—</span>';
  const itemsHtml=r=>{
    const ed=rxEditing===r.id,inp=(k,v,ph='')=>`<input class="rx-in" data-rx-field="${k}" value="${esc(v||'')}" placeholder="${esc(ph)}">`;
    const doc=ed?`<div class="rx-kv"><label><span>Physician</span>${inp('doctor',r.doctor,'First and last name')}</label><label><span>NPI</span>${inp('npi',r.npi,'10 digits')}</label><label><span>Specialty</span>${inp('specialty',r.specialty)}</label><label><span>Prescription date</span>${inp('date',r.date,'MM/DD/YYYY')}</label></div>`
      :`<div class="rx-kv"><div><span>Physician</span><b>${esc(r.physician)}</b></div><div><span>NPI</span><b>${esc(r.npi||'—')}</b></div><div><span>Specialty</span><b>${esc(r.specialty||'—')}</b></div><div><span>Prescription date</span><b>${esc(r.date)}</b></div><div><span>Source</span><b>${esc(r.source)}</b></div></div>`;
    const icd=ed?inp('icd',(r.icd||[]).map(c=>c.code).join(', '),'Codes, separated by commas')
      :`<div class="rx-icd">${(r.icd||[]).map(c=>`<span class="rx-code"><b>${esc(c.code)}</b>${esc(c.description||'')}${c.primary?' <em>Primary</em>':''}</span>`).join('')||'<span class="ih-muted">None</span>'}</div>`;
    const items=`<ul class="rx-item-list">${r.items.map((item,ii)=>`<li><div class="rx-item-name"><b>${esc(item.name)}</b>${ed?`<span class="rx-item-edit"><label>Qty ${`<input class="rx-in rx-in-sm" data-rx-item="${ii}" data-rx-k="qty" value="${esc(item.qty||'')}">`}</label><label>Frequency <input class="rx-in" data-rx-item="${ii}" data-rx-k="frequency" value="${esc(item.frequency||'')}"></label></span>`:[item.qty?`Qty ${esc(item.qty)}`:'',item.frequency?esc(item.frequency):''].filter(Boolean).map(t=>`<small>${t}</small>`).join('')}</div><div class="rx-item-codes">${(item.lines||[]).map(l=>`<span class="rx-code" title="${esc(l.description||'')}"><b>${esc(l.code)}</b>${esc(l.description||'')}</span>`).join('')}</div></li>`).join('')}</ul>`;
    const bar=r.status==='Expired'?'':ed?`<div class="rx-edit-bar"><button type="button" class="rx-btn" data-rx-cancel>Cancel</button><button type="button" class="rx-btn primary" data-rx-save="${r.id}">Save</button></div>`:`<div class="rx-edit-bar"><button type="button" class="rx-btn" data-rx-edit="${r.id}"><i data-lucide="pencil"></i> Edit</button></div>`;
    return `<tr class="rx-items-row"><td></td><td colspan="7"><div class="rx-detail">${bar}<section><h4>Ordering physician</h4>${doc}</section><section><h4>Diagnosis (ICD-10)</h4>${icd}</section><section><h4>Items prescribed</h4>${items}</section></div></td></tr>`;
  };
  const row=r=>{const open=rxOpen.has(r.id),codes=rxCodes(r);return `<tr class="${r.status!=='Active'?'is-expired':''} ${open?'is-open':''}">
    <td class="rx-toggle-cell"><button type="button" class="rx-toggle" data-rx-toggle="${r.id}" aria-expanded="${open}" aria-label="${open?'Hide':'Show'} items in ${esc(r.rxId)}"><i data-lucide="chevron-right"></i></button></td>
    <td><span class="rx-id-line"><b>${esc(r.rxId)}</b><button type="button" class="rx-eye" data-rx-preview="${r.id}" aria-label="View ${esc(r.rxId)}" title="View prescription"><i data-lucide="eye"></i></button></span><small class="ih-codes">${esc(r.source)}</small></td>
    <td>${esc(r.physician)}${r.specialty?`<small class="ih-codes">${esc(r.specialty)}</small>`:''}</td>
    <td>${esc(r.date)}</td>
    <td><button type="button" class="rx-count" data-rx-toggle="${r.id}">${plural(r.items.length,'item')}</button><small class="ih-codes">${codes.slice(0,3).map(esc).join(' · ')}${codes.length>3?' …':''}</small></td>
    <td><span class="rec-intake-status is-${r.status==='Active'?'completed':r.status==='Pending review'?'pending':'draft'}">${esc(r.status)}</span></td>
    <td>${ready(r)}</td>
    <td class="rec-row-action">${r.status==='Active'?`${r.readiness==='Not checked'?`<button type="button" class="rec-link ih-check" data-rx-check="${r.id}"><i data-lucide="shield-check"></i> Check Readiness</button>`:`<button type="button" class="rec-link ih-check" data-rx-check="${r.id}" data-rx-view title="Open the last readiness result. Re-check from there."><i data-lucide="eye"></i> View Readiness</button>`}`:''}</td>
  </tr>${open?itemsHtml(r):''}`;};
  $('#recIntakes').innerHTML=`<table class="rec-table rec-intake-table rx-table"><thead><tr>${['','Prescription','Ordering physician','Date','Items','Status','Readiness',''].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${[...pending,...active,...expired].map(row).join('')}</tbody></table>`;
  icons();
}
document.addEventListener('click',event=>{
  const ed=event.target.closest('[data-rx-edit]');if(ed){rxEditing=ed.dataset.rxEdit;rxOpen.add(rxEditing);renderPrescriptionsTab();return;}
  if(event.target.closest('[data-rx-cancel]')){rxEditing=null;renderPrescriptionsTab();return;}
  const sv=event.target.closest('[data-rx-save]');
  if(sv){const r=rxRows.find(row=>row.id===sv.dataset.rxSave),box=sv.closest('.rx-detail'),val=k=>box.querySelector(`[data-rx-field="${k}"]`)?.value.trim()||'';
    r.doctor=val('doctor');r.physician=r.doctor?`Dr. ${r.doctor.replace(/^Dr\.?\s*/i,'')}`:'—';r.npi=val('npi');r.specialty=val('specialty');r.date=val('date')||r.date;
    const codes=val('icd').split(/[,\s]+/).filter(Boolean).map(c=>c.toUpperCase());r.icd=codes.map((code,ci)=>({code,description:(r.icd||[]).find(c=>c.code===code)?.description||'',primary:ci===0}));
    box.querySelectorAll('[data-rx-item]').forEach(el=>{r.items[+el.dataset.rxItem][el.dataset.rxK]=el.value.trim();});
    const wasChecked=r.readiness==='Ready';if(wasChecked){r.readiness='Not checked';r.checked='';}
    rxEditing=null;renderPrescriptionsTab();toast(`${r.rxId} updated${wasChecked?'. Check readiness again.':''}`);return;}
  const t=event.target.closest('[data-rx-toggle]');
  if(t){const id=t.dataset.rxToggle;rxOpen[rxOpen.has(id)?'delete':'add'](id);renderPrescriptionsTab();return;}
  const pv=event.target.closest('[data-rx-preview]');
  if(pv){const r=rxRows.find(row=>row.id===pv.dataset.rxPreview);$('#rxPreviewTitle').textContent=r.rxId;$('#rxPreviewMeta').textContent=`${r.source} · ${r.physician} · ${r.date}`;$('#rxPreviewImg').src='assets/prescription.svg';$('#rxPreviewImg').alt=`Preview of ${r.source}`;$('#rxPreview').showModal();icons();return;}
  if(event.target.closest('[data-rx-preview-close]')||event.target===$('#rxPreview')){$('#rxPreview').close();return;}
  const b=event.target.closest('[data-rx-check]');if(!b)return;
  const r=rxRows.find(row=>row.id===b.dataset.rxCheck);
  try{sessionStorage.setItem('signeticReadinessServices',JSON.stringify([{id:r.rxId,codes:rxCodes(r),from:r.source}]));}catch(error){}
  location.href=b.hasAttribute('data-rx-view')?'precheck.html?view=result':'precheck.html';
});
renderPrescriptionsTab();renderIntakeBanner();

// Shell
const setNavCollapsed=collapsed=>{document.body.classList.toggle('nav-collapsed',collapsed);const toggle=$('#navToggle');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');toggle.title=toggle.getAttribute('aria-label');};
setNavCollapsed(true);
$('#navToggle').addEventListener('click',()=>setNavCollapsed(!document.body.classList.contains('nav-collapsed')));
$$('[data-nav-section]').forEach(section=>section.addEventListener('click',()=>{const open=section.parentElement.classList.toggle('open');section.setAttribute('aria-expanded',String(open));}));
$$('.shell-nav a[href="#"]').forEach(link=>link.addEventListener('click',event=>event.preventDefault()));

render();
// Side pane: opens over the right edge and pushes the form, like Xrm.App.sidePanes. Remembered for the session.
function setPane(open){
  document.body.classList.toggle('pane-open',open);
  $('#wqPane').hidden=!open;$('.sp-rail-btn').setAttribute('aria-expanded',String(open));$('.sp-rail-btn').classList.toggle('is-active',open);
  try{sessionStorage.setItem('signeticWqPane',open?'1':'0');}catch(error){}
  const url=new URL(location.href);if(open)url.searchParams.set('pane','workqueue');else url.searchParams.delete('pane');url.searchParams.delete('tab');history.replaceState(null,'',url);
}
// Opened from the intake's "Work Queue" action (?pane=workqueue): the form opens on General with the Work Queue pane open.
showTab(['orders','documents','intakes'].includes(params.get('tab'))?params.get('tab'):'general');
if(params.get('uploaded'))setTimeout(()=>toast(`${plural(+params.get('uploaded'),'document')} uploaded to ${intake.patient.first}’s record`),150);
const remembered=(()=>{try{return sessionStorage.getItem('signeticWqPane')==='1';}catch(error){return false;}})();
setPane(params.get('pane')==='workqueue'||params.get('tab')==='workqueue'||params.get('tab')==='attention'||remembered);
if(params.get('from')==='intake')setTimeout(()=>toast(params.get('tab')==='intakes'?'Intake complete. Check readiness for any prescription.':'Intake complete. Here’s what to follow up on.'),150);

document.addEventListener('click',event=>{if(event.target.closest('[data-na-done]')){ui.showDone=!ui.showDone;render();}});
