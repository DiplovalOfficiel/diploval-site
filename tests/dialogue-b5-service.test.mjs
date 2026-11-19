import test from 'node:test';
import assert from 'node:assert/strict';
import {createDialogueInternalHandler} from '../netlify/lib/dialogue-service-v03.mjs';
import {createAuthorAccess} from '../netlify/lib/dialogue-author-access.mjs';
import {createModeratorAccess} from '../netlify/lib/dialogue-moderator-access.mjs';
import {createModerationQueue} from '../netlify/lib/dialogue-moderation-queue.mjs';
import {createAppealService} from '../netlify/lib/dialogue-appeals.mjs';
import {createAppealQueue} from '../netlify/lib/dialogue-appeal-queue.mjs';
import {createEntry,reviewRevision} from '../netlify/lib/dialogue-model.mjs';

const origin='https://diploval.test',ID='dossier-http-b5-001',OTHER='dossier-http-b5-002';
const REF='CE-2026-000000ABCDEF',OTHER_REF='CE-2026-000000123456',email='auteur@example.test';
const initial=()=>createEntry({
 consultationId:'consultation-a',kind:'contribution',
 text:'Mon argument a été refusé, je souhaite comprendre les motifs.',
 processingAgreement:true,publicationAgreement:true,
 displayMode:'without_name',email
},{id:ID,reference:REF,at:'2026-11-19T11:00:00Z'});
function store(){
 const map=new Map();let count=0;
 return {
  async getWithMetadata(key){
   const v=map.get(key);return v?{etag:v.etag,data:JSON.parse(v.value)}:null;
  },
  async set(key,value,{onlyIfNew=false,onlyIfMatch=null}={}){
   const old=map.get(key);
   if(onlyIfNew&&old)return {modified:false,etag:old.etag};
   if(onlyIfMatch!==null&&(!old||old.etag!==onlyIfMatch))return {modified:false,etag:old?.etag};
   const etag='rev-'+(++count);map.set(key,{value,etag});return {modified:true,etag};
  }
 };
}
function setup(){
 const records=new Map([[ID,reviewRevision(initial(),{
  decision:'reject',actor:'Examinateur de test',
  reason:'Préciser la source principale.',expectedMutation:0,at:'2026-11-19T11:01:00Z'
 })]]);
 const other=initial();other.id=OTHER;other.reference=OTHER_REF;
 other.consultationId='consultation-b';records.set(OTHER,other);
 const data=store(),mail=[];
 let role='reviewer',allowed=true;
 const moderators=createModeratorAccess({
  verifySession:async req=>allowed&&req?.headers?.get('x-test-session')==='staff-verified'
   ?{staffId:'staff-b5-001',label:'Agent B5 de test'}:null,
  loadGrants:async()=>({active:true,roles:[role],consultationIds:['consultation-a']})
 });
 const authorAccess=createAuthorAccess({
  store:data,secret:Buffer.alloc(32,0x31),
  loadEntry:async id=>records.get(id)||null,
  sendLink:async msg=>mail.push(msg),
  clock:()=>Date.parse('2026-11-19T12:00:00Z')
 });
 const readAuthorEntry=async(principal,id)=>{
  const e=records.get(id);
  if(!e||await authorAccess.authorize(principal,'read_private',e)!==true)
   throw Error('Accès non autorisé.');
  return structuredClone(e);
 };
 const readModeratorEntry=async(principal,id)=>{
  const e=records.get(id);
  if(!e||await moderators.authorize(principal,'read_private',e)!==true)
   throw Error('Accès non autorisé.');
  return structuredClone(e);
 };
 const queue=createModerationQueue({
  listCandidateIds:async()=>[ID,OTHER],
  authorize:moderators.authorize,
  repository:{readPrivate:readModeratorEntry}
 });
 const appeals=createAppealService({
  store:data,readAuthorEntry,readModeratorEntry,authorizeModerator:moderators.authorize,
  clock:()=> '2026-11-19T12:00:00Z'
 });
 const appealQueue=createAppealQueue({
  listCandidateAppeals:async()=>[{entryId:ID,version:1}],
  appeals,authorize:moderators.authorize
 });
 const handler=createDialogueInternalHandler({
  enabled:true,origin,authorAccess,moderationQueue:queue,appealService:appeals,appealQueue,
  authorRepository:{readPrivate:readAuthorEntry,mutatePrivate:async()=>{throw Error('Unavailable in test')}},
  moderatorRepository:{readPrivate:readModeratorEntry,mutatePrivate:async()=>{throw Error('Unavailable in test')}},
  publicRepository:{readPublicReference:async()=>null},
  authenticateModerator:moderators.authenticate,
  resolveEntryIdByReference:async ref=>ref===REF?ID:null,
  rateLimit:async()=>true
 });
 const ask=async(path,{method='GET',body,cookie='',staff='',originHeader=origin}={})=>{
  const headers={};
  if(cookie)headers.cookie=cookie;
  if(staff)headers['x-test-session']=staff;
  if(method==='POST'){
   headers.origin=originHeader;headers['x-diploval-v03-request']='1';
   headers['content-type']='application/json';
  }
  return handler(new Request(origin+path,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})}));
 };
 const signIn=async()=>{
  const request=await ask('/author/request-link',{
   method:'POST',body:{reference:REF,email}
  });
  assert.equal(request.status,202);
  const authenticated=await ask('/author/redeem',{
   method:'POST',body:{token:mail.at(-1).token}
  });
  assert.equal(authenticated.status,200);
  return authenticated.headers.get('set-cookie').split(';')[0];
 };
 const post=(path,body,opts={})=>ask(path,{method:'POST',body,...opts});
 return {ask,post,records,mail,signIn,setRole:x=>{role=x},revoke:()=>{allowed=false}};
}
const rationale='Après discussion contradictoire, les éléments fournis motivent cette décision.';
const appealReason='Je souhaite expliquer pourquoi mon argument mérite un nouvel examen.';
test('contrôleur B5 : la file exige une session professionnelle',async()=>{
 const e=setup();
 assert.equal((await e.ask('/moderation/queue')).status,401);
 const signed=await e.signIn();
 assert.equal((await e.ask('/moderation/queue',{cookie:signed})).status,401);
});
test('examinateur : une file privée limitée à sa consultation, sans coordonnées',async()=>{
 const e=setup();
 const r=await e.ask('/moderation/queue?state=rejected',{staff:'staff-verified'});
 assert.equal(r.status,200);
 const payload=await r.json();
 assert.equal(payload.entries.length,1);
 assert.equal(payload.entries[0].id,ID);
 assert(!JSON.stringify(payload).includes(email));
 assert(!JSON.stringify(payload).includes(OTHER));
});
test('observateur : lecture oui, décision interdite',async()=>{
 const e=setup();e.setRole('observer');
 const q=await e.ask('/moderation/queue?state=rejected',{staff:'staff-verified'});
 assert.equal(q.status,200);
 const authorCookie=await e.signIn();
 const filed=await e.post('/author/appeal',{reason:appealReason},{cookie:authorCookie});
 assert.equal(filed.status,202);
 const a=await e.ask('/moderation/appeal?id='+ID+'&version=1',{staff:'staff-verified'});
 assert.equal(a.status,200);
 const reject=await e.post('/moderation/appeal/decide',{
  id:ID,version:1,decision:'maintain',reason:rationale
 },{staff:'staff-verified'});
 assert.equal(reject.status,503);
});
test('le contributeur dépose un recours et peut consulter uniquement le sien',async()=>{
 const e=setup();const signed=await e.signIn();
 const filed=await e.post('/author/appeal',{id:OTHER,reason:appealReason},{cookie:signed});
 assert.equal(filed.status,202);
 const data=await filed.json();
 assert.equal(data.appeal.reference,REF);
 assert.equal(data.appeal.status,'pending');
 assert(!JSON.stringify(data).includes(OTHER));
 const own=await e.ask('/author/appeal?version=1',{cookie:signed});
 assert.equal(own.status,200);
 assert.equal((await own.json()).appeal.reference,REF);
});
test('aucune demande de recours sans connexion auteur ou avec texte insuffisant',async()=>{
 const e=setup();
 assert.equal((await e.post('/author/appeal',{reason:appealReason})).status,401);
 const signed=await e.signIn();
 assert.equal((await e.post('/author/appeal',{reason:'Non'},{cookie:signed})).status,400);
});
test('modération : réponse motivée, aucune publication automatique',async()=>{
 const e=setup();const signed=await e.signIn();
 await e.post('/author/appeal',{reason:appealReason},{cookie:signed});
 const decided=await e.post('/moderation/appeal/decide',{
  id:ID,version:1,decision:'maintain',reason:rationale
 },{staff:'staff-verified'});
 assert.equal(decided.status,200);
 const response=await decided.json();
 assert.equal(response.appeal.status,'resolved');
 assert.equal(response.appeal.decision.outcome,'maintain');
 assert.equal(e.records.get(ID).versions[0].status,'rejected');
 const publicResponse=await e.ask('/public/entry?reference='+REF);
 assert.equal(publicResponse.status,404);
});
test('escalade : le superviseur seul peut clore le recours',async()=>{
 const e=setup();const signed=await e.signIn();
 await e.post('/author/appeal',{reason:appealReason},{cookie:signed});
 const escalated=await e.post('/moderation/appeal/decide',{
  id:ID,version:1,decision:'escalate',reason:rationale
 },{staff:'staff-verified'});
 assert.equal(escalated.status,200);
 const forbidden=await e.post('/moderation/appeal/decide',{
  id:ID,version:1,expectedStatus:'escalated',
  decision:'maintain',reason:rationale
 },{staff:'staff-verified'});
 assert.equal(forbidden.status,503);
 e.setRole('supervisor');
 const settled=await e.post('/moderation/appeal/decide',{
  id:ID,version:1,expectedStatus:'escalated',
  decision:'invite_revision',reason:rationale
 },{staff:'staff-verified'});
 assert.equal(settled.status,200);
 assert.equal((await settled.json()).appeal.status,'resolved');
});
test('révocation de session administrative bloque toute consultation de recours',async()=>{
 const e=setup();const signed=await e.signIn();
 await e.post('/author/appeal',{reason:appealReason},{cookie:signed});
 e.revoke();
 assert.equal((await e.ask('/moderation/appeal?id='+ID+'&version=1',{
  staff:'staff-verified'
 })).status,401);
});
test('pagination et paramètres mal formés : refus sans fuite',async()=>{
 const e=setup();
 assert.equal((await e.ask('/moderation/queue?limit=300',{staff:'staff-verified'})).status,400);
 assert.equal((await e.ask('/moderation/appeal?id=../private&version=1',{
  staff:'staff-verified'
 })).status,400);
 assert.equal((await e.post('/moderation/appeal/decide',{
  id:ID,version:1,decision:'publish',reason:rationale
 },{staff:'staff-verified'})).status,400);
});

test('file de recours HTTP : séparation des consultations et des sessions',async()=>{
 const e=setup();const cookie=await e.signIn();
 await e.post('/author/appeal',{reason:appealReason},{cookie});
 assert.equal((await e.ask('/moderation/appeals-queue')).status,401);
 const ok=await e.ask('/moderation/appeals-queue?status=pending',{staff:'staff-verified'});
 assert.equal(ok.status,200);
 const contents=await ok.json();
 assert.equal(contents.appeals.length,1);
 assert.equal(contents.appeals[0].reference,REF);
 assert(!JSON.stringify(contents).includes(email));
 assert.equal((await e.ask('/moderation/appeals-queue?limit=150',{staff:'staff-verified'})).status,400);
});
