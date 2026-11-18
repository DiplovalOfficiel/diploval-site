// DIPLOVAL V0.3 — dépôt privé, sans endpoint HTTP ni activation publique.
// Cet adaptateur est uniquement utilisable par un futur service serveur qui
// authentifie réellement les personnes ET injecte une politique authorize.
// Sans politique de contrôle d'accès explicite, la création échoue.
// IMPORTANT : chiffrement, RGPD, sauvegardes et anti-abus restent à valider.
import {publicView} from './dialogue-model.mjs';

const idPattern=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const refPattern=/^[A-Z]{2,5}-\d{4}-[A-F0-9]{12,}$/;
const validId=value=>typeof value==='string'&&idPattern.test(value);
const validRef=value=>typeof value==='string'&&value.length<=80&&refPattern.test(value);
const clone=value=>structuredClone(value);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const conflict=()=>new Error('Conflit : les données ont changé. Recharger avant de réessayer.');
const failed=()=>new Error('Enregistrement non confirmé ; aucune réussite ne peut être annoncée.');
const MAX_BYTES=1024*1024;

export function createDialogueRepository({store,authorize,prefix='dialogue-v03'}={}){
  if(!store||typeof store.getWithMetadata!=='function'||typeof store.set!=='function'){
    throw Error('Stockage privé compatible avec les écritures conditionnelles requis.');
  }
  if(typeof authorize!=='function')throw Error('Aucune politique d’autorisation vérifiée : accès interdit.');
  if(!/^[a-z0-9-]{5,48}$/.test(prefix))throw Error('Espace de stockage invalide.');
  const recordKey=id=>{
    if(!validId(id))throw Error('Identifiant interne invalide.');
    return prefix+'/records/'+id;
  };
  const refKey=ref=>{
    if(!validRef(ref))throw Error('Référence publique invalide.');
    return prefix+'/references/'+ref;
  };
  const checkedAccess=async(principal,action,entry=null)=>{
    // Le principal doit être créé par un service serveur après authentification,
    // jamais depuis un rôle librement envoyé par un navigateur.
    if((await authorize(principal,action,entry?clone(entry):null))!==true){
      throw Error('Accès non autorisé.');
    }
  };
  const getJson=async key=>{
    const result=await store.getWithMetadata(key,{type:'json',consistency:'strong'});
    if(!result)return null;
    if(!result.data||typeof result.data!=='object'||!result.etag){
      throw Error('Stockage incohérent : lecture privée impossible.');
    }
    return result;
  };
  const encode=entry=>{
    const content=JSON.stringify(entry);
    if(!content||Buffer.byteLength(content,'utf8')>MAX_BYTES)throw Error('Dossier trop volumineux.');
    return content;
  };
  const confirm=async(key,expected)=>{
    const found=await getJson(key);
    if(!found||!same(found.data,expected))throw failed();
    return found;
  };
  const checkNew=entry=>{
    if(!entry||typeof entry!=='object'||!validId(entry.id)||!validRef(entry.reference)){
      throw Error('Identifiants de dossier invalides.');
    }
    if(!validId(entry.consultationId)||!['contribution','reply','charter'].includes(entry.kind)){
      throw Error('Type de dossier invalide.');
    }
    if(entry.visibility!=='private'||entry.publishedVersion!==null||entry.mutation!==0
        ||!Array.isArray(entry.versions)||entry.versions.length!==1
        ||entry.versions[0]?.status!=='pending'||!Array.isArray(entry.audit)
        ||entry.audit.length!==1){
      throw Error('Seule une contribution privée initiale peut être déposée.');
    }
  };
  async function createPrivate(principal,entry){
    await checkedAccess(principal,'create');
    checkNew(entry);
    const record=clone(entry),claim={id:record.id};
    // Réservation atomique de la référence avant le dépôt.
    // Si le second write échoue, la réservation orpheline doit être
    // récupérée par un futur outil interne, jamais exposée publiquement.
    const reserved=await store.set(refKey(record.reference),JSON.stringify(claim),{onlyIfNew:true});
    if(!reserved?.modified||!reserved.etag)throw conflict();
    await confirm(refKey(record.reference),claim);
    const saved=await store.set(recordKey(record.id),encode(record),{onlyIfNew:true});
    if(!saved?.modified||!saved.etag)throw conflict();
    await confirm(recordKey(record.id),record);
    return {id:record.id,reference:record.reference,mutation:record.mutation};
  }
  async function readPrivate(principal,id){
    const existing=await getJson(recordKey(id));
    if(!existing)return null;
    await checkedAccess(principal,'read_private',existing.data);
    return clone(existing.data);
  }
  async function mutatePrivate(principal,id,{expectedMutation,operation,transform}={}){
    const key=recordKey(id);
    const existing=await getJson(key);
    if(!existing)return null;
    if(typeof operation!=='string'||!['revise','moderate','withdraw'].includes(operation)
       ||typeof transform!=='function'){
      throw Error('Opération serveur inconnue ou non autorisée.');
    }
    await checkedAccess(principal,operation,existing.data);
    if(!Number.isSafeInteger(expectedMutation)||existing.data.mutation!==expectedMutation)throw conflict();
    const old=clone(existing.data);
    const next=transform(clone(old));
    if(!next||typeof next!=='object'||next.mutation!==expectedMutation+1
       ||!Array.isArray(next.audit)||next.audit.length!==old.audit.length+1){
      throw Error('Mutation invalide : version ou journal incohérents.');
    }
    for(const field of ['id','reference','consultationId','kind','parent','author','permissions','createdAt']){
      if(!same(old[field],next[field]))throw Error('Mutation interdite sur un champ d’identité ou de consentement.');
    }
    const saved=await store.set(key,encode(next),{onlyIfMatch:existing.etag});
    if(!saved?.modified||!saved.etag)throw conflict();
    await confirm(key,next);
    return {id:next.id,reference:next.reference,mutation:next.mutation};
  }
  async function readPublicReference(reference){
    // Projection à liste blanche seulement, sans clé d'accès ni données privées.
    const claim=await getJson(refKey(reference));
    if(!claim)return null;
    const id=claim.data.id;
    if(!validId(id))throw Error('Index de références incohérent.');
    const saved=await getJson(recordKey(id));
    if(!saved)return null;
    if(saved.data.reference!==reference)throw Error('Référence croisée incohérente.');
    return publicView(saved.data);
  }
  return Object.freeze({createPrivate,readPrivate,mutatePrivate,readPublicReference});
}
