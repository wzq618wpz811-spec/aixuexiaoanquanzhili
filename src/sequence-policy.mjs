export function sequenceReady(c){
 if(c.type!=='order')return true;
 const e=c.sequenceEvidence;
 return !!(e?.approved===true&&e.originalQuestionRef&&e.originalType&&e.currentProcedureRef&&e.scope&&e.precedenceVerified===true);
}
