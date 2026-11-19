import test from 'node:test';
import assert from 'node:assert/strict';
import {createInstitutionalScopeGate} from '../netlify/lib/dialogue-institutional-scope-gate.mjs';
import {createInstitutionalDraftReview} from '../netlify/lib/dialogue-institutional-draft-review.mjs';
const institutional={role:'institution'},reviewer={role:'diploval'},fake={role:'other'};
const organizationId='mairie_123',consultationId='consultation_123';
const reference='CE-2026-ABCDEF123456',draftId='draft_123';
const message='Projet de réponse de la collectivité, transmis à Diploval pour contrôle.';
const evidenceId='review_evidence_123456';
function fixture({mandate=true,sourceVersion=1,reviewerAuthorized=true,auditOk=true}={}){
 let next=0,submitted=0;
 const db=new Map();
 const publicEntry={reference,consultationId,kind:'contribution',version:1,
  text:'Une contribution publique entièrement fictive.',publicAuthor:'Participant sans nom affiché'};
 const loadPublicContribution=async()=>sourceVersion===null?null:{...publicEntry,version:sourceVersion};
 const store={
  getWithMetadata:async k=>{const v=db.get(k);return v?{data:structuredClone(v.data),etag:v.etag}:null;},
  set:async(k,raw,opts={})=>{
   const old=db.get(k);
   if(opts.onlyIfNew&&old)return {modified:false};
   if(opts.onlyIfMatch&&(!old||old.etag!==opts.onlyIfMatch))return {modified:false};
   const etag='etag_'+(++next);db.set(k,{etag,data:JSON.parse(raw)});return {modified:true,etag};
  }
 };
 const gate=createInstitutionalScopeGate({enabled:true,
  resolveIdentity:async p=>p===institutional?{
   staffId:'agent_12345',organizationId,active:true,authenticated:true}:null,
  loadMandate:async()=>({organizationId,active:true,consultationIds:mandate?[consultationId]:[],
   permissions:['view_public','submit_draft']}),
  verifyPermission:async()=>true,
  loadPublicContribution,
  recordDraft:async record=>{
   submitted++;
   const data={...record,draftId,revision:1};
   const r=await store.set('dialogue-v03-institution-drafts/'+draftId,JSON.stringify(data),{onlyIfNew:true});
   return r.modified?{accepted:true,draftId}:{accepted:false};
  }
 });
 const review=createInstitutionalDraftReview({enabled:true,store,
  authenticateDiploval:async p=>p===reviewer&&reviewerAuthorized?{
   staffId:'diploval_reviewer',organization:'diploval',active:true,canReviewInstitutional:true}:null,
  loadPublicContribution,
  auditDecision:async()=>auditOk
 });
 async function submit(){return gate.draftResponse(institutional,{organizationId,consultationId,reference,message});}
 async function decide(p=reviewer,decision='accept_for_separate_publication',revision=1){
  return review.decide(p,{draftId,expectedRevision:revision,decision,evidenceId});
 }
 return {submit,decide,gate,db,counts:()=>({submitted})};
}
test('institutional lifecycle: draft remains unpublished pending Diploval review',async()=>{
 const x=fixture();const r=await x.submit();
 assert.equal(r.status,'pending_diploval_review');assert.equal(r.published,false);
 assert.equal(x.counts().submitted,1);
});
test('institutional lifecycle: external actor cannot decide',async()=>{
 const x=fixture();await x.submit();
 await assert.rejects(x.decide(institutional),/non autorisée/);
});
test('institutional lifecycle: unauthorized reviewer cannot approve',async()=>{
 const x=fixture({reviewerAuthorized:false});await x.submit();
 await assert.rejects(x.decide(),/non autorisée/);
});
test('institutional lifecycle: accepted review does not publish',async()=>{
 const x=fixture();await x.submit();const r=await x.decide();
 assert.equal(r.status,'reviewed_for_separate_publication');
 assert.equal(r.published,false);
});
test('institutional lifecycle: rejection stays unpublished',async()=>{
 const x=fixture();await x.submit();const r=await x.decide(reviewer,'reject');
 assert.equal(r.status,'rejected');assert.equal(r.published,false);
});
test('institutional lifecycle: source version changed blocks review',async()=>{
 const x=fixture({sourceVersion:2});await x.submit();
 // The mocked submission references version 2. Simulate external mutation after submission.
 const row=x.db.get('dialogue-v03-institution-drafts/'+draftId);
 row.data.sourceVersion=1;
 await assert.rejects(x.decide(),/modifiée ou retirée/);
});
test('institutional lifecycle: missing source blocks review',async()=>{
 const x=fixture();await x.submit();
 const row=x.db.get('dialogue-v03-institution-drafts/'+draftId);
 row.data.sourceVersion=2;
 await assert.rejects(x.decide(),/modifiée ou retirée/);
});
test('institutional lifecycle: missing mandate blocks draft',async()=>{
 const x=fixture({mandate:false});
 await assert.rejects(x.submit(),/non autorisés/);assert.equal(x.counts().submitted,0);
});
test('institutional lifecycle: cannot decide twice',async()=>{
 const x=fixture();await x.submit();await x.decide();
 await assert.rejects(x.decide(),/indisponible|modifié/);
});
test('institutional lifecycle: audit failure prevents review state change',async()=>{
 const x=fixture({auditOk:false});await x.submit();
 await assert.rejects(x.decide(),/non confirmé/);
 const row=x.db.get('dialogue-v03-institution-drafts/'+draftId);
 assert.equal(row.data.status,'pending_diploval_review');
});
