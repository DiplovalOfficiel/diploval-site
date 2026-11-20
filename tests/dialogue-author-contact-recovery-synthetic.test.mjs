import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthorAccess} from '../netlify/lib/dialogue-author-access.mjs';

// Isolated email and session tests; no real SMTP, account, or production storage.
const ENTRY='entry_123';
function fixture(){
 const records=new Map(),sent=[];let sequence=0,time=1784560000000;
 const entry={id:ENTRY,author:{privateContact:'initial@example.invalid'}};
 const store={
  getWithMetadata:async key=>{
   const data=records.get(key);
   return data?{etag:data.etag,data:structuredClone(data.content)}:null;
  },
  set:async(key,raw,options={})=>{
   const prev=records.get(key);
   if(options.onlyIfNew&&prev)return {modified:false};
   if(options.onlyIfMatch&&(!prev||prev.etag!==options.onlyIfMatch))
    return {modified:false};
   const etag='etag_'+(++sequence);
   records.set(key,{etag,content:JSON.parse(raw)});
   return {modified:true,etag};
  }
 };
 const access=createAuthorAccess({
  store,secret:Buffer.alloc(32,13),
  loadEntry:async()=>structuredClone(entry),
  sendLink:async item=>{sent.push(item);},
  clock:()=>time
 });
 return {access,entry,sent,tick:ms=>{time+=ms;}};
}
test('access recovery: valid email creates opaque link and session',async()=>{
 const f=fixture();
 assert.deepEqual(await f.access.requestLink({entryId:ENTRY,email:'INITIAL@example.invalid'}),{accepted:true});
 assert.equal(f.sent.length,1);
 const result=await f.access.redeemLink(f.sent[0].token);
 assert.equal(typeof result.sessionToken,'string');
 assert.equal(result.sessionToken.length,43);
 assert.ok(await f.access.authenticate(result.sessionToken));
});
test('access recovery: unknown email has generic response and no email',async()=>{
 const f=fixture();
 assert.deepEqual(await f.access.requestLink({entryId:ENTRY,email:'unknown@example.invalid'}),{accepted:true});
 assert.equal(f.sent.length,0);
});
test('access recovery: link requested before email change cannot be redeemed afterward',async()=>{
 const f=fixture();
 await f.access.requestLink({entryId:ENTRY,email:'initial@example.invalid'});
 f.entry.author.privateContact='replacement@example.invalid';
 assert.equal(await f.access.redeemLink(f.sent[0].token),null);
});
test('access recovery: old active session loses authentication after contact change',async()=>{
 const f=fixture();
 await f.access.requestLink({entryId:ENTRY,email:'initial@example.invalid'});
 const session=await f.access.redeemLink(f.sent[0].token);
 const principal=await f.access.authenticate(session.sessionToken);
 assert.equal(await f.access.authorize(principal,'lookup_private'),true);
 f.entry.author.privateContact='replacement@example.invalid';
 assert.equal(await f.access.authenticate(session.sessionToken),null);
 // Existing opaque principal must also lose access on server-side revalidation.
 // This second assertion documents a security invariant that must be fixed if it fails.
 assert.equal(await f.access.authorize(principal,'lookup_private'),false);
});
test('access recovery: new contact can request a new link after change',async()=>{
 const f=fixture();
 f.entry.author.privateContact='replacement@example.invalid';
 await f.access.requestLink({entryId:ENTRY,email:'replacement@example.invalid'});
 assert.equal(f.sent.length,1);
 assert.ok(await f.access.redeemLink(f.sent[0].token));
});
test('access recovery: one-time link rejects second consumption',async()=>{
 const f=fixture();
 await f.access.requestLink({entryId:ENTRY,email:'initial@example.invalid'});
 assert.ok(await f.access.redeemLink(f.sent[0].token));
 assert.equal(await f.access.redeemLink(f.sent[0].token),null);
});
test('access recovery: expired link is rejected',async()=>{
 const f=fixture();
 await f.access.requestLink({entryId:ENTRY,email:'initial@example.invalid'});
 f.tick(11*60*1000);
 assert.equal(await f.access.redeemLink(f.sent[0].token),null);
});
test('access recovery: revoked session cannot authenticate again',async()=>{
 const f=fixture();
 await f.access.requestLink({entryId:ENTRY,email:'initial@example.invalid'});
 const s=await f.access.redeemLink(f.sent[0].token);
 assert.equal(await f.access.revokeSession(s.sessionToken),true);
 assert.equal(await f.access.authenticate(s.sessionToken),null);
});
