// Fulfillment: turn the reviewed intake into orders, refills and appointments.
// Kept simple for non-technical users: one card per thing that will happen, plain words, one button per card,
// and only the next card's button is highlighted. Three main cases:
//   1. New order: every new item on a prescription goes on one order (2+ items = one order).
//   2. Refill: items already on an existing order and due now.
//   3. Already ordered: items already on an order that hasn't shipped. Nothing to do; they aren't ordered again.
// Items are placed by matching HCPCS codes against the patient's Signetic orders. "Move" (hidden until clicked) handles exceptions.
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

// ---------- Model ----------
const items=intake.prescriptions.flatMap((rx,ri)=>rx.items.map((item,ii)=>({key:`${ri}-${item.id||ii}`,ri,rx,item,options:api.routeOptions(item),suggested:api.suggestRoute(item)})));
let plan=api.getPlan();
plan.routes=plan.routes||{};plan.done=plan.done||[];plan.ordered=plan.ordered||{};plan.pending=plan.pending||{};plan.appts=plan.appts||{};
items.forEach(entry=>{
  const r=plan.routes[entry.key]||{route:entry.suggested.route,target:entry.suggested.target};
  if(r.route==='new'&&!/^n\d+$/.test(r.target||''))r.target='n1';   // every new item starts on the same new order
  plan.routes[entry.key]=r;
});
api.savePlan(plan);
let moving='';   // the item whose Move choices are open

// A finished action comes back with ?done=<action id>: its items are now ordered.
const returned=params.get('done');
if(returned){
  (plan.pending[returned]||[]).forEach(key=>{plan.ordered[key]=returned;});
  if(!plan.done.includes(returned))plan.done.push(returned);
  delete plan.pending[returned];api.savePlan(plan);
  history.replaceState(null,'','prepare-orders.html');
  setTimeout(()=>toast(returned.startsWith('new')?'Order created':returned.startsWith('refill')?'Refill done':'Order updated'),100);
}

const choice=entry=>plan.routes[entry.key];
const ordered=entry=>Boolean(plan.ordered[entry.key]);
function itemStatus(entry){
  if(!precheckStatus)return null;
  const codes=api.codesOf(entry.item);
  if(!codes.length||codes.some(code=>!precheckStatus[code]))return 'unchecked';
  const s=codes.map(code=>precheckStatus[code]);
  return s.includes('fail')?'fail':s.includes('warn')?'warn':'pass';
}
const statusPill={warn:['warning','triangle-alert','Pre-check: needs attention'],fail:['danger','circle-x','Pre-check: not qualified'],unchecked:['neutral','shield-question','Not pre-checked']};

