// Diploval V0.3 — diagnostic isolé, non destructif, des index HMAC de contact.
// Ne confirme PAS que l'email indexé appartient au dossier : rapprochement
// humain et mécanisme dédié restent nécessaires. Aucun endpoint public.
const HASH=/^[a-f0-9]{64}$/;
const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const error=message=>new Error(message);
export function createContactIndexIntegrityInspector({
 enabled=false,index,repository,authorize
}={}){
 if(enabled!==true)return Object.freeze({inspect:async()=>{throw error('Audit index désactivé.');}});
 if(!index||typeof index.lookupByDigest!=='function'
   ||!repository||typeof repository.readPrivate!=='function'
   ||typeof authorize!=='function')
   throw error('Dépendances d’audit des contacts incomplètes.');
 async function inspect(principal,{digest}={}){
  if(typeof digest!=='string'||!HASH.test(digest))
   throw error('Empreinte de contact invalide.');
  if(await authorize(principal,'inspect_contact_index')!==true)
   throw error('Audit non autorisé.');
  const ids=await index.lookupByDigest(digest);
  if(!Array.isArray(ids)||ids.length>100||ids.some(id=>typeof id!=='string'||!ID.test(id)))
   throw error('Index de contact incohérent.');
  // Duplicate IDs indicate corruption, not separate contributions.
  if(new Set(ids).size!==ids.length)throw error('Doublon dans l’index des contacts.');
  const details=[];
  for(const id of ids){
   const data=await repository.readPrivate(principal,id);
   if(data===null){details.push({id,status:'missing_record_candidate'});continue;}
   if(!data||data.id!==id||typeof data.reference!=='string'
     ||!Array.isArray(data.versions))
     details.push({id,status:'invalid_record'});
   else details.push({id,status:'record_exists_contact_unverified'});
  }
  return Object.freeze({indexedCount:ids.length,checkedCount:details.length,
   details:details.map(row=>Object.freeze(row)),
   safeToDelete:false,contactOwnershipVerified:false});
 }
 return Object.freeze({inspect});
}
