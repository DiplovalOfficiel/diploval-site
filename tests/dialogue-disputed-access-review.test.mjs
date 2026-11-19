import test from 'node:test';
import assert from 'node:assert/strict';
import {createDisputedAccessReview} from '../netlify/lib/dialogue-disputed-access-review.mjs';
const first={person:'one'},second={person:'two'},unknown={person:'unknown'};
const id='dispute_123',lostAccessReviewId='request_123',evidenceId='evidence_123456';
function fixture({sourceStatus='disputed',validEvidence=true,auditOk=true}={}){
 const db=new Map();let counter=0;
 const service=createDisputedAccessReview({enabled:true,
  store:{
   getWithMetadata:async key=>{const x=db.get(key);return x?{etag:x.etag,data:structuredClone(x.data)}:null;},
   set:async(key,raw,opts={})=>{
    const old=db.get(key);
    if(opts.onlyIfNew&&old)return {modified:false};
    if(opts.onlyIfMatch&&(!old||old.etag!==opts.onlyIfMatch))return {modified:false};
    const etag='etag_'+(++counter);db.set(key,{etag,data:JSON.parse(raw)});
    return {modified:true,etag};
   }
  },
  authenticateReviewer:async p=>p===first?{id:'reviewer_one'}:p===second?{id:'reviewer_two'}:null,
  loadLostAccessReview:async()=>({id:lostAccessReviewId,status:sourceStatus}),
  verifyEvidence:async()=>validEvidence,
  audit:async()=>auditOk
 });
 const open=()=>service.open(first,{id,lostAccessReviewId});
 const vote=(actor,decision,expectedRevision)=>service.review(actor,{
  id,decision,expectedRevision,evidenceId
 });
 return {service,open,vote};
}
test('off by default',async()=>{
 await assert.rejects(createDisputedAccessReview().open(first,{id,lostAccessReviewId}),/désactivée/);
});
test('requires safe dependencies',()=>{
 assert.throws(()=>createDisputedAccessReview({enabled:true}),/manquantes/);
});
test('unauthorized reviewer cannot open dispute',async()=>{
 const f=fixture();await assert.rejects(f.service.open(unknown,{id,lostAccessReviewId}),/non habilité/);
});
test('source must be actively disputed',async()=>{
 const f=fixture({sourceStatus:'submitted'});await assert.rejects(f.open(),/non active/);
});
test('opening creates pending review without access token',async()=>{
 const f=fixture();const r=await f.open();
 assert.equal(r.status,'pending');assert.equal('sessionToken' in r,false);
});
test('first reviewer alone never resolves dispute',async()=>{
 const f=fixture();await f.open();
 const r=await f.vote(first,'refer_to_separate_resolution',1);
 assert.equal(r.status,'pending');assert.equal(r.outcome,null);
});
test('same reviewer cannot supply second approval',async()=>{
 const f=fixture();await f.open();await f.vote(first,'refer_to_separate_resolution',1);
 await assert.rejects(f.vote(first,'refer_to_separate_resolution',2),/distinct/);
});
test('two reviewers agreeing only refer to another process',async()=>{
 const f=fixture();await f.open();await f.vote(first,'refer_to_separate_resolution',1);
 const r=await f.vote(second,'refer_to_separate_resolution',2);
 assert.equal(r.status,'closed');assert.equal(r.outcome,'refer_to_separate_resolution');
 assert.equal('sessionToken' in r,false);assert.equal('accessGranted' in r,false);
});
test('reviewer disagreement retains block',async()=>{
 const f=fixture();await f.open();await f.vote(first,'refer_to_separate_resolution',1);
 const r=await f.vote(second,'maintain_block',2);
 assert.equal(r.outcome,'maintain_block');
});
test('both blocking decisions retain block',async()=>{
 const f=fixture();await f.open();await f.vote(first,'maintain_block',1);
 const r=await f.vote(second,'maintain_block',2);
 assert.equal(r.outcome,'maintain_block');
});
test('stale revision cannot alter review',async()=>{
 const f=fixture();await f.open();await f.vote(first,'maintain_block',1);
 await assert.rejects(f.vote(second,'maintain_block',1),/périmée/);
});
test('independent evidence required',async()=>{
 const f=fixture({validEvidence:false});await f.open();
 await assert.rejects(f.vote(first,'maintain_block',1),/insuffisante/);
});
test('audit failure prevents decision write',async()=>{
 const f=fixture({auditOk:false});await f.open();
 await assert.rejects(f.vote(first,'maintain_block',1),/non confirmé/);
 assert.deepEqual((await f.service.inspect(first,id)).reviews,[]);
});
test('duplicate dispute identifier denied',async()=>{
 const f=fixture();await f.open();await assert.rejects(f.open(),/Conflit/);
});
test('closed dispute cannot accept a third vote',async()=>{
 const f=fixture();await f.open();await f.vote(first,'maintain_block',1);
 await f.vote(second,'maintain_block',2);
 await assert.rejects(f.vote(first,'maintain_block',3),/périmée/);
});