// ---------- Cards ----------
// For one prescription, in this order: new orders, refills, adds, already ordered, not ordering now.
function cardsFor(ri){
  const list=items.filter(e=>e.ri===ri),cards=[];
  const push=(kind,target,entries)=>{if(entries.length)cards.push({id:kind==='new'?`new-${ri}-${target}`:`${kind}-${ri}-${target||entries[0].key}`,ri,kind,target,entries});};
  const news=list.filter(e=>choice(e).route==='new');
  [...new Set(news.map(e=>choice(e).target))].sort().forEach(n=>push('new',n,news.filter(e=>choice(e).target===n)));
  ['refill','add'].forEach(kind=>{
    const entries=list.filter(e=>choice(e).route===kind);
    [...new Set(entries.map(e=>choice(e).target))].forEach(target=>{
      if(target)push(kind,target,entries.filter(e=>choice(e).target===target));
      else entries.filter(e=>!choice(e).target).forEach(e=>push(kind,'',[e]));
    });
  });
  push('hold','',list.filter(e=>choice(e).route==='hold'));
  push('skip','',list.filter(e=>choice(e).route==='skip'));
  const newCards=cards.filter(c=>c.kind==='new');
  newCards.forEach((c,i)=>{c.label=newCards.length>1?`New order ${i+1}`:'New order';});
  cards.forEach(c=>{c.actionable=['new','refill','add'].includes(c.kind);c.done=c.actionable&&c.entries.every(ordered);});
  return cards;
}
// Cards across all prescriptions, in one list: things to do first (new orders, refills, adds), then info cards.
const kindOrder={new:0,refill:1,add:2,hold:3,skip:4};
const allCards=()=>intake.prescriptions.flatMap((rx,ri)=>cardsFor(ri)).sort((a,b)=>kindOrder[a.kind]-kindOrder[b.kind]||a.ri-b.ri);
// A small label that says which prescription an item or card came from (instead of grouping by prescription).
const rxTag=ri=>{const rx=intake.prescriptions[ri];const last=(rx.physician||'').split(' ').pop();return `<span class="ful-rx-tag" title="${esc(rx.title)}${rx.physician?` · Dr. ${esc(rx.physician)}`:''}">Rx ${ri+1}${last?` · Dr. ${esc(last)}`:''}</span>`;};
// What happens to one item, in plain words, including any link to an existing order.
function itemFate(entry){
  const c=choice(entry),order=c.target&&c.route!=='new'?api.orderById(c.target):null;
  if(ordered(entry))return {cls:'done',icon:'circle-check',label:c.route==='refill'?`Refilled · ${c.target}`:c.route==='add'?`Added to ${c.target}`:'Ordered',note:''};
  if(c.route==='refill')return {cls:'refill',icon:'refresh-cw',label:order?`Refill · ${order.id}`:'Refill',note:order?`${order.title} · due now`:'Due on more than one order · pick one below'};
  if(c.route==='add')return {cls:'add',icon:'list-plus',label:order?`Add to ${order.id}`:'Add to an order',note:order?`${order.title} · not shipped yet`:''};
  if(c.route==='hold'){const m=api.codesOf(entry.item).flatMap(code=>api.lineMatches(code)).find(x=>x.order.editable);return {cls:'hold',icon:'copy-check',label:m?`Already on ${m.order.id}`:'Already ordered',note:m?`${m.order.title} · ${m.order.statusNote}`:''};}
  if(c.route==='skip')return {cls:'skip',icon:'pause',label:'Not ordering now',note:''};
  // New order: still mention a related existing order (e.g. on file but not due yet).
  const related=api.codesOf(entry.item).flatMap(code=>api.lineMatches(code))[0];
  return {cls:'new',icon:'file-plus',label:'New order',note:related?entry.suggested.why:''};
}
function itemsOverview(){
  const rows=items.map(entry=>{
    const f=itemFate(entry),s=itemStatus(entry),pc=s&&s!=='pass'?`<span class="section-status ${statusPill[s][0]} ful-pc"><i data-lucide="${statusPill[s][1]}"></i> ${statusPill[s][2]}</span>`:'';
    return `<li class="ful-ov-row"><div class="ful-ov-item"><b>${esc(entry.item.name)}</b><small>${api.codesOf(entry.item).join(', ')||'No HCPCS code'}</small></div>${rxTag(entry.ri)}<div class="ful-ov-fate ${f.cls}"><span class="ful-fate"><i data-lucide="${f.icon}"></i> ${esc(f.label)}</span>${f.note?`<small>${esc(f.note)}</small>`:''}${pc}</div></li>`;
  }).join('');
  return `<section class="ful-card ful-overview"><header class="ful-ov-head"><b>Items in this intake</b><small>${plural(items.length,'item')} from ${plural(intake.prescriptions.length,'prescription')}</small></header><ul class="ful-ov">${rows}</ul></section>`;
}

