// Shared tooltip: any element with a title shows it in the app's popover style (like the AI explanation),
// instead of the browser's native tooltip. Elements with their own popover keep it.
(function(){
  const skip='[data-plan-why],[data-ins-ai],[data-cob-why],.pn,.pn *';
  let tip=null,anchor=null,timer=null;
  const el=()=>{if(!tip){tip=document.createElement('div');tip.className='app-tip';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.appendChild(tip);}return tip;};
  function show(target){
    const text=target.getAttribute('title');if(!text)return;
    target.dataset.tip=text;target.removeAttribute('title');anchor=target;
    const t=el();t.textContent=text;t.hidden=false;
    const r=target.getBoundingClientRect(),w=t.offsetWidth,h=t.offsetHeight;
    t.style.left=`${Math.max(12,Math.min(r.left+r.width/2-w/2,innerWidth-w-12))}px`;
    t.style.top=`${r.bottom+h+10>innerHeight?Math.max(12,r.top-h-6):r.bottom+6}px`;
  }
  function hide(){
    clearTimeout(timer);
    if(anchor&&anchor.dataset.tip!==undefined){if(!anchor.hasAttribute('title'))anchor.setAttribute('title',anchor.dataset.tip);delete anchor.dataset.tip;}
    anchor=null;if(tip)tip.hidden=true;
  }
  const find=node=>{const t=node instanceof Element?node.closest('[title]'):null;return t&&!t.matches(skip)&&t!==document.documentElement?t:null;};
  document.addEventListener('pointerover',e=>{const t=find(e.target);if(t===anchor)return;hide();if(t)timer=setTimeout(()=>show(t),300);});
  document.addEventListener('pointerout',e=>{if(anchor&&!anchor.contains(e.relatedTarget))hide();else if(!anchor)clearTimeout(timer);});
  document.addEventListener('focusin',e=>{const t=find(e.target);hide();if(t&&t.matches(':focus-visible'))show(t);});
  document.addEventListener('focusout',hide);
  ['scroll','pointerdown','keydown'].forEach(ev=>addEventListener(ev,hide,true));
})();
