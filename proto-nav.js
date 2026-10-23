/* Prototype navigator: a floating helper for stepping through the flow. Not part of the product design. */
(function(){
  const screens=[
    {label:'Upload · empty',group:'Patient intake',href:'index.html?screen=upload'},
    {label:'Upload · documents added',group:'Patient intake',href:'index.html?screen=uploaded'},
    {label:'Upload · patient selected',group:'Patient intake',href:'index.html?screen=uploaded-patient'},
    {label:'Confirm patient and documents',group:'Patient intake',href:'index.html?screen=extract-both'},
    {label:'Confirm documents only',group:'Patient intake',href:'index.html?screen=extract-docs'},
    {label:'Review · required items open',group:'Patient intake',href:'index.html?screen=review'},
    {label:'Review · new documents to extract',group:'Patient intake',href:'index.html?screen=review-new'},
    {label:'Review · required complete',group:'Patient intake',href:'index.html?screen=review-done'},
    {label:'Next action · locked',group:'Patient intake',href:'index.html?screen=complete'},
    {label:'Next action · ready',group:'Patient intake',href:'index.html?screen=complete-ready'},
    {label:'Next action · refresh suggested',group:'Patient intake',href:'index.html?screen=complete-stale'},
    {label:'Pre-check',group:'After intake',href:'precheck.html'},
    {label:'Prepare orders',group:'After intake',href:'prepare-orders.html?screen=plan'},
    {label:'Order actions',group:'After intake',href:'prepare-orders.html?screen=actions'},
    {label:'Refill · existing order screen',group:'After intake',href:'existing-order.html?screen=refill'},
    {label:'Add to order · existing order screen',group:'After intake',href:'existing-order.html?screen=add'},
    {label:'Patient information',group:'Order',href:'dme-order.html?step=patient'},
    {label:'Payment information',group:'Order',href:'dme-order.html?step=payment'},
    {label:'Select products',group:'Order',href:'dme-order.html?step=products'},
    {label:'Documentation',group:'Order',href:'dme-order.html?step=documentation'},
    {label:'Order summary',group:'Order',href:'dme-order.html?step=summary'},
    {label:'Follow up',group:'Order',href:'dme-order.html?step=followup'}
  ];
  const params=new URLSearchParams(location.search);
  const page=location.pathname.split('/').pop()||'index.html';
  const planConfirmed=(()=>{try{return Boolean(JSON.parse(sessionStorage.getItem('signeticOrderPlan'))?.confirmed);}catch(e){return false;}})();
  const key=page==='precheck.html'?'precheck.html':page==='dme-order.html'?`dme-order.html?step=${params.get('step')||'patient'}`
    :page==='prepare-orders.html'?`prepare-orders.html?screen=${params.get('screen')||(planConfirmed?'actions':'plan')}`
    :page==='existing-order.html'?`existing-order.html?screen=${params.get('screen')||params.get('mode')||'refill'}`
    :params.get('screen')?`${page}?screen=${params.get('screen')}`:page;
  // On the live intake page (no ?screen=), the current screen follows the app's state.
  const liveKey=()=>{
    if(key!=='index.html'||typeof state==='undefined')return key;
    const required=typeof requiredReviewsLeft==='function'?requiredReviewsLeft():0;
    const review=state.completed?(required?'complete':state.nextStale?'complete-stale':'complete-ready'):documents.some(file=>file.pendingExtract)?'review-new':required?'review':'review-done';
    const screen=state.phase==='review'?review:state.phase==='extraction'?(state.knownPatient?'extract-docs':'extract-both'):(documents.length?'uploaded':'upload');
    return `index.html?screen=${screen}`;
  };
  const findCurrent=()=>{const index=screens.findIndex(s=>s.href===liveKey());return index<0?0:index;};
  let current=findCurrent();
  const store={get(){try{return localStorage.getItem('protoNavCollapsed')==='1';}catch(e){return false;}},set(v){try{localStorage.setItem('protoNavCollapsed',v?'1':'0');}catch(e){}}};

  // ---------- Theme (intake page only): color presets, custom colors, corner radius ----------
  const THEME_KEY='signeticTheme';
  const presets=[
    // Default = Fluent UI theme primary, neutralLighter background (see fluent/fluent-tokens.css).
    {id:'signetic',name:'Fluent blue',primary:'#0078d4',ai:'#0078d4',bg:'#f3f2f1'},
    {id:'teal',name:'Clinical teal',primary:'#0f766e',ai:'#7c3aed',bg:'#f2f7f6'},
    {id:'navy',name:'Hospital navy',primary:'#1e3a8a',ai:'#6d28d9',bg:'#f3f5f9'},
    {id:'ocean',name:'Ocean',primary:'#0369a1',ai:'#7c3aed',bg:'#f1f6fa'},
    {id:'indigo',name:'Calm indigo',primary:'#4f46e5',ai:'#a21caf',bg:'#f5f5fb'},
    {id:'graphite',name:'Graphite',primary:'#334155',ai:'#6d4aff',bg:'#f4f5f7'}
  ];
  const isIntake=document.body.classList.contains('intake-page');
  const themeStore={get(){try{return JSON.parse(localStorage.getItem(THEME_KEY))||{};}catch(e){return {};}},set(v){try{localStorage.setItem(THEME_KEY,JSON.stringify(v));}catch(e){}}};
  let theme=themeStore.get();
  const themeColors=()=>({...presets[0],...(theme.primary?{primary:theme.primary,ai:theme.ai,bg:theme.bg}:{})});
  const luminance=hex=>{const c=hex.replace('#','');return [0,2,4].map(i=>{const v=parseInt(c.slice(i,i+2),16)/255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);};
  function applyTheme(){
    if(!isIntake)return;
    let style=document.getElementById('pn-theme');
    if(theme.primary){
      if(!style){style=document.createElement('style');style.id='pn-theme';document.head.appendChild(style);}
      const {primary,ai,bg}=themeColors(),mix=(color,amount,base)=>`color-mix(in srgb,${color} ${amount}%,${base})`;
      // Only the intake workspace, its header and dialogs are themed; the ribbon and left navigation keep the product chrome.
      style.textContent=`body.intake-page :is(.app-body,.page-header,dialog,.toast){
        --primary:${primary};--blue:${primary};--on-primary:${luminance(primary)>.45?'#0f1f3d':'#fff'};
        --blue-hover:${mix(primary,84,'#000')};--blue-soft:${mix(primary,9,'#fff')};--blue-line:${mix(primary,28,'#fff')};--blue-wash:${mix(primary,4,'#fff')};
        --ring:0 0 0 3px ${mix(primary,22,'transparent')};
        --ai:${ai};--ai-soft:${mix(ai,7,'#fff')};--ai-line:${mix(ai,25,'#fff')};
        --ai-grad:linear-gradient(135deg,${primary} 0%,${ai} 100%);--ai-grad-soft:linear-gradient(135deg,${mix(primary,7,'#fff')} 0%,${mix(ai,7,'#fff')} 100%);
        --bg:${bg}}
        body.intake-page,body.intake-page .app-body{background:${bg}}`;
    }else style?.remove();
    if(theme.radius&&theme.radius!=='default')document.body.dataset.radius=theme.radius;else delete document.body.dataset.radius;
  }
  applyTheme();

  const css=document.createElement('style');
  css.textContent=`
  .pn{position:fixed;left:0;top:0;visibility:hidden;z-index:2147483000;display:flex;flex-direction:column;width:164px;padding:6px;border-radius:12px;background:#1b2a3a;color:#fff;font:500 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:0 8px 28px rgba(10,25,45,.35)}
  .pn *{box-sizing:border-box}
  .pn button{border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;border-radius:999px;height:30px;display:inline-flex;align-items:center;justify-content:center;gap:6px}
  .pn button:hover:not(:disabled){background:rgba(255,255,255,.14)}
  .pn button:disabled{opacity:.35;cursor:default}
  .pn button:focus-visible{outline:2px solid #8fc4ff;outline-offset:1px}
  .pn-body{display:grid;gap:4px}
  .pn-head{display:flex;align-items:center;justify-content:space-between}
  .pn-nav{display:grid;grid-template-columns:1fr 1fr;gap:4px}
  .pn-arrow{width:100%;background:rgba(255,255,255,.08)!important;font-size:12px}
  .pn-arrow:hover:not(:disabled){background:rgba(255,255,255,.16)!important}
  .pn .pn-current{height:auto;min-height:44px;padding:6px 10px;border-radius:8px;flex-direction:column;align-items:flex-start;justify-content:center;gap:3px;text-align:left}
  .pn-current b{font-weight:600;line-height:1.3;white-space:normal}
  .pn-count{opacity:.6;font-variant-numeric:tabular-nums}
  .pn-tag{display:inline-flex;align-items:center;gap:6px;flex:1;height:30px;padding:0 8px 0 6px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.6);cursor:grab;touch-action:none;user-select:none}
  .pn-tag::before{content:'\\22EE\\22EE';letter-spacing:-2px;font-size:13px}
  .pn.dragging .pn-tag,.pn.dragging .pn-open{cursor:grabbing}.pn.dragging{box-shadow:0 14px 36px rgba(10,25,45,.45)}
  .pn-min{width:30px;flex:none}
  .pn .pn-reset{width:100%;border:1px solid rgba(255,255,255,.18);font-size:12px;color:rgba(255,255,255,.85)}
  .pn [hidden]{display:none!important}
  .pn .pn-theme-btn{width:100%;font-size:12px;background:rgba(255,255,255,.08)}.pn .pn-theme-btn[aria-expanded=true]{background:#2f6fd0}
  .pn-theme{position:absolute;bottom:0;left:calc(100% + 10px);width:272px;max-height:calc(100vh - 24px);overflow:auto;padding:12px;border-radius:14px;background:#1b2a3a;box-shadow:0 12px 32px rgba(10,25,45,.4);cursor:default}
  .pn.theme-left .pn-theme{left:auto;right:calc(100% + 10px)}
  .pt-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}.pt-head b{font-size:13px;font-weight:600}
  .pn .pt-head button{width:28px;height:28px}
  .pt-label{margin:12px 0 6px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.55)}
  .pt-presets{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  .pn .pt-preset{height:auto;justify-content:flex-start;gap:8px;padding:7px 8px;border-radius:8px;background:rgba(255,255,255,.06);font-size:12px;text-align:left;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
  .pn .pt-preset[aria-pressed=true]{box-shadow:inset 0 0 0 2px #8fc4ff;background:rgba(143,196,255,.12)}
  .pt-sw{display:inline-flex;flex:none}.pt-sw i{width:14px;height:14px;border-radius:50%;box-shadow:0 0 0 2px #1b2a3a}.pt-sw i+i{margin-left:-5px}
  .pt-color{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 2px;font-size:12px;color:rgba(255,255,255,.85);cursor:pointer}
  .pt-color input{width:34px;height:24px;padding:0;border:1px solid rgba(255,255,255,.25);border-radius:6px;background:none;cursor:pointer}
  .pt-color input::-webkit-color-swatch-wrapper{padding:2px}.pt-color input::-webkit-color-swatch{border:0;border-radius:4px}
  .pt-color code{margin-left:auto;font:11px ui-monospace,SFMono-Regular,Menlo,monospace;color:rgba(255,255,255,.55)}
  .pt-warn{margin:6px 0 0;padding:6px 8px;border-radius:6px;background:rgba(251,191,36,.14);color:#fcd34d;font-size:11px;line-height:1.4}
  .pt-seg{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:3px;border-radius:9px;background:rgba(255,255,255,.06)}
  .pn .pt-seg button{height:30px;font-size:12px;border-radius:6px}
  .pn .pt-seg button[aria-checked=true]{background:#fff;color:#1b2a3a;font-weight:600}
  .pt-foot{display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:10px;border-top:1px solid rgba(255,255,255,.1)}
  .pt-foot small{font-size:11px;color:rgba(255,255,255,.55)}
  .pn .pt-reset{height:28px;padding:0 10px;font-size:12px;color:#8fc4ff}
  .pn-path{display:grid;gap:4px}
  .pn-path-label{padding:0 4px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.55)}
  .pn-path .pt-seg{grid-template-columns:1fr 1fr}
  .pn .pn-path .pt-seg button{height:28px;padding:0 4px;white-space:nowrap;font-size:11px;color:rgba(255,255,255,.85)}
  .pn .pn-path .pt-seg button[aria-checked=true]{background:#fff;color:#1b2a3a}
  .pn-demo{margin:2px 0;padding:0 6px;font-size:11px;line-height:1.4;color:rgba(255,255,255,.7)}.pn-demo a{color:#8fc4ff}
  .pn-confirm{display:grid;gap:6px;padding:6px 2px 0}.pn-confirm[hidden]{display:none}
  .pn-confirm p{margin:0;padding:0 6px;font-size:12px;line-height:1.4;color:rgba(255,255,255,.85)}
  .pn .pn-danger{background:#c2410c!important}.pn .pn-danger:hover{background:#9a3412!important}
  .pn-menu{position:absolute;left:50%;bottom:calc(100% + 10px);transform:translateX(-50%);width:300px;max-height:min(420px,60vh);overflow:auto;padding:6px;border-radius:14px;background:#1b2a3a;box-shadow:0 12px 32px rgba(10,25,45,.4)}
  .pn-menu[hidden]{display:none}
  .pn.down .pn-menu{bottom:auto;top:calc(100% + 10px)}
  .pn-group{padding:8px 10px 4px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.5}
  .pn-menu a{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;color:#fff;text-decoration:none;font-size:13px}
  .pn-menu a:hover{background:rgba(255,255,255,.12)}
  .pn-menu a[aria-current=true]{background:#2f6fd0}
  .pn-menu a span{width:18px;opacity:.6;font-size:11px;font-variant-numeric:tabular-nums}
  .pn.min{padding:0;width:auto;border-radius:999px}.pn.min .pn-body{display:none}.pn:not(.min) .pn-open{display:none}
  .pn-open{width:34px;height:34px;cursor:grab;touch-action:none}
  @media print{.pn{display:none}}`;
  document.head.appendChild(css);

  const root=document.createElement('div');
  root.className='pn';root.setAttribute('role','navigation');root.setAttribute('aria-label','Prototype navigator');
  const menuItems=screens.map((s,i)=>`${i===0||screens[i-1].group!==s.group?`<div class="pn-group">${s.group}</div>`:''}<a href="${s.href}" ${i===current?'aria-current="true"':''}><span>${i+1}</span>${s.label}</a>`).join('');
  root.innerHTML=`<button class="pn-open" aria-label="Show prototype navigator" title="Prototype navigator">⌘</button>
  <div class="pn-body">
    <div class="pn-head"><span class="pn-tag">Prototype</span><button class="pn-min" data-pn="min" aria-label="Hide prototype navigator" title="Hide">×</button></div>
    <button class="pn-current" data-pn="menu" aria-haspopup="true" aria-expanded="false"><b>${screens[current].label}</b><span class="pn-count">${current+1}/${screens.length}</span></button>
    <div class="pn-nav"><button class="pn-arrow" data-pn="prev" aria-label="Previous screen" title="Previous (Alt+←)">‹ Prev</button><button class="pn-arrow" data-pn="next" aria-label="Next screen" title="Next (Alt+→)">Next ›</button></div>
    <div class="pn-path"><span class="pn-path-label" id="pnPathLabel">Scenario</span><div class="pt-seg" role="radiogroup" aria-labelledby="pnPathLabel"><button role="radio" data-path="happy" title="No errors: nothing to confirm, nothing to review, every code qualifies">Happy path</button><button role="radio" data-path="issues" title="A few errors to work through: missing gender and mobile number, document conflicts, flagged codes">With issues</button></div></div>
    <button class="pn-theme-btn" data-pn="theme" aria-expanded="false" aria-controls="pnTheme">◐ Theme</button>
    <p class="pn-demo" hidden>Demo view · changes aren’t saved. <a href="index.html">Open my intake</a></p>
    <button class="pn-reset" data-pn="reset" title="Clear saved progress and start a new intake">↺ Reset prototype</button>
    <div class="pn-confirm" hidden><p>Clear all progress and start again?</p><div class="pn-nav"><button class="pn-arrow" data-pn="reset-no">Keep</button><button class="pn-arrow pn-danger" data-pn="reset-yes">Reset</button></div></div>
  </div>
  <div class="pn-menu" hidden>${menuItems}</div>
  <div class="pn-theme" id="pnTheme" role="dialog" aria-label="Theme" hidden>
    <div class="pt-head"><b>Theme</b><button data-pn="theme" aria-label="Close theme">×</button></div>
    <p class="pt-label">Color presets</p>
    <div class="pt-presets">${presets.map(p=>`<button class="pt-preset" data-preset="${p.id}" aria-pressed="false"><span class="pt-sw"><i style="background:${p.primary}"></i><i style="background:${p.ai}"></i></span>${p.name}</button>`).join('')}</div>
    <p class="pt-label">Custom colors</p>
    <label class="pt-color"><span>Buttons and links</span><code data-hex="primary"></code><input type="color" data-color="primary"></label>
    <label class="pt-color"><span>AI accents</span><code data-hex="ai"></code><input type="color" data-color="ai"></label>
    <label class="pt-color"><span>Page background</span><code data-hex="bg"></code><input type="color" data-color="bg"></label>
    <p class="pt-warn" hidden>Low contrast: links in this color are hard to read on white.</p>
    <p class="pt-label">Corners</p>
    <div class="pt-seg" role="radiogroup" aria-label="Corner radius"><button role="radio" data-radius="sharp">Sharp</button><button role="radio" data-radius="default">Default</button><button role="radio" data-radius="round">Round</button></div>
    <div class="pt-foot"><small>Intake page only</small><button class="pt-reset" data-pn="theme-reset">Reset theme</button></div>
  </div>`;
  document.body.appendChild(root);

  const menu=root.querySelector('.pn-menu'),toggle=root.querySelector('[data-pn=menu]');
  const prev=root.querySelector('[data-pn=prev]'),next=root.querySelector('[data-pn=next]');
  const syncCurrent=()=>{
    current=findCurrent();
    toggle.querySelector('b').textContent=screens[current].label;toggle.querySelector('.pn-count').textContent=`${current+1}/${screens.length}`;
    menu.querySelectorAll('a').forEach((link,index)=>index===current?link.setAttribute('aria-current','true'):link.removeAttribute('aria-current'));
    prev.disabled=current===0;next.disabled=current===screens.length-1;
  };
  syncCurrent();
  // Scenario: switching starts the intake over so the new path applies everywhere.
  const scenario=window.protoScenario||'happy';
  root.querySelectorAll('[data-path]').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.path===scenario)));
  root.querySelector('.pn-path').addEventListener('click',event=>{
    const b=event.target.closest('[data-path]');if(!b||b.dataset.path===scenario)return;
    window.progressReset=true;
    try{localStorage.setItem('signeticScenario',b.dataset.path);localStorage.removeItem('signeticIntakeProgress');sessionStorage.removeItem('signeticIntakeOrder');sessionStorage.removeItem('signeticIntakeFull');}catch(e){}
    location.reload();
  });
  root.querySelector('.pn-demo').hidden=!(page==='index.html'&&params.get('screen'));
  document.addEventListener('intake:change',syncCurrent);

  const themePanel=root.querySelector('.pn-theme'),themeBtn=root.querySelector('.pn-theme-btn');
  themeBtn.hidden=!isIntake;
  const syncTheme=()=>{
    const colors=themeColors(),preset=theme.primary?theme.preset||'custom':'signetic';
    themePanel.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.preset===preset)));
    themePanel.querySelectorAll('[data-color]').forEach(input=>{input.value=colors[input.dataset.color];themePanel.querySelector(`[data-hex=${input.dataset.color}]`).textContent=colors[input.dataset.color].toUpperCase();});
    // Links use the primary color on white: flag anything below a 3:1 contrast ratio.
    themePanel.querySelector('.pt-warn').hidden=1.05/(luminance(colors.primary)+.05)>=3;
    themePanel.querySelectorAll('[data-radius]').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.radius===(theme.radius||'default'))));
  };
  const saveTheme=()=>{themeStore.set(theme);applyTheme();syncTheme();};
  const setThemeOpen=open=>{
    themePanel.hidden=!open;themeBtn.setAttribute('aria-expanded',String(open));
    if(!open)return;
    setMenu(false);syncTheme();
    // Open beside the navigator, on whichever side has room.
    root.classList.remove('theme-left');
    if(themePanel.getBoundingClientRect().right>innerWidth-8)root.classList.add('theme-left');
  };
  themePanel.addEventListener('click',event=>{
    const preset=event.target.closest('[data-preset]'),radius=event.target.closest('[data-radius]');
    if(preset){const p=presets.find(item=>item.id===preset.dataset.preset);theme=p.id==='signetic'?{radius:theme.radius}:{...theme,preset:p.id,primary:p.primary,ai:p.ai,bg:p.bg};saveTheme();}
    if(radius){theme={...theme,radius:radius.dataset.radius};saveTheme();}
  });
  themePanel.addEventListener('input',event=>{
    const input=event.target.closest('[data-color]');if(!input)return;
    theme={...themeColors(),...theme,preset:'custom',[input.dataset.color]:input.value};saveTheme();
  });
  const go=i=>{if(i>=0&&i<screens.length)location.href=screens[i].href;};
  const setMenu=open=>{
    menu.hidden=!open;toggle.setAttribute('aria-expanded',String(open));
    if(open&&!themePanel.hidden)setThemeOpen(false);
    if(!open)return;
    // Open upward unless there's no room, and keep the list inside the viewport horizontally.
    root.classList.toggle('down',root.getBoundingClientRect().top<menu.offsetHeight+24);
    menu.style.transform='translateX(-50%)';
    const r=menu.getBoundingClientRect();
    const dx=r.left<8?8-r.left:r.right>innerWidth-8?innerWidth-8-r.right:0;
    if(dx)menu.style.transform=`translateX(calc(-50% + ${dx}px))`;
  };
  let docked=true;
  const dock=()=>{const nav=document.querySelector('.shell-nav'),left=nav?nav.getBoundingClientRect().left:0;place(left+8,innerHeight-root.offsetHeight-12);};
  const place=(x,y)=>{
    const w=root.offsetWidth,h=root.offsetHeight;
    x=Math.min(Math.max(8,x),Math.max(8,innerWidth-w-8));y=Math.min(Math.max(8,y),Math.max(8,innerHeight-h-8));
    root.style.left=x+'px';root.style.top=y+'px';return {x,y};
  };
  const setMin=min=>{root.classList.toggle('min',min);store.set(min);setMenu(false);if(docked){dock();return;}const r=root.getBoundingClientRect();place(r.left,r.top);};
  root.style.visibility='hidden';
  root.classList.toggle('min',store.get());
  dock();
  root.style.visibility='visible';
  addEventListener('resize',()=>{if(docked){dock();return;}const r=root.getBoundingClientRect();place(r.left,r.top);});
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
    if(!moved){moved=true;docked=false;root.classList.add('dragging');setMenu(false);}
    place(event.clientX-drag.dx,event.clientY-drag.dy);
  });
  const endDrag=()=>{
    if(!drag)return;drag=null;root.classList.remove('dragging');
  };
  root.addEventListener('pointerup',endDrag);root.addEventListener('pointercancel',endDrag);
  root.addEventListener('click',event=>{
    if(moved){moved=false;return;}
    const btn=event.target.closest('[data-pn],.pn-open');if(!btn)return;
    const act=btn.dataset.pn;
    if(act==='prev')go(current-1);else if(act==='next')go(current+1);
    else if(act==='menu')setMenu(menu.hidden);
    else if(act==='min')setMin(true);
    else if(act==='theme')setThemeOpen(themePanel.hidden);
    else if(act==='theme-reset'){theme={};saveTheme();}
    else if(act==='reset'||act==='reset-no'){
      // Inline confirm: native confirm() dialogs are blocked in some embedded browsers.
      const asking=act==='reset';
      root.querySelector('.pn-reset').hidden=asking;root.querySelector('.pn-confirm').hidden=!asking;
      if(docked)dock();else{const r=root.getBoundingClientRect();place(r.left,r.top);}
      if(asking)root.querySelector('[data-pn=reset-yes]').focus();
    }
    else if(act==='reset-yes'){
      window.progressReset=true;
      try{localStorage.removeItem(THEME_KEY);localStorage.removeItem('signeticIntakeProgress');sessionStorage.removeItem('signeticIntakeOrder');sessionStorage.removeItem('signeticIntakeFull');}catch(e){}
      location.href='index.html';
    }
    else setMin(false);
  });
  document.addEventListener('click',event=>{if(!root.contains(event.target)){setMenu(false);setThemeOpen(false);}});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){setMenu(false);setThemeOpen(false);}
    if(!event.altKey||event.metaKey||event.ctrlKey)return;
    if(event.key==='ArrowRight'){event.preventDefault();go(current+1);}
    if(event.key==='ArrowLeft'){event.preventDefault();go(current-1);}
  });
})();
