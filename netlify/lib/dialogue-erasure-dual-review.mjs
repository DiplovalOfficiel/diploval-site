// Diploval V0.3 B9.9 — two-person review of reconciliation evidence.
// No HTTP route, no unlock, no automatic continuation. Data-provider adapters absent.
const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const EVID=/^[a-z0-9_-]{12,100}$/i;
const ACTOR=/^[a-z0-9_-]{8,96}$/i;
const fail=message=>new Error(message);
export function createErasureTwoPersonReview({
 enabled=false,authenticateReviewer,authenticateExecutor,
 loadCase,journal,loadEvidence,verifyEvidence,saveDecision,audit
}={}){
 if(enabled!==true)return Object.freeze({
  approve:async()=>{throw fail('B9.9 non activé.');},
  authorizeHandoff:async()=>{throw fail('B9.9 non activé.');}
 });
 if([authenticateReviewer,authenticateExecutor,loadCase,loadEvidence,
   verifyEvidence,saveDecision,audit].some(x=>typeof x!=='function')
   ||!journal||typeof journal.inspect!=='function')
  throw fail('Dépendances de double contrôle absentes.');
 const valid=(caseId,expectedRevision,evidenceId)=>
  ID.test(caseId||'')&&Number.isSafeInteger(expectedRevision)
  &&expectedRevision>=1&&EVID.test(evidenceId||'');
 async function state(caseId,expectedRevision){
  const data=await journal.inspect(caseId);
  if(!data||data.lockStatus!=='locked'||data.revision!==expectedRevision
    ||!data.checkpoint||data.checkpoint.state!=='running')
   throw fail('Journal verrouillé ou révision non confirmée.');
  const dossier=await loadCase(caseId);
  if(!dossier||dossier.id!==caseId||dossier.kind!=='erasure'
    ||dossier.decision!=='approved'||dossier.legalReview!==true
    ||dossier.subjectVerified!==true||dossier.holdCleared!==true)
   throw fail('Décision juridique absente.');
  return data;
 }
 async function approve(principal,{caseId,expectedRevision,evidenceId,executorId}={}){
  if(!valid(caseId,expectedRevision,evidenceId)||!ACTOR.test(executorId||''))
   throw fail('Dossier ou preuve invalide.');
  const reviewer=await authenticateReviewer(principal,caseId);
  if(!reviewer||!ACTOR.test(reviewer.id||'')||reviewer.id===executorId)
   throw fail('Relecteur non autorisé ou identique à l’exécutant.');
  await state(caseId,expectedRevision);
  const evidence=await loadEvidence(evidenceId);
  if(!evidence||evidence.id!==evidenceId||evidence.caseId!==caseId
    ||evidence.revision!==expectedRevision
    ||!Array.isArray(evidence.sources)||evidence.sources.length<1)
   throw fail('Preuve structurée absente ou hors périmètre.');
  if(await verifyEvidence({caseId,expectedRevision,evidence})!==true)
   throw fail('Preuve non vérifiée.');
  const decision={caseId,expectedRevision,evidenceId,reviewerId:reviewer.id,
   executorId,kind:'supervised_handoff',status:'approved'};
  if(await saveDecision(decision)!==true)throw fail('Décision non enregistrée.');
  if(await audit({event:'handoff_approved',caseId,reviewerId:reviewer.id,
    evidenceId})!==true)throw fail('Audit non confirmé.');
  // Authorization only; never opens a lock or modifies any private record.
  return Object.freeze({status:'approved_for_review',caseId,expectedRevision});
 }
 async function authorizeHandoff(principal,decision){
  if(!decision||!valid(decision.caseId,decision.expectedRevision,decision.evidenceId)
     ||!ACTOR.test(decision.reviewerId||'')||!ACTOR.test(decision.executorId||'')
     ||decision.reviewerId===decision.executorId||decision.status!=='approved'
     ||decision.kind!=='supervised_handoff')
   throw fail('Décision de reprise invalide.');
  const executor=await authenticateExecutor(principal,decision.caseId);
  if(!executor||executor.id!==decision.executorId)
   throw fail('Exécutant non autorisé.');
  await state(decision.caseId,decision.expectedRevision);
  const evidence=await loadEvidence(decision.evidenceId);
  if(!evidence||evidence.id!==decision.evidenceId
    ||evidence.caseId!==decision.caseId
    ||evidence.revision!==decision.expectedRevision
    ||await verifyEvidence({caseId:decision.caseId,
      expectedRevision:decision.expectedRevision,evidence})!==true)
   throw fail('Preuve devenue invalide.');
  // This does not validate that 'decision' came from durable trusted storage.
  // Production must load it server-side and perform atomic single-use consumption.
  return Object.freeze({authorized:true,automaticResume:false,unlockPerformed:false});
 }
 return Object.freeze({approve,authorizeHandoff});
}
