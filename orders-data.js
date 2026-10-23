/* Existing Signetic orders for the intake patient, and how each prescribed item could be ordered.
   Demo data: in Signetic, orders, refillable items and refill eligibility come from the order system.
   The routing unit is a prescribed item: a single product or a whole bundle. A bundle is never split across orders.
   Loaded by precheck.html, prepare-orders.html and existing-order.html (after scenario.js). */
(function(){
  const issues=window.protoScenario==='issues';
  // Ashlynn is an existing patient in both scenarios, so Fulfillment always shows a new order, a refill and an already-ordered item.
  // Demo orders belong to Ashlynn Botosh (MRN PT-10482). Other patients, including new ones from a manual intake, have none.
  const currentIntake=(()=>{try{return JSON.parse(sessionStorage.getItem('signeticIntakeFull'))||JSON.parse(sessionStorage.getItem('signeticIntakeOrder'));}catch(error){return null;}})();
  const forDemoPatient=!currentIntake?.patient?.mrn||currentIntake.patient.mrn==='PT-10482';
  const existingOrders=!forDemoPatient?[]:[
    {id:'ORD-1042',title:'CPAP and supplies',therapy:'pap',status:'Active',statusNote:'CPAP owned since 08/2021 · monthly resupply',editable:false,physician:'Sarah Kim',created:'08/12/2021',
      items:[
        {code:'E0601',name:'CPAP device',refillable:false,note:'Owned · capped rental ended 08/2022',acquisition:'owned',dates:'Delivered 08/12/2021 · rental completed 08/2022'},
        {code:'A7030',name:'Full face mask',acquisition:'purchase',refillable:true,limit:'1 per 3 months',lastFilled:'09/02/2026',nextEligible:'12/02/2026',due:false},
        {code:'A7031',name:'Full face mask cushion',acquisition:'purchase',refillable:true,limit:'1 per month',lastFilled:'09/02/2026',nextEligible:'10/02/2026',due:true},
        {code:'A7035',name:'Headgear',acquisition:'purchase',refillable:true,limit:'1 per 6 months',lastFilled:'03/20/2026',nextEligible:'09/20/2026',due:true},
        {code:'A7037',name:'Tubing',acquisition:'purchase',refillable:true,limit:'1 per 3 months',lastFilled:'06/30/2026',nextEligible:'09/30/2026',due:true},
        {code:'A7038',name:'Disposable filters',acquisition:'purchase',refillable:true,limit:'2 per month',lastFilled:'09/02/2026',nextEligible:'10/02/2026',due:true}
      ]},
    {id:'ORD-0987',title:'PAP supplies (secondary payer)',therapy:'pap',status:'Active',statusNote:'Aetna resupply · every 6 months',editable:false,physician:'Sarah Kim',created:'01/18/2024',
      items:[{code:'A7035',name:'Headgear',acquisition:'purchase',refillable:true,limit:'1 per 6 months',lastFilled:'09/11/2026',nextEligible:'03/11/2027',due:false},
               {code:'A7034',name:'Nasal mask',acquisition:'purchase',refillable:false,note:'Purchased once · switched to full face mask',dates:'Purchased 01/18/2024'}]},
    {id:'ORD-1050',title:'Home oxygen concentrator',therapy:'oxygen',status:'Open',statusNote:'Created 10/13/2026 · not shipped',editable:true,physician:'Michael Reyes',created:'10/13/2026',
      items:[{code:'E1390',name:'Oxygen concentrator, single delivery port',refillable:false,note:'Awaiting delivery',acquisition:'pending',dates:'Ordered 10/13/2026 · not delivered'}]},
    {id:'ORD-0901',title:'Nebulizer',therapy:'other',status:'Closed',statusNote:'Delivered and billed 02/2025',editable:false,physician:'Michael Reyes',created:'02/04/2025',
      items:[{code:'E0570',name:'Nebulizer with compressor',refillable:false,acquisition:'purchase',dates:'Purchased 02/04/2025'}]},
    {id:'ORD-0755',title:'Home oxygen (prior episode)',therapy:'oxygen',status:'Closed',statusNote:'Rental ended 02/2024',editable:false,physician:'Michael Reyes',created:'03/02/2023',
      items:[{code:'E0439',name:'Stationary liquid oxygen system',refillable:false,acquisition:'rental-past',note:'Past rental',dates:'Rented 03/2023 – 02/2024 · 11 months'}]}
  ];

  const therapyOf=code=>/^(E0601|E0562|A70)/.test(code)?'pap':/^(E139|E043|A46)/.test(code)?'oxygen':'other';
  const codesOf=item=>item.lines.map(line=>line.code).filter(Boolean);

  // What the existing orders say about one HCPCS code (evidence shown in the pre-check and the plan).
  function lineMatches(code){
    return existingOrders.flatMap(order=>order.items.filter(i=>i.code===code).map(i=>({order,item:i})));
  }

  // Routes for one prescribed item. Refill needs every line to be a due refillable item on the same order.
  function routeOptions(item){
    const codes=codesOf(item),therapy=therapyOf(codes[0]||'');
    const refill=existingOrders.filter(order=>codes.every(code=>order.items.some(i=>i.code===code&&i.refillable&&i.due)));
    const refillBlocked=(()=>{
      if(refill.length)return '';
      const notRefillable=codes.filter(code=>!existingOrders.some(o=>o.items.some(i=>i.code===code&&i.refillable)));
      const notDue=codes.filter(code=>!notRefillable.includes(code)&&!existingOrders.some(o=>o.items.some(i=>i.code===code&&i.refillable&&i.due)));
      if(!existingOrders.length)return 'No existing orders for this patient';
      if(notRefillable.length===codes.length)return 'Not a refillable item on any order';
      const parts=[];
      if(notRefillable.length)parts.push(`${notRefillable.join(', ')} ${notRefillable.length===1?'isn’t a refillable item':'aren’t refillable items'}`);
      if(notDue.length){const due=lineMatches(notDue[0]).find(m=>m.item.refillable)?.item.nextEligible;parts.push(`${notDue.join(', ')} not due until ${due}`);}
      return `A bundle is refilled as a whole: ${parts.join('; ')}`;
    })();
    const add=existingOrders.filter(order=>order.editable);
    const addSuggested=add.filter(order=>order.therapy===therapy&&!codes.every(code=>order.items.some(i=>i.code===code)));
    const alreadyOn=existingOrders.find(order=>order.editable&&codes.every(code=>order.items.some(i=>i.code===code)));
    return {refill,refillBlocked,add,addSuggested,alreadyOn,addBlocked:add.length?'':existingOrders.length?'No open orders can take new items':'No existing orders for this patient'};
  }

  // The system's suggestion for one item, with a one-line reason. The user always confirms.
  function suggestRoute(item){
    const o=routeOptions(item),codes=codesOf(item);
    if(o.alreadyOn)return {route:'hold',target:'',why:`Already on ${o.alreadyOn.id} (${o.alreadyOn.status.toLowerCase()}, not shipped). Ordering it again would duplicate it.`};
    if(o.refill.length===1)return {route:'refill',target:o.refill[0].id,why:`Refillable on ${o.refill[0].id} and due now.`};
    if(o.refill.length>1)return {route:'refill',target:'',why:`Refillable and due on ${o.refill.length} orders. Choose which one to refill.`};
    const owned=lineMatches(codes[0]).find(m=>!m.item.refillable);
    if(owned)return {route:'new',target:'',why:`${codes[0]} is on ${owned.order.id} but isn’t a refillable item, so the ${item.bundle?'whole bundle goes':'item goes'} on a new order.`};
    const notDue=codes.map(code=>lineMatches(code).find(m=>m.item.refillable&&!m.item.due)).find(Boolean);
    if(notDue)return {route:'new',target:'',why:`Refillable on ${notDue.order.id} but not due until ${notDue.item.nextEligible}, so it goes on a new order.`};
    return {route:'new',target:'',why:codes.some(code=>lineMatches(code).length)?`Not refillable as prescribed, so it goes on a new order.`:'Nothing like this is on file for the patient.'};
  }

  // Prepare orders state: the route chosen for each item, whether the plan is confirmed, and which actions are done.
  const PLAN_KEY='signeticOrderPlan',ACTION_KEY='signeticOrderAction';
  const read=(key,fallback)=>{try{return JSON.parse(sessionStorage.getItem(key))||fallback;}catch(error){return fallback;}};
  const write=(key,value)=>{try{sessionStorage.setItem(key,JSON.stringify(value));}catch(error){}};
  const PLAN_VERSION=4;
  const getPlan=()=>{const p=read(PLAN_KEY,null);return p&&p.v===PLAN_VERSION?p:{v:PLAN_VERSION,routes:{},confirmed:false,done:[]};};
  const savePlan=plan=>write(PLAN_KEY,plan);
  function markActionDone(id){const plan=getPlan();if(!plan.done.includes(id))plan.done.push(id);savePlan(plan);}
  // The action currently open in a Signetic screen (new order wizard, refill, add to order).
  const getAction=()=>read(ACTION_KEY,null);
  const setAction=action=>write(ACTION_KEY,action);
  const clearAction=()=>{try{sessionStorage.removeItem(ACTION_KEY);}catch(error){}};
  // Intake carried from the pre-check (or the demo intake when a page is opened directly).
  const getIntake=()=>{const order=read('signeticIntakeOrder',null);return read('signeticIntakeFull',null)||(order&&!order.fromPrescription&&!order.fromAction?order:null)||window.signeticDemoIntake;};

  window.signeticOrders={existingOrders,lineMatches,routeOptions,suggestRoute,codesOf,orderById:id=>existingOrders.find(o=>o.id===id),
    getPlan,savePlan,markActionDone,getAction,setAction,clearAction,getIntake};
})();
