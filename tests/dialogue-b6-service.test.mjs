import test from 'node:test';
import assert from 'node:assert/strict';
import {createEntry} from '../netlify/lib/dialogue-model.mjs';
import {createModeratorAccess} from '../netlify/lib/dialogue-moderator-access.mjs';
import {createFollowupService} from '../netlify/lib/dialogue-followup.mjs';
import {createContributorResponses} from '../netlify/lib/dialogue-contributor-responses.mjs';
import {createDialogueInternalHandler} from '../netlify/lib/dialogue-service-v03.mjs';

const ORIGIN='https://diploval.test',ID='dossier-b6-http-001',REF='CE-2026-112233445566';
const AUTHOR=Object.freeze({private:'verified-author'}),date='2026-11-19T12:00:00.000Z';
const email='auteur@example.test';
const message='Nous avons bien reçu votre contribution. Les arguments seront examinés sans publication automatique.';
const policy={enabled:true,version:'demo-b6',reviewDays:7,appealDays:14};
function store(){
 const map=new Map();let n=0;
 return {
  map,
  async getWithMetadata(key){
   const v=map.get(key);return v?{data:JSON.parse(v.data),etag:v.etag}:null;
  },
  async set(key,data,{onlyIfNew=false,onlyIfMatch=null}={}){
   const old=map.get(key);
   if(onlyIfNew&&old)return {modified:false,etag:old.etag};
   if(onlyIfMatch!==null&&(!old||old.etag!==onlyIfMatch))
    return {modified:false,etag:old?.etag};
   const etag='etag-'+(++n);map.set(key,{data,etag});return {modified:true,etag};
  }
 };
}
function setup(){
 const entry=createEntry({
  consultationId:'consultation-a',kind:'contribution',
  text:'Ma contribution présente une objection constructive et sourcée.',
  email,displayMode:'without_name',processingAgreement:true,publicationAgreement:true
 },{id:ID,reference:REF,at:date});
 const db=new Map([[ID,entry]]),outbox=store();
 const personnel=new Map([
  ['exam-01',{active:true,roles:['reviewer'],consultationIds:['consultation-a']}],
  ['super-01',{active:true,roles:['supervisor'],consultationIds:['consultation-a']}],
  ['observe-01',{active:true,roles:['observer'],consultationIds:['consultation-a']}]
 ]);
 const moderator=createModeratorAccess({
  verifySession:async req=>{
   const staffId=req?.headers?.get('x-test-staff');
   return personnel.has(staffId)?{staffId,label:'Agent '+staffId}:null;
  },
  loadGrants:async staffId=>structuredClone(personnel.get(staffId))
 });
 const authorAccess={
  authenticate:async token=>token==='signed-in-test'?AUTHOR:null,
  ownEntryId:async who=>who===AUTHOR?ID:null,
  requestLink:async()=>({accepted:true}),
  redeemLink:async()=>null,revokeSession:async()=>true
 };
 const readAuthorEntry=async(who,id)=>{
  if(who!==AUTHOR||id!==ID)throw Error('Accès non autorisé.');
  return structuredClone(db.get(id));
 };
 const readModeratorEntry=async(who,id)=>{
  const x=db.get(id);
  if(!x||await moderator.authorize(who,'read_private',x)!==true)
   throw Error('Accès non autorisé.');
  return structuredClone(x);
 };
 const followup=createFollowupService({
  readAuthorEntry,readModeratorEntry,authorizeModerator:moderator.authorize,
  loadAppeal:async()=>null,policyForConsultation:async()=>policy,clock:()=>date
 });
 const responses=createContributorResponses({
  store:outbox,readAuthorEntry,readModeratorEntry,
  authorizeModerator:moderator.authorize,resolveStaff:moderator.resolveStaff,
  clock:()=>date
 });
 const handler=createDialogueInternalHandler({
  enabled:true,origin:ORIGIN,authorAccess,
  authorRepository:{readPrivate:readAuthorEntry,mutatePrivate:async()=>null},
  moderatorRepository:{readPrivate:readModeratorEntry,mutatePrivate:async()=>null},
  publicRepository:{readPublicReference:async()=>null},
  authenticateModerator:moderator.authenticate,
  resolveEntryIdByReference:async ref=>ref===REF?ID:null,
  rateLimit:async()=>true,followupService:followup,contributorResponses:responses
 });
 const request=async(path,{method='GET',staff=null,cookie=null,body=null,origin=ORIGIN}={})=>{
  const headers={};
  if(staff)headers['x-test-staff']=staff;
  if(cookie)headers.cookie='__Host-diploval-v03-author='+cookie;
  if(method==='POST'){
   headers.origin=origin;headers['x-diploval-v03-request']='1';
   headers['content-type']='application/json';
  }
  return handler(new Request(ORIGIN+path,{method,headers,...(method==='POST'?{body:JSON.stringify(body||{})}:{})}));
 };
 return {request,outbox,db,personnel,followup,responses};
}
test('aucun suivi personnel sans connexion à la session',async()=>{
 const e=setup();
 assert.equal((await e.request('/author/followup')).status,401);
 assert.equal((await e.request('/author/response?mutation=0')).status,401);
});
test('l’auteur consulte un objectif INDICATIF, sans données internes',async()=>{
 const e=setup(),r=await e.request('/author/followup',{cookie:'signed-in-test'});
 assert.equal(r.status,200);
 const result=(await r.json()).followup;
 assert.equal(result.state,'pending');
 assert.equal(result.objective.nonBinding,true);
 assert.equal(result.objective.policyVersion,'demo-b6');
 assert(!JSON.stringify(result).includes(email));
 assert(!JSON.stringify(result).includes('audit'));
});
test('un contributeur ne lit aucune réponse en cours de rédaction',async()=>{
 const e=setup(),drafted=await e.request('/moderation/response/draft',{
  method:'POST',staff:'exam-01',body:{
   id:ID,expectedMutation:0,topic:'acknowledgement',message
  }
 });
 assert.equal(drafted.status,202);
 const privateRead=await e.request('/author/response?mutation=0',{cookie:'signed-in-test'});
 assert.equal(privateRead.status,404);
});
test('validation à deux personnes puis lecture dans le dossier personnel',async()=>{
 const e=setup();
 const drafted=await e.request('/moderation/response/draft',{
  method:'POST',staff:'exam-01',
  body:{id:ID,expectedMutation:0,topic:'acknowledgement',message}
 });
 assert.equal(drafted.status,202);
 const approved=await e.request('/moderation/response/approve',{
  method:'POST',staff:'super-01',
  body:{id:ID,expectedMutation:0}
 });
 assert.equal(approved.status,200);
 const own=await e.request('/author/response?mutation=0',{cookie:'signed-in-test'});
 assert.equal(own.status,200);
 const result=(await own.json()).response;
 assert.equal(result.message,message);
 assert.equal(result.topic,'acknowledgement');
 assert(!JSON.stringify(result).includes(email));
 assert(!JSON.stringify(result).includes('staff-'));
 assert(!JSON.stringify(result).includes('audit'));
 assert.equal(e.db.get(ID).visibility,'private');
});
test('observateur incapable de rédiger une réponse',async()=>{
 const e=setup();
 const r=await e.request('/moderation/response/draft',{
  method:'POST',staff:'observe-01',
  body:{id:ID,expectedMutation:0,topic:'acknowledgement',message}
 });
 assert.equal(r.status,503); // B3 maps errors to generic service unavailable; HTTP mapping remains to design.
 assert.equal(e.outbox.map.size,0);
});
test('un examinateur ne peut jamais approuver une réponse',async()=>{
 const e=setup();
 await e.request('/moderation/response/draft',{
  method:'POST',staff:'exam-01',
  body:{id:ID,expectedMutation:0,topic:'acknowledgement',message}
 });
 const r=await e.request('/moderation/response/approve',{
  method:'POST',staff:'exam-01',
  body:{id:ID,expectedMutation:0}
 });
 assert.equal(r.status,503);
 assert.equal((await e.request('/author/response?mutation=0',{
  cookie:'signed-in-test'
 })).status,404);
});
test('vérification des droits de suivi pour la modération',async()=>{
 const e=setup();
 assert.equal((await e.request('/moderation/followup?id='+ID,{
  staff:'observe-01'
 })).status,200);
 assert.equal((await e.request('/moderation/followup?id='+ID)).status,401);
 assert.equal((await e.request('/moderation/followup?id=../private',{
  staff:'exam-01'
 })).status,400);
});
test('les paramètres de réponses invalides sont refusés',async()=>{
 const e=setup();
 assert.equal((await e.request('/moderation/response/draft',{
  method:'POST',staff:'exam-01',
  body:{id:ID,expectedMutation:-1,topic:'acknowledgement',message}
 })).status,400);
 assert.equal((await e.request('/author/response?mutation=-1',{
  cookie:'signed-in-test'
 })).status,400);
});
test('les requêtes POST d’origine étrangère sont refusées avant rédaction',async()=>{
 const e=setup();
 const r=await e.request('/moderation/response/draft',{
  method:'POST',staff:'exam-01',origin:'https://malicious.test',
  body:{id:ID,expectedMutation:0,topic:'acknowledgement',message}
 });
 assert.equal(r.status,403);
 assert.equal(e.outbox.map.size,0);
});
test('aucune activation possible lorsque le contrôleur B3 reste désactivé',async()=>{
 const disabled=createDialogueInternalHandler();
 const response=await disabled(new Request(ORIGIN+'/author/followup'));
 assert.equal(response.status,503);
});
