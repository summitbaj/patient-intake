/* Flow v2: the next step lives in a fixed footer, not in the side panel.
   - Footer always shows what's left to review and a "Complete intake" button.
   - Complete intake with required items open scrolls to the next one (no blocking popup).
   - Complete intake when done opens a dialog with the recommended next action.
   - The side panel is only the review checklist (no "Next action" tab). */
(function(){
  const baseSetSideTab=setSideTab;
  const reviewTotals=()=>{
    const items=reviewItems(),required=items.filter(item=>item.severity==='missing');
    const ai=aiResolvedFields.filter(item=>!state.aiEdited.has(item.key)&&!state.aiReviewed.has(item.key)&&!items.some(open=>open.id===item.id));
    return {required,optional:items.length-required.length+ai.length};
  };

  function renderV2Status(){
    const box=$('#v2Status');if(!box)return;
    const {required,optional}=reviewTotals();
    if(required.length){
      box.className='v2-status todo';
      box.innerHTML=`<i data-lucide="circle-alert"></i><span><b>${required.length} required ${required.length===1?'item':'items'} left</b><span class="v2-next">Next: ${required[0].label}</span></span><button type="button" class="text-btn v2-go" data-v2-go>Go to next <i data-lucide="arrow-down"></i></button>`;
    }else{
      box.className='v2-status done';
      box.innerHTML=`<i data-lucide="circle-check"></i><span><b>All required items reviewed</b>${optional?`<button type="button" class="text-btn v2-optional" data-v2-optional>${optional} optional AI ${optional===1?'check':'checks'}</button>`:'<span class="v2-next">Ready to complete</span>'}</span>`;
    }
    icons();
  }

  function goToNextRequired(){
    const next=reviewTotals().required[0];if(!next)return false;
    const target=document.getElementById(next.id);
    if(target){
      target.closest('details')?.setAttribute('open','');
      target.scrollIntoView({behavior:'smooth',block:'center'});
      target.classList.remove('v2-flash');void target.offsetWidth;target.classList.add('v2-flash');
      setTimeout(()=>target.querySelector('input,select,textarea')?.focus({preventScroll:true}),400);
    }
    return next;
  }

  // Complete intake: go to the next required item, or open the Next action tab in the left panel.
  function openComplete(){
    const next=goToNextRequired();
    if(next){toast(`Finish “${next.label}” to complete the intake`);return;}
    state.completed=true;
    setSourceDrawer(true,true);
    baseSetSideTab('next');
  }

  // Footer is shown for upload and review.
  syncFooter=function(){
    const phase=state.phase;
    $('#pageFooter').hidden=!(phase==='upload'||phase==='review');
    $$('[data-footer-phase]').forEach(group=>{group.hidden=group.dataset.footerPhase!==phase;});
    if(phase==='review')renderV2Status();
  };
  // Keep the footer status in sync with every review change.
  const baseRenderReviewMenu=renderReviewMenu;
  renderReviewMenu=function(){baseRenderReviewMenu();renderV2Status();};
  // No "Next action" tab: anything that asked for it opens the completion dialog instead.
  showPostIntake=function(){openComplete();};
  openReviewGate=function(){goToNextRequired();};

  $('#v2Complete').addEventListener('click',openComplete);
  $('#v2SaveExit').addEventListener('click',()=>toast('Intake saved. Resume it any time from the intake queue.'));
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-v2-go]')){goToNextRequired();return;}
    if(event.target.closest('[data-v2-complete]')){openComplete();return;}
    if(event.target.closest('[data-v2-optional]')){setSourceDrawer(true,true);baseSetSideTab('review');}
  });
  $('#v2CompleteDialog').addEventListener('click',event=>{if(event.target===$('#v2CompleteDialog'))$('#v2CompleteDialog').close();});

  // Deep links from the prototype navigator.
  const screen=new URLSearchParams(location.search).get('screen');
  if(screen==='review'||screen==='complete'){
    baseSetSideTab('review');setSourceDrawer(false,true);syncFooter();
    if(screen==='complete'){
      // Fill the one required item so the completion step can be shown.
      const rx=prescriptions[0];if(rx&&!rx.physician.npi&&typeof pickPhysician==='function')pickPhysician(rx.id,'1629384756');
      const g=$('#genderInput');if(g&&!g.value){g.value='Female';}
      const m=$('#mobileInput');if(m&&!m.value){m.value='(415) 220-8841';}
      updateProgress();
      setTimeout(openComplete,300);
    }
  }else syncFooter();
})();
