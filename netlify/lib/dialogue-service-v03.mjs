// Diploval V0.3 — contrôleur HTTP interne, sans fonction Netlify exportée.
// Désactivé par défaut. Aucun endpoint de production n'importe ce module.
// Les identités et les rôles proviennent exclusivement des services serveur
// injectés et vérifiés, jamais des champs envoyés depuis le navigateur.
import {proposeRevision,reviewRevision,withdrawPublication} from './dialogue-model.mjs';

const COOKIE='__Host-diploval-v03-author';
const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const REF=/^[A-Z]{2,5}-\d{4}-[A-F0-9]{12,}$/;
const MAX_BODY=12000;
const headers={
 'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':'private, no-store, max-age=0',
 'X-Robots-Tag':'noindex, nofollow, noarchive',
 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer',
 'Vary':'Cookie, Origin'
};
const issue=(status,message)=>Object.assign(new Error(message),{httpStatus:status});
const cookie=(token)=>COOKIE+'='+(token||'')+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+(token?'7200':'0');
const cookieToken=request=>{
 const c=(request.headers.get('cookie')||'').split(';').map(s=>s.trim())
  .find(s=>s.startsWith(COOKIE+'='));
 return c?.slice(COOKIE.length+1)||null;
};
const notFound=()=>issue(404,'Opération indisponible.');
const parseJson=async request=>{
 const type=request.headers.get('content-type')||'';
 if(!/^application\/json(?:\s*;|$)/i.test(type))throw issue(415,'Format JSON attendu.');
 const length=Number(request.headers.get('content-length')||0);
 if(!Number.isSafeInteger(length)||length>MAX_BODY)throw issue(413,'Requête trop volumineuse.');
 const raw=await request.text();
 if(Buffer.byteLength(raw,'utf8')>MAX_BODY)throw issue(413,'Requête trop volumineuse.');
 let value;try{value=JSON.parse(raw)}catch{throw issue(400,'JSON incorrect.');}
 if(!value||typeof value!=='object'||Array.isArray(value))throw issue(400,'Objet JSON requis.');
 return value;
};
const viewAuthor=e=>({
 reference:e.reference,consultationId:e.consultationId,kind:e.kind,
 visibility:e.visibility,mutation:e.mutation,publishedVersion:e.publishedVersion,
 versions:e.versions.map(v=>({number:v.number,text:v.text,status:v.status,submittedAt:v.submittedAt}))
});
const viewModerator=e=>({
 id:e.id,reference:e.reference,consultationId:e.consultationId,kind:e.kind,
 parent:e.parent,visibility:e.visibility,mutation:e.mutation,
 publishedVersion:e.publishedVersion,
 publicationAllowed:!!e.permissions?.publicationAt,
 author:{displayMode:e.author.displayMode,publicLabel:e.author.publicLabel},
 versions:e.versions.map(v=>({number:v.number,text:v.text,status:v.status,submittedAt:v.submittedAt}))
});
const reason=(value,required=false)=>{
 if(!required&&(value===undefined||value===null||value===''))return '';
 if(typeof value!=='string'||value.trim().length<4||value.length>2000)
  throw issue(400,'Motif de décision requis.');
 return value.trim();
};
const text=v=>{
 if(typeof v!=='string'||v.trim().length<10||v.length>10000)throw issue(400,'Texte invalide.');
 return v;
};

/**
 * Module inactif par défaut. Un point d'entrée HTTP devra être créé et
 * approuvé explicitement, après configuration effective des dépendances :
 * stockage chiffré, authentification professionnelle, stockage de sessions,
 * limitation distribuée de requêtes, CSRF, consentement et contrôles RGPD.
 */