// The Move choices for one item, shown only after the user clicks Move.
function moveChoices(entry,cards){
  const c=choice(entry),opts=[],seen=new Set([`${c.route}:${c.target||''}`]);
  const add=(value,label)=>{if(!seen.has(value)){seen.add(value);opts.push([value,label]);}};
  cards.filter(card=>card.kind==='new'&&!card.done).forEach(card=>add(`new:${card.target}`,`Put it on ${card.label.toLowerCase()}`));
  const nextN=`n${Math.max(0,...items.filter(e=>e.ri===entry.ri&&choice(e).route==='new').map(e=>+choice(e).target.slice(1)))+1}`;
  add(`new:${nextN}`,'Order it separately');
  entry.options.refill.forEach(o=>add(`refill:${o.id}`,`Refill it on ${o.id}`));
  entry.options.addSuggested.forEach(o=>add(`add:${o.id}`,`Add it to ${o.id} (not shipped yet)`));
  add('skip:','Don’t order it now');
  return `<div class="ful-move-box" role="group" aria-label="Move ${esc(entry.item.name)}"><span>Move ${esc(entry.item.name)} to:</span>${opts.map(([v,l])=>`<button type="button" class="ful-choice" data-move-to="${v}" data-key="${entry.key}">${esc(l)}</button>`).join('')}<button type="button" class="ful-cancel" data-move-cancel>Cancel</button></div>`;
}
function itemRow(entry,cards,card){
  const s=itemStatus(entry),pill=s&&s!=='pass'?`<span class="section-status ${statusPill[s][0]} ful-pc"><i data-lucide="${statusPill[s][1]}"></i> ${statusPill[s][2]}</span>`:'';
  const codes=api.codesOf(entry.item).join(', ')||'No HCPCS code';
  const holdNote=card.kind==='hold'?(()=>{const m=api.codesOf(entry.item).flatMap(code=>api.lineMatches(code)).find(x=>x.order.editable);return m?`<small class="ful-note">On ${m.order.id} · ${esc(m.order.title)} · ${esc(m.order.statusNote)}</small>`:'';})():'';
  const related=card.kind==='new'&&api.codesOf(entry.item).some(code=>api.lineMatches(code).length)?`<small class="ful-note"><i data-lucide="link-2"></i> ${esc(entry.suggested.why)}</small>`:'';
  const canMove=!ordered(entry)&&!card.done;
  return `<li class="ful-item"><div class="ful-item-main"><span class="ful-item-name">${esc(entry.item.name)}</span><span class="ful-item-codes">${codes}</span>${pill}${holdNote}${related}</div>${canMove?`<button type="button" class="ful-move" data-move="${entry.key}" aria-expanded="${moving===entry.key}">${card.kind==='hold'?'Order anyway':card.kind==='skip'?'Undo':'Move'}</button>`:''}${moving===entry.key?moveChoices(entry,cards):''}</li>`;
}
// Plain-language copy per card.
function cardCopy(card){
  const order=card.target&&card.kind!=='new'?api.orderById(card.target):null;
  if(card.kind==='new')return {icon:'file-plus',title:card.label,sub:card.entries.length>1?`${card.entries.length} items on one new order`:'1 item on a new order',button:'Create order'};
  if(card.kind==='refill'&&!card.target)return {icon:'refresh-cw',title:'Refill',sub:'Due on more than one order · pick one',button:'Open refill'};
  if(card.kind==='refill')return {icon:'refresh-cw',title:`Refill ${order.id}`,sub:`${order.title} · due now`,button:'Open refill'};
  if(card.kind==='add')return {icon:'list-plus',title:`Add to ${order.id}`,sub:`${order.title} · not shipped yet`,button:'Open order'};
  if(card.kind==='hold')return {icon:'copy-check',title:'Already ordered',sub:'On an order that hasn’t shipped · nothing to do'};
  return {icon:'pause',title:'Not ordering now',sub:'Stays on the intake · order it later'};
}
function cardHtml(card,cards,step,isNext){
  const copy=cardCopy(card);
  let action='';
  if(card.done)action=`<span class="section-status success-visible"><i data-lucide="circle-check"></i> ${card.kind==='new'?'Order created':card.kind==='refill'?'Refill done':'Added'}</span>`;
  else if(card.actionable&&!card.target)action='';
  else if(card.actionable)action=`<button class="footer-btn primary" data-open-card="${card.id}">${copy.button} <i data-lucide="arrow-right"></i></button>`;
  const pick=card.actionable&&!card.target?`<div class="ful-pick"><b>Which order?</b>${(card.kind==='refill'?card.entries[0].options.refill:card.entries[0].options.addSuggested).map(o=>`<button type="button" class="ful-choice" data-target="${card.entries[0].key}" data-order="${o.id}"><b>${o.id}</b> · ${esc(o.title)}</button>`).join('')}</div>`:'';
  const order=card.target&&card.kind!=='new'&&card.kind!=='hold'?api.orderById(card.target):null;
  const physician=order&&card.entries[0].rx.physician&&order.physician&&order.physician!==card.entries[0].rx.physician?`<p class="ful-warn"><i data-lucide="triangle-alert"></i> Prescribed by Dr. ${esc(card.entries[0].rx.physician)}, but ${order.id} is under Dr. ${esc(order.physician)}.</p>`:'';
  return `<article class="ful-card ful-${card.kind} ${card.done?'done':''}">
    <header class="ful-head"><span class="ful-icon ${card.done?'done':card.kind}"><i data-lucide="${card.done?'check':copy.icon}"></i></span><div class="ful-title"><b>${copy.title} ${rxTag(card.ri)}</b><small>${copy.sub}</small></div>${action}</header>
    <ul class="ful-items">${card.entries.map(e=>itemRow(e,cards,card)).join('')}</ul>${pick}${physician}
  </article>`;
}
// Recommended services: optional suggestions based on what was prescribed. Not steps; nothing has to be done.
function recommendedServices(){
  const codes=items.flatMap(e=>api.codesOf(e.item)),list=[];
  if(codes.some(c=>/^(E0601|E047)/.test(c))){
    list.push({id:'pap-setup',name:'PAP setup and education',why:'Helps the patient start CPAP therapy safely.'});
    list.push({id:'mask-fitting',name:'Mask fitting',why:'Finds a mask that fits before the first night.'});
    list.push({id:'compliance',name:'Compliance monitoring',why:'Medicare requires 4+ hours a night on 70% of nights in the first 90 days.'});
  }
  if(codes.some(c=>/^(E139|E04)/.test(c)))list.push({id:'oxygen-setup',name:'Home oxygen setup and safety education',why:'Needed for the new oxygen prescription.'});
  return list;
}
function render(){
  $('#poTitle').innerHTML=`<span class="title-muted">Fulfillment for</span> <span class="title-name">${esc(intake.patient.first)} ${esc(intake.patient.last)}</span>`;
  $('#poStage').textContent='Fulfillment';
  const cards=allCards(),todo=cards.filter(c=>c.actionable&&!c.done);
  const count=k=>cards.filter(c=>c.kind===k).length;
  const summary=[[count('new'),'new order'],[count('refill'),'refill'],[count('add'),'add to an order'],[count('hold'),'already ordered']].filter(([n])=>n).map(([n,w])=>w==='already ordered'||w==='add to an order'?`${n} ${w}`:plural(n,w)).join(' · ');
  $('#poPatient').textContent=`From intake #${intake.id}${precheckStatus?'':' · pre-check not run'}`;
  $('#poLead').innerHTML=summary?`${[[count('new'),'new order','file-plus','new'],[count('refill'),'refill','refresh-cw','refill'],[count('add'),'add to an order','list-plus','add'],[count('hold'),'already ordered','copy-check','hold']].filter(([n])=>n).map(([n,w,ic,k])=>`<span class="ful-sum ${k}"><i data-lucide="${ic}"></i> ${w==='already ordered'||w==='add to an order'?`${n} ${w}`:plural(n,w)}</span>`).join('')}`:'Nothing to order';
  const next=todo.find(c=>c.target)||null;let step=0;
  const done=cards.filter(c=>c.actionable&&c.done).length,actionable=cards.filter(c=>c.actionable).length;
  const listHead=`<header class="ful-list-head"><div><h2>Items in this intake</h2><small>${plural(items.length,'item')} from ${plural(intake.prescriptions.length,'prescription')}</small></div>${actionable?`<span class="ful-progress"><b>${done} of ${actionable}</b> done<span class="ful-progress-bar"><span style="width:${Math.round(done/actionable*100)}%"></span></span></span>`:''}</header>`;
  const rxHtml=`<section class="ful-list">${listHead}${cards.map(c=>cardHtml(c,cardsFor(c.ri),0,next&&c.id===next.id)).join('')}</section>`;
  const services=recommendedServices();
  const apptHtml=services.length?`<section class="ful-list ful-svc-wrap"><header class="ful-list-head"><div><h2>Recommended services</h2><small>Optional · based on this intake</small></div></header><div class="ful-card ful-services"><ul class="ful-svc">${services.map(s=>{const booked=plan.appts[s.id];return `<li><i data-lucide="${booked?'circle-check':'sparkles'}" class="${booked?'ok':''}"></i><div><b>${s.name}</b><small>${booked?`Scheduled · ${esc(booked)}`:s.why}</small></div>${booked?'':`<button type="button" class="ful-move" data-appt="${s.id}">Schedule</button>`}</li>`;}).join('')}</ul></div></section>`:'';
  $('#poBody').innerHTML=rxHtml+apptHtml;
  const left=todo.length,all=left===0;
  $('#poStatus').className=`pk-footer-status ${all?'done':'todo'}`;
  $('#poStatus').innerHTML=all
    ?'<span class="pk-status-icon"><i data-lucide="check"></i></span><span><b>All done</b><span class="v2-next">Orders and refills are in Signetic</span></span>'
    :`<span class="pk-status-icon"><i data-lucide="list-checks"></i></span><span><b>${left} to do</b><span class="v2-next">Create the orders and refills above</span></span>`;
  $('#poActions').innerHTML='';
  icons();
}

