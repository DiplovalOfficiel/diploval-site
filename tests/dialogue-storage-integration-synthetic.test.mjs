import test from 'node:test';
import assert from 'node:assert/strict';
import {createEncryptedStore} from '../netlify/lib/dialogue-encrypted-store.mjs';

// In-memory simulation only; no Netlify connection, no production keys.
function storage(){
 const data=new Map();let serial=0;
 return {
  getWithMetadata:async path=>{
   const v=data.get(path);return v?{data:structuredClone(v.body),etag:v.etag}:null;
  },
  set:async(path,payload,opts={})=>{
   const previous=data.get(path);
   if(opts.onlyIfNew&&previous)return {modified:false};
   if(opts.onlyIfMatch&&(!previous||previous.etag!==opts.onlyIfMatch))return {modified:false};
   const body=JSON.parse(payload),etag='etag-'+(++serial);
   data.set(path,{body,etag});return {modified:true,etag};
  },
  _raw:data
 };
}
const KEY=Buffer.alloc(32,7);
test('synthetic: encrypts the plaintext, then decrypts same path',async()=>{
 const s=storage(),sealed=createEncryptedStore({store:s,key:KEY});
 const item={contact:'fiction@example.invalid',text:'Contribution strictement fictive'};
 const write=await sealed.set('dialogue-v03/records/entry_123',JSON.stringify(item),{onlyIfNew:true});
 assert.equal(write.modified,true);
 const raw=s._raw.get('dialogue-v03/records/entry_123').body;
 assert.equal(JSON.stringify(raw).includes('fiction@example.invalid'),false);
 assert.deepEqual((await sealed.getWithMetadata('dialogue-v03/records/entry_123')).data,item);
});
test('synthetic: duplicate reservation rejected with onlyIfNew',async()=>{
 const s=storage(),sealed=createEncryptedStore({store:s,key:KEY}),path='dialogue-v03/records/entry_123';
 await sealed.set(path,JSON.stringify({mutation:0}),{onlyIfNew:true});
 const other=await sealed.set(path,JSON.stringify({mutation:999}),{onlyIfNew:true});
 assert.equal(other.modified,false);
 assert.equal((await sealed.getWithMetadata(path)).data.mutation,0);
});
test('synthetic: stale ETag cannot overwrite revision',async()=>{
 const s=storage(),sealed=createEncryptedStore({store:s,key:KEY}),path='dialogue-v03/records/entry_123';
 const created=await sealed.set(path,JSON.stringify({mutation:0}),{onlyIfNew:true});
 const updated=await sealed.set(path,JSON.stringify({mutation:1}),{onlyIfMatch:created.etag});
 assert.equal(updated.modified,true);
 const stale=await sealed.set(path,JSON.stringify({mutation:2}),{onlyIfMatch:created.etag});
 assert.equal(stale.modified,false);
 assert.equal((await sealed.getWithMetadata(path)).data.mutation,1);
});
test('synthetic: tampered encrypted payload rejected',async()=>{
 const s=storage(),sealed=createEncryptedStore({store:s,key:KEY}),path='dialogue-v03/records/entry_123';
 await sealed.set(path,JSON.stringify({contact:'fiction@example.invalid'}));
 s._raw.get(path).body.payload='AAAA';
 await assert.rejects(sealed.getWithMetadata(path),/intégrité non vérifiée/);
});
test('synthetic: replayed ciphertext at another path rejected by authenticated AAD',async()=>{
 const s=storage(),sealed=createEncryptedStore({store:s,key:KEY}),a='dialogue-v03/records/entry_123',b='dialogue-v03/records/entry_456';
 await sealed.set(a,JSON.stringify({text:'fiction'}));
 const from=s._raw.get(a);
 s._raw.set(b,{body:structuredClone(from.body),etag:'etag-replay'});
 await assert.rejects(sealed.getWithMetadata(b),/intégrité non vérifiée/);
});
test('synthetic: invalid encryption key rejected',()=>{
 assert.throws(()=>createEncryptedStore({store:storage(),key:Buffer.alloc(16)}),/256/);
});
test('synthetic: unknown conditional-write option refused',async()=>{
 const sealed=createEncryptedStore({store:storage(),key:KEY});
 await assert.rejects(sealed.set('dialogue-v03/records/entry_123','{}',{force:true}),/Option/);
});
