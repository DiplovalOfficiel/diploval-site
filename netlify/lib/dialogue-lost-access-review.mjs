// Diploval V0.3 — qualification administrative de perte d'accès.
// Aucun rétablissement, aucune liaison au compte, aucun envoi, aucun HTTP.
// Le numéro de suivi n'est PAS une preuve d'identité.
const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const fail=m=>new Error(m);
const STATUSES=new Set(['submitted','under_review','needs_more_evidence','disputed','approved_for_separate_action','rejected','closed']);
const NEXT=Object.freeze({
 submitted:['under_review','rejected','closed'],
 under_review:['needs_more_evidence','disputed','approved_for_separate_action','rejected'],
 needs_more_evidence:['under_review','rejected','closed'],
 disputed:['under_review','rejected','closed'],
 approved_for_separate_action:['closed'],
 rejected:['closed'],
 closed:[]
});
export function createLostAccessReview({
 enabled=false,store,authorize,verifyReview,evidenceRecord,prefix='dialogue-v03-lost-access'
}={}){
 if(enabled!==true)return Object.freeze({open:async()=>{throw fail('Récupération désactivée.');},
  transition:async()=>{throw fail('Récupération désactivée.');},
  inspect:async()=>{throw fail('Récupération désactivée.');}});
 if(!store||typeof store.getWithMetadata!=='function'||typeof store.set!=='function'
  ||typeof authorize!=='function'||typeof verifyReview!=='function'
  ||typeof evidenceRecord!=='function'||!/^[a-z0-9-]{5,48}$/.test(prefix))
  throw fail('Garanties de revue manquantes.');
 const path=id=>{if(!ID.test(id||''))throw fail('Identifiant invalide.');return prefix+'/'+id;};
 async function read(id){
  const x=await store.getWithMetadata(path(id),{type:'json',consistency:'strong'});
  if(!x)return null;
  if(!x.etag||!x.data||x.data.id!==id||!STATUSES.has(x.data.status)
    ||!Number.isSafeInteger(x.data.revision))throw fail('Dossier de revue incohérent.');
  return {etag:x.etag,data:structuredClone(x.data)};
 }
 async function persist(id,obj,etag){
  const result=await store.set(path(id),JSON.stringify(obj),etag?{onlyIfMatch:etag}:{onlyIfNew:true});
  if(result?.modified!==true||!result.etag)throw fail('Conflit ou enregistrement non confirmé.');
  const check=await read(id);
  if(!check||check.etag!==result.etag||JSON.stringify(check.data)!==JSON.stringify(obj))
   throw fail('Relecture de contrôle non confirmée.');
  return structuredClone(obj);
 }
 async function open(principal,{id,caseId,reasonCode}={}){
  if(!ID.test(id||'')||!ID.test(caseId||'')||!['email_unavailable','access_disputed'].includes(reasonCode))
   throw fail('Demande de revue invalide.');
  if(await authorize(principal,'open_lost_access_review',caseId)!==true)
   throw fail('Ouverture non autorisée.');
  // No email address, free-text allegations or identity documents in this journal.
  return persist(id,{id,caseId,reasonCode,status:'submitted',revision:1,
    decisionEvidence:null,reviewerId:null},null);
 }
 async function inspect(principal,id){
  const row=await read(id);
  if(await authorize(principal,'inspect_lost_access_review',row?.data.caseId??null)!==true)
   throw fail('Lecture non autorisée.');
  return row?structuredClone(row.data):null;
 }
 async function transition(principal,{id,expectedRevision,to,evidenceId,reviewerId}={}){
  if(!ID.test(id||'')||!STATUSES.has(to)||typeof evidenceId!=='string'
   ||!/^[a-z0-9_-]{12,100}$/i.test(evidenceId)
   ||typeof reviewerId!=='string'||!/^[a-z0-9_-]{8,96}$/i.test(reviewerId))
   throw fail('Transition invalide.');
  const old=await read(id);if(!old)throw fail('Revue introuvable.');
  if(await authorize(principal,'decide_lost_access_review',old.data.caseId)!==true)
   throw fail('Décision non autorisée.');
  if(old.data.revision!==expectedRevision||!NEXT[old.data.status].includes(to))
   throw fail('État ou révision incompatible.');
  // For approval, independently verify evidence; allow suspension on dispute.
  if(to==='approved_for_separate_action'&&
      await verifyReview({caseId:old.data.caseId,reviewId:id,evidenceId,reviewerId})!==true)
   throw fail('Preuves insuffisantes.');
  if(await evidenceRecord({reviewId:id,caseId:old.data.caseId,to,evidenceId,reviewerId})!==true)
   throw fail('Audit de décision non confirmé.');
  return persist(id,{...old.data,status:to,revision:old.data.revision+1,
    decisionEvidence:evidenceId,reviewerId},old.etag);
 }
 return Object.freeze({open,inspect,transition});
}
