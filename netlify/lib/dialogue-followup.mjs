// Diploval V0.3 — synthèse de suivi : projection minimale des états réels.
// Pas de route HTTP, pas de lecture de stockage ni d'envoi automatique.
// Aucun délai n'est supposé : les objectifs internes doivent être renseignés
// ET validés explicitement par consultation avant d'être affichés.
const VALID_STATES=new Set(['pending','revision_pending','published','rejected',
 'revision_rejected','withdrawn']);
const validDate=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const validDays=n=>Number.isSafeInteger(n)&&n>=1&&n<=180;
const at=(date,days)=>new Date(Date.parse(date)+days*86400000).toISOString();
const clone=x=>structuredClone(x);

export function caseState(entry){
 if(!entry||!Array.isArray(entry.versions)||!entry.versions.length)
  throw Error('Contribution de suivi invalide.');
 const latest=entry.versions.at(-1);
 if(entry.visibility==='withdrawn')return 'withdrawn';
 if(latest.status==='pending')
  return Number.isInteger(entry.publishedVersion)?'revision_pending':'pending';
 if(latest.status==='rejected')
  return Number.isInteger(entry.publishedVersion)?'revision_rejected':'rejected';
 if(entry.visibility==='public'&&latest.status==='approved'
   &&entry.publishedVersion===latest.number)return 'published';
 throw Error('État de contribution incohérent.');
}
function safeAppeal(appeal,entry){
 if(appeal==null)return null;
 if(appeal.reference!==entry.reference||appeal.consultationId!==entry.consultationId
  ||!Number.isSafeInteger(appeal.version)||appeal.version<1
  ||!['pending','escalated','resolved'].includes(appeal.status)
  ||!validDate(appeal.submittedAt))throw Error('Recours de suivi incohérent.');
 const decision=appeal.decision;
 if(appeal.status==='escalated'&&(!decision||decision.outcome!=='escalate'
   ||!validDate(decision.at)))throw Error('Escalade incohérente.');
 if(appeal.status==='resolved'&&(!decision
   ||!['maintain','invite_revision'].includes(decision.outcome)||!validDate(decision.at)))
  throw Error('Décision finale du recours incohérente.');
 return {
  version:appeal.version,status:appeal.status,
  submittedAt:appeal.submittedAt,
  ...(decision?{lastDecisionAt:decision.at,outcome:decision.outcome}:{})
 };
}
function targetDate(anchor,days,now){
 if(!validDate(anchor)||!validDays(days))throw Error('Date ou objectif de suivi invalide.');
 const due=at(anchor,days);
 return {targetAt:due,state:Date.parse(now)>Date.parse(due)?'attention_required':'within_target'};
}
function getPolicy(policy){
 if(policy==null)return null;
 if(!policy||policy.enabled!==true||typeof policy.version!=='string'
   ||!/^[a-z0-9][a-z0-9_.-]{1,39}$/i.test(policy.version)
   ||!validDays(policy.reviewDays)||!validDays(policy.appealDays))
  throw Error('Politique de suivi non validée.');
 return {version:policy.version,reviewDays:policy.reviewDays,appealDays:policy.appealDays};
}

/** Projection AUTORISÉE à remettre uniquement à l'auteur vérifié ou au
 * modérateur habilité. Ne diffuse pas l'adresse, l'audit ni le texte intégral.
 * Les objectifs ne sont jamais présentés comme des échéances réglementaires.
 */
export function buildFollowup(entry,{appeal=null,policy=null,now=new Date().toISOString()}={}){
 if(!validDate(now))throw Error('Horloge invalide.');
 if(!entry||typeof entry.reference!=='string'
   ||typeof entry.consultationId!=='string'
   ||!Array.isArray(entry.versions)||!entry.versions.length
   ||!Number.isSafeInteger(entry.mutation))throw Error('Contribution de suivi invalide.');
 const status=caseState(entry),latest=entry.versions.at(-1);
 if(!Number.isSafeInteger(latest.number)||!validDate(latest.submittedAt))
  throw Error('Version de contribution incohérente.');
 const request=safeAppeal(appeal,entry);
 const setting=getPolicy(policy);
 let objective=null;
 if(setting){
  if(request&&(request.status==='pending'||request.status==='escalated')){
   const anchor=request.status==='escalated'?appeal.decision.at:appeal.submittedAt;
   objective={kind:'appeal',...targetDate(anchor,setting.appealDays,now)};
  }else if(status==='pending'||status==='revision_pending'){
   objective={kind:'review',...targetDate(latest.submittedAt,setting.reviewDays,now)};
  }
 }
 return {
  reference:entry.reference,consultationId:entry.consultationId,kind:entry.kind,
  state:status,version:latest.number,publishedVersion:entry.publishedVersion,
  updatedAt:latest.submittedAt,appeal:request,
  objective:objective?{...objective,policyVersion:setting.version,nonBinding:true}:null
 };
}

/**
 * Contrôle d'accès côté serveur. Ces dépendances doivent charger les fiches
 * par identifiant interne issu de sessions authentifiées ; aucune entrée
 * ne doit être acceptée directement depuis le navigateur.
 */
export function createFollowupService({
 readAuthorEntry,readModeratorEntry,authorizeModerator,loadAppeal,
 policyForConsultation,clock=()=>new Date().toISOString()
}={}){
 if(typeof readAuthorEntry!=='function'||typeof readModeratorEntry!=='function'
   ||typeof authorizeModerator!=='function'||typeof loadAppeal!=='function'
   ||typeof policyForConsultation!=='function'||typeof clock!=='function')
  throw Error('Accès privé et politique explicite de suivi requis.');
 const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
 const readSnapshot=async entry=>{
  const possible=await loadAppeal(entry.id,entry);
  const policy=await policyForConsultation(entry.consultationId);
  return buildFollowup(entry,{appeal:possible,policy,now:clock()});
 };
 async function forAuthor(principal,entryId){
  if(!ID.test(entryId||''))throw Error('Identifiant de dossier invalide.');
  const entry=await readAuthorEntry(principal,entryId);
  if(!entry||entry.id!==entryId)throw Error('Accès non autorisé.');
  return clone(await readSnapshot(entry));
 }
 async function forModerator(principal,entryId){
  if(!ID.test(entryId||''))throw Error('Identifiant de dossier invalide.');
  const entry=await readModeratorEntry(principal,entryId);
  if(!entry||entry.id!==entryId
    ||await authorizeModerator(principal,'read_private',entry)!==true)
    throw Error('Accès non autorisé.');
  return clone(await readSnapshot(entry));
 }
 return Object.freeze({forAuthor,forModerator});
}
