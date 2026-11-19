// V0.3 — Décision éditoriale indépendante sur un projet institutionnel.
// Aucun endpoint, aucune publication, aucune lecture de données personnelles.
// Un avis favorable ouvre seulement une procédure de publication distincte.
const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const REF=/^[A-Z]{2,5}-\d{4}-[A-F0-9]{12,}$/;
const fail=message=>new Error(message);
export function createInstitutionalDraftReview({
 enabled=false,store,authenticateDiploval,loadPublicContribution,
 auditDecision,prefix='dialogue-v03-institution-drafts'
}={}){
 if(enabled!==true)return Object.freeze({decide:async()=>{throw fail('Revue institutionnelle désactivée.');}});
 if(!store||typeof store.getWithMetadata!=='function'||typeof store.set!=='function'
   ||typeof authenticateDiploval!=='function'||typeof loadPublicContribution!=='function'
   ||typeof auditDecision!=='function'||!/^[a-z0-9-]{5,48}$/.test(prefix))
  throw fail('Dépendances de revue institutionnelle incomplètes.');
 const path=id=>{if(!ID.test(id||''))throw fail('Projet inconnu.');return prefix+'/'+id;};
 async function decide(principal,{draftId,expectedRevision,decision,evidenceId}={}){
  if(!ID.test(draftId||'')||!Number.isSafeInteger(expectedRevision)||expectedRevision<1
   ||!['accept_for_separate_publication','reject'].includes(decision)
   ||typeof evidenceId!=='string'||!/^[a-z0-9_-]{12,100}$/i.test(evidenceId))
   throw fail('Décision éditoriale invalide.');
  const reviewer=await authenticateDiploval(principal);
  if(!reviewer||reviewer.organization!=='diploval'||reviewer.active!==true
   ||!ID.test(reviewer.staffId||'')||reviewer.canReviewInstitutional!==true)
   throw fail('Validation Diploval non autorisée.');
  const old=await store.getWithMetadata(path(draftId),{type:'json',consistency:'strong'});
  if(!old||!old.etag||!old.data||old.data.draftId!==draftId
    ||old.data.status!=='pending_diploval_review'
    ||old.data.revision!==expectedRevision||!ID.test(old.data.organizationId||'')
    ||!ID.test(old.data.staffId||'')||!ID.test(old.data.consultationId||'')
    ||!REF.test(old.data.reference||'')||!Number.isSafeInteger(old.data.sourceVersion)
    ||old.data.sourceVersion<1)
   throw fail('Projet indisponible, incohérent ou modifié.');
  if(reviewer.staffId===old.data.staffId)throw fail('Contrôle indépendant obligatoire.');
  const current=await loadPublicContribution({
   reference:old.data.reference,consultationId:old.data.consultationId
  });
  if(!current||current.reference!==old.data.reference
   ||current.consultationId!==old.data.consultationId
   ||current.version!==old.data.sourceVersion)
   throw fail('Contribution source modifiée ou retirée.');
  if(await auditDecision({draftId,reviewerId:reviewer.staffId,
    decision,evidenceId,expectedRevision})!==true)
   throw fail('Audit éditorial non confirmé.');
  const next={...old.data,status:decision==='reject'?'rejected':'reviewed_for_separate_publication',
   reviewerId:reviewer.staffId,decisionEvidence:evidenceId,
   revision:expectedRevision+1,published:false};
  const saved=await store.set(path(draftId),JSON.stringify(next),{onlyIfMatch:old.etag});
  if(saved?.modified!==true||!saved.etag)throw fail('Décision concurrente ou non confirmée.');
  const confirmed=await store.getWithMetadata(path(draftId),{type:'json',consistency:'strong'});
  if(!confirmed||confirmed.etag!==saved.etag||JSON.stringify(confirmed.data)!==JSON.stringify(next))
   throw fail('Relecture de décision non confirmée.');
  return Object.freeze({draftId,status:next.status,published:false});
 }
 return Object.freeze({decide});
}
