// Diploval V0.3 — contrôle non destructif des références réservées.
// Diagnostic interne seulement. Aucun endpoint, aucune suppression automatique.
const REF=/^[A-Z]{2,5}-\d{4}-[A-F0-9]{12,}$/;
const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const fail=message=>new Error(message);
export function createReferenceIntegrityInspector({
 enabled=false,store,authorize,prefix='dialogue-v03'
}={}){
 if(enabled!==true)return Object.freeze({inspect:async()=>{throw fail('Audit références désactivé.');}});
 if(!store||typeof store.getWithMetadata!=='function'
    ||typeof authorize!=='function'||!/^[a-z0-9-]{5,48}$/.test(prefix))
  throw fail('Dépendances d’audit incomplètes.');
 async function read(key){
  const value=await store.getWithMetadata(key,{type:'json',consistency:'strong'});
  if(value===null||value===undefined)return null;
  if(!value.etag||!value.data||typeof value.data!=='object')
   throw fail('État de stockage non fiable.');
  return value.data;
 }
 async function inspect(principal,{reference}={}){
  if(!REF.test(reference||''))throw fail('Référence invalide.');
  if(await authorize(principal,'inspect_reference',reference)!==true)
   throw fail('Accès d’audit non autorisé.');
  const claimed=await read(prefix+'/references/'+reference);
  if(!claimed)return Object.freeze({reference,status:'not_found',safeToDelete:false});
  const id=claimed.id;
  if(!ID.test(id||''))return Object.freeze({reference,status:'invalid_claim',safeToDelete:false});
  const record=await read(prefix+'/records/'+id);
  // "orphan_candidate" is never proof of safe deletion: eventual consistency,
  // in-flight creates and historic failures can explain temporary absence.
  if(!record)return Object.freeze({reference,status:'orphan_candidate',recordId:id,safeToDelete:false});
  if(record.id!==id||record.reference!==reference)
   return Object.freeze({reference,status:'cross_reference_mismatch',recordId:id,safeToDelete:false});
  return Object.freeze({reference,status:'consistent',recordId:id,safeToDelete:false});
 }
 return Object.freeze({inspect});
}
