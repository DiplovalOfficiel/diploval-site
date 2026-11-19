import test from 'node:test';
import assert from 'node:assert/strict';
import {createDialogueInternalHandler} from '../netlify/lib/dialogue-service-v03.mjs';
import {createDialogueRepository} from '../netlify/lib/dialogue-storage.mjs';
import {createEncryptedStore} from '../netlify/lib/dialogue-encrypted-store.mjs';
import {createAuthorAccess} from '../netlify/lib/dialogue-author-access.mjs';
import {createEntry,publicView} from '../netlify/lib/dialogue-model.mjs';

const ORIGIN='https://diploval.test';
const ENTRY_ID='dossier-controleur-001',OTHER_ID='dossier-controleur-002';
const REF='CE-2026-AABBCCDDEEFF',OTHER_REF='CE-2026-112233445566';
const EMAIL='citoyen@example.test';
const MODERATOR=Object.freeze({internal:'moderator-authenticated-test'});
const SEED=Object.freeze({internal:'seed-only-test'});
const stamp='2026-11-19T10:15:00.000Z';
function fakeStore(){
 const map=new Map();let n=0;
 return {
  map,
  async getWithMetadata(key){
   const item=map.get(key);
   return item?{data:JSON.parse(item.value),etag:item.etag}:null;
  },
  async set(key,value,{onlyIfNew=false,onlyIfMatch=null}={}){
   const old=map.get(key);
   if(onlyIfNew&&old)return {modified:false,etag:old.etag};
   if(onlyIfMatch!==null&&(!old||old.etag!==onlyIfMatch))
    return {modified:false,etag:old?.etag};
   const etag='etag-'+(++n);
   map.set(key,{etag,value});
   return {modified:true,etag};
  }
 };
}
function makeEntry(id,reference,email=EMAIL){
 return createEntry({
  consultationId:'engagements-electoraux',kind:'contribution',
  text:'Une proposition de citoyen qui peut être discutée librement.',
  email,displayMode:'pseudonym',publicLabel:'Participant fictif',
  processingAgreement:true,publicationAgreement:true
 },{at:stamp,id,reference});
}
function setup({allowRate=true}={}){
 const raw=fakeStore(),storage=createEncryptedStore({store:raw,key:Buffer.alloc(32,0x61)});
 const seed=createDialogueRepository({
  store:storage,prefix:'b3-integration',authorize:async who=>who===SEED
 });
 const messages=[];
 let now=Date.parse('2026-11-19T10:16:00.000Z');
 const access=createAuthorAccess({
  store:storage,secret:Buffer.alloc(32,0x62),
  loadEntry:id=>seed.readPrivate(SEED,id),
  sendLink:async info=>{messages.push(info)},
  clock:()=>now
 });
 const authorRepository=createDialogueRepository({
  store:storage,prefix:'b3-integration',authorize:access.authorize
 });
 const moderatorRepository=createDialogueRepository({
  store:storage,prefix:'b3-integration',
  authorize:async(who,action)=>who===MODERATOR
   &&['lookup_private','read_private','moderate','withdraw'].includes(action)
 });
 const entryByRef=new Map([[REF,ENTRY_ID],[OTHER_REF,OTHER_ID]]);
 let limit=allowRate;
 const handler=createDialogueInternalHandler({
  enabled:true,origin:ORIGIN,authorAccess:access,authorRepository,
  moderatorRepository,publicRepository:seed,
  resolveEntryIdByReference:async ref=>entryByRef.get(ref)||null,
  authenticateModerator:async req=>req.headers.get('cookie')?.split(';').map(x=>x.trim())
   .includes('__Host-fictive-admin=verified')
   ?{principal:MODERATOR,label:'Modérateur habilité (test)'}:null,
  rateLimit:async()=>limit
 });
 const request=async(path,{method='GET',body,cookie,origin=ORIGIN,custom=true,contentType='application/json'}={})=>{
  const headers={};
  if(cookie)headers.Cookie=cookie;
  if(method==='POST'){
   headers.Origin=origin;
   if(custom)headers['X-Diploval-V03-Request']='1';
   headers['Content-Type']=contentType;
  }
  return handler(new Request(ORIGIN+path,{
   method,headers,...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})
  }));
 };
 return {
  seed,access,request,messages,raw,entryByRef,
  setRate:val=>{limit=val},
  setClock:val=>{now=val}
 };
}
const addEntry=async(env,id=ENTRY_ID,ref=REF,email=EMAIL)=>
 env.seed.createPrivate(SEED,makeEntry(id,ref,email));
