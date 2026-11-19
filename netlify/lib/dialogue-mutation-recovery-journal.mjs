// Diploval V0.3 — journal d'opérations multi-objets inachevées.
// Module interne sans route HTTP. N'effectue aucune modification des dossiers.
// "completed" n'est permis que sur attestation d'un contrôle indépendant.
const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const KINDS=new Set(['create','rectify_contact']);
const STEPS=Object.freeze({
 create:['reference_reserved','private_record_saved','contact_index_confirmed'],
 rectify_contact:['new_contact_verified','private_record_updated','new_index_confirmed','old_index_revoked','sessions_revoked']
});
const fail=m=>new Error(m),copy=x=>structuredClone(x);
export function createMutationRecoveryJournal({
 enabled=false,store,authorize,verifyStep,prefix='dialogue-v03-mutation-audit'
}={}){
 if(enabled!==true)return Object.freeze({begin:async()=>{throw fail('Suivi désactivé.');},
  inspect:async()=>{throw fail('Suivi désactivé.');},confirmStep:async()=>{throw fail('Suivi désactivé.');}});
 if(!store||typeof store.getWithMetadata!=='function'||typeof store.set!=='function'
  ||typeof authorize!=='function'||typeof verifyStep!=='function'
  ||!/^[a-z0-9-]{5,48}$/.test(prefix))throw fail('Dépendances de journal manquantes.');
 const path=id=>{if(!ID.test(id||''))throw fail('Identifiant invalide.');return prefix+'/'+id;};
 async function read(id){
  const x=await store.getWithMetadata(path(id),{type:'json',consistency:'strong'});
  if(!x)return null;
  if(!x.etag||!x.data||x.data.id!==id||!KINDS.has(x.data.kind)
   ||!Array.isArray(x.data.confirmed)||!['pending','complete'].includes(x.data.status))
   throw fail('Journal incohérent.');
  return {etag:x.etag,data:copy(x.data)};
 }
 async function persist(id,next,etag){
  const w=await store.set(path(id),JSON.stringify(next),
   etag?{onlyIfMatch:etag}:{onlyIfNew:true});
  if(w?.modified!==true||!w.etag)throw fail('Conflit ou journal non confirmé.');
  const reread=await read(id);
  if(!reread||reread.etag!==w.etag||JSON.stringify(reread.data)!==JSON.stringify(next))
   throw fail('Persistance non vérifiée.');
  return copy(next);
 }
 async function guard(p,op,id){if(await authorize(p,op,id)!==true)throw fail('Non autorisé.');}
 async function begin(principal,{id,kind,recordId,reference}={}){
  if(!ID.test(id||'')||!KINDS.has(kind)||!ID.test(recordId||'')
    ||typeof reference!=='string'||!/^[A-Z]{2,5}-\d{4}-[A-F0-9]{12,}$/.test(reference))
   throw fail('Demande invalide.');
  await guard(principal,'begin_mutation_audit',id);
  return persist(id,{id,kind,recordId,reference,status:'pending',confirmed:[]},null);
 }
 async function inspect(principal,id){
  await guard(principal,'inspect_mutation_audit',id);
  const x=await read(id);
  return x?copy(x.data):null;
 }
 async function confirmStep(principal,{id,step,evidenceId}={}){
  if(!ID.test(id||'')||typeof evidenceId!=='string'
   ||!/^[a-z0-9_-]{12,100}$/i.test(evidenceId))throw fail('Preuve invalide.');
  await guard(principal,'confirm_mutation_audit',id);
  const x=await read(id);if(!x)throw fail('Journal absent.');
  const sequence=STEPS[x.data.kind];
  if(x.data.status!=='pending'||sequence[x.data.confirmed.length]!==step)
   throw fail('Étape non autorisée ou hors ordre.');
  if(await verifyStep({id,kind:x.data.kind,recordId:x.data.recordId,
    reference:x.data.reference,step,evidenceId})!==true)throw fail('Effet non attesté.');
  const confirmed=[...x.data.confirmed,{step,evidenceId}];
  const next={...x.data,confirmed,status:confirmed.length===sequence.length?'complete':'pending'};
  return persist(id,next,x.etag);
 }
 return Object.freeze({begin,inspect,confirmStep});
}
