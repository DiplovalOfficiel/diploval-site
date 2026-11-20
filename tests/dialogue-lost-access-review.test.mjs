import test from 'node:test';
import assert from 'node:assert/strict';
import {createLostAccessReview} from '../netlify/lib/dialogue-lost-access-review.mjs';
const principal={staff:true},id='request_123',caseId='case_123',evidenceId='evidence_123456',reviewerId='reviewer_123';
function fixture({allowed=true,approved=true,audited=true}={}){
 const objects=new Map();let serial=0;
 const review=createLostAccessReview({enabled:true,
  store:{
   getWithMetadata:async key=>{const r=objects.get(key);return r?{data:structuredClone(r.value),etag:r.etag}:null;},
   set:async(key,raw,opt={})=>{
    const previous=objects.get(key);
    if(opt.onlyIfNew&&previous)return {modified:false};
    if(opt.onlyIfMatch&&(!previous||previous.etag!==opt.onlyIfMatch))return {modified:false};
    const etag='etag-'+(++serial);objects.set(key,{value:JSON.parse(raw),etag});
    return {modified:true,etag};
   }
  },
  authorize:async p=>p===principal&&allowed,
  verifyReview:async()=>approved,
  evidenceRecord:async()=>audited
 });
 const open=()=>review.open(principal,{id,caseId,reasonCode:'email_unavailable'});
 const decide=(to,revision=1)=>review.transition(principal,{
  id,expectedRevision:revision,to,evidenceId,reviewerId
 });
 return {review,open,decide};
}
test('disabled without explicit enable',async()=>assert.rejects(createLostAccessReview().open(principal,{}),/désactivée/));
test('requires audit and authorization providers',()=>assert.throws(()=>createLostAccessReview({enabled:true}),/manquantes/));
test('valid request is submitted without auto restoration',async()=>{
 const x=fixture(),result=await x.open();
 assert.equal(result.status,'submitted');assert.equal(result.revision,1);
 assert.equal('sessionToken' in result,false);
 assert.equal('newEmail' in result,false);
});
test('duplicate request identifier is rejected',async()=>{
 const x=fixture();await x.open();await assert.rejects(x.open(),/Conflit/);
});
test('claiming a case number alone does not authorize opening',async()=>{
 const x=fixture();await assert.rejects(x.review.open({},{id,caseId,reasonCode:'email_unavailable'}),/non autorisée/);
});
test('cannot jump directly from submitted to approved',async()=>{
 const x=fixture();await x.open();await assert.rejects(x.decide('approved_for_separate_action'),/incompatible/);
});
test('human review can suspend on dispute',async()=>{
 const x=fixture();await x.open();await x.decide('under_review');
 const state=await x.decide('disputed',2);assert.equal(state.status,'disputed');
});
test('approval requires independently confirmed evidence',async()=>{
 const x=fixture({approved:false});await x.open();await x.decide('under_review');
 await assert.rejects(x.decide('approved_for_separate_action',2),/insuffisantes/);
});
test('no audit acknowledgement means no state transition',async()=>{
 const x=fixture({audited:false});await x.open();
 await assert.rejects(x.decide('under_review'),/non confirmé/);
 assert.equal((await x.review.inspect(principal,id)).status,'submitted');
});
test('approval only permits separate action, never session issuance',async()=>{
 const x=fixture();await x.open();await x.decide('under_review');
 const result=await x.decide('approved_for_separate_action',2);
 assert.equal(result.status,'approved_for_separate_action');
 assert.equal('sessionToken' in result,false);
 assert.equal('accessGranted' in result,false);
});
test('stale revision is refused',async()=>{
 const x=fixture();await x.open();await x.decide('under_review');
 await assert.rejects(x.decide('rejected',1),/incompatible/);
});
test('closed review cannot reopen without separate case',async()=>{
 const x=fixture();await x.open();await x.decide('closed');
 await assert.rejects(x.decide('under_review',2),/incompatible/);
});
