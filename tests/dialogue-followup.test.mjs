import test from 'node:test';
import assert from 'node:assert/strict';
import {createEntry,reviewRevision,proposeRevision,withdrawPublication} from '../netlify/lib/dialogue-model.mjs';
import {caseState,buildFollowup,createFollowupService} from '../netlify/lib/dialogue-followup.mjs';

const date='2026-11-19T09:00:00.000Z';
const REF='CE-2026-010203040506',ID='dossier-followup-001';
const entry=()=>createEntry({
 consultationId:'consultation-a',kind:'contribution',
 text:'Une contribution de démonstration qui requiert une lecture attentive.',
 processingAgreement:true,publicationAgreement:true,displayMode:'without_name',
 email:'private@example.test'
},{id:ID,reference:REF,at:date});
const approve=e=>reviewRevision(e,{
 decision:'approve',actor:'Personne chargée de modération',expectedMutation:e.mutation,at:date
});
const reject=e=>reviewRevision(e,{
 decision:'reject',reason:'Motif de modération interne non publiable.',
 actor:'Personne chargée de modération',expectedMutation:e.mutation,at:date
});
const appeal={
 reference:REF,consultationId:'consultation-a',
 version:1,status:'pending',submittedAt:'2026-11-19T10:00:00.000Z',
 decision:null,reason:'Un argument personnel sensible à protéger.'
};
const policy={enabled:true,version:'test-v1',reviewDays:7,appealDays:14};

test('contribution reçue : état en attente, sans échéance inventée',()=>{
 const state=buildFollowup(entry(),{now:'2026-11-19T12:00:00Z'});
 assert.equal(state.state,'pending');
 assert.equal(state.objective,null);
 assert.equal(state.reference,REF);
 assert(!JSON.stringify(state).includes('private@example.test'));
 assert(!JSON.stringify(state).includes('audit'));
});
test('les objectifs indicatifs ne sont visibles que si la politique est activée et valide',()=>{
 const state=buildFollowup(entry(),{policy,now:'2026-11-20T09:00:00Z'});
 assert.equal(state.objective.targetAt,'2026-11-26T09:00:00.000Z');
 assert.equal(state.objective.nonBinding,true);
 assert.equal(state.objective.policyVersion,'test-v1');
 assert.equal(state.objective.state,'within_target');
});
test('date dépassée : signal de retard interne, jamais suppression automatique',()=>{
 const record=entry();
 const result=buildFollowup(record,{policy,now:'2026-11-28T09:00:00Z'});
 assert.equal(result.objective.state,'attention_required');
 assert.equal(record.visibility,'private');
 assert.equal(record.mutation,0);
});
test('texte publié : suivi sans nouveau délai fictif',()=>{
 const state=buildFollowup(approve(entry()),{policy,now:'2026-11-19T13:00:00Z'});
 assert.equal(state.state,'published');
 assert.equal(state.objective,null);
});
test('révision en attente : publication précédente inchangée',()=>{
 const record=approve(entry());
 const next=proposeRevision(record,{
  text:'Nouvelle formulation après la lecture des réponses contradictoires.',
  expectedMutation:record.mutation,at:'2026-11-20T09:00:00Z'
 });
 const state=buildFollowup(next,{policy,now:'2026-11-21T09:00:00Z'});
 assert.equal(state.state,'revision_pending');
 assert.equal(state.publishedVersion,1);
 assert.equal(state.version,2);
 assert.equal(state.objective.targetAt,'2026-11-27T09:00:00.000Z');
});
test('version refusée et version précédente toujours publiée',()=>{
 const approved=approve(entry());
 const revision=proposeRevision(approved,{
  text:'Une autre formulation proposée avec quelques précisions argumentées.',
  expectedMutation:approved.mutation,at:'2026-11-20T09:00:00Z'
 });
 const rejected=reject(revision);
 const result=buildFollowup(rejected,{policy});
 assert.equal(result.state,'revision_rejected');
 assert.equal(result.publishedVersion,1);
 assert.equal(result.objective,null);
});
test('retrait de publication sans publicité des notes privées',()=>{
 const approved=approve(entry());
 const withdrawn=withdrawPublication(approved,{
  actor:'Superviseur',reason:'Motif de retrait strictement privé.',
  expectedMutation:approved.mutation,at:date
 });
 const result=buildFollowup(withdrawn,{policy});
 assert.equal(result.state,'withdrawn');
 assert(!JSON.stringify(result).includes('Motif de retrait'));
});
test('un recours en attente fait basculer le suivi sur son objectif',()=>{
 const base=reject(entry());
 const result=buildFollowup(base,{
  appeal,policy,now:'2026-11-20T10:00:00Z'
 });
 assert.equal(result.appeal.status,'pending');
 assert.equal(result.objective.kind,'appeal');
 assert.equal(result.objective.targetAt,'2026-12-03T10:00:00.000Z');
 assert(!JSON.stringify(result).includes(appeal.reason));
});
test('escalade : nouveau point de départ documenté',()=>{
 const escalated={...appeal,status:'escalated',
  decision:{outcome:'escalate',at:'2026-11-25T10:00:00Z',reason:'Motif privé'}
 };
 const r=buildFollowup(reject(entry()),{
  appeal:escalated,policy,now:'2026-11-26T10:00:00Z'
 });
 assert.equal(r.objective.targetAt,'2026-12-09T10:00:00.000Z');
 assert.equal(r.appeal.outcome,'escalate');
 assert(!JSON.stringify(r).includes('Motif privé'));
});
test('recours résolu : pas de nouvelle échéance automatique',()=>{
 const resolved={...appeal,status:'resolved',
  decision:{outcome:'maintain',at:'2026-11-26T10:00:00Z',reason:'Motif privé'}
 };
 const r=buildFollowup(reject(entry()),{appeal:resolved,policy});
 assert.equal(r.appeal.status,'resolved');
 assert.equal(r.objective,null);
});
test('politique absente, dates incohérentes et jours hors bornes refusés',()=>{
 assert.throws(()=>buildFollowup(entry(),{
  policy:{enabled:true,version:'V1',reviewDays:0,appealDays:14}
 }),/Politique/);
 assert.throws(()=>buildFollowup(entry(),{policy:{...policy,enabled:false}}),/Politique/);
 assert.throws(()=>buildFollowup(entry(),{policy,now:'not-a-date'}),/Horloge/);
 assert.throws(()=>buildFollowup(entry(),{
  appeal:{...appeal,reference:'CE-2026-DEADBEEF1111'},policy
 }),/Recours/);
});
test('aucun accès au service de suivi sans sources vérifiées',()=>{
 assert.throws(()=>createFollowupService(),/Accès privé/);
});
test('suivi personnel : lecture uniquement après contrôle auteur',async()=>{
 const record=entry(),AUTHOR=Object.freeze({who:'author'}),STAFF=Object.freeze({who:'staff'});
 const service=createFollowupService({
  readAuthorEntry:async(who,id)=>who===AUTHOR&&id===ID?record:null,
  readModeratorEntry:async(who,id)=>who===STAFF&&id===ID?record:null,
  authorizeModerator:async(who,action)=>who===STAFF&&action==='read_private',
  loadAppeal:async()=>null,
  policyForConsultation:async()=>null,
  clock:()=>date
 });
 assert.equal((await service.forAuthor(AUTHOR,ID)).reference,REF);
 await assert.rejects(()=>service.forAuthor(STAFF,ID),/non autorisé/);
 await assert.rejects(()=>service.forModerator(AUTHOR,ID),/non autorisé/);
 assert.equal((await service.forModerator(STAFF,ID)).objective,null);
});
