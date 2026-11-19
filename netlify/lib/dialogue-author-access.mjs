// Diploval V0.3 — accès auteur par lien à usage unique.
// AUCUNE route HTTP, aucun envoi réel, aucune connexion au stockage de production.
// La méthode loadEntry DOIT obtenir la fiche depuis le stockage serveur de confiance;
// ne jamais lui transmettre une fiche venue du navigateur.
import {createHmac, randomBytes, timingSafeEqual} from 'node:crypto';

const KEY_PREFIX='dialogue-v03-auth';
const LINK_TTL_MS=10*60*1000;
const SESSION_TTL_MS=2*60*60*1000;
const MAX_EMAIL=254;
const idPattern=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const tokenPattern=/^[A-Za-z0-9_-]{43}$/;
const toEmail=(value)=>{
  if(typeof value!=='string')return null;
  const text=value.trim().toLowerCase();
  return text.length<=MAX_EMAIL&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)?text:null;
};
const eq=(a,b)=>{
  if(typeof a!=='string'||typeof b!=='string')return false;
  const x=Buffer.from(a,'utf8'),y=Buffer.from(b,'utf8');
  return x.length===y.length&&timingSafeEqual(x,y);
};

/**
 * Nécessite un stockage serveur avec lecture forte et écritures conditionnelles,
 * une clé HMAC secrète propre à la V0.3, un chargeur serveur des dossiers et un
 * transport email injecté. Aucun fallback permissif.
 */
