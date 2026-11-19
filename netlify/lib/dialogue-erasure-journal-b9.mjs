// Diploval V0.3 — B9.3 — journal CAS et exclusion exclusive conservatrice.
// Prototype serveur seulement. Aucun endpoint, aucun stockage fournisseur raccordé.
// Un verrou abandonné NE s'expire PAS automatiquement : reprise supervisée requise.
const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const OWNER=/^[a-z0-9_-]{16,96}$/i;
const clone=x=>structuredClone(x);
const err=m=>new Error(m);
export function createErasureCaseJournal({store,prefix='dialogue-v03-erasure-b9',clock=()=>new Date().toISOString()}={}){
 if(!store||typeof store.getWithMetadata!=='function'||typeof store.set!=='function'
    ||typeof clock!=='function'||!/^[a-z0-9-]{5,48}$/.test(prefix))
   throw err('Stockage ETag fort et horloge requis.');
 const path=id=>{if(!ID.test(id||''))throw err('Identifiant de demande invalide.');return prefix+'/'+id;};
 async function readRaw(id){
  const found=await store.getWithMetadata(path(id),{type:'json',consistency:'strong'});
  if(!found)return null;
  if(typeof found.etag!=='string'||!found.etag||!found.data
     ||found.data.caseId!==id||!Number.isSafeInteger(found.data.revision)
     ||found.data.revision<1||!['locked','released'].includes(found.data.lockStatus))
    throw err('Journal durable incohérent.');
  return {data:clone(found.data),etag:found.etag};
 }
 async function persist(id,value,etag){
  const result=await store.set(path(id),JSON.stringify(value),etag?{onlyIfMatch:etag}:{onlyIfNew:true});
  if(result?.modified!==true||!result.etag)throw err('Conflit CAS ou écriture non confirmée.');
  const confirmed=await readRaw(id);
  if(!confirmed||confirmed.etag!==result.etag
     ||JSON.stringify(confirmed.data)!==JSON.stringify(value))throw err('Journal non confirmé.');
  return confirmed;
 }
 async function acquire(id,owner){
  if(!OWNER.test(owner||''))throw err('Identifiant opérateur invalide.');
  const prev=await readRaw(id);
  if(prev&&prev.data.lockStatus!=='released')throw err('Dossier déjà verrouillé ; reprise supervisée.');
  const value={caseId:id,revision:(prev?.data.revision||0)+1,
   lockStatus:'locked',owner,acquiredAt:clock(),
   checkpoint:prev?.data.checkpoint??null};
  await persist(id,value,prev?.etag);
  return Object.freeze({caseId:id,owner,revision:value.revision});
 }
 async function verify(token){
  if(!token||!ID.test(token.caseId||'')||!OWNER.test(token.owner||'')
     ||!Number.isSafeInteger(token.revision))throw err('Jeton de verrou invalide.');
  const current=await readRaw(token.caseId);
  if(!current||current.data.lockStatus!=='locked'||current.data.owner!==token.owner
     ||current.data.revision!==token.revision)throw err('Verrou périmé ou non détenu.');
  return current;
 }
 function scoped(token){
  return Object.freeze({
   read:async id=>{
    if(id!==token.caseId)throw err('Périmètre journal refusé.');
    return clone((await verify(token)).data.checkpoint);
   },
   write:async(id,checkpoint)=>{
    if(id!==token.caseId||!checkpoint||checkpoint.caseId!==id
       ||!Array.isArray(checkpoint.completed))throw err('Checkpoint invalide.');
    const prev=await verify(token);
    await persist(id,{...prev.data,checkpoint:clone(checkpoint)},prev.etag);
    return true;
   }
  });
 }
 async function release(token){
  const prev=await verify(token);
  await persist(token.caseId,{...prev.data,lockStatus:'released',owner:null,
   releasedAt:clock()},prev.etag);
  return true;
 }
 // Aucun 'forceUnlock' : la reprise après crash requiert un processus indépendant,
 // vérification des gestes exécutés et invalidation des exécutants précédents.
 return Object.freeze({acquire,scoped,release,inspect:async id=>clone((await readRaw(id))?.data??null)});
}
