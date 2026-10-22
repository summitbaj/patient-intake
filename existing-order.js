// Stand-in for Signetic's existing order screen, opened from Order actions.
//   ?mode=refill: the order's refillable item list, with the intake's items preselected; creates a refill order.
//   ?mode=add: the order with the intake's items ready to add; changes this order, no new order.
// In Signetic these screens already exist; the prototype shows only the handoff and the prefilled selection.
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const icons=()=>{if(window.lucide)window.lucide.createIcons();};
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600);}
const esc=value=>String(value??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;

const api=window.signeticOrders,intake=api.getIntake(),params=new URLSearchParams(location.search);
const mode=params.get('mode')||(params.get('screen')==='add'?'add':'refill');
const order=api.orderById(params.get('order')||(mode==='add'?'ORD-1050':'ORD-1042'));

// The action from Order actions, or a demo one when the page is opened directly.
function demoAction(){
  const rxIndex=mode==='add'?1:0,rx=intake.prescriptions[rxIndex];
  const item=rx?.items.find(it=>{const s=api.suggestRoute(it);return s.route===mode;})||rx?.items[rx.items.length-1];
  return {id:`${mode}-${order?.id}`,route:mode,target:order?.id,rxTitle:rx?.title,physician:rx?.physician,icd:rx?.icd||[],items:item?[item]:[],intakeId:intake.id};
}
let action=api.getAction();
if(!action||action.target!==order?.id||action.route!==mode)action=demoAction();
const actionCodes=action.items.flatMap(it=>api.codesOf(it));
const selected=new Set(mode==='refill'?order?.items.filter(i=>i.refillable&&i.due&&actionCodes.includes(i.code)).map(i=>i.code):[]);

function finish(){
  api.markActionDone(action.id);api.clearAction();
  location.href=`prepare-orders.html?done=${encodeURIComponent(action.id)}`;
}

function render(){
  if(!order){
    $('#eoTitle').textContent='Order';
    $('#eoBody').innerHTML='<section class="review-card"><div class="card-header"><div><span class="section-icon"><i data-lucide="inbox"></i></span><div><h3>No existing orders</h3><p>This patient has no orders to refill or add to. Switch to “With issues” in the prototype navigator to see this screen.</p></div></div></div></section>';
    $('#eoStatus').innerHTML='';$('#eoActions').innerHTML='';icons();return;
  }
  $('#eoTitle').innerHTML=`<span class="title-muted">${mode==='refill'?'Refill':'Order'}</span> <span class="title-name">${order.id}</span> <span class="title-muted">· ${esc(order.title)}</span>`;
  $('#eoBanner').innerHTML=`<i data-lucide="sparkles"></i><span><b>Opened from intake #${esc(action.intakeId||intake.id)} · Order actions</b>${mode==='refill'?'The items from the intake are selected. Review them, then create the refill order.':'The items from the intake are ready to add with their prescription details. Review them, then add them to this order.'}</span>`;
  const head=`<div class="card-header"><div><span class="section-icon"><i data-lucide="${mode==='refill'?'refresh-cw':'clipboard-list'}"></i></span><div><h3>${mode==='refill'?'Refillable items':'Items on this order'}</h3><p>${esc(order.status)} · ${esc(order.statusNote)} · Dr. ${esc(order.physician)}</p></div></div><span class="section-status ${order.editable?'success':'warning'}">${order.editable?'Can take new items':esc(order.status)}</span></div>`;
  if(mode==='refill'){
    const rows=order.items.filter(i=>i.refillable).map(i=>`<label class="eo-row ${selected.has(i.code)?'on':''} ${i.due?'':'off'}"><input type="checkbox" data-code="${i.code}" ${selected.has(i.code)?'checked':''} ${i.due?'':'disabled'}><span class="eo-name"><b>${esc(i.name)}</b><small>${i.code} · ${esc(i.limit)}</small></span><span class="eo-meta">Last filled ${esc(i.lastFilled)}</span><span class="eo-meta">${i.due?'Eligible now':`Eligible ${esc(i.nextEligible)}`}</span>${actionCodes.includes(i.code)?'<em class="eo-from">From intake</em>':'<span></span>'}</label>`).join('');
    $('#eoBody').innerHTML=`<section class="review-card">${head}<div class="eo-table">${rows}</div></section>`;
    $('#eoStatus').innerHTML=`<span class="pk-status-icon"><i data-lucide="refresh-cw"></i></span><span><b>${plural(selected.size,'item')} selected</b><span class="v2-next">Refill order for ${order.id}</span></span>`;
    $('#eoActions').innerHTML=`<button class="footer-btn primary" id="eoDo" ${selected.size?'':'disabled'}>Create refill order <i data-lucide="arrow-right"></i></button>`;
  }else{
    const current=order.items.map(i=>`<div class="eo-row"><span class="eo-name"><b>${esc(i.name)}</b><small>${i.code}</small></span><span class="eo-meta">${esc(i.note||'')}</span></div>`).join('');
    const primary=(action.icd||[]).find(c=>c.primary);
    const adding=action.items.map(it=>`<div class="eo-add"><p class="eo-add-name"><b>${esc(it.name)}</b><span class="pill ai-kind">${it.bundle?`Bundle · ${api.codesOf(it).length}`:'Single'}</span></p>${it.lines.map(l=>`<div class="eo-row on"><span class="eo-name"><b>${l.code}</b><small>${esc(l.description)}</small></span><span class="eo-meta">Qty ${esc(l.qty&&l.qty!=='—'?l.qty:'1')}</span><span class="eo-meta">${esc(l.frequency||'')}</span><em class="eo-from">From intake</em></div>`).join('')}</div>`).join('');
    $('#eoBody').innerHTML=`<section class="review-card">${head}<div class="eo-table">${current}</div></section>
      <section class="review-card"><div class="card-header"><div><span class="section-icon"><i data-lucide="list-plus"></i></span><div><h3>Add items</h3><p>${esc(action.rxTitle||'Prescription')} · Dr. ${esc(action.physician||'')} · ${primary?`${primary.code} ${esc(primary.description)}`:'ICD-10 from the intake'}</p></div></div></div><div class="eo-table">${adding}</div></section>`;
    $('#eoStatus').innerHTML=`<span class="pk-status-icon"><i data-lucide="list-plus"></i></span><span><b>${plural(actionCodes.length,'item')} to add</b><span class="v2-next">Changes ${order.id}. No new order is created.</span></span>`;
    $('#eoActions').innerHTML=`<button class="footer-btn primary" id="eoDo">Add to ${order.id} <i data-lucide="arrow-right"></i></button>`;
  }
  icons();
}

document.addEventListener('change',event=>{const code=event.target.dataset.code;if(!code)return;event.target.checked?selected.add(code):selected.delete(code);render();});
document.addEventListener('click',event=>{if(event.target.closest('#eoDo')){toast(mode==='refill'?'Refill order created':'Items added to the order');setTimeout(finish,600);}});

// Shell
const setNavCollapsed=collapsed=>{document.body.classList.toggle('nav-collapsed',collapsed);const toggle=$('#navToggle');toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Expand navigation':'Collapse navigation');toggle.title=toggle.getAttribute('aria-label');};
setNavCollapsed(true);
$('#navToggle').addEventListener('click',()=>setNavCollapsed(!document.body.classList.contains('nav-collapsed')));
$$('[data-nav-section]').forEach(section=>section.addEventListener('click',()=>{const open=section.parentElement.classList.toggle('open');section.setAttribute('aria-expanded',String(open));}));
$$('.shell-nav a[href="#"]').forEach(link=>link.addEventListener('click',event=>event.preventDefault()));

render();
