// Diploval V0.3 — revue contradictoire fictive d'une perte d'accès contestée.
// Aucune délivrance d'accès, aucun email, aucune suppression, aucun endpoint.
const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const ACTOR=/^[a-z0-9_-]{8,96}$/i;
const PROOF=/^[a-z0-9_-]{12,100}$/i;
const DECISIONS=new Set(['maintain_block','refer_to_separate_resolution']);
const fail=m=>new Error(m);
export function createDisputedAccessReview({
 enabled=false,store,authenticateReviewer,loadLostAccessReview,
 verifyEvidence,audit,prefix='dialogue-v03-disputed-access'
}={}){
 if(enabled!==true)return Object.freeze({
  open:async()=>{throw fail('Revue contradictoire désactivée.');},
  review:async()=>{throw fail('Revue contradictoire désactivée.');},
  inspect:async()=>{throw fail('Revue contradictoire désactivée.')}
 });
 if(!store||typeof store.getWithMetadata!=='function'||typeof store.set!=='function'
   ||[authenticateReviewer,loadLostAccessReview,verifyEvidence,audit].some(f=>typeof f!=='function')
   ||!/^[a-z0-9-]{5,48}$/.test(prefix))throw fail('Dépendances de revue manquantes.');
 const path=id=>{if(!ID.test(id||''))throw fail('Identifiant de revue invalide.');return prefix+'/'+id;};
 async function read(id){
  const x=await store.getWithMetadata(path(id),{type:'json',consistency:'strong'});
  if(!x)return null;
  const v=x.data;
  if(!x.etag||!v||v.id!==id||!ID.test(v.lostAccessReviewId||'')
    ||!Array.isArray(v.reviews)||v.reviews.length>2
    ||!['pending','closed'].includes(v.status)||!Number.isSafeInteger(v.revision))
   throw fail('Journal de contestation incohérent.');
  return {etag:x.etag,data:structuredClone(v)};
 }
 async function save(id,data,etag){
  const out=await store.set(path(id),JSON.stringify(data),
    etag?{onlyIfMatch:etag}:{onlyIfNew:true});
  if(out?.modified!==true||!out.etag)throw fail('Conflit ou écriture non confirmée.');
  const check=await read(id);
  if(!check||check.etag!==out.etag||JSON.stringify(check.data)!==JSON.stringify(data))
   throw fail('Journal de contestation non confirmé.');
  return structuredClone(data);
 }
 async function reviewer(principal,id){
  const actor=await authenticateReviewer(principal,id);
  if(!actor||!ACTOR.test(actor.id||''))throw fail('Relecteur non habilité.');
  return actor.id;
 }
 async function verifyDispute(lostAccessReviewId){
  const source=await loadLostAccessReview(lostAccessReviewId);
  if(!source||source.id!==lostAccessReviewId||source.status!=='disputed')
   throw fail('Contestation source non active.');
 }
 async function open(principal,{id,lostAccessReviewId}={}){
  if(!ID.test(id||'')||!ID.test(lostAccessReviewId||''))
   throw fail('Identification invalide.');
  await reviewer(principal,id);
  await verifyDispute(lostAccessReviewId);
  return save(id,{id,lostAccessReviewId,revision:1,status:'pending',
    reviews:[],outcome:null},null);
 }
 async function inspect(principal,id){
  await reviewer(principal,id);
  return structuredClone((await read(id))?.data??null);
 }
 async function review(principal,{id,expectedRevision,decision,evidenceId}={}){
  if(!ID.test(id||'')||!Number.isSafeInteger(expectedRevision)
   ||!DECISIONS.has(decision)||!PROOF.test(evidenceId||''))
   throw fail('Avis de revue invalide.');
  const actor=await reviewer(principal,id);
  const current=await read(id);
  if(!current||current.data.status!=='pending'
    ||current.data.revision!==expectedRevision)
   throw fail('Révision de contestation périmée.');
  await verifyDispute(current.data.lostAccessReviewId);
  if(current.data.reviews.some(r=>r.reviewerId===actor))
   throw fail('Second relecteur distinct obligatoire.');
  if(current.data.reviews.length>=2)throw fail('Revue déjà terminée.');
  if(await verifyEvidence({lostAccessReviewId:current.data.lostAccessReviewId,
    reviewerId:actor,decision,evidenceId})!==true)throw fail('Preuve indépendante insuffisante.');
  // The action is not reversible just because audit succeeds. On a write failure,
  // the audit is an orphan event and needs reconciliation; never grant access.
  if(await audit({kind:'disputed_access_review',id,reviewerId:actor,
    decision,evidenceId,expectedRevision})!==true)throw fail('Audit non confirmé.');
  const reviews=[...current.data.reviews,{reviewerId:actor,decision,evidenceId}];
  const done=reviews.length===2;
  const outcome=done?(reviews.every(r=>r.decision==='refer_to_separate_resolution')
    ?'refer_to_separate_resolution':'maintain_block'):null;
  return save(id,{...current.data,revision:expectedRevision+1,
    status:done?'closed':'pending',reviews,outcome},current.etag);
 }
 return Object.freeze({open,inspect,review});
}
