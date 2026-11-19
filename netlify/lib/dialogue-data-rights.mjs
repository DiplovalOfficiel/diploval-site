// Diploval V0.3 — B9.1, service interne de demandes RGPD.
// Aucun endpoint HTTP, aucune suppression automatique. Désactivé sans adaptateurs fiables.
const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const ACTIONS=['access','rectification','erasure','restriction','opposition','withdrawal'];
const isObject=x=>x&&typeof x==='object'&&!Array.isArray(x);
const error=message=>new Error(message);
const project=entry=>({
 reference:entry.reference,consultationId:entry.consultationId,kind:entry.kind,
 createdAt:entry.createdAt,visibility:entry.visibility,publishedVersion:entry.publishedVersion,
 versions:entry.versions.map(v=>({number:v.number,text:v.text,status:v.status,submittedAt:v.submittedAt})),
 publicLabel:entry.author.publicLabel??null,
 privateContact:entry.author.privateContact??null
});
export function createDialogueDataRights({authorRepository,authorize,recordRequest,auditEvent,clock=()=>new Date().toISOString()}={}){
 if(!authorRepository||typeof authorRepository.readPrivate!=='function')
  throw error('Lecture privée autorisée requise.');
 if([authorize,recordRequest,auditEvent,clock].some(fn=>typeof fn!=='function'))
  throw error('Authentification, registre de demandes et audit nécessaires.');
 async function check(principal,id,kind){
  if(!isObject(principal)||!ID.test(id||'')||!ACTIONS.includes(kind))
   throw error('Demande invalide.');
  if(await authorize(principal,id,kind)!==true)throw error('Accès non autorisé.');
 }
 async function load(principal,id){
  const entry=await authorRepository.readPrivate(principal,id);
  if(!entry||entry.id!==id||!Array.isArray(entry.versions)||!isObject(entry.author))
   throw error('Dossier indisponible.');
  return entry;
 }
 async function access(principal,id){
  await check(principal,id,'access');
  const entry=await load(principal,id);
  const request=await recordRequest({entryId:id,kind:'access',at:clock()});
  if(!request||typeof request.reference!=='string'||!request.reference)
   throw error('Demande non enregistrée.');
  const data=project(structuredClone(entry));
  await auditEvent({kind:'access_export',entryId:id,requestRef:request.reference,at:clock()});
  return Object.freeze({schema:'diploval-v03-access-export-v1',
   requestReference:request.reference,generatedAt:clock(),data});
 }
 async function requestChange(principal,id,{kind,details}={}){
  if(!ACTIONS.includes(kind)||kind==='access')throw error('Type de droit inconnu.');
  if(typeof details!=='string'||details.trim().length<8||details.length>2000)
   throw error('Précisions insuffisantes ou trop longues.');
  await check(principal,id,kind);
  await load(principal,id);
  const result=await recordRequest({entryId:id,kind,details:details.trim(),
   at:clock(),status:'pending_review'});
  if(!result||typeof result.reference!=='string'||!result.reference)
   throw error('Demande non enregistrée.');
  await auditEvent({kind:'rights_request',right:kind,entryId:id,
   requestRef:result.reference,at:clock()});
  // Le traitement matériel nécessite une décision et un workflow multi-stockages séparés.
  return Object.freeze({reference:result.reference,status:'pending_review',executed:false});
 }
 return Object.freeze({access,requestChange});
}
