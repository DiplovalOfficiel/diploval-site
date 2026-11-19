import test from 'node:test';
import assert from 'node:assert/strict';
import {createEntry,reviewRevision} from '../netlify/lib/dialogue-model.mjs';
import {createDialogueRepository} from '../netlify/lib/dialogue-storage.mjs';
import {createAppealService} from '../netlify/lib/dialogue-appeals.mjs';
import {createFollowupService} from '../netlify/lib/dialogue-followup.mjs';
import {createContributorResponses} from '../netlify/lib/dialogue-contributor-responses.mjs';

// Phase 2: real application modules composed with ONLY synthetic identities and storage.
// This is not an authenticated institutional workflow or production readiness evidence.
const author={id:'fiction_author'},staffA={id:'fiction_staff_a'},staffB={id:'fiction_staff_b'},outsider={id:'fiction_outsider'};
const id='entry_123',reference='CE-2026-ABCDEF123456',consultationId='consultation_123';
function scenario(){
 const db=new Map();let rev=0;
 const store={
  getWithMetadata:async k=>{const v=db.get(k);return v?{data:structuredClone(v.data),etag:v.etag}:null;},
  set:async(k,raw,opts={})=>{
   const old=db.get(k);
   if(opts.onlyIfNew&&old)return {modified:false};
   if(opts.onlyIfMatch&&(!old||old.etag!==opts.onlyIfMatch))return {modified:false};
   const etag='etag_'+(++rev);db.set(k,{data:JSON.parse(raw),etag});
   return {modified:true,etag};
  }
 };
 const isStaff=p=>p===staffA||p===staffB;
 const repo=createDialogueRepository({store,authorize:async(p,action)=>{
  if(p===author)return ['create','lookup_private','read_private'].includes(action);
  if(isStaff(p))return ['lookup_private','read_private','moderate'].includes(action);
  return false;
 }});
 const readAuthorEntry=(p,entryId)=>repo.readPrivate(p,entryId);
 const readModeratorEntry=(p,entryId)=>repo.readPrivate(p,entryId);
 const authorizeModerator=async p=>isStaff(p);
 const appeals=createAppealService({store,readAuthorEntry,readModeratorEntry,authorizeModerator,
  clock:()=> '2026-11-19T17:00:00Z'});
 const followup=createFollowupService({
  readAuthorEntry,readModeratorEntry,authorizeModerator,
  loadAppeal:async(entryId,entry)=>{
   const v=entry.versions.at(-1)?.number;
   if(!Number.isSafeInteger(v))return null;
   return appeals.forModerator(staffA,{entryId,version:v});
  },
  policyForConsultation:async()=>null,clock:()=> '2026-11-19T17:00:00Z'
 });
 const notices=createContributorResponses({
  store,readAuthorEntry,readModeratorEntry,authorizeModerator,
  resolveStaff:async p=>isStaff(p)?{staffId:p.id,label:p.id}:null,
  clock:()=> '2026-11-19T17:00:00Z'
 });
 const entry=createEntry({consultationId,kind:'contribution',
  text:'Contribution entièrement fictive pour la recette des dossiers.',
  email:'fiction@example.invalid',displayMode:'without_name',
  processingAgreement:true,publicationAgreement:false},
  {id,reference,at:'2026-11-19T16:00:00Z'});
 return {repo,appeals,followup,notices,entry};
}
async function rejectEntry(s){
 await s.repo.createPrivate(author,s.entry);
 await s.repo.mutatePrivate(staffA,id,{operation:'moderate',expectedMutation:0,
  transform:r=>reviewRevision(r,{decision:'reject',actor:'Modérateur fictif',
   reason:'Réponse motivée de refus dans ce scénario fictif',expectedMutation:r.mutation})});
}
test('phase2: refusal -> appeal -> tracking -> authorized decision',async()=>{
 const s=scenario();await rejectEntry(s);
 const a=await s.appeals.submit(author,{entryId:id,reason:'Je souhaite un réexamen documenté de la décision.'});
 assert.equal(a.status,'pending');
 assert.equal((await s.followup.forAuthor(author,id)).appeal.status,'pending');
 const reviewed=await s.appeals.decide(staffA,{entryId:id,version:1,decision:'maintain',
  reason:'Après examen contradictoire fictif, maintien de la décision.',
  actor:'Modérateur fictif'});
 assert.equal(reviewed.status,'resolved');
 const personal=await s.appeals.own(author,{entryId:id,version:1});
 assert.equal(personal.decision.outcome,'maintain');
 assert.equal((await s.followup.forAuthor(author,id)).appeal.status,'resolved');
 assert.equal(await s.repo.readPublicReference(reference),null);
});
test('phase2: appeal remains private from unauthorized users',async()=>{
 const s=scenario();await rejectEntry(s);
 await s.appeals.submit(author,{entryId:id,reason:'Une demande de réexamen totalement fictive.'});
 await assert.rejects(s.appeals.own(outsider,{entryId:id,version:1}),/non autorisé/i);
 await assert.rejects(s.followup.forAuthor(outsider,id),/non autorisé/i);
});
test('phase2: draft response requires different second approver',async()=>{
 const s=scenario();await rejectEntry(s);
 const draft=await s.notices.draft(staffA,{entryId:id,expectedMutation:1,topic:'decision',
  message:'Votre contribution a été examinée et une décision motivée existe.'});
 assert.equal(draft.status,'draft');
 assert.equal(await s.notices.forAuthor(author,{entryId:id,mutation:1}),null);
 await assert.rejects(s.notices.approve(staffA,{entryId:id,expectedMutation:1}),/indépendante/);
 const approved=await s.notices.approve(staffB,{entryId:id,expectedMutation:1});
 assert.equal(approved.status,'approved');
 const response=await s.notices.forAuthor(author,{entryId:id,mutation:1});
 assert.equal(response.topic,'decision');assert.equal('createdBy' in response,false);
});
test('phase2: revoked response becomes unavailable to author',async()=>{
 const s=scenario();await rejectEntry(s);
 await s.notices.draft(staffA,{entryId:id,expectedMutation:1,topic:'decision',
  message:'Une décision fictive et motivée a été prise concernant votre contribution.'});
 await s.notices.approve(staffB,{entryId:id,expectedMutation:1});
 await s.notices.revoke(staffA,{entryId:id,mutation:1,
  reason:'Retrait administratif fictif après réexamen documentaire.'});
 assert.equal(await s.notices.forAuthor(author,{entryId:id,mutation:1}),null);
});
test('phase2: cannot issue decision response before moderation',async()=>{
 const s=scenario();await s.repo.createPrivate(author,s.entry);
 await assert.rejects(s.notices.draft(staffA,{entryId:id,expectedMutation:0,topic:'decision',
  message:'Une décision fictive encore inexistante serait notifiée ici.'}),/non encore enregistrée/);
});
test('phase2: completed appeal does not automatically publish entry',async()=>{
 const s=scenario();await rejectEntry(s);
 await s.appeals.submit(author,{entryId:id,reason:'Demande de réexamen fictive et motivée.'});
 await s.appeals.decide(staffB,{entryId:id,version:1,decision:'invite_revision',
  reason:'Invitation fictive à proposer une nouvelle version après examen.',
  actor:'Superviseur fictif'});
 assert.equal((await s.repo.readPrivate(author,id)).visibility,'private');
 assert.equal(await s.repo.readPublicReference(reference),null);
});
