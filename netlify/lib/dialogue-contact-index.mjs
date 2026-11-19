// Diploval V0.3 — index privé des contributions par empreinte HMAC.
// A utiliser exclusivement à l'intérieur du serveur, avec un stockage
// chiffré. Pas d'endpoint public, aucune recherche par email accessible
// au navigateur. L'index n'accorde aucun droit : récupération B4 revalide
// chaque dossier après vérification d'un lien à usage unique.
import {createHmac} from 'node:crypto';
const PREFIX='dialogue-v03-contact-index/';
const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const DIGEST=/^[a-f0-9]{64}$/;
const MAX=100;
const normalize=value=>{
 if(typeof value!=='string')return null;
 const e=value.trim().toLowerCase();
 return e.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)?e:null;
};
export function createPrivateContactIndex({store,secret}={}){
 if(!store||typeof store.getWithMetadata!=='function'||typeof store.set!=='function')
  throw Error('Stockage chiffré et conditionnel requis.');
 if(!Buffer.isBuffer(secret)||secret.length<32)
  throw Error('Clé de l’index de 256 bits minimum requise.');
 const key=Buffer.from(secret);
 const digest=email=>createHmac('sha256',key).update('contact\u0000'+email).digest('hex');
 const path=hash=>PREFIX+hash;
 const read=async hash=>{
  if(!DIGEST.test(hash||''))throw Error('Empreinte invalide.');
  const result=await store.getWithMetadata(path(hash),{type:'json',consistency:'strong'});
  if(!result)return null;
  if(!result.etag||!Array.isArray(result.data?.ids)||result.data.ids.length>MAX
    ||result.data.ids.some(v=>!ID.test(v)))throw Error('Index incohérent.');
  return result;
 };
 const mutate=async(email,id,remove)=>{
  const normalized=normalize(email);
  if(!normalized||!ID.test(id||''))throw Error('Dossier ou contact invalide.');
  const hash=digest(normalized);
  for(let i=0;i<4;i++){
   const previous=await read(hash),ids=new Set(previous?.data.ids||[]);
   if(remove)ids.delete(id);
   else{
    if(ids.size>=MAX&&!ids.has(id))throw Error('Seuil d’index atteint.');
    ids.add(id);
   }
   const updated={ids:[...ids].sort()};
   if(previous&&JSON.stringify(previous.data)===JSON.stringify(updated))return;
   if(!previous&&remove)return;
   const write=await store.set(path(hash),JSON.stringify(updated),
    previous?{onlyIfMatch:previous.etag}:{onlyIfNew:true});
   if(!write?.modified)continue;
   if(!write.etag)throw Error('Modification non confirmée.');
   const confirmed=await read(hash);
   if(!confirmed||confirmed.etag!==write.etag
      ||JSON.stringify(confirmed.data)!==JSON.stringify(updated))
    throw Error('Modification non confirmée.');
   return;
  }
  throw Error('Conflit sur l’index privé : réessayer après contrôle.');
 };
 return Object.freeze({
  register:({email,id})=>mutate(email,id,false),
  unregister:({email,id})=>mutate(email,id,true),
  lookupByDigest:async hash=>(await read(hash))?.data.ids.slice()||[]
 });
}
