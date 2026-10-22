/* Prototype scenario, chosen in the prototype navigator (proto-nav.js). Not part of the product design. Happy path is the default.
   happy  = no errors anywhere: nothing to confirm after extraction, no required review items, every pre-check code qualifies.
   issues = a few errors to work through: gender and mobile number missing, document conflicts, flagged pre-check codes. */
window.protoScenario=(()=>{try{return localStorage.getItem('signeticScenario')==='issues'?'issues':'happy';}catch(error){return 'happy';}})();
