// Diploval V0.3 — modèle de domaine isolé, SANS accès réseau ni stockage.
// IMPORTANT : ce module ne publie rien et ne prouve pas la conformité RGPD.
// Toute exposition de données passe par publicView(), jamais par la sérialisation
// directe d'un dossier interne. Les droits de suppression/effacement restent à
// traiter par le service sécurisé avant mise en production.

import {randomBytes, randomUUID} from 'node:crypto';

export const KINDS=Object.freeze(['contribution','reply','charter']);
export const DISPLAY_MODES=Object.freeze(['without_name','pseudonym','name']);
export const REVIEW_DECISIONS=Object.freeze(['approve','reject']);
export const REPORT_OUTCOMES=Object.freeze(['no_action','hide','needs_information']);
export const MAX_TEXT=10000;
const idPattern=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const safeString=(value,name,max=200)=>{
  if(typeof value!=='string')throw Error(name+' : texte requis.');
  const text=value.normalize('NFC').trim();
  if(!text||text.length>max)throw Error(name+' : longueur invalide.');
  if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text))throw Error(name+' : caractère interdit.');
  return text;
};
const strictId=(value,name)=>{const v=safeString(value,name,80);if(!idPattern.test(v))throw Error(name+' : identifiant invalide.');return v;};
const time=value=>{if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw Error('Horodatage invalide.');return value;};
const must=(condition,message)=>{if(!condition)throw Error(message);};
const clone=value=>structuredClone(value);

/**
 * Référence affichable ; ce n'est JAMAIS un secret d'accès.
 * La persistance doit encore vérifier l'unicité de façon atomique.
 */
export function createReference({year=new Date().getUTCFullYear(),prefix='CE',bytes=randomBytes(6)}={}){
  must(Number.isInteger(year)&&year>=2000&&year<=2100,'Année de référence invalide.');
  must(/^[A-Z]{2,5}$/.test(prefix),'Préfixe de référence invalide.');
  must(Buffer.isBuffer(bytes)&&bytes.length>=6,'Aléa insuffisant pour la référence.');
  return prefix+'-'+year+'-'+bytes.toString('hex').toUpperCase();
}
export const createInternalId=()=>randomUUID();

function newVersion(number,text,at){
  return {number,text,submittedAt:at,status:'pending',decisionAt:null};
}
function identity(input={}){
  const mode=input.displayMode??'without_name';
  must(DISPLAY_MODES.includes(mode),'Mode de présentation invalide.');
  const publicLabel=mode==='without_name'?null:safeString(input.publicLabel,'Nom ou pseudonyme public',90);
  const contact=input.email===undefined||input.email===null?null:safeString(input.email,'Adresse de suivi',254);
  if(contact)must(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact),'Adresse de suivi invalide.');
  return {displayMode:mode,publicLabel,privateContact:contact};
}
function consent(input,at){
  must(input.processingAgreement===true,'Accord de traitement explicite requis avant tout dépôt.');
  // L'autorisation de rendre une contribution publique est volontaire et distincte.
  must(typeof input.publicationAgreement==='boolean','Choix de publication explicite requis, même en cas de refus.');
  return {processingAt:at,publicationAt:input.publicationAgreement?at:null};
}
export function createEntry(input,{at=new Date().toISOString(),id=createInternalId(),reference=createReference()}={}){
  const stamp=time(at);
  must(input&&typeof input==='object','Contribution absente.');
  must(KINDS.includes(input.kind),'Type de contribution inconnu.');
  const cid=strictId(input.consultationId,'Consultation');
  const entryId=strictId(id,'Identifiant interne');
  const publicRef=safeString(reference,'Référence publique',80);
  must(/^[A-Z]{2,5}-\d{4}-[A-F0-9]{12,}$/.test(publicRef),'Référence publique invalide.');
  const author=identity(input),permissions=consent(input,stamp);
  const text=safeString(input.text,'Contribution',MAX_TEXT);
  must(input.kind!=='reply','Une réponse doit utiliser createReply() pour conserver la version cible.');
  return {
    id:entryId,reference:publicRef,consultationId:cid,kind:input.kind,
    parent:null,author,permissions,
    versions:[newVersion(1,text,stamp)],publishedVersion:null,
    visibility:'private',mutation:0,createdAt:stamp,
    audit:[{at:stamp,action:'submitted',actor:'contributor'}]
  };
}
export function createReply(input,parent,options={}){
  must(parent&&parent.visibility==='public'&&Number.isInteger(parent.publishedVersion),
    'Une réponse ne peut viser qu’un argument déjà publié.');
  must(parent.consultationId===input?.consultationId,'La réponse doit appartenir à la même consultation.');
  must(parent.kind!=='reply','Les fils imbriqués sont désactivés pour préserver la lisibilité.');
  const entry=createEntry({...input,kind:'contribution'},options);
  entry.kind='reply';
  entry.parent={reference:parent.reference,version:parent.publishedVersion};
  return entry;
}
function currentPending(entry){
  const latest=entry.versions.at(-1);
  return latest?.status==='pending'?latest:null;
}
function requireRevision(entry,expectedMutation){
  must(entry&&Number.isInteger(entry.mutation),'Dossier invalide.');
  must(Number.isInteger(expectedMutation)&&expectedMutation===entry.mutation,
    'Le dossier a changé : recharger avant de poursuivre.');
}
export function proposeRevision(entry,{text,expectedMutation,at=new Date().toISOString()}={}){
  requireRevision(entry,expectedMutation);
  must(entry.visibility!=='withdrawn','Une contribution retirée ne peut pas être modifiée.');
  must(!currentPending(entry),'Une proposition est déjà en cours de modération.');
  const next=clone(entry),stamp=time(at);
  next.versions.push(newVersion(next.versions.length+1,safeString(text,'Nouvelle version',MAX_TEXT),stamp));
  next.mutation++;
  next.audit.push({at:stamp,action:'revision_proposed',actor:'contributor',version:next.versions.length});
  // L'ancien texte publié reste le seul visible tant que la nouvelle version est en attente.
  return next;
}
export function reviewRevision(entry,{decision,actor,reason='',expectedMutation,at=new Date().toISOString()}={}){
  requireRevision(entry,expectedMutation);
  must(REVIEW_DECISIONS.includes(decision),'Décision inconnue.');
  const moderator=safeString(actor,'Responsable habilité',120),stamp=time(at);
  must(entry.visibility!=='withdrawn','Un dossier retiré ne peut pas être remis en ligne par une décision sur une révision.');
  const pending=currentPending(entry);
  must(pending,'Aucune version en attente de modération.');
  if(decision==='approve')must(!!entry.permissions.publicationAt,'Aucune autorisation de publication pour ce dossier.');
  if(decision==='reject')safeString(reason,'Motif de refus',2000);
  const next=clone(entry),version=next.versions.at(-1);
  version.status=decision==='approve'?'approved':'rejected';
  version.decisionAt=stamp;
  if(decision==='approve'){
    next.publishedVersion=version.number;
    next.visibility='public';
  }
  // Le motif et l'identité du modérateur restent uniquement dans l'audit privé.
  next.mutation++;
  next.audit.push({at:stamp,actor:moderator,action:decision==='approve'?'approved':'rejected',
    version:version.number,...(decision==='reject'?{reason:reason.trim()}:{})});
  return next;
}
export function withdrawPublication(entry,{actor,reason,expectedMutation,at=new Date().toISOString()}={}){
  requireRevision(entry,expectedMutation);
  must(entry.visibility==='public','Aucune publication active à retirer.');
  const who=safeString(actor,'Responsable habilité',120),why=safeString(reason,'Motif de retrait',2000);
  const next=clone(entry),stamp=time(at);
  next.visibility='withdrawn';next.mutation++;
  next.audit.push({at:stamp,action:'withdrawn',actor:who,reason:why});
  return next;
}
const publicAuthor=author=>author.displayMode==='without_name'?'Participant sans nom affiché':author.publicLabel;
/**
 * Projection EXPLICITE et MINIMALE, avec liste blanche.
 * Ne jamais exposer entry, entry.audit, entry.author ou entry.versions directement.
 * Les anciennes versions ne sont pas incluses ; elles exigeraient une autorisation
 * de diffusion spécifique et une autre API filtrée après examen juridique.
 */