export function createDialogueInternalHandler({
 enabled=false,origin,authorAccess,authorRepository,moderatorRepository,
 publicRepository,authenticateModerator,resolveEntryIdByReference,rateLimit,
 moderationQueue=null,appealService=null
}={}){
 const respond=(body,status=200,extra={})=>new Response(JSON.stringify(body),{
  status,headers:{...headers,...extra}
 });
 if(enabled!==true)return async()=>respond({error:'Service V0.3 non activé.'},503);
 if(typeof origin!=='string'||!/^https:\/\/[^/?#]+$/.test(origin))throw Error('Origine HTTPS requise.');
 if(!authorAccess||!['requestLink','redeemLink','authenticate','ownEntryId','revokeSession'].every(k=>typeof authorAccess[k]==='function'))
  throw Error('Authentification auteur incomplète.');
 if(!authorRepository||!['readPrivate','mutatePrivate'].every(k=>typeof authorRepository[k]==='function'))
  throw Error('Stockage auteur incomplet.');
 if(!moderatorRepository||!['readPrivate','mutatePrivate'].every(k=>typeof moderatorRepository[k]==='function'))
  throw Error('Stockage modération incomplet.');
 if(!publicRepository||typeof publicRepository.readPublicReference!=='function')
  throw Error('Projection publique absente.');
 if(typeof authenticateModerator!=='function'||typeof resolveEntryIdByReference!=='function'
    ||typeof rateLimit!=='function')throw Error('Dépendances de sécurité manquantes.');

 const author=async request=>{
  const token=cookieToken(request);
  const principal=token?await authorAccess.authenticate(token):null;
  if(!principal)throw issue(401,'Connexion personnelle requise.');
  const id=await authorAccess.ownEntryId(principal);
  if(!id)throw issue(401,'Connexion personnelle requise.');
  return {principal,id,token};
 };
 const moderator=async request=>{
  // Le vérificateur doit contrôler une vraie session professionnelle du serveur,
  // jamais un champ de requête ou un en-tête role émis par le navigateur.
  const result=await authenticateModerator(request);
  if(!result||typeof result.label!=='string'||result.label.trim().length<3
     ||!result.principal||typeof result.principal!=='object')
   throw issue(401,'Accès de modération requis.');
  return result;
 };
 return async request=>{
  try{
   const u=new URL(request.url);
   if(u.origin!==origin)throw issue(403,'Origine non autorisée.');
   if(!['GET','POST'].includes(request.method))throw issue(405,'Méthode non autorisée.');
   const path=u.pathname;
   if(!(['/public/entry'].includes(path)||path.startsWith('/author/')||path.startsWith('/moderation/')))
    throw notFound();
   if(request.method==='POST'&&(request.headers.get('origin')!==origin
      ||request.headers.get('x-diploval-v03-request')!=='1'))throw issue(403,'Origine du formulaire refusée.');
   // Cette limitation doit être fournie par un composant distribué de confiance,
   // pas une Map en mémoire locale.
   if(await rateLimit({request,path})!==true)throw issue(429,'Veuillez réessayer plus tard.');

   if(path==='/public/entry'&&request.method==='GET'){
    const ref=u.searchParams.get('reference');
    if(!REF.test(ref||''))throw notFound();
    const entry=await publicRepository.readPublicReference(ref);
    if(!entry)throw notFound();
    return respond({entry});
   }
   if(path==='/author/request-link'&&request.method==='POST'){
    const body=await parseJson(request);
    // Le service résout la référence publique vers l'id interne, mais ne
    // renvoie jamais cet id au navigateur. Réponse générique dans tous les cas.
    const id=REF.test(body.reference||'')?await resolveEntryIdByReference(body.reference):null;
    if(id&&ID.test(id))await authorAccess.requestLink({entryId:id,email:body.email});
    return respond({accepted:true},202);
   }
   if(path==='/author/redeem'&&request.method==='POST'){
    const body=await parseJson(request);
    const session=await authorAccess.redeemLink(body.token);
    if(!session)throw issue(401,'Lien expiré ou invalide.');
    return respond({authenticated:true},200,{'Set-Cookie':cookie(session.sessionToken)});
   }
   if(path==='/author/me'&&request.method==='GET'){
    const {principal,id}=await author(request);
    const entry=await authorRepository.readPrivate(principal,id);
    if(!entry)throw notFound();
    return respond({entry:viewAuthor(entry)});
   }
   if(path==='/author/revise'&&request.method==='POST'){
    const {principal,id}=await author(request),body=await parseJson(request);
    if(!Number.isSafeInteger(body.expectedMutation)||body.expectedMutation<0)
     throw issue(400,'Version de dossier requise.');
    const result=await authorRepository.mutatePrivate(principal,id,{
     operation:'revise',expectedMutation:body.expectedMutation,
     transform:record=>proposeRevision(record,{text:text(body.text),expectedMutation:record.mutation})
    });
    if(!result)throw notFound();
    return respond({accepted:true,mutation:result.mutation},202);
   }
   if(path==='/author/appeal'&&request.method==='POST'){
    if(!appealService)throw issue(503,'Service de recours non configuré.');
    const {principal,id}=await author(request),body=await parseJson(request);
    if(typeof body.reason!=='string'||body.reason.trim().length<10||body.reason.length>2000)
     throw issue(400,'Motif de réexamen requis.');
    const result=await appealService.submit(principal,{entryId:id,reason:body.reason});
    return respond({appeal:result},202);
   }
   if(path==='/author/appeal'&&request.method==='GET'){
    if(!appealService)throw issue(503,'Service de recours non configuré.');
    const {principal,id}=await author(request);
    const version=Number(u.searchParams.get('version'));
    if(!Number.isSafeInteger(version)||version<1)throw issue(400,'Version de recours requise.');
    const appeal=await appealService.own(principal,{entryId:id,version});
    if(!appeal)throw notFound();
    return respond({appeal});
   }
   if(path==='/author/logout'&&request.method==='POST'){
    const {token}=await author(request);
    if(!(await authorAccess.revokeSession(token)))throw issue(409,'Session non révoquée.');
    return respond({signedOut:true},200,{'Set-Cookie':cookie(null)});
   }
   if(path==='/moderation/queue'&&request.method==='GET'){
    if(!moderationQueue)throw issue(503,'File de modération non configurée.');
    const who=await moderator(request);
    const state=u.searchParams.get('state')||'pending';
    const consultationId=u.searchParams.get('consultationId')||null;
    const limit=Number(u.searchParams.get('limit')||20);
    const cursor=Number(u.searchParams.get('cursor')||0);
    if(!Number.isSafeInteger(limit)||limit<1||limit>25
       ||!Number.isSafeInteger(cursor)||cursor<0)throw issue(400,'Pagination invalide.');
    const result=await moderationQueue.list(who.principal,{state,consultationId,limit,cursor});
    return respond(result);
   }
   if(path==='/moderation/appeal'&&request.method==='GET'){
    if(!appealService)throw issue(503,'Service de recours non configuré.');
    const who=await moderator(request);
    const id=u.searchParams.get('id'),version=Number(u.searchParams.get('version'));
    if(!ID.test(id||'')||!Number.isSafeInteger(version)||version<1)
     throw issue(400,'Référence interne ou version invalide.');
    const result=await appealService.forModerator(who.principal,{entryId:id,version});
    if(!result)throw notFound();
    return respond({appeal:result});
   }
   if(path==='/moderation/appeal/decide'&&request.method==='POST'){
    if(!appealService)throw issue(503,'Service de recours non configuré.');
    const who=await moderator(request),body=await parseJson(request);
    if(!ID.test(body.id||'')||!Number.isSafeInteger(body.version)||body.version<1
      ||!['maintain','invite_revision','escalate'].includes(body.decision)
      ||typeof body.reason!=='string'||body.reason.trim().length<10||body.reason.length>2000)
     throw issue(400,'Décision motivée de recours requise.');
    const result=await appealService.decide(who.principal,{
      entryId:body.id,version:body.version,decision:body.decision,
      reason:body.reason,actor:who.label,expectedStatus:body.expectedStatus||'pending'
    });
    return respond({appeal:result});
   }
   if(path==='/moderation/entry'&&request.method==='GET'){
    const who=await moderator(request),id=u.searchParams.get('id');
    if(!ID.test(id||''))throw notFound();
    const entry=await moderatorRepository.readPrivate(who.principal,id);
    if(!entry)throw notFound();
    return respond({entry:viewModerator(entry)});
   }
   if(path==='/moderation/review'&&request.method==='POST'){
    const who=await moderator(request),body=await parseJson(request);
    if(!ID.test(body.id||'')||!['approve','reject'].includes(body.decision)
       ||!Number.isSafeInteger(body.expectedMutation)||body.expectedMutation<0)
     throw issue(400,'Décision invalide.');
    const why=reason(body.reason,body.decision==='reject');
    const result=await moderatorRepository.mutatePrivate(who.principal,body.id,{
     operation:'moderate',expectedMutation:body.expectedMutation,
     transform:record=>reviewRevision(record,{
      decision:body.decision,actor:who.label,reason:why,expectedMutation:record.mutation
     })
    });
    if(!result)throw notFound();
    return respond({confirmed:true,mutation:result.mutation});
   }
   if(path==='/moderation/withdraw'&&request.method==='POST'){
    const who=await moderator(request),body=await parseJson(request);
    if(!ID.test(body.id||'')||!Number.isSafeInteger(body.expectedMutation)
       ||body.expectedMutation<0)throw issue(400,'Dossier et version requis.');
    const why=reason(body.reason,true);
    const result=await moderatorRepository.mutatePrivate(who.principal,body.id,{
     operation:'withdraw',expectedMutation:body.expectedMutation,
     transform:record=>withdrawPublication(record,{
      actor:who.label,reason:why,expectedMutation:record.mutation
     })
    });
    if(!result)throw notFound();
    return respond({withdrawn:true,mutation:result.mutation});
   }
   throw notFound();
  }catch(error){
   const status=error.httpStatus||(/Conflit|recharger|déjà en cours/.test(error.message||'')?409:503);
   const safe=(error.httpStatus&&status<500)?error.message
    :status===409?'Un changement a été enregistré. Rechargez le dossier.'
    :'Service temporairement indisponible.';
   return respond({error:safe},status);
  }
 };
}
