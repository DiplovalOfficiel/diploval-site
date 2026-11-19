// Diploval V0.3 — demandes de réexamen, exclusivement privées.
// Une décision sur un recours N'ENTRAÎNE JAMAIS une publication ni une
// modification de la contribution : tout changement exige un acte distinct,
// autorisé, tracé et vérifié dans le modèle de contribution existant.
// Stockage : adapter à createEncryptedStore + ETag AVANT usage réel.
import {randomUUID} from 'node:crypto';

const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const DECISIONS=new Set(['maintain','invite_revision','escalate']);
const SUPERVISOR_DECISIONS=new Set(['maintain','invite_revision']);
const clone=x=>structuredClone(x);
const ERR=()=>new Error('Accès non autorisé.');
const check=x=>typeof x==='string'&&x.length>=10&&x.trim().length>=10&&x.length<=2000
  &&!/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(x);
const requireText=(x,label)=>{
 if(!check(x))throw Error(label+' : texte de 10 à 2 000 caractères requis.');
 return x.normalize('NFC').trim();
};
const activeVersion=entry=>{
 if(!entry||!Array.isArray(entry.versions)||!entry.versions.length)return null;
 const latest=entry.versions.at(-1);
 if(latest.status==='rejected')return latest.number;
 if(entry.visibility==='withdrawn'&&Number.isSafeInteger(entry.publishedVersion))
  return entry.publishedVersion;
 return null;
};
const path=(id,version)=>{
 if(!ID.test(id||'')||!Number.isSafeInteger(version)||version<1||version>10000)
  throw Error('Identifiant ou version de recours invalide.');
 return 'dialogue-v03-appeals/'+id+'/v'+version;
};
const viewAuthor=appeal=>({
 reference:appeal.reference,version:appeal.version,status:appeal.status,
 reason:appeal.reason,submittedAt:appeal.submittedAt,
 decision:appeal.decision?{
   outcome:appeal.decision.outcome,reason:appeal.decision.reason,at:appeal.decision.at
 }:null
});
const viewModerator=appeal=>({
 id:appeal.id,entryId:appeal.entryId,reference:appeal.reference,
 consultationId:appeal.consultationId,version:appeal.version,
 status:appeal.status,reason:appeal.reason,submittedAt:appeal.submittedAt,
 decision:appeal.decision?{
  outcome:appeal.decision.outcome,reason:appeal.decision.reason,at:appeal.decision.at
 }:null
});

export function createAppealService({
 store,readAuthorEntry,readModeratorEntry,authorizeModerator,clock=()=>new Date().toISOString()
}={}){
 if(!store||typeof store.getWithMetadata!=='function'||typeof store.set!=='function'
    ||typeof readAuthorEntry!=='function'||typeof readModeratorEntry!=='function'
    ||typeof authorizeModerator!=='function'||typeof clock!=='function'){
  throw Error('Stockage chiffré et droits de dossier nécessaires pour les recours.');
 }
 const timestamp=()=>{
  const value=clock();
  if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw Error('Horodatage invalide.');
  return value;
 };
 const read=async k=>{
  const found=await store.getWithMetadata(k,{type:'json',consistency:'strong'});
  if(!found)return null;
  if(!found.etag||!found.data||typeof found.data!=='object')throw Error('Stockage de recours incohérent.');
  return found;
 };
 const confirm=async(k,record,etag)=>{
  const after=await read(k);
  if(!after||after.etag!==etag||JSON.stringify(after.data)!==JSON.stringify(record))
    throw Error('Décision ou dépôt non confirmé.');
 };
 // L'identifiant interne du dossier provient exclusivement du contexte
 // personnel authentifié par le serveur, jamais d'une référence publique.
 async function submit(principal,{entryId,reason}={}){
  if(!ID.test(entryId||''))throw Error('Dossier de recours invalide.');
  const entry=await readAuthorEntry(principal,entryId); // contrôle d'accès auteur effectif
  if(!entry||entry.id!==entryId)throw ERR();
  const version=activeVersion(entry);
  if(!version)throw Error('Seule une décision de rejet ou de retrait peut faire l’objet de ce recours.');
  const statement=requireText(reason,'Motif du réexamen'),at=timestamp();
  const appeal={
    id:randomUUID(),entryId,consultationId:entry.consultationId,
    reference:entry.reference,version,reason:statement,status:'pending',
    submittedAt:at,decision:null,
    audit:[{at,action:'appeal_submitted',actor:'contributor'}]
  };
  const k=path(entryId,version);
  const result=await store.set(k,JSON.stringify(appeal),{onlyIfNew:true});
  if(!result?.modified||!result.etag)throw Error('Une demande de réexamen existe déjà pour cette décision.');
  await confirm(k,appeal,result.etag);
  return viewAuthor(appeal);
 }
 async function own(principal,{entryId,version}={}){
  const entry=await readAuthorEntry(principal,entryId);
  if(!entry||entry.id!==entryId)throw ERR();
  const found=await read(path(entryId,version));
  return found?viewAuthor(found.data):null;
 }
 async function forModerator(principal,{entryId,version}={}){
  const entry=await readModeratorEntry(principal,entryId);
  if(!entry||entry.id!==entryId)throw ERR();
  if(await authorizeModerator(principal,'read_appeal',entry)!==true)throw ERR();
  const found=await read(path(entryId,version));
  if(!found)return null;
  if(found.data.reference!==entry.reference||found.data.consultationId!==entry.consultationId)
   throw Error('Recours incohérent avec le dossier.');
  return viewModerator(found.data);
 }
 async function decide(principal,{
  entryId,version,decision,reason,expectedStatus='pending',actor
 }={}){
  const entry=await readModeratorEntry(principal,entryId);
  if(!entry||entry.id!==entryId)throw ERR();
  const wanted=expectedStatus==='escalated'?'resolve_escalation':'review_appeal';
  if(await authorizeModerator(principal,wanted,entry)!==true)throw ERR();
  const role=typeof actor==='string'&&actor.trim().length>=3&&actor.length<=120
    ?actor.trim():null;
  if(!role)throw Error('Identité professionnelle requise.');
  if(expectedStatus!=='pending'&&expectedStatus!=='escalated')
    throw Error('Statut attendu invalide.');
  if(!(expectedStatus==='pending'?DECISIONS:SUPERVISOR_DECISIONS).has(decision))
    throw Error('Décision de recours invalide.');
  const rationale=requireText(reason,'Motif de décision'),k=path(entryId,version),stored=await read(k);
  if(!stored||stored.data.status!==expectedStatus)
    throw Error('Conflit de recours : recharger le dossier.');
  if(stored.data.consultationId!==entry.consultationId||stored.data.reference!==entry.reference)
    throw Error('Recours incohérent avec le dossier.');
  const at=timestamp(),next=clone(stored.data);
  next.status=decision==='escalate'?'escalated':'resolved';
  next.decision={outcome:decision,reason:rationale,at};
  next.audit.push({at,actor:role,action:decision==='escalate'?'appeal_escalated':'appeal_reviewed',
    outcome:decision,reason:rationale});
  const result=await store.set(k,JSON.stringify(next),{onlyIfMatch:stored.etag});
  if(!result?.modified||!result.etag)throw Error('Conflit de recours : recharger le dossier.');
  await confirm(k,next,result.etag);
  return viewModerator(next);
 }
 return Object.freeze({submit,own,forModerator,decide});
}
