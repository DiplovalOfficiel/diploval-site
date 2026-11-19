import test from 'node:test';
import assert from 'node:assert/strict';
import {createModerationQueue,moderationState} from '../netlify/lib/dialogue-moderation-queue.mjs';
import {createModeratorAccess} from '../netlify/lib/dialogue-moderator-access.mjs';
import {createEntry,reviewRevision,proposeRevision,withdrawPublication} from '../netlify/lib/dialogue-model.mjs';

const at='2026-11-19T11:00:00.000Z',A='consultation-a',B='consultation-b';
const contributor='private@example.test';
function entry(id,ref,consultationId=A){
 return createEntry({consultationId,kind:'contribution',
  text:'Une question publique avec un argument citoyen assez long pour la file.',
  displayMode:'pseudonym',publicLabel:'Pseudonyme confidentiel',email:contributor,
  processingAgreement:true,publicationAgreement:true
 },{id,reference:ref,at});
}
const accept=r=>reviewRevision(r,{decision:'approve',actor:'Modérateur-test',
  expectedMutation:r.mutation,at});
const reject=r=>reviewRevision(r,{decision:'reject',actor:'Modérateur-test',
  reason:'Le message exige une précision supplémentaire.',expectedMutation:r.mutation,at});
const withdraw=r=>withdrawPublication(r,{actor:'Superviseur-test',
  reason:'Retrait motivé de la publication.',expectedMutation:r.mutation,at});