// ---------- Actions: each card opens the existing Signetic screen with only its own items ----------
function openCard(id){
  const card=allCards().find(c=>c.id===id);if(!card)return;
  const rx=intake.prescriptions[card.ri],entries=card.entries.filter(e=>!ordered(e)),picked=entries.map(e=>e.item);
  const actionId=card.kind==='new'?`${card.id}-${Date.now()}`:card.id;
  plan.pending[actionId]=entries.map(e=>e.key);api.savePlan(plan);
  api.setAction({id:actionId,route:card.kind,target:card.kind==='new'?'':card.target,rxTitle:rx.title,physician:rx.physician,icd:rx.icd,items:picked,intakeId:intake.id});
  if(card.kind==='new'){
    const codes=picked.flatMap(it=>api.codesOf(it));
    const order={...intake,prescriptions:[{...rx,items:picked}],priorAuths:(intake.priorAuths||[]).filter(pa=>codes.includes(pa.code)),fromAction:actionId};
    try{sessionStorage.setItem('signeticIntakeFull',JSON.stringify(intake));sessionStorage.setItem('signeticIntakeOrder',JSON.stringify(order));}catch(error){}
    location.href='dme-order.html';return;
  }
  location.href=`existing-order.html?mode=${card.kind}&order=${card.target}`;
}

