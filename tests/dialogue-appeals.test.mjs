import test from 'node:test';
import assert from 'node:assert/strict';
import {createAppealService} from '../netlify/lib/dialogue-appeals.mjs';
import {createEntry,reviewRevision,withdrawPublication,proposeRevision} from '../netlify/lib/dialogue-model.mjs';
import {createModeratorAccess} from '../netlify/lib/dialogue-moderator-access.mjs';

const at='2026-11-19T11:00:00.000Z',ID='dossier-appeal-001',OTHER='dossier-appeal-002';
const REF='CE-2026-ABCDEFABCDEF',REF2='CE-2026-1234567890AB';
const AUTHOR=Object.freeze({type:'verified-author-test'});
function make(id=ID,reference=REF,consultationId='consultation-a'){
 return createEntry({
  consultationId,kind:'contribution',text:'Un avis citoyen initial discuté selon les règles publiées.',
  displayMode:'without_name',email:'citoyen@example.test',
  processingAgreement:true,publicationAgreement:true
 },{id,reference,at});
}
const reject=entry=>reviewRevision(entry,{
 decision:'reject',actor:'Modérateur habilité (test)',reason:'Une affirmation doit être mieux sourcée.',
 expectedMutation:entry.mutation,at
});
const approve=entry=>reviewRevision(entry,{
 decision:'approve',actor:'Modérateur habilité (test)',
 expectedMutation:entry.mutation,at
});
function fakeStore(){
 const data=new Map();let counter=0;
 return {
  data,
  async getWithMetadata(key){
   const row=data.get(key);
   return row?{etag:row.etag,data:JSON.parse(row.text)}:null;
  },
  async set(key,text,{onlyIfNew=false,onlyIfMatch=null}={}){
   const old=data.get(key);
   if(onlyIfNew&&old)return {modified:false,etag:old.etag};
   if(onlyIfMatch!==null&&(!old||old.etag!==onlyIfMatch))
     return {modified:false,etag:old?.etag};
   const etag='etag-'+(++counter);
   data.set(key,{etag,text});return {modified:true,etag};
  }
 };
}
function setup({role='reviewer'}={}){
 const records=new Map([[ID,reject(make())],[OTHER,reject(make(OTHER,REF2,'consultation-b'))]]);
 let staffActive=true,grantRole=role;
 const modAccess=createModeratorAccess({
  verifySession:async req=>staffActive&&req?.token==='real-session'
   ?{staffId:'staff-appeal-001',label:'Agent habilité'}:null,
  loadGrants:async()=>({active:true,roles:[grantRole],consultationIds:['consultation-a']})
 });
 const moderator=modAccess.authenticate({token:'real-session'});
 const store=fakeStore();
 const appeals=createAppealService({
  store,
  readAuthorEntry:async(principal,id)=>{
   if(principal!==AUTHOR||id!==ID)throw Error('Accès non autorisé.');
   return structuredClone(records.get(id));
  },
  readModeratorEntry:async(principal,id)=>{
   const entry=records.get(id);
   if(!entry||!(await modAccess.authorize(principal,'read_private',entry)))
    throw Error('Accès non autorisé.');
   return structuredClone(entry);
  },
  authorizeModerator:modAccess.authorize,
  clock:()=>at
 });
 return {appeals,records,store,modAccess,moderator,
  setRole:value=>{grantRole=value},disable:()=>{staffActive=false}};
}
const appealReason='Je demande un réexamen : cet argument peut être mieux contextualisé.';
const decideReason='Après vérification contradictoire, voici les raisons documentées de notre décision.';
const submit=e=>e.appeals.submit(AUTHOR,{entryId:ID,reason:appealReason});
test('le service ne s’ouvre jamais sans ses dépendances vérifiées',()=>{
 assert.throws(()=>createAppealService(),/Stockage chiffré/);
});
test('un refus peut faire l’objet d’un recours privé et motivé',async()=>{
 const e=setup();
 const filed=await submit(e);
 assert.equal(filed.version,1);
 assert.equal(filed.status,'pending');
 assert.equal(filed.reference,REF);
 assert.equal(filed.reason,appealReason);
 assert.equal(filed.decision,null);
 assert.equal(e.store.data.size,1);
});
test('une contribution non refusée ne donne pas droit à ce type de recours',async()=>{
 const e=setup();e.records.set(ID,make());
 await assert.rejects(()=>submit(e),/rejet ou de retrait/);
 e.records.set(ID,approve(make()));
 await assert.rejects(()=>submit(e),/rejet ou de retrait/);
});
test('un retrait de publication ouvre un recours sans republier',async()=>{
 const e=setup();
 e.records.set(ID,withdrawPublication(approve(make()),{
  actor:'Responsable du retrait',reason:'Retrait à vérifier.',
  expectedMutation:1,at
 }));
 const filed=await submit(e);
 assert.equal(filed.version,1);
 assert.equal(e.records.get(ID).visibility,'withdrawn');
});
test('une demande de recours est unique pour une même version',async()=>{
 const e=setup();
 await submit(e);
 await assert.rejects(()=>submit(e),/existe déjà/);
 assert.equal(e.store.data.size,1);
});
test('deux requêtes concurrentes ne créent qu’un recours',async()=>{
 const e=setup();
 const out=await Promise.allSettled([submit(e),submit(e)]);
 assert.equal(out.filter(x=>x.status==='fulfilled').length,1);
});
test('un auteur ne peut pas consulter le recours d’autrui',async()=>{
 const e=setup();
 await submit(e);
 await assert.rejects(()=>e.appeals.own({type:'author'},{
  entryId:ID,version:1
 }),/non autorisé/);
 await assert.rejects(()=>e.appeals.own(AUTHOR,{entryId:OTHER,version:1}),/non autorisé/);
});
test('l’observateur peut consulter le recours mais pas statuer',async()=>{
 const e=setup({role:'observer'});await submit(e);
 const id=await e.moderator;
 const found=await e.appeals.forModerator(id.principal,{entryId:ID,version:1});
 assert.equal(found.status,'pending');
 assert.equal(found.reason,appealReason);
 await assert.rejects(()=>e.appeals.decide(id.principal,{
  entryId:ID,version:1,decision:'maintain',reason:decideReason,actor:id.label
 }),/non autorisé/);
});
test('le reviewer peut confirmer le rejet en motivant sa décision',async()=>{
 const e=setup();await submit(e);
 const id=await e.moderator;
 const result=await e.appeals.decide(id.principal,{
  entryId:ID,version:1,decision:'maintain',reason:decideReason,actor:id.label
 });
 assert.equal(result.status,'resolved');
 assert.equal(result.decision.outcome,'maintain');
 assert.equal(result.decision.reason,decideReason);
 assert.equal(e.records.get(ID).versions.at(-1).status,'rejected');
 assert.equal((await e.appeals.own(AUTHOR,{entryId:ID,version:1})).decision.outcome,'maintain');
});
test('proposer une révision clôt le recours sans publier automatiquement',async()=>{
 const e=setup();await submit(e);
 const id=await e.moderator;
 const result=await e.appeals.decide(id.principal,{
  entryId:ID,version:1,decision:'invite_revision',reason:decideReason,actor:id.label
 });
 assert.equal(result.status,'resolved');
 assert.equal(result.decision.outcome,'invite_revision');
 assert.equal(e.records.get(ID).visibility,'private');
 assert.equal(e.records.get(ID).versions.length,1);
});
test('escalade : le reviewer renvoie à un superviseur sans modifier le texte',async()=>{
 const e=setup();await submit(e);
 const id=await e.moderator;
 const escalated=await e.appeals.decide(id.principal,{
  entryId:ID,version:1,decision:'escalate',reason:decideReason,actor:id.label
 });
 assert.equal(escalated.status,'escalated');
 assert.equal(escalated.decision.outcome,'escalate');
 await assert.rejects(()=>e.appeals.decide(id.principal,{
  entryId:ID,version:1,expectedStatus:'escalated',
  decision:'maintain',reason:decideReason,actor:id.label
 }),/non autorisé/);
 e.setRole('supervisor');
 const final=await e.appeals.decide(id.principal,{
  entryId:ID,version:1,expectedStatus:'escalated',
  decision:'invite_revision',reason:decideReason,actor:id.label
 });
 assert.equal(final.status,'resolved');
 assert.equal(final.decision.outcome,'invite_revision');
 assert.equal(e.records.get(ID).versions[0].status,'rejected');
});
test('aucun second examen d’un recours résolu ou avec statut obsolète',async()=>{
 const e=setup();await submit(e);
 const id=await e.moderator;
 await e.appeals.decide(id.principal,{
  entryId:ID,version:1,decision:'maintain',reason:decideReason,actor:id.label
 });
 await assert.rejects(()=>e.appeals.decide(id.principal,{
  entryId:ID,version:1,decision:'maintain',reason:decideReason,actor:id.label
 }),/Conflit/);
});
test('décision sans justification ou identité professionnelle refusée',async()=>{
 const e=setup();await submit(e);const id=await e.moderator;
 await assert.rejects(()=>e.appeals.decide(id.principal,{
  entryId:ID,version:1,decision:'maintain',reason:'',actor:id.label
 }),/Motif/);
 await assert.rejects(()=>e.appeals.decide(id.principal,{
  entryId:ID,version:1,decision:'maintain',reason:decideReason,actor:'x'
 }),/professionnelle/);
});
test('hors périmètre : le modérateur ne découvre pas un autre dossier',async()=>{
 const e=setup();await submit(e);const id=await e.moderator;
 await assert.rejects(()=>e.appeals.forModerator(id.principal,{
  entryId:OTHER,version:1
 }),/non autorisé/);
});
test('révocation en temps réel : impossible de décider ensuite',async()=>{
 const e=setup();await submit(e);const id=await e.moderator;e.disable();
 await assert.rejects(()=>e.appeals.decide(id.principal,{
  entryId:ID,version:1,decision:'maintain',reason:decideReason,actor:id.label
 }),/non autorisé/);
});
test('le recours n’expose pas les journaux privés dans les projections',async()=>{
 const e=setup();await submit(e);const id=await e.moderator;
 const moderator=await e.appeals.forModerator(id.principal,{entryId:ID,version:1});
 const author=await e.appeals.own(AUTHOR,{entryId:ID,version:1});
 assert(!JSON.stringify(moderator).includes('audit'));
 assert(!JSON.stringify(author).includes('entryId'));
 assert(!JSON.stringify(author).includes('staff-appeal'));
 assert(!JSON.stringify(author).includes('audit'));
});
test('un motif trop bref est refusé sans déposer de recours',async()=>{
 const e=setup();
 await assert.rejects(()=>e.appeals.submit(AUTHOR,{
  entryId:ID,reason:'non'
 }),/10 à 2 000/);
});
