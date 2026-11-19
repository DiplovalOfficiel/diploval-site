// Diploval V0.3 — récupération de références sans divulgation d'identité.
// Module serveur non exposé. L'index par empreinte de contact est injecté :
// il doit être créé/tenu à jour dans un stockage privé, chiffré, audité et
// synchronisé avec l'effacement RGPD. Ne jamais l'utiliser comme annuaire public.
import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';

const PREFIX='dialogue-v03-recovery';
const LINK_TTL=10*60*1000,SESSION_TTL=15*60*1000;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const MAX_MATCHES=100;
const normalizeEmail=value=>{
 if(typeof value!=='string')return null;
 const normalized=value.trim().toLowerCase();
 return normalized.length>0&&normalized.length<=254
   &&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)?normalized:null;
};
const equals=(a,b)=>{
 if(typeof a!=='string'||typeof b!=='string')return false;
 const x=Buffer.from(a),y=Buffer.from(b);
 return x.length===y.length&&timingSafeEqual(x,y);
};
const projection=e=>({
 reference:e.reference,consultationId:e.consultationId,kind:e.kind,
 status:e.visibility==='withdrawn'?'withdrawn':e.visibility==='public'?'public':
  e.versions?.at(-1)?.status==='rejected'?'rejected':'pending',
 lastActivity:e.versions?.at(-1)?.submittedAt||e.createdAt||null
});
export function createReferenceRecovery({store,secret,lookupByDigest,loadEntry,sendRecovery,clock=()=>Date.now()}={}){
 if(!store||typeof store.getWithMetadata!=='function'||typeof store.set!=='function')
  throw Error('Stockage privé des accès requis.');
 if(!Buffer.isBuffer(secret)||secret.length<32)
  throw Error('Clé HMAC indépendante de 256 bits minimum requise.');
 if(typeof lookupByDigest!=='function'||typeof loadEntry!=='function'
   ||typeof sendRecovery!=='function')throw Error('Index privé, chargeur et transport requis.');
 if(typeof clock!=='function')throw Error('Horloge serveur requise.');
 const key=Buffer.from(secret);
 const digest=(scope,input)=>createHmac('sha256',key).update(scope+'\u0000'+input).digest('hex');
 const contactDigest=email=>digest('contact',email);
 const token=()=>randomBytes(32).toString('base64url');
 const recordKey=(type,raw)=>PREFIX+'/'+type+'/'+digest(type,raw);
 const now=()=>{
  const timestamp=clock();
  if(!Number.isSafeInteger(timestamp)||timestamp<0)throw Error('Horloge invalide.');
  return timestamp;
 };
 const read=async path=>{
  const r=await store.getWithMetadata(path,{type:'json',consistency:'strong'});
  if(!r)return null;
  if(!r.etag||!r.data||typeof r.data!=='object')throw Error('Stockage incohérent.');
  return r;
 };
 const confirm=async(path,value,etag)=>{
  const after=await read(path);
  if(!after||after.etag!==etag||JSON.stringify(after.data)!==JSON.stringify(value))
   throw Error('Enregistrement non confirmé.');
 };
 const setNew=async(path,value)=>{
  const result=await store.set(path,JSON.stringify(value),{onlyIfNew:true});
  if(!result?.modified||!result.etag)throw Error('Enregistrement impossible.');
  await confirm(path,value,result.etag);
 };
 const consume=async(path,old,value)=>{
  const result=await store.set(path,JSON.stringify(value),{onlyIfMatch:old.etag});
  if(!result?.modified||!result.etag)return false;
  await confirm(path,value,result.etag);
  return true;
 };
 // Un index ne fait pas autorité : chaque fiche est rechargée et son contact
 // est comparé à l'empreinte avant restitution ou émission d'un lien.
 const matching=async hash=>{
  if(typeof hash!=='string'||!/^[a-f0-9]{64}$/.test(hash))return [];
  const ids=await lookupByDigest(hash);
  if(!Array.isArray(ids)||ids.length>MAX_MATCHES)throw Error('Index des dossiers invalide.');
  const unique=new Set();
  const results=[];
  for(const id of ids){
   if(!ID.test(id)||unique.has(id))continue;
   unique.add(id);
   const entry=await loadEntry(id);
   const contact=normalizeEmail(entry?.author?.privateContact);
   if(entry?.id===id&&contact&&equals(contactDigest(contact),hash))results.push(entry);
  }
  return results;
 };
 /**
  * Réponse toujours identique, aucune référence ni existence d'adresse divulguée.
  * Un futur endpoint doit appliquer des limites par origine et empreinte d'adresse,
  * une protection anti-robot et un contrôle des envois en double.
  */
 async function requestRecovery({email}={}){
  const generic={accepted:true},normalized=normalizeEmail(email);
  if(!normalized)return generic;
  const hash=contactDigest(normalized),entries=await matching(hash);
  if(!entries.length)return generic;
  const raw=token(),stamp=now(),path=recordKey('links',raw);
  await setNew(path,{contactDigest:hash,status:'pending',
   issuedAt:stamp,expiresAt:stamp+LINK_TTL});
  // Le token n'est jamais stocké en clair ni retourné au navigateur.
  await sendRecovery({to:normalized,token:raw,expiresAt:stamp+LINK_TTL});
  return generic;
 }
 async function redeemRecovery(raw){
  if(typeof raw!=='string'||!TOKEN.test(raw))return null;
  const path=recordKey('links',raw),record=await read(path),stamp=now();
  if(!record||record.data.status!=='pending'
    ||!Number.isSafeInteger(record.data.expiresAt)||record.data.expiresAt<=stamp
    ||typeof record.data.contactDigest!=='string')return null;
  if(!(await matching(record.data.contactDigest)).length)return null;
  if(!(await consume(path,record,{...record.data,status:'used',usedAt:stamp})))return null;
  const opaque=token(),sessionPath=recordKey('sessions',opaque);
  const session={status:'active',contactDigest:record.data.contactDigest,
   createdAt:stamp,expiresAt:stamp+SESSION_TTL};
  await setNew(sessionPath,session);
  return {sessionToken:opaque,expiresAt:session.expiresAt};
 }
 async function listReferences(sessionToken){
  if(typeof sessionToken!=='string'||!TOKEN.test(sessionToken))return null;
  const session=await read(recordKey('sessions',sessionToken)),stamp=now();
  if(!session||session.data.status!=='active'
    ||!Number.isSafeInteger(session.data.expiresAt)||session.data.expiresAt<=stamp)return null;
  return (await matching(session.data.contactDigest)).map(projection)
   .sort((a,b)=>String(b.lastActivity||'').localeCompare(String(a.lastActivity||'')));
 }
 async function revokeRecovery(sessionToken){
  if(typeof sessionToken!=='string'||!TOKEN.test(sessionToken))return false;
  const path=recordKey('sessions',sessionToken),old=await read(path);
  if(!old||old.data.status!=='active')return false;
  return consume(path,old,{...old.data,status:'revoked',revokedAt:now()});
 }
 return Object.freeze({requestRecovery,redeemRecovery,listReferences,revokeRecovery});
}
