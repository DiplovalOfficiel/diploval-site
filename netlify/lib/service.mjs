import {createHash, createHmac, timingSafeEqual} from 'node:crypto';
import {emptyReview, updateReview, normalizeSubmission} from './model.mjs';
const digest=v=>createHash('sha256').update(v).digest('hex');
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const fail=(status,message)=>Object.assign(new Error(message),{status});
const id=v=>{if(!/^[a-zA-Z0-9_-]{1,120}$/.test(v||''))throw fail(400,'Identifiant invalide.');return v;};
const COOKIE='__Host-diploval-moderation';
const cookie=(value,age=14400)=>`${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
export function createHandler({env,fetcher=fetch,store,clock=()=>Date.now()}) {
  const origin=env.DIPLOVAL_MODERATION_ORIGIN||'https://diploval.fr';
  let cachedForms=null,formsAt=0;
  async function api(path) {
    const r=await fetcher('https://api.netlify.com/api/v1'+path,{method:'GET',headers:{Authorization:'Bearer '+env.DIPLOVAL_NETLIFY_TOKEN,Accept:'application/json'},signal:AbortSignal.timeout(12000)});
    if(!r.ok)throw fail(502,r.status===429?'Netlify demande de patienter. Réessayez dans quelques instants.':'Lecture Netlify impossible. Vérifier les accès côté serveur.');
    const data=await r.json();if(!Array.isArray(data))throw fail(502,'Réponse Netlify inattendue.');return data;
  }
  async function forms(){
    if(cachedForms&&clock()-formsAt<30000)return cachedForms;
    const all=[];for(let page=1;page<=100;page++){const batch=await api(`/sites/${id(env.DIPLOVAL_NETLIFY_SITE_ID)}/forms?per_page=100&page=${page}`);all.push(...batch);if(batch.length<100){cachedForms=all.filter(f=>String(f.name||'').startsWith('contribution-'));formsAt=clock();return cachedForms;}}
    throw fail(502,'Liste des formulaires trop volumineuse.');
  }
  function users(){try{return JSON.parse(env.DIPLOVAL_MODERATION_USERS);}catch{throw fail(503,'Accès privé à configurer dans Netlify.');}}
  function signed(payload){const body=Buffer.from(JSON.stringify(payload)).toString('base64url');return body+'.'+createHmac('sha256',env.DIPLOVAL_MODERATION_SESSION_SECRET).update(body).digest('base64url');}
  function session(req){
    const token=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
    if(!token)return null;try{const [body,sig,...extra]=token.split('.');if(extra.length||!equal(sig,createHmac('sha256',env.DIPLOVAL_MODERATION_SESSION_SECRET).update(body).digest('base64url')))return null;
      const p=JSON.parse(Buffer.from(body,'base64url'));const u=users()[p.user];if(!u||p.exp<=clock()||!equal(p.keyVersion,digest(u.sha256)))return null;return {user:p.user,label:u.label||p.user};}catch{return null;}
  }
  async function json(req){if(!req.headers.get('content-type')?.startsWith('application/json'))throw fail(415,'Format JSON requis.');const body=await req.text();if(Buffer.byteLength(body)>40000)throw fail(413,'Enregistrement trop volumineux.');try{return JSON.parse(body);}catch{throw fail(400,'Enregistrement invalide.');}}
  const key=(formId,submissionId)=>`reviews/${id(formId)}/${id(submissionId)}`;
  async function readReview(formId,submissionId){return store.getWithMetadata(key(formId,submissionId),{type:'json',consistency:'strong'});}
  async function exists(formId,submissionId){for(const state of ['verified','spam'])for(let p=1;p<=100;p++){const rows=await api(`/forms/${formId}/submissions?per_page=100&page=${p}${state==='spam'?'&state=spam':''}`);if(rows.some(r=>String(r.id)===submissionId))return true;if(rows.length<100)break;}return false;}
  return async req=>{
    const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Cookie'};
    const response=(value,status=200,extra={})=>new Response(JSON.stringify(value),{status,headers:{...headers,...extra}});
    try {
      const url=new URL(req.url);
      // A preview deploy must never read or write the production moderation store.
      if(url.origin!==origin)return response({error:'Cette interface est accessible uniquement sur le domaine de production.'},403);
      if(!['GET','POST','PUT'].includes(req.method))return response({error:'Méthode non autorisée.'},405,{Allow:'GET, POST, PUT'});
      const u=users();
      if(!env.DIPLOVAL_NETLIFY_TOKEN||!env.DIPLOVAL_NETLIFY_SITE_ID||!env.DIPLOVAL_MODERATION_SESSION_SECRET||env.DIPLOVAL_MODERATION_SESSION_SECRET.length<43||!Object.keys(u).length||Object.values(u).some(x=>!x||!/^[a-f0-9]{64}$/.test(x.sha256||'')))throw fail(503,'Activation privée incomplète. Aucun accès aux contributions n’est ouvert.');
      if(req.method!=='GET'&&(req.headers.get('origin')!==origin||req.headers.get('x-diploval-moderation')!=='1'))throw fail(403,'Origine de la demande refusée.');
      const action=url.searchParams.get('action')||'session';
      if(action==='login'&&req.method==='POST'){
        const {user,secret}=await json(req);const found=u[user];
        if(typeof secret!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(secret)||!equal(digest(secret),found?.sha256))throw fail(401,'Identifiant ou clé personnelle incorrects.');
        return response({user,label:found.label||user},200,{'Set-Cookie':cookie(signed({user,keyVersion:digest(found.sha256),exp:clock()+14400000}))});
      }
      const who=session(req);if(!who)throw fail(401,'Connectez-vous à l’espace privé de modération.');
      if(action==='logout'&&req.method==='POST')return response({ok:true},200,{'Set-Cookie':cookie('',0)});
      if(action==='session'&&req.method==='GET')return response(who);
      if(action==='forms'&&req.method==='GET')return response({forms:(await forms()).map(f=>({id:f.id,name:f.name}))});
      const formId=id(url.searchParams.get('form'));
      const form=(await forms()).find(f=>String(f.id)===formId);if(!form)throw fail(403,'Formulaire de consultation non autorisé.');
      if(action==='submissions'&&req.method==='GET'){
        const page=Number(url.searchParams.get('page')||1),state=url.searchParams.get('state')||'verified';
        if(!Number.isInteger(page)||page<1||page>100||!['verified','spam'].includes(state))throw fail(400,'Pagination invalide.');
        const rows=await api(`/forms/${formId}/submissions?per_page=25&page=${page}${state==='spam'?'&state=spam':''}`);
        const records=await Promise.all(rows.map(async raw=>{
          const s=normalizeSubmission(raw,{formId,formName:form.name});
          const review=await readReview(formId,s.id);
          const fields=['dossier','version','contribution_type','contribution','partie_dossier','source','alternative','email','acknowledgement'];
          const data=Object.fromEntries(fields.filter(k=>Object.hasOwn(s.data,k)).map(k=>[k,s.data[k]]));
          const decision=review?.data||emptyReview();
          // The full audit trail is fetched only when opening a contribution.
          return {id:s.id,dossierKey:formId,formName:form.name,receivedAt:s.receivedAt,data,netlifyState:state,review:{...decision,history:[],historyCount:decision.history.length}};
        }));return response({records,hasMore:rows.length===25,page,state});
      }
      if(action==='review'&&req.method==='GET'){
        const submissionId=id(url.searchParams.get('submission'));
        const existing=await readReview(formId,submissionId);
        return response({review:existing?.data||emptyReview()});
      }
      if(action==='review'&&req.method==='PUT'){
        const submissionId=id(url.searchParams.get('submission'));
        const body=await json(req);
        if(!(await exists(formId,submissionId)))throw fail(404,'Réponse originale introuvable dans Netlify. Aucune décision enregistrée.');
        const previous=await readReview(formId,submissionId);
        let review;try{review=updateReview(previous?.data||emptyReview(),body.changes,{actor:who.label+' ['+who.user+']',now:new Date(clock()).toISOString(),expectedRevision:body.expectedRevision});}catch(e){throw fail(e.message.includes('recharger')?409:400,e.message);}
        if(review.history.length>1000||Buffer.byteLength(JSON.stringify(review))>1000000)throw fail(409,'Historique volumineux : organiser un archivage privé avant de poursuivre.');
        const result=await store.set(key(formId,submissionId),JSON.stringify(review),previous?{onlyIfMatch:previous.etag}:{onlyIfNew:true});
        if(!result.modified)throw fail(409,'Une autre décision a été enregistrée. Rechargez la contribution.');
        if(!result.etag)throw fail(503,'Le stockage n’a pas confirmé l’enregistrement. Rechargez avant de réessayer.');
        const confirmed=await readReview(formId,submissionId);
        if(!confirmed||confirmed.etag!==result.etag||JSON.stringify(confirmed.data)!==JSON.stringify(review))throw fail(409,'L’enregistrement n’a pas pu être confirmé. Rechargez les décisions.');
        return response({review});
      }
      throw fail(404,'Opération inconnue.');
    }catch(e){return response({error:e.status?e.message:'Service temporairement indisponible. Vos modifications ne sont pas confirmées.'},e.status||503);}
  };
}
