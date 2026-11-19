// Diploval V0.3 — contrôle de périmètre institutionnel, interne et sans HTTP.
// Une invitation ne vaut ni identité prouvée ni mandat administratif validé.
// Aucune lecture d'un dossier privé ni publication directe ne sont fournies.
const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const REF=/^[A-Z]{2,5}-\d{4}-[A-F0-9]{12,}$/;
const fail=m=>new Error(m);
export function createInstitutionalScopeGate({
 enabled=false,resolveIdentity,loadMandate,loadPublicContribution,
 recordDraft,verifyPermission
}={}){
 if(enabled!==true)return Object.freeze({
  view:async()=>{throw fail('Accès institutionnel désactivé.');},
  draftResponse:async()=>{throw fail('Accès institutionnel désactivé.');}
 });
 if([resolveIdentity,loadMandate,loadPublicContribution,recordDraft,verifyPermission]
  .some(x=>typeof x!=='function'))throw fail('Dépendances institutionnelles manquantes.');
 async function authorized(principal,{consultationId,organizationId,action}){
  if(!ID.test(consultationId||'')||!ID.test(organizationId||''))
   throw fail('Périmètre institutionnel invalide.');
  const identity=await resolveIdentity(principal);
  if(!identity||!ID.test(identity.staffId||'')
    ||identity.organizationId!==organizationId
    ||identity.active!==true||identity.authenticated!==true)
    throw fail('Identité institutionnelle non attestée.');
  const mandate=await loadMandate(identity.staffId,organizationId);
  if(!mandate||mandate.active!==true||mandate.organizationId!==organizationId
    ||!Array.isArray(mandate.consultationIds)
    ||!mandate.consultationIds.includes(consultationId)
    ||!Array.isArray(mandate.permissions)
    ||!mandate.permissions.includes(action))
    throw fail('Mandat ou consultation non autorisés.');
  if(await verifyPermission({identity,mandate,consultationId,action})!==true)
    throw fail('Habilitation non confirmée.');
  return identity;
 }
 async function publicEntry(reference,consultationId){
  if(!REF.test(reference||''))throw fail('Référence invalide.');
  const entry=await loadPublicContribution({reference,consultationId});
  if(!entry||entry.reference!==reference||entry.consultationId!==consultationId
    ||typeof entry.text!=='string'||!Number.isSafeInteger(entry.version)
    ||entry.version<1||typeof entry.publicAuthor!=='string')
    throw fail('Contribution publique indisponible.');
  // Trust no other properties returned from the provider.
  return Object.freeze({reference:entry.reference,
    consultationId:entry.consultationId,kind:entry.kind,
    text:entry.text,version:entry.version,
    publicAuthor:entry.publicAuthor});
 }
 async function view(principal,{consultationId,organizationId,reference}={}){
  await authorized(principal,{consultationId,organizationId,action:'view_public'});
  return publicEntry(reference,consultationId);
 }
 async function draftResponse(principal,{consultationId,organizationId,reference,message}={}){
  const identity=await authorized(principal,
    {consultationId,organizationId,action:'submit_draft'});
  const entry=await publicEntry(reference,consultationId);
  if(typeof message!=='string'||message.trim().length<20||message.length>2000)
    throw fail('Projet de réponse invalide.');
  // Store a draft for separate human moderation. Never publish it here.
  const result=await recordDraft({organizationId,staffId:identity.staffId,
    consultationId,reference:entry.reference,sourceVersion:entry.version,
    message:message.trim(),status:'pending_diploval_review'});
  if(!result||result.accepted!==true||typeof result.draftId!=='string'
    ||!ID.test(result.draftId))
    throw fail('Dépôt du projet non confirmé.');
  return Object.freeze({draftId:result.draftId,status:'pending_diploval_review',
    published:false});
 }
 return Object.freeze({view,draftResponse});
}
