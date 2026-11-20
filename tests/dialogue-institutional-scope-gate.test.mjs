import test from 'node:test';
import assert from 'node:assert/strict';
import {createInstitutionalScopeGate} from '../netlify/lib/dialogue-institutional-scope-gate.mjs';
const user={fiction:true},organizationId='mairie_123',consultationId='consultation_123';
const reference='CE-2026-ABCDEF123456';
const input={organizationId,consultationId,reference};
const message='Réponse fictive de la collectivité à transmettre à la modération Diploval.';
function fixture(options={}){
 let reads=0,drafts=0;
 const gate=createInstitutionalScopeGate({enabled:true,
  resolveIdentity:async p=>p===user&&!options.inactiveIdentity?{
   staffId:'agent_12345',organizationId:options.foreignOrg?'another_org':organizationId,
   active:true,authenticated:true}:null,
  loadMandate:async()=>({organizationId,active:true,
   consultationIds:options.foreignConsultation?['consultation_456']:[consultationId],
   permissions:options.readOnly?['view_public']:['view_public','submit_draft']}),
  verifyPermission:async()=>options.revoked!==true,
  loadPublicContribution:async()=>{reads++;return options.malformed?{
   reference,consultationId,text:'publié',version:1,publicAuthor:null
  }:{reference,consultationId,kind:'contribution',
   text:'Avis fictif rendu public après modération.',
   version:1,publicAuthor:'Participant sans nom affiché',
   privateContact:'secret@example.invalid',audit:[{actor:'internal'}]};},
  recordDraft:async()=>{drafts++;return options.failedDraft?{accepted:false}:{
   accepted:true,draftId:'draft_123'};}
 });
 return {gate,calls:()=>({reads,drafts})};
}
test('institution: disabled by default',async()=>{
 await assert.rejects(createInstitutionalScopeGate().view(user,input),/désactivé/);
});
test('institution: requires all adapters',()=>{
 assert.throws(()=>createInstitutionalScopeGate({enabled:true}),/manquantes/);
});
test('institution: can only see whitelisted public projection',async()=>{
 const x=fixture();const r=await x.gate.view(user,input);
 assert.equal(r.reference,reference);assert.equal('privateContact' in r,false);
 assert.equal('audit' in r,false);
});
test('institution: unverified identity is refused before reading content',async()=>{
 const x=fixture();await assert.rejects(x.gate.view({},input),/non attestée/);
 assert.equal(x.calls().reads,0);
});
test('institution: cannot cross organization boundaries',async()=>{
 const x=fixture({foreignOrg:true});
 await assert.rejects(x.gate.view(user,input),/non attestée/);
 assert.equal(x.calls().reads,0);
});
test('institution: consultation not in mandate is blocked',async()=>{
 const x=fixture({foreignConsultation:true});
 await assert.rejects(x.gate.view(user,input),/non autorisés/);
 assert.equal(x.calls().reads,0);
});
test('institution: permission revocation blocks access',async()=>{
 const x=fixture({revoked:true});
 await assert.rejects(x.gate.view(user,input),/non confirmée/);
 assert.equal(x.calls().reads,0);
});
test('institution: draft requires explicit mandate',async()=>{
 const x=fixture({readOnly:true});
 await assert.rejects(x.gate.draftResponse(user,{...input,message}),/non autorisés/);
 assert.equal(x.calls().drafts,0);
});
test('institution: submitted draft does not publish automatically',async()=>{
 const x=fixture();const r=await x.gate.draftResponse(user,{...input,message});
 assert.equal(r.status,'pending_diploval_review');
 assert.equal(r.published,false);assert.equal(x.calls().drafts,1);
});
test('institution: malformed public projection refused',async()=>{
 const x=fixture({malformed:true});
 await assert.rejects(x.gate.view(user,input),/indisponible/);
});
test('institution: short institutional message rejected',async()=>{
 const x=fixture();
 await assert.rejects(x.gate.draftResponse(user,{...input,message:'court'}),/invalide/);
 assert.equal(x.calls().drafts,0);
});
test('institution: refused draft persistence cannot be reported as success',async()=>{
 const x=fixture({failedDraft:true});
 await assert.rejects(x.gate.draftResponse(user,{...input,message}),/non confirmé/);
});
test('institution: another consultation in request is blocked',async()=>{
 const x=fixture();await assert.rejects(x.gate.view(user,
  {...input,consultationId:'consultation_456'}),/non autorisés/);
});
