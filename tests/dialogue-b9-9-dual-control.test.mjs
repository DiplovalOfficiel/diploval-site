import test from 'node:test';
import assert from 'node:assert/strict';
import {createErasureTwoPersonReview} from '../netlify/lib/dialogue-erasure-dual-review.mjs';

const id='case_123',evidenceId='evidence_123456',reviewer={role:'reviewer'},executor={role:'executor'};
function fixture(options={}){
 let log=[],decision=null;
 const state={caseId:id,revision:1,lockStatus:'locked',checkpoint:{state:'running',completed:[]}};
 const evidence={id:evidenceId,caseId:id,revision:1,sources:[{kind:'fictitious-storage-probe',ref:'probe_001'}]};
 const svc=createErasureTwoPersonReview({enabled:true,
  authenticateReviewer:async p=>p===reviewer?{id:'reviewer_01'}:null,
  authenticateExecutor:async p=>p===executor?{id:'executor_01'}:null,
  loadCase:async()=>({id,kind:'erasure',decision:'approved',legalReview:true,subjectVerified:true,holdCleared:true}),
  journal:{inspect:async()=>({...state})},
  loadEvidence:async()=>options.missingEvidence?null:{...evidence},
  verifyEvidence:async()=>options.invalidEvidence!==true,
  saveDecision:async d=>{if(options.saveFails)return false;decision=structuredClone(d);return true;},
  loadDecision:async()=>options.fakeDecision?{...options.fakeDecision}:decision,
  audit:async e=>{log.push(e);return options.auditFails!==true;}
 });
 return {svc,state,log,getDecision:()=>decision};
}
const approval={caseId:id,expectedRevision:1,evidenceId,executorId:'executor_01'};
const handoff={caseId:id,expectedRevision:1,evidenceId};
test('B9.9 off by default',async()=>assert.rejects(createErasureTwoPersonReview().approve({},{}),/non activé/));
test('B9.9 requires dependencies',()=>assert.throws(()=>createErasureTwoPersonReview({enabled:true}),/absentes/));
test('B9.9 authorized distinct reviewer records decision',async()=>{
 const x=fixture();const r=await x.svc.approve(reviewer,approval);
 assert.equal(r.status,'approved_for_review');assert.equal(x.getDecision().reviewerId,'reviewer_01');
});
test('B9.9 unauthorized reviewer rejected',async()=>{
 const x=fixture();await assert.rejects(x.svc.approve(executor,approval),/Relecteur/);
});
test('B9.9 same person cannot approve and execute',async()=>{
 const x=fixture();await assert.rejects(x.svc.approve(reviewer,{...approval,executorId:'reviewer_01'}),/identique/);
});
test('B9.9 missing evidence refused',async()=>{
 const x=fixture({missingEvidence:true});await assert.rejects(x.svc.approve(reviewer,approval),/Preuve structurée/);
});
test('B9.9 bad evidence refused',async()=>{
 const x=fixture({invalidEvidence:true});await assert.rejects(x.svc.approve(reviewer,approval),/non vérifiée/);
});
test('B9.9 stale journal revision refused',async()=>{
 const x=fixture();x.state.revision=2;await assert.rejects(x.svc.approve(reviewer,approval),/Journal/);
});
test('B9.9 approval failure stops',async()=>{
 const x=fixture({saveFails:true});await assert.rejects(x.svc.approve(reviewer,approval),/non enregistrée/);
});
test('B9.9 executor receives no automatic unlock',async()=>{
 const x=fixture();await x.svc.approve(reviewer,approval);
 const r=await x.svc.authorizeHandoff(executor,handoff);
 assert.equal(r.authorized,true);assert.equal(r.unlockPerformed,false);assert.equal(r.automaticResume,false);
 assert.equal(x.state.lockStatus,'locked');
});
test('B9.9 wrong executor rejected',async()=>{
 const x=fixture();await x.svc.approve(reviewer,approval);
 await assert.rejects(x.svc.authorizeHandoff(reviewer,handoff),/Exécutant/);
});
test('B9.9 no stored approval means no handoff',async()=>{
 const x=fixture();await assert.rejects(x.svc.authorizeHandoff(executor,handoff),/Décision/);
});

test('B9.10: une décision d’un autre dossier est rejetée même si le magasin la renvoie',async()=>{
 const x=fixture({fakeDecision:{caseId:'case_456',expectedRevision:1,evidenceId,
  reviewerId:'reviewer_01',executorId:'executor_01',kind:'supervised_handoff',status:'approved'}});
 await assert.rejects(x.svc.authorizeHandoff(executor,handoff),/Décision de reprise invalide/);
});
test('B9.10: une décision liée à une autre preuve est rejetée',async()=>{
 const x=fixture({fakeDecision:{caseId:id,expectedRevision:1,evidenceId:'evidence_999999',
  reviewerId:'reviewer_01',executorId:'executor_01',kind:'supervised_handoff',status:'approved'}});
 await assert.rejects(x.svc.authorizeHandoff(executor,handoff),/Décision de reprise invalide/);
});
test('B9.10: une décision d’une autre révision est rejetée',async()=>{
 const x=fixture({fakeDecision:{caseId:id,expectedRevision:2,evidenceId,
  reviewerId:'reviewer_01',executorId:'executor_01',kind:'supervised_handoff',status:'approved'}});
 await assert.rejects(x.svc.authorizeHandoff(executor,handoff),/Décision de reprise invalide/);
});