export function publicView(entry){
  if(!entry||entry.visibility!=='public'||!entry.permissions?.publicationAt)return null;
  const approved=entry.versions.find(v=>v.number===entry.publishedVersion&&v.status==='approved');
  if(!approved)return null;
  return {
    reference:entry.reference,
    consultationId:entry.consultationId,
    kind:entry.kind,
    text:approved.text,
    version:approved.number,
    publishedAt:approved.decisionAt,
    publicAuthor:publicAuthor(entry.author),
    ...(entry.parent?{inReplyTo:{reference:entry.parent.reference,version:entry.parent.version}}:{})
  };
}
export function publicList(entries){
  if(!Array.isArray(entries))throw Error('Liste de contributions invalide.');
  return entries.map(publicView).filter(Boolean);
}
/** Un signalement n'entraîne AUCUNE suppression ou modification de la cible. */
export function createReport({target,reporterMessage='',reason,at=new Date().toISOString(),id=createInternalId()}={}){
  must(target&&publicView(target),'Seul un contenu public peut être signalé.');
  const stamp=time(at),which=safeString(reason,'Motif du signalement',100);
  const accepted=['personal_data','abuse','spam','other'];
  must(accepted.includes(which),'Motif inconnu.');
  const report={
    id:strictId(id,'Signalement'),target:{reference:target.reference,version:target.publishedVersion},
    reason:which,details:typeof reporterMessage==='string'?reporterMessage.trim().slice(0,2000):'',
    status:'pending',createdAt:stamp,decision:null,
    audit:[{at:stamp,actor:'reporter',action:'reported'}]
  };
  return report;
}
export function reviewReport(report,{outcome,actor,reason,at=new Date().toISOString()}={}){
  must(report?.status==='pending','Signalement déjà traité ou invalide.');
  must(REPORT_OUTCOMES.includes(outcome),'Suite du signalement invalide.');
  const who=safeString(actor,'Responsable habilité',120),why=safeString(reason,'Motif de décision',2000),stamp=time(at);
  const next=clone(report);
  next.status='reviewed';next.decision={outcome,at:stamp};
  next.audit.push({at:stamp,actor:who,action:'report_reviewed',outcome,reason:why});
  // Même un résultat "hide" ne modifie pas ici la cible : opération séparée et tracée.
  return next;
}
