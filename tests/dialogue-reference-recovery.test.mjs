import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createReferenceRecovery} from '../netlify/lib/dialogue-reference-recovery.mjs';

const secret=Buffer.alloc(32,0x4f);
const email='citoyen@example.test';
const hash=value=>createHmac('sha256',secret).update('contact\u0000'+value).digest('hex');
const records=[
 {id:'dossier-recuperation-001',reference:'CE-2026-AAAABBBBCCCC',consultationId:'consultation-a',kind:'contribution',visibility:'public',
  author:{privateContact:email},versions:[{submittedAt:'2026-11-18T10:00:00Z'}]},
 {id:'dossier-recuperation-002',reference:'CE-2026-DDDDEEEEFFFF',consultationId:'consultation-b',kind:'charter',visibility:'private',
  author:{privateContact:email},versions:[{status:'pending',submittedAt:'2026-11-19T10:00:00Z'}]},
 {id:'dossier-autre-003',reference:'CE-2026-112233445566',consultationId:'consultation-c',kind:'reply',visibility:'private',
  author:{privateContact:'autre@example.test'},versions:[{status:'pending',submittedAt:'2026-11-18T11:00:00Z'}]}
];
function setup(){
 const map=new Map();let seq=0,now=Date.parse('2026-11-19T11:00:00Z');
 const store={
  async getWithMetadata(key){const v=map.get(key);return v?{etag:v.etag,data:JSON.parse(v.value)}:null},
  async set(key,value,{onlyIfNew=false,onlyIfMatch=null}={}){
   const old=map.get(key);
   if(onlyIfNew&&old)return {modified:false,etag:old.etag};
   if(onlyIfMatch!==null&&(!old||old.etag!==onlyIfMatch))return {modified:false,etag:old?.etag};
   const etag='etag-'+(++seq);map.set(key,{etag,value});return {modified:true,etag};
  }
 };
 const index=new Map([[hash(email),['dossier-recuperation-001','dossier-recuperation-002']]]);
 const list=structuredClone(records),sent=[];
 const recovery=createReferenceRecovery({
  store,secret,
  lookupByDigest:async digest=>index.get(digest)||[],
  loadEntry:async id=>list.find(x=>x.id===id)||null,
  sendRecovery:async message=>sent.push(message),
  clock:()=>now
 });
 return {recovery,map,index,list,sent,advance:ms=>{now+=ms}};
}
async function signedIn(e){
 assert.deepEqual(await e.recovery.requestRecovery({email}),{accepted:true});
 assert.equal(e.sent.length,1);
 const {token}=e.sent[0];
 const session=await e.recovery.redeemRecovery(token);
 assert(session);
 return {token,...session};
}
test('échec fermé sans clé, stockage ou index privé',()=>{
 assert.throws(()=>createReferenceRecovery(),/Stockage/);
 const e=setup();
 assert.throws(()=>createReferenceRecovery({store:{getWithMetadata(){},set(){}}}),/Clé HMAC/);
 assert.throws(()=>createReferenceRecovery({store:{getWithMetadata(){},set(){}},secret}),/Index privé/);
});
test('adresse inconnue ou incorrecte : même réponse et aucun courrier',async()=>{
 const e=setup();
 const a=await e.recovery.requestRecovery({email:'inconnue@example.test'});
 const b=await e.recovery.requestRecovery({email:'mal-formée'});
 assert.deepEqual(a,{accepted:true});
 assert.deepEqual(a,b);
 assert.equal(e.sent.length,0);
});
test('une référence n’est jamais affichée dans la réponse de demande',async()=>{
 const e=setup();
 const response=await e.recovery.requestRecovery({email:email.toUpperCase()});
 assert.deepEqual(response,{accepted:true});
 assert(!JSON.stringify(response).includes('CE-'));
 assert.equal(e.sent[0].to,email);
 assert.equal(e.sent[0].token.length,43);
 const storage=[...e.map.entries()].map(([k,v])=>k+v.value).join(' ');
 assert(!storage.includes(e.sent[0].token));
 assert(!storage.includes(email));
 assert(!storage.includes('CE-'));
});
test('lien utilisé une fois : liste réduite aux dossiers de cette adresse',async()=>{
 const e=setup();const {token,sessionToken}=await signedIn(e);
 assert.equal(await e.recovery.redeemRecovery(token),null);
 const found=await e.recovery.listReferences(sessionToken);
 assert.equal(found.length,2);
 assert.deepEqual(found.map(v=>v.reference),['CE-2026-DDDDEEEEFFFF','CE-2026-AAAABBBBCCCC']);
 assert(found.every(v=>!Object.hasOwn(v,'id')&&!Object.hasOwn(v,'author')));
 assert(!JSON.stringify(found).includes('autre@example.test'));
});
test('lien expiré après dix minutes',async()=>{
 const e=setup();await e.recovery.requestRecovery({email});
 e.advance(600000);
 assert.equal(await e.recovery.redeemRecovery(e.sent[0].token),null);
});
test('session expire en quinze minutes, révocation immédiate',async()=>{
 const e=setup();const {sessionToken}=await signedIn(e);
 assert.equal((await e.recovery.listReferences(sessionToken)).length,2);
 assert.equal(await e.recovery.revokeRecovery(sessionToken),true);
 assert.equal(await e.recovery.listReferences(sessionToken),null);
 assert.equal(await e.recovery.revokeRecovery(sessionToken),false);
 const later=setup();const session=await signedIn(later);
 later.advance(900000);
 assert.equal(await later.recovery.listReferences(session.sessionToken),null);
});
test('pas de liste sans session vérifiée ou avec référence seule',async()=>{
 const e=setup();
 assert.equal(await e.recovery.listReferences('CE-2026-AAAABBBBCCCC'),null);
 assert.equal(await e.recovery.listReferences('not-a-session'),null);
 assert.equal(await e.recovery.listReferences('A'.repeat(43)),null);
});
test('un index obsolète ne révèle jamais un dossier dont le contact a changé',async()=>{
 const e=setup();const {sessionToken}=await signedIn(e);
 e.list[0].author.privateContact='adresse-changee@example.test';
 const found=await e.recovery.listReferences(sessionToken);
 assert.equal(found.length,1);
 assert.equal(found[0].reference,'CE-2026-DDDDEEEEFFFF');
});
test('un index malveillant contenant un autre dossier ne révèle pas son contenu',async()=>{
 const e=setup();
 e.index.set(hash(email),['dossier-recuperation-001','dossier-autre-003']);
 const {sessionToken}=await signedIn(e);
 const found=await e.recovery.listReferences(sessionToken);
 assert.deepEqual(found.map(v=>v.reference),['CE-2026-AAAABBBBCCCC']);
});
test('une adresse sans dossiers valides ne déclenche aucun envoi',async()=>{
 const e=setup();
 e.list[0].author.privateContact='modifie@example.test';
 e.list[1].author.privateContact='modifie@example.test';
 assert.deepEqual(await e.recovery.requestRecovery({email}),{accepted:true});
 assert.equal(e.sent.length,0);
});
test('deux validations simultanées : une seule session peut être créée',async()=>{
 const e=setup();await e.recovery.requestRecovery({email});
 const token=e.sent[0].token;
 const calls=await Promise.all([e.recovery.redeemRecovery(token),e.recovery.redeemRecovery(token)]);
 assert.equal(calls.filter(Boolean).length,1);
});
test('le départ d’une contribution de l’index est reflété dès la liste suivante',async()=>{
 const e=setup();const {sessionToken}=await signedIn(e);
 e.index.set(hash(email),['dossier-recuperation-002']);
 assert.deepEqual((await e.recovery.listReferences(sessionToken)).map(x=>x.reference),['CE-2026-DDDDEEEEFFFF']);
});
test('un code de récupération seul ne constitue pas une autorisation de lecture',async()=>{
 const e=setup();await e.recovery.requestRecovery({email});
 assert.equal(await e.recovery.listReferences(e.sent[0].token),null);
});