function setup({role='reviewer',ids=null}={}){
 const entries=new Map();
 const seed=[
  entry('dossier-queue-001','CE-2026-000000000001'),
  entry('dossier-queue-002','CE-2026-000000000002'),
  entry('dossier-queue-003','CE-2026-000000000003',B),
  entry('dossier-queue-004','CE-2026-000000000004')
 ];
 entries.set(seed[0].id,seed[0]);
 entries.set(seed[1].id,accept(seed[1]));
 entries.set(seed[2].id,seed[2]);
 entries.set(seed[3].id,reject(seed[3]));
 let authorized=true,roleName=role,readIndex=0,reads=0;
 const access=createModeratorAccess({
  verifySession:async req=>authorized&&req?.session==='verified'
    ?{staffId:'staff-queue-001',label:'Agent fictif'}:null,
  loadGrants:async()=>({active:true,roles:[roleName],consultationIds:[A]})
 });
 const principalPromise=access.authenticate({session:'verified'});
 const queue=createModerationQueue({
  listCandidateIds:async()=>{readIndex++;return ids??[...entries.keys()]},
  repository:{readPrivate:async(principal,id)=>{
   reads++;
   const e=entries.get(id);
   if(!e)return null;
   if(await access.authorize(principal,'lookup_private')!==true
     ||await access.authorize(principal,'read_private',e)!==true)
      throw Error('Accès non autorisé.');
   return structuredClone(e);
  }},
  authorize:access.authorize
 });
 return {entries,access,queue,principalPromise,
  setRole:x=>{roleName=x},setVerified:x=>{authorized=x},
  getReads:()=>reads,getIndexReads:()=>readIndex};
}
test('état de modération correct pour brouillon, refus, publication et retrait',()=>{
 const initial=entry('dossier-queue-005','CE-2026-000000000005');
 assert.equal(moderationState(initial),'pending');
 assert.equal(moderationState(reject(initial)),'rejected');
 assert.equal(moderationState(accept(initial)),'approved');
 assert.equal(moderationState(withdraw(accept(initial))),'withdrawn');
 const revised=proposeRevision(accept(initial),{
  text:'Une nouvelle version en attente après changement de perspective.',
  expectedMutation:1,at
 });
 assert.equal(moderationState(revised),'pending');
});
test('file en attente : seules les contributions du périmètre attribué',async()=>{
 const e=setup();const p=(await e.principalPromise).principal;
 const result=await e.queue.list(p);
 assert.deepEqual(result.entries.map(x=>x.id),['dossier-queue-001']);
 assert.equal(result.nextCursor,null);
});
test('file de suivi complète : sans identifiants privés du hors-périmètre',async()=>{
 const e=setup();const p=(await e.principalPromise).principal;
 const result=await e.queue.list(p,{state:'all'});
 assert.equal(result.entries.length,3);
 assert(!JSON.stringify(result).includes('dossier-queue-003'));
});
test('la file ne révèle jamais coordonnées, pseudonyme ou journal interne',async()=>{
 const e=setup();const p=(await e.principalPromise).principal;
 const data=JSON.stringify(await e.queue.list(p,{state:'all'}));
 assert(!data.includes(contributor));
 assert(!data.includes('Pseudonyme confidentiel'));
 assert(!data.includes('Modérateur-test'));
 assert(!data.includes('audit'));
 assert(!data.includes('permissions'));
});
test('observateur : lecture autorisée, aucune permission de publication',async()=>{
 const e=setup({role:'observer'}),p=(await e.principalPromise).principal;
 assert.equal((await e.queue.list(p)).entries.length,1);
 assert.equal(await e.access.authorize(p,'moderate',e.entries.get('dossier-queue-001')),false);
});
test('principal forgé : refus AVANT lecture de l’index',async()=>{
 const e=setup();
 await assert.rejects(()=>e.queue.list({type:'verified-moderation'}),/non autorisé/);
 assert.equal(e.getReads(),0);
 assert.equal(e.getIndexReads(),0);
});
test('révocation de session : aucun nouvel accès',async()=>{
 const e=setup(),p=(await e.principalPromise).principal;
 e.setVerified(false);
 await assert.rejects(()=>e.queue.list(p),/non autorisé/);
});
test('droits réduits en cours : même principal privé de lecture',async()=>{
 const e=setup(),p=(await e.principalPromise).principal;
 assert.equal((await e.queue.list(p)).entries.length,1);
 e.setRole('invalid-role');
 await assert.rejects(()=>e.queue.list(p),/non autorisé/);
});
test('filtre par consultation et état de décision',async()=>{
 const e=setup(),p=(await e.principalPromise).principal;
 const a=await e.queue.list(p,{state:'rejected',consultationId:A});
 assert.deepEqual(a.entries.map(x=>x.id),['dossier-queue-004']);
 assert.equal((await e.queue.list(p,{state:'approved'})).entries.length,1);
 assert.equal((await e.queue.list(p,{state:'withdrawn'})).entries.length,0);
});
test('pagination sûre sans compter les contributions hors champ',async()=>{
 const e=setup(),p=(await e.principalPromise).principal;
 const first=await e.queue.list(p,{state:'all',limit:2});
 assert.equal(first.entries.length,2);
 assert.equal(first.nextCursor,2);
 const second=await e.queue.list(p,{state:'all',limit:2,cursor:2});
 assert.equal(second.entries.length,1);
 assert.equal(second.nextCursor,null);
});
test('pagination, filtres et index mal formés refusés',async()=>{
 const e=setup(),p=(await e.principalPromise).principal;
 await assert.rejects(()=>e.queue.list(p,{limit:26}),/Pagination/);
 await assert.rejects(()=>e.queue.list(p,{cursor:-1}),/Pagination/);
 await assert.rejects(()=>e.queue.list(p,{state:'private'}),/Filtre/);
 await assert.rejects(()=>e.queue.list(p,{consultationId:'../secret'}),/Consultation/);
 const bad=setup({ids:['../bad']});const principal=(await bad.principalPromise).principal;
 await assert.rejects(()=>bad.queue.list(principal),/Index/);
});
test('un candidat obsolète sans dossier ne crée aucune ligne',async()=>{
 const e=setup({ids:['dossier-queue-001','dossier-absent-999','dossier-queue-001']});
 const p=(await e.principalPromise).principal;
 assert.equal((await e.queue.list(p)).entries.length,1);
});
test('une erreur de stockage autre qu’un refus de droits bloque toute la file',async()=>{
 const p={type:'internal'};
 const queue=createModerationQueue({
  listCandidateIds:async()=>['dossier-queue-001'],
  authorize:async()=>true,
  repository:{readPrivate:async()=>{throw Error('Données privées inaccessibles')}}
 });
 await assert.rejects(()=>queue.list(p),/inaccessibles/);
});
test('dépendances obligatoires : aucune file ouverte par défaut',()=>{
 assert.throws(()=>createModerationQueue(),/Index privé/);
});
