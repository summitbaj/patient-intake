/* Prototype navigator: a floating helper for stepping through the flow. Not part of the product design. */
(function(){
  const screens=[
    {label:'Upload',group:'Intake',href:'index.html'},
    {label:'Extraction · patient + documents',group:'Intake',href:'index.html?screen=extract-both'},
    {label:'Extraction · documents only',group:'Intake',href:'index.html?screen=extract-docs'},
    {label:'Review',group:'Intake',href:'index.html?screen=review'},
    {label:'Intake complete',group:'Intake',href:'index.html?screen=complete'},
    {label:'Pre-check',group:'Pre-check',href:'precheck.html'},
    {label:'Patient information',group:'Order',href:'dme-order.html?step=patient'},
    {label:'Payment information',group:'Order',href:'dme-order.html?step=payment'},
    {label:'Select products',group:'Order',href:'dme-order.html?step=products'},
    {label:'Documentation',group:'Order',href:'dme-order.html?step=documentation'},
    {label:'Order summary',group:'Order',href:'dme-order.html?step=summary'},
    {label:'Follow up',group:'Order',href:'dme-order.html?step=followup'}
  ];
  const params=new URLSearchParams(location.search);
  const page=location.pathname.split('/').pop()||'index.html';
  const key=page==='precheck.html'?'precheck.html':page==='dme-order.html'?`dme-order.html?step=${params.get('step')||'patient'}`:params.get('screen')?`index.html?screen=${params.get('screen')}`:'index.html';
  let current=screens.findIndex(s=>s.href===key);if(current<0)current=0;
  const store={get(){try{return localStorage.getItem('protoNavCollapsed')==='1';}catch(e){return false;}},set(v){try{localStorage.setItem('protoNavCollapsed',v?'1':'0');}catch(e){}}};

  const css=document.createElement('style');
  css.textContent=`
  .pn{position:fixed;left:0;top:0;visibility:hidden;z-index:2147483000;display:flex;align-items:center;gap:4px;padding:5px;border-radius:999px;background:#1b2a3a;color:#fff;font:500 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:0 8px 28px rgba(10,25,45,.35)}
  .pn *{box-sizing:border-box}
  .pn button{border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;border-radius:999px;height:30px;display:inline-flex;align-items:center;justify-content:center;gap:6px}
  .pn button:hover:not(:disabled){background:rgba(255,255,255,.14)}
  .pn button:disabled{opacity:.35;cursor:default}
  .pn button:focus-visible{outline:2px solid #8fc4ff;outline-offset:1px}
  .pn-arrow{width:30px}
  .pn-current{padding:0 12px;max-width:300px;min-width:180px}
  .pn-current b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pn-count{opacity:.6;font-variant-numeric:tabular-nums}
  .pn-tag{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 8px 0 10px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.6);cursor:grab;touch-action:none;user-select:none}
  .pn-tag::before{content:'\\22EE\\22EE';letter-spacing:-2px;font-size:13px}
  .pn.dragging .pn-tag,.pn.dragging .pn-open{cursor:grabbing}.pn.dragging{box-shadow:0 14px 36px rgba(10,25,45,.45)}
  .pn-min{width:30px}
  .pn-menu{position:absolute;left:50%;bottom:calc(100% + 10px);transform:translateX(-50%);width:300px;max-height:min(420px,60vh);overflow:auto;padding:6px;border-radius:14px;background:#1b2a3a;box-shadow:0 12px 32px rgba(10,25,45,.4)}
  .pn-menu[hidden]{display:none}
  .pn.down .pn-menu{bottom:auto;top:calc(100% + 10px)}
  .pn-group{padding:8px 10px 4px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.5}
  .pn-menu a{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;color:#fff;text-decoration:none;font-size:13px}
  .pn-menu a:hover{background:rgba(255,255,255,.12)}
  .pn-menu a[aria-current=true]{background:#2f6fd0}
  .pn-menu a span{width:18px;opacity:.6;font-size:11px;font-variant-numeric:tabular-nums}
  .pn.min{padding:0}.pn.min .pn-body{display:none}.pn:not(.min) .pn-open{display:none}
  .pn-open{width:34px;height:34px;cursor:grab;touch-action:none}
  @media(max-width:700px){.pn-current{min-width:120px;max-width:170px}.pn-tag{display:none}}
  @media print{.pn{display:none}}`;
  document.head.appendChild(css);

  const root=document.createElement('div');
  root.className='pn';root.setAttribute('role','navigation');root.setAttribute('aria-label','Prototype navigator');
  const menuItems=screens.map((s,i)=>`${i===0||screens[i-1].group!==s.group?`<div class="pn-group">${s.group}</div>`:''}<a href="${s.href}" ${i===current?'aria-current="true"':''}><span>${i+1}</span>${s.label}</a>`).join('');
  root.innerHTML=`<button class="pn-open" aria-label="Show prototype navigator" title="Prototype navigator">⌘</button>
  <div class="pn-body" style="display:flex;align-items:center;gap:4px">
    <span class="pn-tag">Prototype</span>
    <button class="pn-arrow" data-pn="prev" aria-label="Previous screen" title="Previous (Alt+←)">‹</button>
    <button class="pn-current" data-pn="menu" aria-haspopup="true" aria-expanded="false"><b>${screens[current].label}</b><span class="pn-count">${current+1}/${screens.length}</span></button>
    <button class="pn-arrow" data-pn="next" aria-label="Next screen" title="Next (Alt+→)">›</button>
    <button class="pn-min" data-pn="min" aria-label="Hide prototype navigator" title="Hide">×</button>
  </div>
  <div class="pn-menu" hidden>${menuItems}</div>`;
  document.body.appendChild(root);

  const menu=root.querySelector('.pn-menu'),toggle=root.querySelector('[data-pn=menu]');
  const prev=root.querySelector('[data-pn=prev]'),next=root.querySelector('[data-pn=next]');
  prev.disabled=current===0;next.disabled=current===screens.length-1;
  const go=i=>{if(i>=0&&i<screens.length)location.href=screens[i].href;};
  const setMenu=open=>{
    menu.hidden=!open;toggle.setAttribute('aria-expanded',String(open));
    if(!open)return;
    // Open upward unless there's no room, and keep the list inside the viewport horizontally.
    root.classList.toggle('down',root.getBoundingClientRect().top<menu.offsetHeight+24);
    menu.style.transform='translateX(-50%)';
    const r=menu.getBoundingClientRect();
    const dx=r.left<8?8-r.left:r.right>innerWidth-8?innerWidth-8-r.right:0;
    if(dx)menu.style.transform=`translateX(calc(-50% + ${dx}px))`;
  };
  const posStore={get(){try{return JSON.parse(localStorage.getItem('protoNavPos'));}catch(e){return null;}},set(p){try{localStorage.setItem('protoNavPos',JSON.stringify(p));}catch(e){}}};
  const place=(x,y)=>{
    const w=root.offsetWidth,h=root.offsetHeight;
    x=Math.min(Math.max(8,x),Math.max(8,innerWidth-w-8));y=Math.min(Math.max(8,y),Math.max(8,innerHeight-h-8));
    root.style.left=x+'px';root.style.top=y+'px';return {x,y};
  };
  const setMin=min=>{root.classList.toggle('min',min);store.set(min);setMenu(false);const r=root.getBoundingClientRect();place(r.left,r.top);};
  root.style.visibility='hidden';
  root.classList.toggle('min',store.get());
  const saved=posStore.get();
  if(saved&&typeof saved.x==='number')place(saved.x,saved.y);
  else place((innerWidth-root.offsetWidth)/2,innerHeight-root.offsetHeight-78);
  root.style.visibility='visible';
  addEventListener('resize',()=>{const r=root.getBoundingClientRect();place(r.left,r.top);});
  // Drag by the grip (or the collapsed button).
  let drag=null,moved=false;
  root.addEventListener('pointerdown',event=>{
    const grip=event.target.closest('.pn-tag,.pn-open');if(!grip||event.button!==0)return;
    const r=root.getBoundingClientRect();
    drag={dx:event.clientX-r.left,dy:event.clientY-r.top,sx:event.clientX,sy:event.clientY,grip};moved=false;
    grip.setPointerCapture(event.pointerId);
  });
  root.addEventListener('pointermove',event=>{
    if(!drag)return;
    if(!moved&&Math.hypot(event.clientX-drag.sx,event.clientY-drag.sy)<4)return;
    if(!moved){moved=true;root.classList.add('dragging');setMenu(false);}
    place(event.clientX-drag.dx,event.clientY-drag.dy);
  });
  const endDrag=()=>{
    if(!drag)return;drag=null;root.classList.remove('dragging');
    if(moved){const r=root.getBoundingClientRect();posStore.set({x:r.left,y:r.top});}
  };
  root.addEventListener('pointerup',endDrag);root.addEventListener('pointercancel',endDrag);
  root.addEventListener('click',event=>{
    if(moved){moved=false;return;}
    const btn=event.target.closest('[data-pn],.pn-open');if(!btn)return;
    const act=btn.dataset.pn;
    if(act==='prev')go(current-1);else if(act==='next')go(current+1);
    else if(act==='menu')setMenu(menu.hidden);
    else if(act==='min')setMin(true);
    else setMin(false);
  });
  document.addEventListener('click',event=>{if(!root.contains(event.target))setMenu(false);});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape')setMenu(false);
    if(!event.altKey||event.metaKey||event.ctrlKey)return;
    if(event.key==='ArrowRight'){event.preventDefault();go(current+1);}
    if(event.key==='ArrowLeft'){event.preventDefault();go(current-1);}
  });
})();
