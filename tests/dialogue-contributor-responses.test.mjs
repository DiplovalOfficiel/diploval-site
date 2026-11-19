import test from 'node:test';
import assert from 'node:assert/strict';
import {createEntry,reviewRevision,proposeRevision} from '../netlify/lib/dialogue-model.mjs';
import {createModeratorAccess} from '../netlify/lib/dialogue-moderator-access.mjs';
import {createContributorResponses} from '../netlify/lib/dialogue-contributor-responses.mjs';

const ID='dossier-b6-response-001',OTHER='dossier-b6-response-002';
const REF='CE-2026-112233445566',EMAIL='private@author.test';
const AUTHOR=Object.freeze({type:'authorized-author-test'});
const message='Après lecture de votre contribution, une source complémentaire semble nécessaire.';
const reason='La réponse précédente doit être corrigée pour éviter toute ambiguïté.';
const date='2026-11-19T14:00:00Z';
const newEntry=(id=ID,reference=REF)=>createEntry({
 consultationId:id===ID?'consultation-a':'consultation-b',kind:'contribution',
 text:'Une réflexion qui mérite un traitement contradictoire et sourcé.',
 processingAgreement:true,publicationAgreement:true,
 displayMode:'pseudonym',publicLabel:'Pseudonyme confidentiel',email:EMAIL
},{id,reference,at:date});
function storage(){
 const map=new Map();let version=0;
 return {
  map,
  async getWithMetadata(k){
   const v=map.get(k);return v?{data:JSON.parse(v.content),etag:v.etag}:null;
  },
  async set(k,content,{onlyIfNew=false,onlyIfMatch=null}={}){
   const old=map.get(k);
   if(onlyIfNew&&old)return {modified:false,etag:old.etag};
   if(onlyIfMatch!==null&&(!old||old.etag!==onlyIfMatch))
    return {modified:false,etag:old?.etag};
   const etag='etag-'+(++version);map.set(k,{content,etag});
   return {modified:true,etag};
  }
 };
}
function setup(){
 const db=storage(),records=new Map([
  [ID,newEntry()],[OTHER,newEntry(OTHER,'CE-2026-445566778899')]
 ]);
 let active=true;
 const grants=new Map([
  ['staff-reviewer-01',{active:true,roles:['reviewer'],consultationIds:['consultation-a']}],
  ['staff-reviewer-02',{active:true,roles:['reviewer'],consultationIds:['consultation-a']}],
  ['staff-supervisor-01',{active:true,roles:['supervisor'],consultationIds:['consultation-a']}],
  ['staff-observer-01',{active:true,roles:['observer'],consultationIds:['consultation-a']}]
 ]);
 const moderators=createModeratorAccess({
  verifySession:async request=>{
   if(!active)return null;
   const id=request?.staffId;
   return grants.has(id)?{staffId:id,label:'Agent '+id}:null;
  },
  loadGrants:async id=>structuredClone(grants.get(id))
 });
 const authorEntry=async(who,id)=>{
  if(who!==AUTHOR||id!==ID)throw Error('Accès non autorisé.');
  return structuredClone(records.get(id));
 };
 const moderatorEntry=async(who,id)=>{
  const e=records.get(id);
  if(!e||await moderators.authorize(who,'read_private',e)!==true)
   throw Error('Accès non autorisé.');
  return structuredClone(e);
 };
 const notices=createContributorResponses({
  store:db,readModeratorEntry:moderatorEntry,readAuthorEntry:authorEntry,
  authorizeModerator:moderators.authorize,resolveStaff:moderators.resolveStaff,
  clock:()=>date
 });
 return {
  notices,db,records,grants,moderators,
  login:async id=>(await moderators.authenticate({staffId:id})).principal,
  stop:()=>{active=false}
 };
}
const draft=async(e,who,options={})=>e.notices.draft(who,{
 entryId:ID,expectedMutation:0,topic:'request_information',message,...options
});
test('initialisation sans stockage ni session : impossible',()=>{
 assert.throws(()=>createContributorResponses(),/Stockage privé/);
});
test('un examinateur peut créer un brouillon privé sans le publier',async()=>{
 const e=setup(),reviewer=await e.login('staff-reviewer-01');
 const reply=await draft(e,reviewer);
 assert.equal(reply.status,'draft');
 assert.equal(reply.topic,'request_information');
 assert.equal(reply.message,message);
 assert.equal(await e.notices.forAuthor(AUTHOR,{entryId:ID,mutation:0}),null);
 assert.equal(e.records.get(ID).visibility,'private');
 assert.equal(e.db.map.size,1);
});
test('seul un superviseur peut valider une réponse, distinct du rédacteur',async()=>{
 const e=setup(),reviewer=await e.login('staff-reviewer-01');
 const reviewer2=await e.login('staff-reviewer-02');
 const supervisor=await e.login('staff-supervisor-01');
 await draft(e,reviewer);
 await assert.rejects(()=>e.notices.approve(reviewer,{entryId:ID,expectedMutation:0}),/non autorisé/);
 await assert.rejects(()=>e.notices.approve(reviewer2,{entryId:ID,expectedMutation:0}),/non autorisé/);
 const accepted=await e.notices.approve(supervisor,{entryId:ID,expectedMutation:0});
 assert.equal(accepted.status,'approved');
 const displayed=await e.notices.forAuthor(AUTHOR,{entryId:ID,mutation:0});
 assert.equal(displayed.message,message);
 assert.equal(displayed.reference,REF);
 assert(!JSON.stringify(displayed).includes(EMAIL));
 assert(!JSON.stringify(displayed).includes('staff-reviewer'));
 assert(!JSON.stringify(displayed).includes('audit'));
});
test('le superviseur ne peut pas approuver sa propre rédaction',async()=>{
 const e=setup(),supervisor=await e.login('staff-supervisor-01');
 await draft(e,supervisor);
 await assert.rejects(()=>e.notices.approve(supervisor,{entryId:ID,expectedMutation:0}),/indépendante/);
 assert.equal(await e.notices.forAuthor(AUTHOR,{entryId:ID,mutation:0}),null);
});
test('un observateur ne peut ni rédiger ni approuver',async()=>{
 const e=setup(),observer=await e.login('staff-observer-01');
 await assert.rejects(()=>draft(e,observer),/non autorisé/);
 await assert.rejects(()=>e.notices.approve(observer,{entryId:ID,expectedMutation:0}),/non autorisé/);
 assert.equal(e.db.map.size,0);
});
test('dossier hors consultation : aucun brouillon, aucune fuite',async()=>{
 const e=setup(),reviewer=await e.login('staff-reviewer-01');
 await assert.rejects(()=>draft(e,reviewer,{
  entryId:OTHER,expectedMutation:0
 }),/non autorisé/);
 assert.equal(e.db.map.size,0);
});
test('une réponse de décision ne peut pas précéder la décision réelle',async()=>{
 const e=setup(),reviewer=await e.login('staff-reviewer-01');
 await assert.rejects(()=>draft(e,reviewer,{
  topic:'decision'
 }),/Décision non encore/);
});
test('après décision, réponse motivée autorisée mais jamais automatiquement envoyée',async()=>{
 const e=setup(),reviewer=await e.login('staff-reviewer-01');
 const rejected=reviewRevision(e.records.get(ID),{
  decision:'reject',actor:'Examinateur fictif',reason:'Plus de précisions nécessaires.',
  expectedMutation:0,at:date
 });
 e.records.set(ID,rejected);
 const drafted=await draft(e,reviewer,{
  topic:'decision',expectedMutation:1
 });
 assert.equal(drafted.status,'draft');
 assert.equal(e.db.map.size,1);
 assert.equal(e.records.get(ID).versions.at(-1).status,'rejected');
});
test('une version obsolète n’obtient pas de réponse nouvelle',async()=>{
 const e=setup(),reviewer=await e.login('staff-reviewer-01');
 const revised=e.records.get(ID);
 const decided=reviewRevision(revised,{
  decision:'approve',actor:'Modérateur fictif',expectedMutation:0,at:date
 });
 e.records.set(ID,decided);
 await assert.rejects(()=>draft(e,reviewer,{
  expectedMutation:0
 }),/Conflit/);
});
test('modification de dossier avant validation : refus sans divulgation',async()=>{
 const e=setup(),reviewer=await e.login('staff-reviewer-01');
 const supervisor=await e.login('staff-supervisor-01');
 await draft(e,reviewer);
 const decided=reviewRevision(e.records.get(ID),{
  decision:'approve',actor:'Modérateur fictif',expectedMutation:0,at:date
 });
 e.records.set(ID,decided);
 await assert.rejects(()=>e.notices.approve(supervisor,{
  entryId:ID,expectedMutation:0
 }),/Conflit/);
});
test('impossible de créer une réponse supplémentaire pour la même version',async()=>{
 const e=setup(),reviewer=await e.login('staff-reviewer-01');
 await draft(e,reviewer);
 await assert.rejects(()=>draft(e,reviewer),/déjà/);
});
test('deux demandes de rédaction simultanées : une seule est stockée',async()=>{
 const e=setup(),reviewer=await e.login('staff-reviewer-01');
 const attempts=await Promise.allSettled([draft(e,reviewer),draft(e,reviewer)]);
 assert.equal(attempts.filter(v=>v.status==='fulfilled').length,1);
});
test('une réponse peut être retirée, sans effacer le dossier ni devenir publique',async()=>{
 const e=setup(),reviewer=await e.login('staff-reviewer-01');
 const supervisor=await e.login('staff-supervisor-01');
 await draft(e,reviewer);
 await e.notices.approve(supervisor,{entryId:ID,expectedMutation:0});
 const withdrawn=await e.notices.revoke(supervisor,{
  entryId:ID,mutation:0,reason
 });
 assert.equal(withdrawn.status,'revoked');
 assert.equal(await e.notices.forAuthor(AUTHOR,{entryId:ID,mutation:0}),null);
 assert.equal(e.records.get(ID).visibility,'private');
});
test('session révoquée : aucun brouillon ou approbation nouvelle',async()=>{
 const e=setup(),reviewer=await e.login('staff-reviewer-01');
 await draft(e,reviewer);
 const supervisor=await e.login('staff-supervisor-01');
 e.stop();
 await assert.rejects(()=>e.notices.approve(supervisor,{
  entryId:ID,expectedMutation:0
 }),/non autorisé/);
});
test('un faux principal ou faux staffId ne peut pas rédiger',async()=>{
 const e=setup();
 await assert.rejects(()=>draft(e,{type:'verified-moderation'}),/non autorisé/);
});
test('un auteur ne peut lire la réponse d’un dossier différent',async()=>{
 const e=setup(),reviewer=await e.login('staff-reviewer-01');
 const supervisor=await e.login('staff-supervisor-01');
 await draft(e,reviewer);
 await e.notices.approve(supervisor,{entryId:ID,expectedMutation:0});
 await assert.rejects(()=>e.notices.forAuthor({},{
  entryId:ID,mutation:0
 }),/non autorisé/);
 await assert.rejects(()=>e.notices.forAuthor(AUTHOR,{
  entryId:OTHER,mutation:0
 }),/non autorisé/);
});
test('les projections du modérateur excluent identités et notes internes',async()=>{
 const e=setup(),reviewer=await e.login('staff-reviewer-01');
 await draft(e,reviewer);
 const result=await e.notices.forModerator(reviewer,{
  entryId:ID,mutation:0
 });
 assert.equal(result.status,'draft');
 assert(!JSON.stringify(result).includes('audit'));
 assert(!JSON.stringify(result).includes(EMAIL));
});
