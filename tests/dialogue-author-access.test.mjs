import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthorAccess} from '../netlify/lib/dialogue-author-access.mjs';
import {createEntry,reviewRevision} from '../netlify/lib/dialogue-model.mjs';
import {createDialogueRepository} from '../netlify/lib/dialogue-storage.mjs';

const secret=Buffer.alloc(32,0x4a); // Clé FICTIVE réservée aux tests automatisés.
const entryId='dossier-auth-001';
const email='auteur@example.test';
const stamp='2026-11-19T09:00:00.000Z';
const reference='CE-2026-001122334455';
const entry=()=>createEntry({
 consultationId:'engagements-electoraux',kind:'contribution',
 text:'Une proposition citoyenne libre conservée dans un dossier privé.',
 processingAgreement:true,publicationAgreement:true,displayMode:'pseudonym',
 publicLabel:'Citoyen fictif',email
},{at:stamp,id:entryId,reference});

function fakeStore(){
 const map=new Map();let counter=0;
 return {
  map,
  async getWithMetadata(key){
   const x=map.get(key);
   return x?{etag:x.etag,data:JSON.parse(x.body)}:null;
  },
  async set(key,body,{onlyIfNew=false,onlyIfMatch=null}={}){
   const current=map.get(key);
   if(onlyIfNew&&current)return {modified:false,etag:current.etag};
   if(onlyIfMatch!==null&&(!current||current.etag!==onlyIfMatch))return {modified:false,etag:current?.etag};
   const etag='etag-'+(++counter);
   map.set(key,{body,etag});
   return {modified:true,etag};
  }
 };
}
function setup(){
 let now=Date.parse('2026-11-19T10:00:00.000Z');
 const records=new Map([[entryId,entry()]]);
 const delivered=[],store=fakeStore();
 const access=createAuthorAccess({
  store,secret,
  loadEntry:async id=>records.get(id)??null,
  sendLink:async msg=>{delivered.push(msg)},
  clock:()=>now
 });
 return {access,store,records,delivered,
  advance:ms=>{now+=ms},
  get now(){return now}
 };
}
async function sendAndRedeem(env){
 const reply=await env.access.requestLink({entryId,email});
 assert.deepEqual(reply,{accepted:true});
 assert.equal(env.delivered.length,1);
 const {token}=env.delivered[0];
 const session=await env.access.redeemLink(token);
 assert(session);
 return {token,...session};
}
test('configuration verrouillée sans stockage, clé, transport ou chargeur serveur',()=>{
 assert.throws(()=>createAuthorAccess(),/Stockage/);
 assert.throws(()=>createAuthorAccess({store:fakeStore()}),/Clé serveur/);
 assert.throws(()=>createAuthorAccess({store:fakeStore(),secret:Buffer.alloc(8)}),/Clé serveur/);
 assert.throws(()=>createAuthorAccess({store:fakeStore(),secret}),/Lecture de dossier/);
});
test('adresse inconnue : réponse générique et aucun courriel ni lien',async()=>{
 const e=setup();
 const answer=await e.access.requestLink({entryId,email:'autre@example.test'});
 assert.deepEqual(answer,{accepted:true});
 assert.equal(e.delivered.length,0);
 assert.equal(e.store.map.size,0);
});
test('numéro public et adresse erronée ne donnent aucun accès',async()=>{
 const e=setup();
 assert.deepEqual(await e.access.requestLink({entryId:reference,email}),{accepted:true});
 assert.deepEqual(await e.access.requestLink({entryId:'inconnu-dossier',email}),{accepted:true});
 assert.equal(e.delivered.length,0);
 assert.equal(await e.access.authenticate(reference),null);
});
test('lien transmis uniquement au destinataire vérifié ; jamais retourné au demandeur',async()=>{
 const e=setup();
 const result=await e.access.requestLink({entryId,email:' AUTEUR@EXAMPLE.TEST '});
 assert.deepEqual(result,{accepted:true});
 assert.equal(e.delivered[0].to,email);
 assert.equal(e.delivered[0].token.length,43);
 const dump=[...e.store.map.entries()].map(([k,v])=>k+v.body).join('');
 assert(!dump.includes(e.delivered[0].token));
 assert(!dump.includes(email));
 assert(!dump.includes('Une proposition citoyenne'));
 assert.equal(e.store.map.size,1);
});
test('un lien consommé n’est pas utilisable une deuxième fois',async()=>{
 const e=setup();
 const {token,sessionToken}=await sendAndRedeem(e);
 assert.equal(await e.access.redeemLink(token),null);
 assert(await e.access.authenticate(sessionToken));
});
test('un lien expiré est refusé ; aucun cookie de session créé',async()=>{
 const e=setup();
 await e.access.requestLink({entryId,email});
 e.advance(10*60*1000);
 assert.equal(await e.access.redeemLink(e.delivered[0].token),null);
 assert.equal(e.store.map.size,1);
});
test('un jeton invalide ou de référence n’ouvre pas une session',async()=>{
 const e=setup();
 assert.equal(await e.access.redeemLink('un-code-court'),null);
 assert.equal(await e.access.redeemLink(reference),null);
 assert.equal(await e.access.authenticate(''),null);
});
test('la session expire même si le jeton ne fuit pas',async()=>{
 const e=setup();const {sessionToken}=await sendAndRedeem(e);
 assert(await e.access.authenticate(sessionToken));
 e.advance(2*60*60*1000);
 assert.equal(await e.access.authenticate(sessionToken),null);
});
test('la révocation invalide la session et un principal déjà authentifié',async()=>{
 const e=setup();const {sessionToken}=await sendAndRedeem(e);
 const principal=await e.access.authenticate(sessionToken);
 assert.equal(await e.access.authorize(principal,'lookup_private'),true);
 assert.equal(await e.access.revokeSession(sessionToken),true);
 assert.equal(await e.access.revokeSession(sessionToken),false);
 assert.equal(await e.access.authenticate(sessionToken),null);
 assert.equal(await e.access.authorize(principal,'lookup_private'),false);
});
test('aucun principal forgé ou sérialisé ne peut être autorisé',async()=>{
 const e=setup();const {sessionToken}=await sendAndRedeem(e);
 const principal=await e.access.authenticate(sessionToken);
 assert.equal(await e.access.authorize(principal,'lookup_private'),true);
 assert.equal(await e.access.authorize({type:'author'},'lookup_private'),false);
 assert.equal(await e.access.authorize(JSON.parse(JSON.stringify(principal)),'lookup_private'),false);
 assert.equal(await e.access.authorize(null,'lookup_private'),false);
});
test('le contributeur peut lire et réviser son dossier, pas le modérer',async()=>{
 const e=setup();const {sessionToken}=await sendAndRedeem(e);
 const principal=await e.access.authenticate(sessionToken);
 assert.equal(await e.access.authorize(principal,'read_private',entry()),true);
 assert.equal(await e.access.authorize(principal,'revise',entry()),true);
 assert.equal(await e.access.authorize(principal,'create'),false);
 assert.equal(await e.access.authorize(principal,'moderate',entry()),false);
 assert.equal(await e.access.authorize(principal,'withdraw',entry()),false);
});
test('un accès auteur n’ouvre aucun autre dossier',async()=>{
 const e=setup();const {sessionToken}=await sendAndRedeem(e);
 const principal=await e.access.authenticate(sessionToken);
 const unrelated=entry();
 unrelated.id='dossier-auth-002';
 assert.equal(await e.access.authorize(principal,'read_private',unrelated),false);
 assert.equal(await e.access.authorize(principal,'revise',unrelated),false);
});
test('changer l’adresse du dossier invalide la session et le lien non consommé',async()=>{
 const e=setup();
 await e.access.requestLink({entryId,email});
 e.records.get(entryId).author.privateContact='nouveau@example.test';
 assert.equal(await e.access.redeemLink(e.delivered[0].token),null);
 const other=setup();
 const {sessionToken}=await sendAndRedeem(other);
 other.records.get(entryId).author.privateContact='nouveau@example.test';
 assert.equal(await other.access.authenticate(sessionToken),null);
});
test('deux utilisations simultanées d’un lien : au plus une session',async()=>{
 const e=setup();await e.access.requestLink({entryId,email});
 const token=e.delivered[0].token;
 const attempts=await Promise.all([e.access.redeemLink(token),e.access.redeemLink(token)]);
 assert.equal(attempts.filter(Boolean).length,1);
});
test('le stockage privé B1 applique les droits de la session B2',async()=>{
 const e=setup();
 const seed=createDialogueRepository({store:e.store,authorize:async()=>true,prefix:'test-seed-v03'});
 await seed.createPrivate({trusted:true},entry());
 const privateRepo=createDialogueRepository({
  store:e.store,prefix:'test-seed-v03',authorize:e.access.authorize
 });
 const {sessionToken}=await sendAndRedeem(e);
 const principal=await e.access.authenticate(sessionToken);
 const own=await privateRepo.readPrivate(principal,entryId);
 assert.equal(own.reference,reference);
 await assert.rejects(()=>privateRepo.readPrivate({type:'author'},entryId),/non autorisé/);
 await assert.rejects(()=>privateRepo.mutatePrivate(principal,entryId,{
  expectedMutation:0,operation:'moderate',
  transform:x=>reviewRevision(x,{
   decision:'approve',actor:'inconnu',expectedMutation:x.mutation,at:stamp
  })
 }),/non autorisé/);
});
test('un échec de l’envoi ne révèle jamais le jeton au demandeur',async()=>{
 const e=setup();
 const failing=createAuthorAccess({
  store:e.store,secret,loadEntry:async id=>e.records.get(id),
  clock:()=>e.now,
  sendLink:async()=>{throw Error('Transport indisponible')}
 });
 await assert.rejects(()=>failing.requestLink({entryId,email}),/Transport indisponible/);
 assert.equal(e.store.map.size,1);
});
