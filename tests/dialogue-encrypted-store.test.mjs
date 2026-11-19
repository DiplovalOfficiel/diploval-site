import test from 'node:test';
import assert from 'node:assert/strict';
import {createEncryptedStore,decodeEncryptionKey} from '../netlify/lib/dialogue-encrypted-store.mjs';

const key=Buffer.alloc(32,0x31); // Exclusivement une clé de test : jamais de production.
function rawStore(){
 const map=new Map();let revision=0;
 return {
  map,
  async getWithMetadata(path){
   const found=map.get(path);
   return found?{data:JSON.parse(found.body),etag:found.etag}:null;
  },
  async set(path,body,{onlyIfNew=false,onlyIfMatch=null}={}){
   const old=map.get(path);
   if(onlyIfNew&&old)return {modified:false,etag:old.etag};
   if(onlyIfMatch!==null&&(!old||old.etag!==onlyIfMatch))return {modified:false,etag:old?.etag};
   const etag='rev-'+(++revision);
   map.set(path,{body,etag});
   return {modified:true,etag};
  }
 };
}
test('aucun stockage sans clé AES-256 ou interface privée valide',()=>{
 assert.throws(()=>createEncryptedStore({}),/Stockage privé/);
 assert.throws(()=>createEncryptedStore({store:rawStore(),key:Buffer.alloc(8)}),/Clé de chiffrement/);
 assert.doesNotThrow(()=>createEncryptedStore({store:rawStore(),key}));
});
test('décodage strict de la clé de 256 bits',()=>{
 const b64=key.toString('base64');
 assert.deepEqual(decodeEncryptionKey(b64),key);
 assert.deepEqual(decodeEncryptionKey(key.toString('base64url')),key);
 assert.throws(()=>decodeEncryptionKey('clé-factice'),/formatée/);
});
test('enveloppe chiffrée : ni texte ni adresse en clair dans le stockage brut',async()=>{
 const raw=rawStore(),storage=createEncryptedStore({store:raw,key});
 const doc={text:'Mon avis peut évoluer, sans être rendu public.',email:'personne@example.test'};
 const name='dialogue-v03/records/dossier-001';
 const result=await storage.set(name,JSON.stringify(doc),{onlyIfNew:true});
 assert.equal(result.modified,true);
 const body=raw.map.get(name).body;
 assert(!body.includes(doc.text));
 assert(!body.includes(doc.email));
 assert.equal(JSON.parse(body).algorithm,'AES-256-GCM');
 const got=await storage.getWithMetadata(name,{type:'json',consistency:'strong'});
 assert.deepEqual(got.data,doc);
 assert.equal(got.etag,result.etag);
});
test('les modifications conditionnelles restent opérationnelles avec les données chiffrées',async()=>{
 const raw=rawStore(),storage=createEncryptedStore({store:raw,key}),path='dialogue-v03/auth/jeton-001';
 const one=await storage.set(path,JSON.stringify({status:'pending'}),{onlyIfNew:true});
 const conflict=await storage.set(path,JSON.stringify({status:'active'}),{onlyIfNew:true});
 assert.equal(conflict.modified,false);
 const mismatch=await storage.set(path,JSON.stringify({status:'active'}),{onlyIfMatch:'obsolete'});
 assert.equal(mismatch.modified,false);
 const updated=await storage.set(path,JSON.stringify({status:'active'}),{onlyIfMatch:one.etag});
 assert.equal(updated.modified,true);
 assert.equal((await storage.getWithMetadata(path)).data.status,'active');
});
test('une enveloppe altérée est refusée sans révéler de texte',async()=>{
 const raw=rawStore(),storage=createEncryptedStore({store:raw,key}),name='dialogue-v03/records/private-002';
 await storage.set(name,JSON.stringify({message:'à protéger'}),{onlyIfNew:true});
 const row=raw.map.get(name),envelope=JSON.parse(row.body);
 envelope.payload=(envelope.payload.startsWith('A')?'B':'A')+envelope.payload.slice(1);
 raw.map.set(name,{...row,body:JSON.stringify(envelope)});
 await assert.rejects(()=>storage.getWithMetadata(name),/intégrité non vérifiée/);
});
test('copier une enveloppe sur une autre clé ne permet pas de la lire',async()=>{
 const raw=rawStore(),storage=createEncryptedStore({store:raw,key});
 const from='dialogue-v03/records/private-003',to='dialogue-v03/records/private-004';
 await storage.set(from,JSON.stringify({text:'confidentiel'}),{onlyIfNew:true});
 raw.map.set(to,{...raw.map.get(from)});
 await assert.rejects(()=>storage.getWithMetadata(to),/intégrité non vérifiée/);
});
test('une clé inconnue ne permet pas de déchiffrer',async()=>{
 const raw=rawStore(),good=createEncryptedStore({store:raw,key});
 const wrong=createEncryptedStore({store:raw,key:Buffer.alloc(32,0x32)});
 const path='dialogue-v03/records/private-005';
 await good.set(path,JSON.stringify({text:'strictement privé'}),{onlyIfNew:true});
 await assert.rejects(()=>wrong.getWithMetadata(path),/intégrité non vérifiée/);
});
test('aucune lecture hors des chemins privés autorisés',async()=>{
 const storage=createEncryptedStore({store:rawStore(),key});
 await assert.rejects(()=>storage.getWithMetadata('../danger'),/Chemin/);
 await assert.rejects(()=>storage.getWithMetadata('dialogue-v03/../fuite'),/Chemin/);
 await assert.rejects(()=>storage.getWithMetadata('x'),/Chemin/);
});
test('échec fermé sur des données non chiffrées',async()=>{
 const raw=rawStore(),path='dialogue-v03/records/private-006';
 await raw.set(path,JSON.stringify({text:'données anciennes en clair'}),{onlyIfNew:true});
 await assert.rejects(()=>createEncryptedStore({store:raw,key}).getWithMetadata(path),/intégrité non vérifiée/);
});
test('un nonce invalide ou JSON invalide empêche toute écriture',async()=>{
 const raw=rawStore();
 const storage=createEncryptedStore({store:raw,key,nonce:()=>Buffer.alloc(3)});
 await assert.rejects(()=>storage.set('dialogue-v03/records/private-007',JSON.stringify({text:'ok'})),/Nonce/);
 await assert.rejects(()=>createEncryptedStore({store:raw,key}).set('dialogue-v03/records/private-008','texte brut'),/JSON/);
 assert.equal(raw.map.size,0);
});
