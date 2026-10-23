/* Demo intake used when a page is opened directly instead of from a completed intake (matches the intake prototype). */
window.signeticDemoIntake={
  id:'INT-0023',completed:'Oct 15, 2026',
  patient:{first:'Ashlynn',middle:'',last:'Botosh',dob:'03/15/1978',gender:'Female',phone:'(415) 220-8841',home:'(206) 555-0142',email:'ashlynn.botosh@email.com',address:'1234 Healthways Blvd, Suite 200',city:'Seattle',state:'WA',zip:'98101',county:'King',mrn:'PT-10482'},
  prescriptions:[
    {title:'Prescription 1',source:'Prescription.pdf',date:'10/12/2026',physician:'Sarah Kim',npi:'1629384756',specialty:'Sleep medicine',
      icd:[{code:'G47.33',description:'Obstructive sleep apnea (adult)',primary:true},{code:'E66.9',description:'Obesity, unspecified'},{code:'I10',description:'Essential (primary) hypertension'}],
      items:[{name:'CPAP auto 5–15 cm H2O with heated humidifier, full face mask and supplies',bundle:true,qty:1,frequency:'Nightly during sleep',lines:[{code:'E0601',description:'Continuous positive airway pressure (CPAP) device'},{code:'E0562',description:'Humidifier, heated, used with PAP device'},{code:'A7030',description:'Full face mask used with PAP device'},{code:'A7031',description:'Face mask cushion, replacement for full face mask'},{code:'A7037',description:'Tubing used with PAP device'},{code:'A7038',description:'Filter, disposable, used with PAP device'}]},
             {name:'PAP headgear',bundle:false,qty:1,frequency:'',lines:[{code:'A7035',description:'Headgear used with PAP device'}]},
             {name:'PAP chinstrap',bundle:false,qty:1,frequency:'1 per 6 months',lines:[{code:'A7036',description:'Chinstrap used with PAP device'}]}]},
    {title:'Prescription 2',source:'Oxygen Prescription.jpg',date:'10/13/2026',physician:'Michael Reyes',npi:'1487265930',specialty:'Pulmonology',
      icd:[{code:'R09.02',description:'Hypoxemia',primary:true},{code:'G47.33',description:'Obstructive sleep apnea (adult)'}],
      items:[{name:'Home oxygen concentrator, 2 L/min nocturnal',bundle:false,qty:1,frequency:'During sleep',lines:[{code:'E1390',description:'Oxygen concentrator, single delivery port'}]},
             {name:'Oxygen supplies',bundle:true,qty:'',frequency:'',lines:[{code:'A4615',description:'Cannula, nasal'},{code:'A4616',description:'Tubing (oxygen), per foot'}]}]}
  ],
  insurance:[{rank:'Primary',name:'Medicare Part B',memberId:'X BCB731045298 03',group:'Not provided',status:'Active'},{rank:'Secondary',name:'Aetna Choice POS II',memberId:'Z AET529187463 07',group:'GRP-258914',status:'Active'},{rank:'Tertiary',name:'Washington Apple Health',memberId:'200458812WA',group:'Not provided',status:'Inactive'}],
  priorAuths:[{code:'E0601',number:'PA-26-0418873',payer:'Aetna Choice POS II',from:'10/15/2026',to:'04/15/2027',qty:'1 unit',frequency:'Monthly rental · 13 months'},{code:'E1390',number:'PA-26-0522190',payer:'Aetna Choice POS II',from:'10/15/2026',to:'10/14/2027',qty:'1 unit',frequency:'Monthly rental · 12 months'}],
  documents:['Referral.pdf','Insurance Card.jpg','Prescription.pdf','Oxygen Prescription.jpg','Consent Form.pdf','Face-to-Face Notes.pdf'],
  note:'',precheck:null
};