// Back goes to the pre-check when it was run, otherwise to the intake.
if(!precheckStatus){$('#poBack').href='index.html';$('#poBack').innerHTML='<i data-lucide="arrow-left"></i> Back to Intake';}

document.addEventListener('click',event=>{
  const open=event.target.closest('[data-open-card]');if(open){openCard(open.dataset.openCard);return;}
  const appt=event.target.closest('[data-appt]');
  if(appt){plan.appts[appt.dataset.appt]='Wed 10/28/2026, 10:00 AM';api.savePlan(plan);render();toast('Opens scheduling in Signetic');return;}
  const move=event.target.closest('[data-move]');
  if(move){
    const entry=items.find(e=>e.key===move.dataset.move),r=choice(entry).route;
    if(r==='skip'||r==='hold'){   // Undo / Order anyway: one click, no menu
      const to=r==='skip'&&entry.suggested.route!=='hold'?entry.suggested:{route:'new',target:''};
      plan.routes[entry.key]={route:to.route,target:to.route==='new'?'n1':to.target||''};api.savePlan(plan);moving='';render();
      toast(r==='skip'?`${entry.item.name} is back`:`${entry.item.name} will go on a new order`);return;
    }
    moving=moving===entry.key?'':entry.key;render();return;
  }
  if(event.target.closest('[data-move-cancel]')){moving='';render();return;}
  const to=event.target.closest('[data-move-to]');
  if(to){
    const entry=items.find(e=>e.key===to.dataset.key),[route,target]=to.dataset.moveTo.split(':');
    plan.routes[entry.key]={route,target:target||''};api.savePlan(plan);moving='';render();
    toast(`${entry.item.name} moved`);return;
  }
  const pick=event.target.closest('[data-order]');
  if(pick){plan.routes[pick.dataset.target]={...plan.routes[pick.dataset.target],target:pick.dataset.order};api.savePlan(plan);render();return;}
});

// Shell
const setNavCollapsed=collapsed=>{document.body.classList.toggle('nav-collapsed',collapsed);const toggle=$('#navToggle');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');toggle.title=toggle.getAttribute('aria-label');};
setNavCollapsed(true);
$('#navToggle').addEventListener('click',()=>setNavCollapsed(!document.body.classList.contains('nav-collapsed')));
$$('[data-nav-section]').forEach(section=>section.addEventListener('click',()=>{const open=section.parentElement.classList.toggle('open');section.setAttribute('aria-expanded',String(open));}));
$$('.shell-nav a[href="#"]').forEach(link=>link.addEventListener('click',event=>event.preventDefault()));

render();
