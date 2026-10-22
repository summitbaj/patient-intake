// Prepare orders: after the pre-check, choose how each prescribed item is ordered, then finish each action in Signetic.
// The routing unit is a prescribed item (single product or whole bundle). Bundles are never split across orders.
// Two states: the plan (choose a route per item) and Order actions (one row per order to create or change).
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const icons=()=>{if(window.lucide)window.lucide.createIcons();};
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600);}
const esc=value=>String(value??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;

const api=window.signeticOrders;
const intake=api.getIntake();
const params=new URLSearchParams(location.search);
let precheckStatus=null;try{precheckStatus=JSON.parse(sessionStorage.getItem('signeticPrecheckStatus'));}catch(error){}

const ROUTES=[
  {id:'new',label:'New order',icon:'file-plus'},
  {id:'refill',label:'Refill',icon:'refresh-cw'},
  {id:'add',label:'Add to order',icon:'list-plus'},
  {id:'hold',label:'Hold',icon:'pause'}
];
const routeLabel=id=>ROUTES.find(r=>r.id===id).label;

// ---------- Model: one entry per prescribed item ----------
const items=intake.prescriptions.flatMap((rx,ri)=>rx.items.map((item,ii)=>({key:`${ri}-${ii}`,ri,rx,item,options:api.routeOptions(item),suggested:api.suggestRoute(item)})));
let plan=api.getPlan();
items.forEach(entry=>{if(!plan.routes[entry.key])plan.routes[entry.key]={route:entry.suggested.route,target:entry.suggested.target};});
api.savePlan(plan);

const choice=entry=>plan.routes[entry.key];
const needsTarget=entry=>{const c=choice(entry);return (c.route==='refill'||c.route==='add')&&!c.target;};
function itemStatus(entry){
  if(!precheckStatus)return null;
  const s=api.codesOf(entry.item).map(code=>precheckStatus[code]||'pass');
  return s.includes('fail')?'fail':s.includes('warn')?'warn':'pass';
}
const statusPill={pass:['success','circle-check','Qualified'],warn:['warning','triangle-alert','Needs attention'],fail:['danger','circle-x','Not qualified']};

// Order actions grouped by destination: one new order per prescription, one refill per order, one change per order.
function buildActions(){
  const actions=[];
  items.forEach(entry=>{
    const {route,target}=choice(entry);if(route==='hold')return;
    const id=route==='new'?`new-${entry.ri}`:`${route}-${target}`;
    let action=actions.find(a=>a.id===id);
    if(!action){action={id,route,target,ri:entry.ri,rx:entry.rx,entries:[]};actions.push(action);}
    action.entries.push(entry);
  });
  const order={new:0,refill:1,add:2};
  return actions.sort((a,b)=>order[a.route]-order[b.route]||a.ri-b.ri);
}

// ---------- Plan ----------
function targetList(entry){
  const c=choice(entry),o=entry.options;
  if(c.route==='refill'){
    const orders=o.refill;
    return `<fieldset class="po-targets"><legend>${orders.length>1?'Choose the order to refill':'Refill from'}</legend>${orders.map(order=>{
      const lines=api.codesOf(entry.item).map(code=>order.items.find(i=>i.code===code));
      return `<label class="po-target ${c.target===order.id?'on':''}"><input type="radio" name="t-${entry.key}" value="${order.id}" data-target="${entry.key}" ${c.target===order.id?'checked':''}><span><b>${order.id} · ${esc(order.title)}</b><small>${esc(order.status)} · ${esc(order.statusNote)}</small><small>${lines.map(i=>`${i.code} last filled ${i.lastFilled} · ${i.limit}`).join(' · ')}</small></span></label>`;
    }).join('')}</fieldset>`;
  }
  if(c.route==='add'){
    const orders=[...o.addSuggested,...o.add.filter(order=>!o.addSuggested.includes(order))];
    return `<fieldset class="po-targets"><legend>Add to an open order</legend>${orders.map(order=>`<label class="po-target ${c.target===order.id?'on':''}"><input type="radio" name="t-${entry.key}" value="${order.id}" data-target="${entry.key}" ${c.target===order.id?'checked':''}><span><b>${order.id} · ${esc(order.title)}</b><small>${esc(order.status)} · ${esc(order.statusNote)}</small><small>On the order: ${order.items.map(i=>i.code).join(', ')}</small></span></label>`).join('')}</fieldset>`;
  }
  if(c.route==='new')return `<p class="po-dest"><i data-lucide="file-plus"></i> Goes on the new order for ${esc(entry.rx.title)}${entry.item.bundle?' with the whole bundle':''}.</p>`;
  return `<p class="po-dest"><i data-lucide="pause"></i> Not ordered now. It stays on the intake so you can order it later.</p>`;
}
function warnings(entry){
  const c=choice(entry),order=c.target&&api.orderById(c.target);
  if(!order||!entry.rx.physician||order.physician===entry.rx.physician)return '';
  return `<p class="po-warn"><i data-lucide="triangle-alert"></i> Prescribed by Dr. ${esc(entry.rx.physician)}; ${order.id} is under Dr. ${esc(order.physician)}.</p>`;
}
function evidence(entry){
  const rows=api.codesOf(entry.item).map(code=>{
    const m=api.lineMatches(code),line=entry.item.lines.find(l=>l.code===code);
    const text=m.length?m.map(({order,item})=>item.refillable?`${order.id} · refillable · ${item.due?'due now':`due ${item.nextEligible}`}`:`${order.id} · ${esc(item.note||'not refillable')}`).join(' · '):'No match on existing orders';
    return `<li><b>${code}</b><span>${esc(line?.description||'')}</span><small>${text}</small></li>`;
  }).join('');
  const matched=api.codesOf(entry.item).some(code=>api.lineMatches(code).length);
  if(!matched)return '';
  return `<details class="po-evidence"><summary>Existing order matches</summary><ul>${rows}</ul></details>`;
}
function itemRow(entry){
  const c=choice(entry),o=entry.options,s=itemStatus(entry),codes=api.codesOf(entry.item);
  const blocked={refill:o.refill.length?'':o.refillBlocked,add:o.add.length?'':o.addBlocked};
  const changed=c.route!==entry.suggested.route;
  const seg=ROUTES.map(r=>{const why=blocked[r.id];return `<button type="button" role="radio" aria-checked="${c.route===r.id}" data-route="${r.id}" data-key="${entry.key}" ${why?`disabled title="${esc(why)}"`:''}>${r.id===entry.suggested.route?'<i data-lucide="sparkles" class="po-sug" aria-label="Suggested"></i>':''}${r.label}</button>`;}).join('');
  // Explain why Refill is off when some of the item's codes are refillable (e.g. a bundle with one item not due).
  const partlyRefillable=codes.some(code=>api.lineMatches(code).some(m=>m.item.refillable));
  const note=!o.refill.length&&partlyRefillable?`<p class="po-why-not"><i data-lucide="info"></i> Refill unavailable. ${esc(o.refillBlocked)}.</p>`:'';
  return `<article class="po-item ${needsTarget(entry)?'needs':''}" id="item-${entry.key}">
    <div class="po-item-head">
      <div class="po-item-name"><b>${esc(entry.item.name)}</b><span class="pill ai-kind">${entry.item.bundle?`Bundle · ${codes.length}`:'Single'}</span></div>
      <div class="po-codes">${codes.map(code=>`<code>${code}</code>`).join('')}</div>
      ${s?`<span class="section-status ${statusPill[s][0]}"><i data-lucide="${statusPill[s][1]}"></i> ${statusPill[s][2]}</span>`:'<span class="section-status po-unchecked"><i data-lucide="shield-question"></i> Not pre-checked</span>'}
    </div>
    <div class="po-seg" role="radiogroup" aria-label="How to order ${esc(entry.item.name)}">${seg}</div>
    <p class="po-why"><i data-lucide="sparkles"></i><span><b>Suggested: ${routeLabel(entry.suggested.route)}.</b> ${esc(entry.suggested.why)}${changed?` <em>You changed this to ${routeLabel(c.route)}.</em>`:''}</span></p>
    ${note}${targetList(entry)}${warnings(entry)}${evidence(entry)}
  </article>`;
}
function renderPlan(){
  $('#poStage').textContent='Prepare orders';
  $('#poLead').textContent='Choose how each prescribed item is ordered. A bundle is ordered as a whole. Nothing is created until you confirm.';
  $('#poBody').innerHTML=intake.prescriptions.map((rx,ri)=>{
    const list=items.filter(e=>e.ri===ri),open=list.filter(needsTarget).length;
    return `<section class="review-card po-rx"><div class="card-header"><div><span class="section-icon"><i data-lucide="file-text"></i></span><div><h3>${esc(rx.title)}</h3><p>${rx.physician?`Dr. ${esc(rx.physician)}`:'Ordering physician not added'} · ${plural(list.length,'item')}</p></div></div>${open?`<span class="section-status warning"><i data-lucide="triangle-alert"></i> ${open} needs a choice</span>`:`<span class="section-status success"><i data-lucide="circle-check"></i> Ready</span>`}</div><div class="po-items">${list.map(itemRow).join('')}</div></section>`;
  }).join('');
  const missing=items.filter(needsTarget),actions=buildActions(),held=items.filter(e=>choice(e).route==='hold').length;
  $('#poStatus').className=`pk-footer-status ${missing.length?'todo':'done'}`;
  $('#poStatus').innerHTML=missing.length
    ?`<span class="pk-status-icon"><i data-lucide="list-checks"></i></span><span><b>Choose an order for ${plural(missing.length,'item')}</b><span class="v2-next">${esc(missing[0].item.name)}</span></span>`
    :`<span class="pk-status-icon"><i data-lucide="check"></i></span><span><b>${plural(items.length,'item')} · ${plural(actions.length,'action')}</b><span class="v2-next">${held?`${held} on hold · `:''}Confirm to open each action</span></span>`;
  $('#poActions').innerHTML=`<button class="footer-btn primary" id="poConfirm" ${missing.length?'disabled':''}>Confirm <i data-lucide="arrow-right"></i></button>`;
  icons();
}

// ---------- Order actions ----------
function actionCopy(a){
  if(a.route==='new')return {title:'Create new order',sub:`${a.rx.title} · ${a.rx.physician?`Dr. ${a.rx.physician}`:'No physician'}`,button:'Open order',icon:'file-plus',where:'Opens the DME order wizard with the intake filled in.'};
  const order=api.orderById(a.target);
  if(a.route==='refill')return {title:`Refill on ${a.target}`,sub:`${order.title} · ${order.status}`,button:'Open refill',icon:'refresh-cw',where:'Opens the order’s refillable items with these items selected.'};
  return {title:`Add to ${a.target}`,sub:`${order.title} · ${order.statusNote}`,button:'Open order',icon:'list-plus',where:'Opens the order with these items ready to add.'};
}
function renderActions(){
  const actions=buildActions(),held=items.filter(e=>choice(e).route==='hold'),done=actions.filter(a=>plan.done.includes(a.id)).length;
  $('#poStage').textContent='Order actions';
  $('#poLead').textContent='Open each action to finish it in Signetic. Patient, insurance, prescription and pre-check details are carried over.';
  $('#poBody').innerHTML=`<section class="review-card po-actions-card"><div class="card-header"><div><span class="section-icon"><i data-lucide="list-checks"></i></span><div><h3>${plural(actions.length,'action')}</h3><p>${done} of ${actions.length} done</p></div></div><button class="text-btn" data-edit-plan><i data-lucide="pencil"></i> Edit plan</button></div>
    <ol class="po-action-list">${actions.map(a=>{const c=actionCopy(a),isDone=plan.done.includes(a.id);return `<li class="po-action ${isDone?'done':''}">
      <span class="po-action-icon"><i data-lucide="${isDone?'check':c.icon}"></i></span>
      <div class="po-action-copy"><b>${c.title}</b><small>${esc(c.sub)}</small><ul>${a.entries.map(e=>`<li>${esc(e.item.name)} <span>${api.codesOf(e.item).join(', ')}</span></li>`).join('')}</ul><small class="po-where">${c.where}</small></div>
      ${isDone?'<span class="section-status success"><i data-lucide="circle-check"></i> Done</span>':`<button class="footer-btn primary" data-open-action="${a.id}">${c.button} <i data-lucide="external-link"></i></button>`}
    </li>`;}).join('')}</ol></section>
    ${held.length?`<section class="review-card po-held"><div class="card-header"><div><span class="section-icon"><i data-lucide="pause"></i></span><div><h3>Not ordered now</h3><p>${plural(held.length,'item')} on hold</p></div></div></div><ul class="po-held-list">${held.map(e=>`<li><b>${esc(e.item.name)}</b> <span>${api.codesOf(e.item).join(', ')}</span><small>${esc(e.suggested.route==='hold'?e.suggested.why:'Held by you.')}</small></li>`).join('')}</ul></section>`:''}`;
  const all=done===actions.length;
  $('#poStatus').className=`pk-footer-status ${all?'done':'todo'}`;
  $('#poStatus').innerHTML=`<span class="pk-status-icon"><i data-lucide="${all?'check':'list-checks'}"></i></span><span><b>${done} of ${plural(actions.length,'action')} done</b><span class="v2-next">${all?'All orders are prepared':'Open the next action to continue'}</span></span>`;
  $('#poActions').innerHTML=`<button class="footer-btn" data-edit-plan><i data-lucide="arrow-left"></i> Edit plan</button><a class="footer-btn primary ${all?'':'is-disabled'}" href="index.html" id="poFinish" ${all?'':'aria-disabled="true"'}>Back to intake</a>`;
  icons();
}

// Each action opens the existing Signetic screen with only its own items.
function openAction(id){
  const a=buildActions().find(x=>x.id===id);if(!a)return;
  const pick={...a.rx,items:a.entries.map(e=>e.item)};
  const codes=pick.items.flatMap(it=>api.codesOf(it));
  api.setAction({id:a.id,route:a.route,target:a.target,rxTitle:a.rx.title,physician:a.rx.physician,icd:a.rx.icd,items:pick.items,intakeId:intake.id});
  if(a.route==='new'){
    const order={...intake,prescriptions:[pick],priorAuths:(intake.priorAuths||[]).filter(pa=>codes.includes(pa.code)),fromAction:a.id};
    try{sessionStorage.setItem('signeticIntakeFull',JSON.stringify(intake));sessionStorage.setItem('signeticIntakeOrder',JSON.stringify(order));}catch(error){}
    location.href='dme-order.html';return;
  }
  location.href=`existing-order.html?mode=${a.route}&order=${a.target}`;
}

// Without a pre-check (Create order without pre-check), back goes to the intake.
if(!precheckStatus){$('#poBack').href='index.html';$('#poBack').innerHTML='<i data-lucide="arrow-left"></i> Back to intake';}
function render(){
  $('#poTitle').innerHTML=`<span class="title-muted">${plan.confirmed?'Order actions for':'Prepare orders for'}</span> <span class="title-name">${esc(intake.patient.first)} ${esc(intake.patient.last)}</span>`;
  $('#poPatient').textContent=`From intake #${intake.id} · ${plural(intake.prescriptions.length,'prescription')} · ${plural(items.length,'item')}${precheckStatus?'':' · pre-check not run'}`;
  plan.confirmed?renderActions():renderPlan();
}

document.addEventListener('click',event=>{
  const route=event.target.closest('[data-route]');
  if(route&&!route.disabled){
    const entry=items.find(e=>e.key===route.dataset.key),r=route.dataset.route;
    const suggestedTarget=entry.suggested.route===r?entry.suggested.target:'';
    const only=r==='refill'&&entry.options.refill.length===1?entry.options.refill[0].id:r==='add'&&entry.options.addSuggested.length===1?entry.options.addSuggested[0].id:'';
    plan.routes[entry.key]={route:r,target:suggestedTarget||(r==='refill'?'':only)};
    api.savePlan(plan);render();return;
  }
  if(event.target.closest('#poConfirm')){plan.confirmed=true;api.savePlan(plan);render();$('#poScroll').scrollTop=0;return;}
  if(event.target.closest('[data-edit-plan]')){plan.confirmed=false;api.savePlan(plan);render();return;}
  const open=event.target.closest('[data-open-action]');if(open){openAction(open.dataset.openAction);return;}
  if(event.target.closest('#poFinish.is-disabled')){event.preventDefault();toast('Finish each action first');}
});
document.addEventListener('change',event=>{
  const key=event.target.dataset.target;if(!key)return;
  plan.routes[key]={...plan.routes[key],target:event.target.value};api.savePlan(plan);render();
});

// Prototype navigator deep link: ?screen=actions shows Order actions with every choice filled in.
if(params.get('screen')==='plan'&&plan.confirmed){plan.confirmed=false;api.savePlan(plan);}
else if(params.get('screen')==='actions'&&!plan.confirmed){
  items.forEach(entry=>{const c=choice(entry);if(needsTarget(entry))c.target=(c.route==='refill'?entry.options.refill:entry.options.add)[0]?.id||'';});
  plan.confirmed=true;api.savePlan(plan);
}
const returned=params.get('done');
if(returned){api.markActionDone(returned);plan=api.getPlan();setTimeout(()=>toast('Action done'),100);}

// Shell
const setNavCollapsed=collapsed=>{document.body.classList.toggle('nav-collapsed',collapsed);const toggle=$('#navToggle');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');toggle.title=toggle.getAttribute('aria-label');};
setNavCollapsed(true);
$('#navToggle').addEventListener('click',()=>setNavCollapsed(!document.body.classList.contains('nav-collapsed')));
$$('[data-nav-section]').forEach(section=>section.addEventListener('click',()=>{const open=section.parentElement.classList.toggle('open');section.setAttribute('aria-expanded',String(open));}));
$$('.shell-nav a[href="#"]').forEach(link=>link.addEventListener('click',event=>event.preventDefault()));

render();
