// Diploval V0.3 B6 — réponses privées à deux validations humaines.
// AUCUN envoi d'email, aucune publication publique, aucune route HTTP.
// Les réponses validées sont lisibles dans le dossier personnel uniquement.
// Toute alerte par e-mail exigera un consentement distinct et un transport
// sécurisé à concevoir ensuite. Le stockage injecté doit être chiffré.
import {caseState} from './dialogue-followup.mjs';

const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const validTime=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const control=/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;
const TOPICS=new Set(['acknowledgement','request_information','decision','appeal_update']);
const clone=x=>structuredClone(x);
const path=(id,mutation)=>{
 if(!ID.test(id||'')||!Number.isSafeInteger(mutation)||mutation<0||mutation>100000)
  throw Error('Identifiants de suivi invalides.');
 return 'dialogue-v03-notices/'+id+'/m'+mutation;
};
const text=value=>{
 if(typeof value!=='string'||value.trim().length<20||value.length>2000||control.test(value))
  throw Error('Message de 20 à 2 000 caractères requis.');
 return value.normalize('NFC').trim();
};
const toAuthor=n=>({
 reference:n.reference,consultationId:n.consultationId,topic:n.topic,
 message:n.message,createdAt:n.createdAt,approvedAt:n.approvedAt,
 caseMutation:n.caseMutation
});
const toModerator=n=>({
 reference:n.reference,consultationId:n.consultationId,topic:n.topic,
 message:n.message,status:n.status,createdAt:n.createdAt,
 approvedAt:n.approvedAt,caseMutation:n.caseMutation
});
export function createContributorResponses({
 store,readModeratorEntry,readAuthorEntry,authorizeModerator,resolveStaff,
 clock=()=>new Date().toISOString()
}={}){
 if(!store||typeof store.getWithMetadata!=='function'||typeof store.set!=='function'
  ||typeof readModeratorEntry!=='function'||typeof readAuthorEntry!=='function'
  ||typeof authorizeModerator!=='function'||typeof resolveStaff!=='function'
  ||typeof clock!=='function')
  throw Error('Stockage privé, habilitations et identité professionnelle requis.');
 const now=()=>{
  const stamp=clock();
  if(!validTime(stamp))throw Error('Date de traitement invalide.');
  return stamp;
 };
 const read=async key=>{
  const result=await store.getWithMetadata(key,{type:'json',consistency:'strong'});
  if(!result)return null;
  if(!result.data||!result.etag||!['draft','approved','revoked'].includes(result.data.status))
   throw Error('Stockage de réponse incohérent.');
  return result;
 };
 const confirm=async(key,data,etag)=>{
  const after=await read(key);
  if(!after||after.etag!==etag||JSON.stringify(after.data)!==JSON.stringify(data))
   throw Error('Réponse non confirmée.');
 };
 const staff=async principal=>{
  const identity=await resolveStaff(principal);
  if(!identity||!ID.test(identity.staffId||'')
   ||typeof identity.label!=='string'||identity.label.trim().length<3)
   throw Error('Identité professionnelle non vérifiée.');
  return identity;
 };
 const permitted=async(principal,action,entry)=>{
  if(await authorizeModerator(principal,action,entry)!==true)
   throw Error('Accès non autorisé.');
 };
 const moderationEntry=async(principal,entryId)=>{
  if(!ID.test(entryId||''))throw Error('Identifiant invalide.');
  const entry=await readModeratorEntry(principal,entryId);
  if(!entry||entry.id!==entryId)throw Error('Accès non autorisé.');
  return entry;
 };
 async function draft(principal,{entryId,expectedMutation,topic,message}={}){
  const entry=await moderationEntry(principal,entryId);
  await permitted(principal,'draft_notice',entry);
  if(!Number.isSafeInteger(expectedMutation)||entry.mutation!==expectedMutation)
   throw Error('Conflit : recharger le dossier.');
  if(!TOPICS.has(topic))throw Error('Sujet de réponse invalide.');
  const prepared=text(message),who=await staff(principal),stamp=now();
  // Un accusé de réception ou une demande de précisions peut être adressé
  // à un dossier en attente ; les décisions exigent un état décidé.
  const state=caseState(entry);
  if(topic==='decision'&&['pending','revision_pending'].includes(state))
   throw Error('Décision non encore enregistrée.');
  const record={
   entryId,reference:entry.reference,consultationId:entry.consultationId,
   caseMutation:expectedMutation,sourceState:state,
   topic,message:prepared,status:'draft',createdAt:stamp,
   createdBy:who.staffId,approvedAt:null,
   audit:[{at:stamp,action:'notice_drafted',actor:who.staffId}]
  };
  const key=path(entryId,expectedMutation);
  const saved=await store.set(key,JSON.stringify(record),{onlyIfNew:true});
  if(!saved?.modified||!saved.etag)
   throw Error('Une réponse existe déjà pour cette version du dossier.');
  await confirm(key,record,saved.etag);
  return toModerator(record);
 }
 async function approve(principal,{entryId,expectedMutation}={}){
  const entry=await moderationEntry(principal,entryId);
  await permitted(principal,'approve_notice',entry);
  if(!Number.isSafeInteger(expectedMutation)||entry.mutation!==expectedMutation)
   throw Error('Conflit : recharger le dossier.');
  const key=path(entryId,expectedMutation),previous=await read(key);
  if(!previous||previous.data.status!=='draft')
   throw Error('Aucune réponse à approuver.');
  if(previous.data.reference!==entry.reference
    ||previous.data.consultationId!==entry.consultationId
    ||previous.data.sourceState!==caseState(entry))
   throw Error('Le dossier a changé : réexaminer la réponse.');
  const who=await staff(principal);
  if(who.staffId===previous.data.createdBy)
   throw Error('Deuxième validation indépendante requise.');
  const stamp=now(),next=clone(previous.data);
  next.status='approved';next.approvedAt=stamp;
  next.audit.push({at:stamp,action:'notice_approved',actor:who.staffId});
  const saved=await store.set(key,JSON.stringify(next),{onlyIfMatch:previous.etag});
  if(!saved?.modified||!saved.etag)throw Error('Conflit : réessayer après relecture.');
  await confirm(key,next,saved.etag);
  return toModerator(next);
 }
 async function revoke(principal,{entryId,mutation,reason}={}){
  const entry=await moderationEntry(principal,entryId);
  await permitted(principal,'approve_notice',entry);
  const why=text(reason),who=await staff(principal),key=path(entryId,mutation);
  const previous=await read(key);
  if(!previous||previous.data.status!=='approved')throw Error('Aucune réponse validée à retirer.');
  if(previous.data.reference!==entry.reference||previous.data.consultationId!==entry.consultationId)
   throw Error('Réponse incohérente avec le dossier.');
  const next=clone(previous.data),stamp=now();
  next.status='revoked';
  next.audit.push({at:stamp,action:'notice_revoked',actor:who.staffId,reason:why});
  const saved=await store.set(key,JSON.stringify(next),{onlyIfMatch:previous.etag});
  if(!saved?.modified||!saved.etag)throw Error('Conflit : recharger la réponse.');
  await confirm(key,next,saved.etag);
  return toModerator(next);
 }
 async function forAuthor(principal,{entryId,mutation}={}){
  if(!ID.test(entryId||''))throw Error('Identifiant invalide.');
  const entry=await readAuthorEntry(principal,entryId);
  if(!entry||entry.id!==entryId)throw Error('Accès non autorisé.');
  const result=await read(path(entryId,mutation));
  if(!result||result.data.status!=='approved')return null;
  if(result.data.reference!==entry.reference
    ||result.data.consultationId!==entry.consultationId)
   throw Error('Réponse incohérente avec le dossier.');
  return toAuthor(result.data);
 }
 async function forModerator(principal,{entryId,mutation}={}){
  const entry=await moderationEntry(principal,entryId);
  await permitted(principal,'read_private',entry);
  const result=await read(path(entryId,mutation));
  if(!result)return null;
  if(result.data.reference!==entry.reference||result.data.consultationId!==entry.consultationId)
   throw Error('Réponse incohérente avec le dossier.');
  return toModerator(result.data);
 }
 return Object.freeze({draft,approve,revoke,forAuthor,forModerator});
}