/* Details carried from the review when the pre-check is opened directly: physician info, required documents per item, and eligibility check results. */
(function(){
  const d=window.signeticDemoIntake;
  const phys=[{first:'Sarah',last:'Kim',npi:'1629384756',specialty:'Sleep medicine',address:'1101 Madison St, Suite 600, Seattle, WA, 98104',dme:true,pmd:true,partb:true},
              {first:'Michael',last:'Reyes',npi:'1487265930',specialty:'Pulmonology',address:'1600 E Jefferson St, Seattle, WA, 98122',dme:true,pmd:false,partb:true}];
  const doc=(name,status,extra={})=>({name,status,found:!/^Not /.test(status),na:/^Not required/.test(status),recommended:'',...extra});
  const docs=[
    [[doc('Standard written order (SWO)','Prescription.pdf'),doc('Face-to-face clinical evaluation','Face-to-Face Notes.pdf'),doc('Prior authorization','On file · PA-26-0418873 · Aetna Choice POS II'),doc('Sleep study (PSG or HST) report','Sleep Study · Aug 2022.pdf',{recommended:'L33718'})],
     [doc('Standard written order (SWO)','Prescription.pdf'),doc('Face-to-face clinical evaluation','Face-to-Face Notes.pdf'),doc('Prior authorization','Not required for these codes'),doc('Sleep study (PSG or HST) report','Sleep Study · Aug 2022.pdf',{recommended:'L33718'})],
     [doc('Standard written order (SWO)','Prescription.pdf'),doc('Face-to-face clinical evaluation','Face-to-Face Notes.pdf'),doc('Prior authorization','Not required for these codes'),doc('Sleep study (PSG or HST) report','Sleep Study · Aug 2022.pdf',{recommended:'L33718'})]],
    [[doc('Standard written order (SWO)','Oxygen Prescription.jpg'),doc('Face-to-face clinical evaluation','Face-to-Face Notes.pdf'),doc('Prior authorization','On file · PA-26-0522190 · Aetna Choice POS II'),doc('Oxygen qualifying test results','Not found in uploads',{recommended:'L33797'})],
     [doc('Standard written order (SWO)','Oxygen Prescription.jpg'),doc('Face-to-face clinical evaluation','Face-to-Face Notes.pdf'),doc('Prior authorization','Not required for these codes'),doc('Oxygen qualifying test results','Not found in uploads',{recommended:'L33797'})]]
  ];
  d.prescriptions.forEach((rx,i)=>{rx.physicianInfo=phys[i];rx.items.forEach((item,j)=>{item.docs=docs[i][j];});});
  const ec={
    'Medicare Part B':{type:'Medicare',eligibility:{service:'DME',checkedAt:'Oct 20, 2026 · 9:42 AM',active:true,eligible:true,benefit:'20% coinsurance after Part B deductible',deductible:'$257.00',deductibleMet:'$257.00',oop:'Not applicable',network:'Medicare-enrolled supplier',payer:'CMS Medicare (HETS)',trace:'HETS-26101594217',planDates:'12/31/2022 – 12/30/2027',other:{name:'Premera Blue Cross PPO',memberId:'PRM884210375',dates:'01/01/2026 – 12/31/2026'}}},
    'Aetna Choice POS II':{type:'Commercial PPO',eligibility:{service:'DME',checkedAt:'Oct 20, 2026 · 9:42 AM',active:true,eligible:true,benefit:'20% coinsurance · prior authorization on file',deductible:'$1,500.00',deductibleMet:'$1,120.00',oop:'$4,000.00 · $1,860.00 met',network:'In network',payer:'Aetna',trace:'AET-0417-88213',planDates:'03/15/2025 – 03/14/2027',other:null}},
    'Washington Apple Health':{type:'Medicaid',eligibility:{service:'DME',checkedAt:'Oct 20, 2026 · 9:42 AM',active:false,eligible:false,benefit:'Coverage ended 09/30/2026 · member not enrolled on the date of service',deductible:'$0.00',deductibleMet:'$0.00',oop:'Not applicable',network:'Enrolled provider',payer:'Washington State HCA',trace:'WAHCA-7731902',planDates:'07/01/2026 – 09/30/2026',other:null}}
  };
  d.insurance.forEach(plan=>Object.assign(plan,ec[plan.name]||{}));
})();
