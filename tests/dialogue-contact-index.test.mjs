import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createPrivateContactIndex} from '../netlify/lib/dialogue-contact-index.mjs';
import {createReferenceRecovery} from '../netlify/lib/dialogue-reference-recovery.mjs';
import {createEncryptedStore} from '../netlify/lib/dialogue-encrypted-store.mjs';
const key=Buffer.alloc(32,0x39),aes=Buffer.alloc(32,0x38);
const EMAIL='contributeur@example.test';
const id1='dossier-index-001',id2='dossier-index-002';
const hash=value=>createHmac('sha256',key).update('contact\u0000'+value).digest('hex');
function setup(){
 const map=new Map();let seq=0;
 const raw={
  map,
  async getWithMetadata(path){const v=map.get(path);return v?{etag:v.etag,data:JSON.parse(v.body)}:null},
  async set(path,body,{onlyIfNew=false,onlyIfMatch=null}={}){
   const current=map.get(path);
   if(onlyIfNew&&current)return {modified:false,etag:current.etag};
   if(onlyIfMatch!==null&&(!current||current.etag!==onlyIfMatch))
    return {modified:false,etag:current?.etag};
   const etag='etag-'+(++seq);map.set(path,{etag,body});return {modified:true,etag};
  }
 };
 const storage=createEncryptedStore({store:raw,key:aes});
 const index=createPrivateContactIndex({store:storage,secret:key});
 return {raw,storage,index};
}
test('impossible de construire l’index sans clé ni stockage privé',()=>{
 assert.throws(()=>createPrivateContactIndex(),/Stockage/);
 const e=setup();
 assert.throws(()=>createPrivateContactIndex({store:e.storage}),/Clé/);
});
test('enregistrement indexe plusieurs contributions sans e-mail en clair',async()=>{
 const e=setup();
 await e.index.register({email:EMAIL,id:id1});
 await e.index.register({email:EMAIL,id:id2});
 const ids=await e.index.lookupByDigest(hash(EMAIL));
 assert.deepEqual(ids,[id1,id2]);
 const raw=[...e.raw.map.entries()].map(([k,v])=>k+' '+v.body).join('\n');
 assert(!raw.includes(EMAIL));
 assert(!raw.includes(id1));
 assert(!raw.includes(id2));
});
test('doublon non créé ; enregistrement simultané conserve les deux références',async()=>{
 const e=setup();
 await Promise.all([
  e.index.register({email:EMAIL,id:id1}),
  e.index.register({email:EMAIL,id:id2})
 ]);
 await e.index.register({email:EMAIL,id:id1});
 assert.deepEqual(await e.index.lookupByDigest(hash(EMAIL)),[id1,id2]);
});
test('suppression indexée : la référence n’apparaît plus dans une récupération ultérieure',async()=>{
 const e=setup();
 await e.index.register({email:EMAIL,id:id1});
 await e.index.register({email:EMAIL,id:id2});
 await e.index.unregister({email:EMAIL,id:id1});
 assert.deepEqual(await e.index.lookupByDigest(hash(EMAIL)),[id2]);
});
test('index distinct pour deux adresses et pour une empreinte inconnue',async()=>{
 const e=setup();
 await e.index.register({email:EMAIL,id:id1});
 await e.index.register({email:'autre@example.test',id:id2});
 assert.deepEqual(await e.index.lookupByDigest(hash(EMAIL)),[id1]);
 assert.deepEqual(await e.index.lookupByDigest(hash('autre@example.test')),[id2]);
 assert.deepEqual(await e.index.lookupByDigest(hash('inconnue@example.test')),[]);
});
test('récupération B4 retrouve uniquement les contributions indexées et vérifiées',async()=>{
 const e=setup(),out=[];
 const documents=new Map([
  [id1,{id:id1,reference:'CE-2026-1234567890AB',consultationId:'consultation-a',kind:'contribution',
   visibility:'public',author:{privateContact:EMAIL},versions:[{submittedAt:'2026-11-18T10:00:00Z'}]}],
  [id2,{id:id2,reference:'CE-2026-ABCDEF123456',consultationId:'consultation-b',kind:'reply',
   visibility:'private',author:{privateContact:EMAIL},versions:[{submittedAt:'2026-11-19T10:00:00Z'}]}]
 ]);
 await e.index.register({email:EMAIL,id:id1});
 await e.index.register({email:EMAIL,id:id2});
 const recovery=createReferenceRecovery({
  store:e.storage,secret:key,lookupByDigest:e.index.lookupByDigest,
  loadEntry:async id=>documents.get(id)||null,
  sendRecovery:async msg=>out.push(msg),
  clock:()=>Date.parse('2026-11-19T11:00:00Z')
 });
 const response=await recovery.requestRecovery({email:EMAIL});
 assert.deepEqual(response,{accepted:true});
 assert.equal(out.length,1);
 const grant=await recovery.redeemRecovery(out[0].token);
 assert(grant);
 const initial=await recovery.listReferences(grant.sessionToken);
 assert.equal(initial.length,2);
 await e.index.unregister({email:EMAIL,id:id2});
 const updated=await recovery.listReferences(grant.sessionToken);
 assert.deepEqual(updated.map(x=>x.reference),['CE-2026-1234567890AB']);
});
