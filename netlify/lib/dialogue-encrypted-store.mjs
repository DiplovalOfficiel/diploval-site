// Diploval V0.3 : enveloppe chiffrée AES-256-GCM pour le stockage privé.
// Module serveur inactif sans configuration et sans route HTTP.
// Les versions de clés, leur rotation, sauvegardes et la conformité juridique
// doivent faire l'objet d'une procédure validée avant la production.
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';

const VERSION=1;
const MAX_PLAINTEXT_BYTES=1024*1024;
const MAX_ENVELOPE_BYTES=2*1024*1024;
const validPath=path=>typeof path==='string'&&path.length>=5&&path.length<=250
  &&/^[a-z0-9][a-z0-9_/-]*$/i.test(path)
  &&!path.includes('//')&&!path.includes('..');
const failure=()=>new Error('Donnée privée indisponible ou intégrité non vérifiée.');
const aad=path=>Buffer.from('DIPLOVAL-V03-AES-GCM\u0000'+path,'utf8');
const strong=(store)=>store&&typeof store.getWithMetadata==='function'&&typeof store.set==='function';

export function decodeEncryptionKey(value){
  if(typeof value!=='string'||!(/^[A-Za-z0-9+/]{43}=$/.test(value)
    ||/^[A-Za-z0-9_-]{43}$/.test(value))){
    throw Error('Clé de chiffrement absente ou mal formatée (base64 de 32 octets).');
  }
  const result=Buffer.from(value,'base64');
  if(result.length!==32)throw Error('Clé de chiffrement de 256 bits requise.');
  return result;
}
export function createEncryptedStore({store,key,nonce=randomBytes}={}){
  if(!strong(store))throw Error('Stockage privé avec lecture forte et ETag requis.');
  if(!Buffer.isBuffer(key)||key.length!==32)throw Error('Clé de chiffrement AES-256 requise.');
  if(typeof nonce!=='function')throw Error('Générateur d’aléa invalide.');
  const secret=Buffer.from(key);
  const check=path=>{
    if(!validPath(path))throw Error('Chemin du stockage privé invalide.');
    return path;
  };
  async function set(path,plaintext,options={}){
    const name=check(path);
    if(typeof plaintext!=='string'||Buffer.byteLength(plaintext,'utf8')>MAX_PLAINTEXT_BYTES)
      throw Error('Écriture privée trop volumineuse ou invalide.');
    let value;
    try{value=JSON.parse(plaintext)}catch{throw Error('Le stockage privé accepte uniquement du JSON.')}
    if(!value||typeof value!=='object')throw Error('Objet JSON privé requis.');
    const iv=nonce(12);
    if(!Buffer.isBuffer(iv)||iv.length!==12)throw Error('Nonce cryptographique invalide.');
    const cipher=createCipheriv('aes-256-gcm',secret,iv);
    cipher.setAAD(aad(name));
    const encrypted=Buffer.concat([cipher.update(Buffer.from(plaintext,'utf8')),cipher.final()]);
    const envelope=JSON.stringify({
      version:VERSION,algorithm:'AES-256-GCM',
      iv:iv.toString('base64url'),
      payload:encrypted.toString('base64url'),
      tag:cipher.getAuthTag().toString('base64url')
    });
    if(Buffer.byteLength(envelope)>MAX_ENVELOPE_BYTES)throw Error('Enveloppe privée trop volumineuse.');
    // Les préconditions d'écriture doivent être transmises sans altération.
    if(options&&typeof options==='object'&&Object.keys(options).some(k=>!['onlyIfNew','onlyIfMatch'].includes(k))){
      throw Error('Option de stockage non autorisée.');
    }
    return store.set(name,envelope,options);
  }
  async function getWithMetadata(path,options={}){
    const name=check(path);
    if(options?.type&&options.type!=='json')throw Error('Lecture JSON chiffrée uniquement.');
    const found=await store.getWithMetadata(name,{type:'json',consistency:'strong'});
    if(!found)return null;
    try{
      const e=found.data;
      if(!e||e.version!==VERSION||e.algorithm!=='AES-256-GCM'
         ||typeof e.iv!=='string'||typeof e.payload!=='string'||typeof e.tag!=='string'
         ||!found.etag)throw Error('Enveloppe invalide.');
      const iv=Buffer.from(e.iv,'base64url'),tag=Buffer.from(e.tag,'base64url');
      const encrypted=Buffer.from(e.payload,'base64url');
      if(iv.length!==12||tag.length!==16||encrypted.length>MAX_ENVELOPE_BYTES)
        throw Error('Taille d’enveloppe invalide.');
      const cipher=createDecipheriv('aes-256-gcm',secret,iv);
      cipher.setAAD(aad(name));cipher.setAuthTag(tag);
      const result=Buffer.concat([cipher.update(encrypted),cipher.final()]);
      if(result.length>MAX_PLAINTEXT_BYTES)throw Error('Déchiffrement trop volumineux.');
      const data=JSON.parse(result.toString('utf8'));
      if(!data||typeof data!=='object')throw Error('Objet privé invalide.');
      return {data,etag:found.etag};
    }catch{throw failure();}
  }
  return Object.freeze({getWithMetadata,set});
}
