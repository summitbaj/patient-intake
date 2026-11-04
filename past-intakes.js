// Past intakes for this patient, shared by the intake detail page and the pre-check page.
// What they came in for, the services used, where each ended up, and a read-only look at that intake's pre-check.
const pastIntakes=[
  {id:'INT-0019',date:'Aug 12, 2026',title:'Home oxygen therapy',payer:'Medicare Part B',physician:'Dr. Sarah Kim',status:'done',statusLabel:'Delivered',
    items:[['E1390','Oxygen concentrator'],['E0431','Portable oxygen system']],services:['Home oxygen setup and safety education'],
    precheck:{tone:'ok',label:'All qualified',detail:'2 codes qualified'}},
  {id:'INT-0014',date:'Mar 3, 2026',title:'CPAP supplies resupply',payer:'Aetna Choice POS II',physician:'Dr. Sarah Kim',status:'done',statusLabel:'Refill shipped',
    items:[['A7030','Full face mask'],['A7031','Face mask cushion']],services:['Mask refit'],
    precheck:{tone:'warn',label:'1 reviewed',detail:'Cushion quantity checked and approved'}},
  {id:'INT-0008',date:'Nov 18, 2025',title:'Wheelchair rental',payer:'Medicare Part B',physician:'Dr. Alan Reyes',status:'closed',statusLabel:'Closed · not ordered',
    items:[['K0001','Standard wheelchair']],services:[],
    precheck:{tone:'bad',label:'Not qualified',detail:'Face-to-face note was missing'}}
];
const pastIcons=()=>{if(window.lucide)window.lucide.createIcons();};

// One card per intake. The whole card opens its pre-check; the active one is the intake shown in the slide-in.
function pastIntakeCardsHtml(activeId){
  const tone={ok:['success','circle-check'],warn:['warning','circle-alert'],bad:['danger','circle-x']};
  const status={done:['success','circle-check'],closed:['neutral','circle-slash']};
  return `<ol class="history-items">${pastIntakes.map(item=>{const [pc,pi]=tone[item.precheck.tone],[sc,si]=status[item.status],active=item.id===activeId;return `<li class="history-card ${active?'is-active':''}" data-past-precheck="${item.id}" role="button" tabindex="0" ${active?'aria-current="true"':''} aria-label="${item.title}, ${item.date}. View pre-check">
      <div class="history-card-head"><div><small>${item.date} · #${item.id}</small><b>${item.title}</b></div><span class="section-status ${sc}"><i data-lucide="${si}"></i> ${item.statusLabel}</span></div>
      <p class="history-meta">${item.payer} · ${item.physician}</p>
      <ul class="history-codes">${item.items.map(([code,name])=>`<li><b>${code}</b>${name}</li>`).join('')}</ul>
      ${item.services.length?`<p class="history-services"><i data-lucide="sparkles"></i> ${item.services.join(', ')}</p>`:''}
      <div class="history-pc"><span class="history-pc-status ${pc}"><i data-lucide="${pi}"></i><span><b>Pre-check: ${item.precheck.label}</b><small>${item.precheck.detail}</small></span></span>${active?'<span class="history-open is-viewing"><i data-lucide="eye"></i> Viewing</span>':'<span class="history-open">View Pre-check <i data-lucide="panel-right-open"></i></span>'}</div>
    </li>`;}).join('')}</ol>`;
}
function pastIntakesListHtml(activeId){
  return `<div class="history-head"><strong>Ashlynn’s past intakes</strong><span>${pastIntakes.length} intakes · most recent first</span></div>${pastIntakeCardsHtml(activeId)}`;
}

// The slide-in: past intakes on the left, the selected intake's pre-check (read-only, no loader) on the right.
function pastSlide(){
  let drawer=document.getElementById('pastPrecheck');if(drawer)return drawer;
  drawer=document.createElement('dialog');drawer.className='pc-slide';drawer.id='pastPrecheck';drawer.setAttribute('aria-labelledby','pastPcTitle');
  drawer.innerHTML=`<header class="pc-slide-head">
      <div class="pc-slide-title"><small id="pastPcMeta"></small><strong id="pastPcTitle">Pre-check</strong></div>
      <span class="pc-slide-tag"><i data-lucide="lock"></i> Read-only · past intake</span>
      <button class="icon-btn" type="button" data-past-close aria-label="Close pre-check" title="Close (Esc)"><i data-lucide="x"></i></button>
    </header>
    <div class="pc-slide-body"><aside class="pc-slide-list" id="pastPcList" aria-label="Past intakes"></aside><iframe class="pc-slide-frame" id="pastPcFrame" title="Pre-check for a past intake"></iframe></div>`;
  document.body.appendChild(drawer);
  drawer.addEventListener('cancel',event=>{event.preventDefault();closePastPrecheck();});
  return drawer;
}
function openPastPrecheck(id){
  const item=pastIntakes.find(entry=>entry.id===id)||pastIntakes[0];if(!item)return;
  const drawer=pastSlide();
  drawer.querySelector('#pastPcMeta').textContent=`${item.date} · #${item.id} · ${item.title}`;
  drawer.querySelector('#pastPcList').innerHTML=pastIntakesListHtml(item.id);
  const frame=drawer.querySelector('#pastPcFrame');
  if(frame.dataset.intake!==item.id){frame.dataset.intake=item.id;frame.src=`precheck.html?embed=1&intake=${encodeURIComponent(item.id)}`;}
  if(!drawer.open){drawer.classList.remove('is-closing');drawer.showModal();}
  pastIcons();
}
function closePastPrecheck(){const drawer=document.getElementById('pastPrecheck');if(!drawer?.open||drawer.classList.contains('is-closing'))return;drawer.classList.add('is-closing');setTimeout(()=>{drawer.classList.remove('is-closing');drawer.close();},220);}

document.addEventListener('click',event=>{
  const t=event.target;
  const card=t.closest('[data-past-precheck]');if(card){openPastPrecheck(card.dataset.pastPrecheck);return;}
  if(t.closest('[data-past-open]')){openPastPrecheck(pastIntakes[0].id);return;}
  if(t.closest('[data-past-close]')||t.id==='pastPrecheck'){closePastPrecheck();}
});
document.addEventListener('keydown',event=>{
  const card=event.target.closest?.('.history-card');if(!card||event.target!==card||!['Enter',' '].includes(event.key))return;
  event.preventDefault();openPastPrecheck(card.dataset.pastPrecheck);
});
