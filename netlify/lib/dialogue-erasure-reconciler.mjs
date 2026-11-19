// Diploval V0.3 B9.8 — isolated supervisory reconciliation.
// Not a public endpoint; no automatic restart, no production storage.
import {randomBytes} from 'node:crypto';
import {ERASURE_STEPS} from './dialogue-erasure-coordinator.mjs';
const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const refuse=message=>new Error(message);
export function createErasureReconciler({
 enabled=false,journal,loadCase,authorizeSupervisor,verifyQuiescence,
 verifyEffect,recordAudit,ownerFactory=()=>randomBytes(24).toString('hex')
}={}){
 if(enabled!==true)return Object.freeze({reconcile:async()=>{throw refuse('B9.8 non activé.');}});
 if(!journal||typeof journal.inspect!=='function'||typeof journal.reconcileLocked!=='function'
  ||[loadCase,authorizeSupervisor,verifyQuiescence,verifyEffect,recordAudit,ownerFactory].some(f=>typeof f!=='function'))
  throw refuse('Dépendances de supervision absentes.');
 async function reconcile(principal,{caseId,expectedRevision,confirmedStep,evidenceId}={}){
  if(!principal||typeof principal!=='object'||!ID.test(caseId||'')
    ||!Number.isSafeInteger(expectedRevision)||expectedRevision<1
    ||typeof evidenceId!=='string'||!/^[a-z0-9_-]{12,100}$/i.test(evidenceId))
   throw refuse('Demande de réconciliation invalide.');
  if(await authorizeSupervisor(principal,caseId)!==true)throw refuse('Supervision non autorisée.');
  const item=await loadCase(caseId);
  if(!item||item.id!==caseId||item.kind!=='erasure'
    ||item.decision!=='approved'||item.legalReview!==true
    ||item.subjectVerified!==true||item.holdCleared!==true)
   throw refuse('Validation préalable absente.');
  const current=await journal.inspect(caseId);
  if(!current||current.lockStatus!=='locked'||current.revision!==expectedRevision
     ||current.checkpoint?.state!=='running'||!Array.isArray(current.checkpoint.completed))
   throw refuse('Journal de référence différent.');
  const steps=current.checkpoint.completed;
  if(!ERASURE_STEPS.slice(0,steps.length).every((x,i)=>steps[i]===x))
   throw refuse('Historique des étapes invalide.');
  const step=ERASURE_STEPS[steps.length];
  if(!step||step!==confirmedStep)throw refuse('Étape à rapprocher incorrecte.');
  if(await verifyQuiescence({caseId,expectedRevision})!==true)
   throw refuse('Ancien exécutant non neutralisé.');
  if(await verifyEffect({caseId,step,recordId:item.recordId,reference:item.reference,
    evidenceId})!==true)throw refuse('Effet non vérifié.');
  // Audit must persist before journal repair; no silent or untraceable change.
  if(await recordAudit({kind:'erasure_reconciliation',caseId,step,
    evidenceId,expectedRevision})!==true)throw refuse('Preuve d’audit non confirmée.');
  const checkpoint={...current.checkpoint,completed:[...steps,step],
   state:'running',reconciliationEvidence:evidenceId};
  const result=await journal.reconcileLocked({caseId,expectedRevision,
    newOwner:ownerFactory(),checkpoint,evidenceId});
  // Still locked, requiring a separate supervised action to resume.
  return Object.freeze({caseId,step,revision:result.newRevision,
    state:'locked_reconciled',automaticResume:false});
 }
 return Object.freeze({reconcile});
}