export function createAuthorAccess({store,secret,loadEntry,sendLink,clock=()=>Date.now()}={}){
  if(!store||typeof store.getWithMetadata!=='function'||typeof store.set!=='function'){
    throw Error('Stockage de jetons privé avec ETag requis.');
  }
  if(!Buffer.isBuffer(secret)||secret.length<32){
    throw Error('Clé serveur HMAC de 256 bits minimum requise.');
  }
  if(typeof loadEntry!=='function'||typeof sendLink!=='function'){
    throw Error('Lecture de dossier serveur et service d’envoi obligatoires.');
  }
  if(typeof clock!=='function')throw Error('Horloge invalide.');
  const authenticated=new WeakMap();
  const now=()=>{
    const value=clock();
    if(!Number.isSafeInteger(value)||value<0)throw Error('Horloge serveur invalide.');
    return value;
  };
  const digest=(domain,text)=>createHmac('sha256',secret)
    .update(domain+'\u0000'+text).digest('hex');
  const entryKey=(domain,token)=>KEY_PREFIX+'/'+domain+'/'+digest(domain,token);
  const emailDigest=email=>digest('email',email);
  const read=async key=>{
    const found=await store.getWithMetadata(key,{type:'json',consistency:'strong'});
    if(!found)return null;
    if(!found.etag||!found.data||typeof found.data!=='object')
      throw Error('Stockage des accès incohérent.');
    return found;
  };
  const confirm=async(key,data,etag)=>{
    const found=await read(key);
    if(!found||found.etag!==etag||JSON.stringify(found.data)!==JSON.stringify(data)){
      throw Error('Accès non confirmé : ne pas annoncer de réussite.');
    }
  };
  const saveNew=async(key,data)=>{
    const saved=await store.set(key,JSON.stringify(data),{onlyIfNew:true});
    if(!saved?.modified||!saved.etag)throw Error('Impossible de réserver le jeton.');
    await confirm(key,data,saved.etag);
  };
  const claim=async(key,old,newData)=>{
    const result=await store.set(key,JSON.stringify(newData),{onlyIfMatch:old.etag});
    if(!result?.modified||!result.etag)return false;
    await confirm(key,newData,result.etag);
    return true;
  };
  const validToken=x=>typeof x==='string'&&tokenPattern.test(x);
  const token=()=>randomBytes(32).toString('base64url');
  const sameAuthor=(record,email)=>{
    const actual=toEmail(record?.author?.privateContact);
    return !!actual&&eq(emailDigest(actual),emailDigest(email));
  };

  /**
   * Réponse identique pour adresse inconnue ou connue. Ne retourne JAMAIS de jeton.
   * Les contrôles de fréquence par IP et par adresse devront être ajoutés au futur
   * endpoint ; ce composant ne constitue pas une protection anti-spam.
   */
  async function requestLink({entryId,email}={}){
    const generic={accepted:true};
    if(typeof entryId!=='string'||!idPattern.test(entryId))return generic;
    const normalized=toEmail(email);
    if(!normalized)return generic;
    const record=await loadEntry(entryId);
    if(!record||record.id!==entryId||!sameAuthor(record,normalized))return generic;
    const raw=token(),stamp=now(),key=entryKey('links',raw);
    const data={
      entryId,contactDigest:emailDigest(normalized),
      issuedAt:stamp,expiresAt:stamp+LINK_TTL_MS,status:'pending'
    };
    await saveNew(key,data);
    // Un échec d'envoi ne retourne pas de jeton ; ce lien expire sans être utilisé.
    // Le transport doit éviter la journalisation des liens et de l'adresse.
    await sendLink({to:normalized,token:raw,expiresAt:data.expiresAt});
    return generic;
  }

  /** Consomme un lien en CAS atomique, puis crée une session opaque côté serveur. */
  async function redeemLink(raw){
    if(!validToken(raw))return null;
    const key=entryKey('links',raw),pending=await read(key),stamp=now();
    if(!pending||pending.data.status!=='pending'
      ||!Number.isSafeInteger(pending.data.expiresAt)||pending.data.expiresAt<=stamp
      ||typeof pending.data.entryId!=='string'||!idPattern.test(pending.data.entryId)
      ||typeof pending.data.contactDigest!=='string')return null;
    const latest=await loadEntry(pending.data.entryId);
    const contact=toEmail(latest?.author?.privateContact);
    if(!latest||latest.id!==pending.data.entryId||!contact
       ||!eq(emailDigest(contact),pending.data.contactDigest))return null;
    const used={...pending.data,status:'used',usedAt:stamp};
    if(!(await claim(key,pending,used)))return null;
    const sessionToken=token(),sessionKey=entryKey('sessions',sessionToken);
    const session={
      entryId:latest.id,contactDigest:pending.data.contactDigest,
      createdAt:stamp,expiresAt:stamp+SESSION_TTL_MS,status:'active'
    };
    await saveNew(sessionKey,session);
    // Ce jeton est destiné UNIQUEMENT à la création d'un cookie HttpOnly Secure
    // SameSite=Strict par un futur endpoint de confiance ; pas à localStorage.
    return {sessionToken,expiresAt:session.expiresAt};
  }

  /** Génère un principal opaque uniquement après lecture d'une session valide. */
  async function authenticate(sessionToken){
    if(!validToken(sessionToken))return null;
    const found=await read(entryKey('sessions',sessionToken)),stamp=now();
    if(!found||found.data.status!=='active'||!Number.isSafeInteger(found.data.expiresAt)
      ||found.data.expiresAt<=stamp||!idPattern.test(found.data.entryId))return null;
    const record=await loadEntry(found.data.entryId);
    const actual=toEmail(record?.author?.privateContact);
    if(!record||record.id!==found.data.entryId||!actual
      ||!eq(found.data.contactDigest,emailDigest(actual)))return null;
    const principal=Object.freeze({type:'author'});
    authenticated.set(principal,{entryId:record.id,contactDigest:found.data.contactDigest,sessionKey:entryKey('sessions',sessionToken)});
    return principal;
  }

  /** Révocation immédiate côté serveur, y compris avant l'expiration. */
  async function revokeSession(sessionToken){
    if(!validToken(sessionToken))return false;
    const key=entryKey('sessions',sessionToken),existing=await read(key);
    if(!existing||existing.data.status!=='active')return false;
    return claim(key,existing,{...existing.data,status:'revoked',revokedAt:now()});
  }

  /**
   * Autorisation vérifiée pour l'adaptateur du lot B1.
   * Aucun rôle de modérateur n'est donné ici : flux de modération à instruire
   * séparément, avec authentification professionnelle dédiée.
   */
  async function authorize(principal,action,entry=null){
    const proof=(principal&&typeof principal==='object')?authenticated.get(principal):null;
    if(!proof)return false;
    // Re-vérifier le statut à chaque autorisation : une révocation n'autorise
    // pas l'utilisation d'un principal ancien mis en mémoire par erreur.
    const active=await read(proof.sessionKey);
    if(!active||active.data.status!=='active'||active.data.expiresAt<=now()
       ||active.data.entryId!==proof.entryId
       ||!eq(active.data.contactDigest,proof.contactDigest))return false;
    // Le principal n'est pas réutilisable comme simple objet JSON.
    if(action==='lookup_private')return true;
    if(!entry||entry.id!==proof.entryId)return false;
    const contact=toEmail(entry.author?.privateContact);
    if(!contact||!eq(proof.contactDigest,emailDigest(contact)))return false;
    return action==='read_private'||action==='revise';
  }
  return Object.freeze({requestLink,redeemLink,authenticate,revokeSession,authorize});
}