const post=(env,path,body,cookie,extra={})=>
 env.request(path,{method:'POST',body,cookie,...extra});
const json=async response=>response.json();
async function authorizeAuthor(env){
 await addEntry(env);
 const sent=await post(env,'/author/request-link',{reference:REF,email:EMAIL});
 assert.equal(sent.status,202);
 assert.deepEqual(await json(sent),{accepted:true});
 assert.equal(env.messages.length,1);
 const redeemed=await post(env,'/author/redeem',{token:env.messages[0].token});
 assert.equal(redeemed.status,200);
 assert.deepEqual(await json(redeemed),{authenticated:true});
 const authCookie=redeemed.headers.get('set-cookie');
 assert.match(authCookie,/HttpOnly/);
 assert.match(authCookie,/Secure/);
 assert.match(authCookie,/SameSite=Strict/);
 assert(!authCookie.includes('Domain='));
 return authCookie.split(';')[0];
}

test('désactivé par défaut : réponse 503 sans dépendances',async()=>{
 const h=createDialogueInternalHandler();
 const r=await h(new Request(ORIGIN+'/author/me'));
 assert.equal(r.status,503);
 assert.match((await r.json()).error,/non activé/);
});
test('activation impossible si les dépendances de sécurité manquent',()=>{
 assert.throws(()=>createDialogueInternalHandler({enabled:true}),/Origine HTTPS/);
 assert.throws(()=>createDialogueInternalHandler({enabled:true,origin:ORIGIN}),/Authentification auteur/);
});
test('aucun accès aux chemins inconnus, aux mauvaises méthodes ou origines',async()=>{
 const env=setup();
 assert.equal((await env.request('/irrelevant')).status,404);
 assert.equal((await env.request('/public/entry',{method:'DELETE'})).status,405);
 const wrong=await env.request('/author/me',{origin:'https://attacker.test'});
 assert.equal(wrong.status,401); // le GET n'accepte pas un Origin comme preuve
 const cross=await env.request('/author/redeem',{method:'POST',body:{token:'unused'},origin:'https://attacker.test'});
 assert.equal(cross.status,403);
 const missingHeader=await post(env,'/author/redeem',{token:'unused'},null,{custom:false});
 assert.equal(missingHeader.status,403);
});
test('limitation de fréquence obligatoire avant tout traitement',async()=>{
 const env=setup({allowRate:false});
 const r=await post(env,'/author/request-link',{reference:REF,email:EMAIL});
 assert.equal(r.status,429);
 assert.equal(env.messages.length,0);
});
test('la demande de lien est générique, sans exposer l’identifiant interne',async()=>{
 const env=setup();
 await addEntry(env);
 const real=await post(env,'/author/request-link',{reference:REF,email:EMAIL});
 const absent=await post(env,'/author/request-link',{reference:OTHER_REF,email:EMAIL});
 assert.equal(real.status,absent.status);
 assert.deepEqual(await json(real),await json(absent));
 assert.equal(env.messages.length,1);
 assert(!JSON.stringify(env.messages[0]).includes(ENTRY_ID));
});
test('lien à usage unique, session en cookie sécurisé, sans jeton dans le JSON',async()=>{
 const env=setup();
 const cookie=await authorizeAuthor(env);
 assert.match(cookie,/^__Host-diploval-v03-author=/);
 const token=env.messages[0].token;
 const replay=await post(env,'/author/redeem',{token});
 assert.equal(replay.status,401);
 assert(!JSON.stringify(await json(replay)).includes(token));
});
test('l’auteur voit seulement son texte, pas les notes ni les coordonnées en sortie',async()=>{
 const env=setup();const cookie=await authorizeAuthor(env);
 const read=await env.request('/author/me',{cookie});
 assert.equal(read.status,200);
 const response=await json(read);
 assert.equal(response.entry.reference,REF);
 assert.equal(response.entry.versions[0].status,'pending');
 const serialized=JSON.stringify(response);
 assert(!serialized.includes(EMAIL));
 assert(!serialized.includes(ENTRY_ID));
 assert(!serialized.includes('audit'));
 assert(!serialized.includes('permissions'));
 assert(!serialized.includes('contact'));
});
test('sans session, impossible de récupérer un dossier privé',async()=>{
 const env=setup();await addEntry(env);
 assert.equal((await env.request('/author/me')).status,401);
 assert.equal((await env.request('/author/me',{cookie:'__Host-diploval-v03-author=forged'})).status,401);
});
test('l’auteur ne peut pas modifier un autre dossier en ajoutant un id',async()=>{
 const env=setup();const cookie=await authorizeAuthor(env);
 await addEntry(env,OTHER_ID,OTHER_REF,'second@example.test');
 await post(env,'/moderation/review',{
  id:ENTRY_ID,expectedMutation:0,decision:'approve'
 },'__Host-fictive-admin=verified');
 const response=await post(env,'/author/revise',{
  id:OTHER_ID,text:'Je propose une réflexion différente avec davantage de nuances.',
  expectedMutation:1
 },cookie);
 assert.equal(response.status,202);
 const actual=await env.seed.readPrivate(SEED,ENTRY_ID);
 const untouched=await env.seed.readPrivate(SEED,OTHER_ID);
 assert.equal(actual.versions.length,2);
 assert.equal(untouched.versions.length,1);
});
test('une révision en attente n’est pas visible sans décision modérateur',async()=>{
 const env=setup();const cookie=await authorizeAuthor(env);
 await post(env,'/moderation/review',{
  id:ENTRY_ID,expectedMutation:0,decision:'approve'
 },'__Host-fictive-admin=verified');
 const newText='J’ai changé de position après avoir examiné de nouveaux éléments.';
 const changed=await post(env,'/author/revise',{text:newText,expectedMutation:1},cookie);
 assert.equal(changed.status,202);
 assert.equal((await json(changed)).mutation,2);
 const published=await env.request('/public/entry?reference='+REF);
 assert.equal(published.status,200);
 assert.equal((await json(published)).entry.version,1);
});
test('le cookie auteur n’autorise jamais une action de modération',async()=>{
 const env=setup();const cookie=await authorizeAuthor(env);
 const admin=await env.request('/moderation/entry?id='+ENTRY_ID,{cookie});
 assert.equal(admin.status,401);
 const forged=await post(env,'/moderation/review',{
  id:ENTRY_ID,expectedMutation:0,decision:'approve',label:'Je suis modérateur'
 },cookie);
 assert.equal(forged.status,401);
});
test('un vrai modérateur fictif de test peut lire une projection privée réduite',async()=>{
 const env=setup();await addEntry(env);
 const read=await env.request('/moderation/entry?id='+ENTRY_ID,{
  cookie:'__Host-fictive-admin=verified'
 });
 assert.equal(read.status,200);
 const result=await json(read);
 assert.equal(result.entry.id,ENTRY_ID);
 assert.equal(result.entry.publicationAllowed,true);
 assert(!JSON.stringify(result).includes(EMAIL));
 assert(!JSON.stringify(result).includes('processingAt'));
 assert(!JSON.stringify(result).includes('audit'));
});
test('une validation humaine rend visible uniquement la projection filtrée',async()=>{
 const env=setup();await addEntry(env);
 const approve=await post(env,'/moderation/review',{
  id:ENTRY_ID,expectedMutation:0,decision:'approve',
  actor:'Faux modérateur',reason:'Décision fictive motivée'
 },'__Host-fictive-admin=verified');
 assert.equal(approve.status,200);
 assert.equal((await json(approve)).mutation,1);
 const r=await env.request('/public/entry?reference='+REF);
 assert.equal(r.status,200);
 const v=(await json(r)).entry;
 assert.equal(v.reference,REF);
 assert.equal(v.version,1);
 assert(!JSON.stringify(v).includes(EMAIL));
 assert(!JSON.stringify(v).includes('Faux modérateur'));
 const internal=await env.seed.readPrivate(SEED,ENTRY_ID);
 assert.equal(internal.audit.at(-1).actor,'Modérateur habilité (test)');
});
test('un rejet sans motif est impossible, une justification est tracée en privé',async()=>{
 const env=setup();await addEntry(env);
 const noReason=await post(env,'/moderation/review',{
  id:ENTRY_ID,expectedMutation:0,decision:'reject'
 },'__Host-fictive-admin=verified');
 assert.equal(noReason.status,400);
 const withReason=await post(env,'/moderation/review',{
  id:ENTRY_ID,expectedMutation:0,decision:'reject',reason:'Justification insuffisante.'
 },'__Host-fictive-admin=verified');
 assert.equal(withReason.status,200);
 const internal=await env.seed.readPrivate(SEED,ENTRY_ID);
 assert.equal(internal.audit.at(-1).reason,'Justification insuffisante.');
 assert.equal((await env.request('/public/entry?reference='+REF)).status,404);
});
test('un retrait motivé supprime l’affichage public, sans effacer la fiche privée',async()=>{
 const env=setup();await addEntry(env);
 await post(env,'/moderation/review',{
  id:ENTRY_ID,expectedMutation:0,decision:'approve'
 },'__Host-fictive-admin=verified');
 const remove=await post(env,'/moderation/withdraw',{
  id:ENTRY_ID,expectedMutation:1,reason:'Retrait demandé et vérifié.'
 },'__Host-fictive-admin=verified');
 assert.equal(remove.status,200);
 assert.equal((await env.request('/public/entry?reference='+REF)).status,404);
 assert.equal((await env.seed.readPrivate(SEED,ENTRY_ID)).visibility,'withdrawn');
});
test('en cas de conflit, aucun succès de modification n’est annoncé',async()=>{
 const env=setup();await addEntry(env);
 const one=await post(env,'/moderation/review',{
  id:ENTRY_ID,expectedMutation:0,decision:'approve'
 },'__Host-fictive-admin=verified');
 assert.equal(one.status,200);
 const stale=await post(env,'/moderation/review',{
  id:ENTRY_ID,expectedMutation:0,decision:'reject',reason:'Une autre décision existe.'
 },'__Host-fictive-admin=verified');
 assert.equal(stale.status,409);
});
test('la révocation par déconnexion refuse la même session ensuite',async()=>{
 const env=setup();const cookie=await authorizeAuthor(env);
 const logout=await post(env,'/author/logout',{},cookie);
 assert.equal(logout.status,200);
 assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
 assert.equal((await env.request('/author/me',{cookie})).status,401);
});
test('les corps incorrects et les gros corps sont rejetés sans effet',async()=>{
 const env=setup();await addEntry(env);
 const bad=await post(env,'/author/redeem','{invalide');
 assert.equal(bad.status,400);
 const wrongType=await post(env,'/author/redeem',{token:'test'},null,{
  contentType:'text/plain'
 });
 assert.equal(wrongType.status,415);
 const huge=await post(env,'/author/redeem',{token:'x'.repeat(13000)});
 assert.equal(huge.status,413);
});
test('un dossier public d’une autre référence ne se révèle jamais sans validation',async()=>{
 const env=setup();await addEntry(env);
 const r=await env.request('/public/entry?reference='+OTHER_REF);
 assert.equal(r.status,404);
 assert(!JSON.stringify(await json(r)).includes(ENTRY_ID));
});
