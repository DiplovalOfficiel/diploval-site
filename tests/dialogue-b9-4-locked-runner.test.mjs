import test from 'node:test';
import assert from 'node:assert/strict';
import {createLockedErasureRunner} from '../netlify/lib/dialogue-erasure-locked-runner.mjs';
import {createErasureCaseJournal} from '../netlify/lib/dialogue-erasure-journal-b9.mjs';
import {ERASURE_STEPS} from '../netlify/lib/dialogue-erasure-coordinator.mjs';

const id='case_123';
function fixture({approved=true,failedStep=null,delayStep=null}={}){
 const records=new Map();let version=0,owners=0;
 const store={
  async getWithMetadata(key){const x=records.get(key);return x?{data:structuredClone(x.data),etag:x.etag}:null;},
  async set(key,body,opts={}){
   const old=records.get(key);
   if(opts.onlyIfNew&&old)return {modified:false};
   if(opts.onlyIfMatch&&(!old||old.etag!==opts.onlyIfMatch))return {modified:false};
   const etag='e'+(++version);records.set(key,{etag,data:JSON.parse(body)});
   return {modified:true,etag};
  }
 };
 const journal=createErasureCaseJournal({store,clock:()=> '2026-11-19T16:00:00Z'});
 const principal={trusted:true},calls=[],started={};
 let unblock;
 const gate=new Promise(resolve=>{unblock=resolve;});
 const adapters=Object.fromEntries(ERASURE_STEPS.map(step=>[step,async args=>{
  calls.push({step,ownership:args.ownership});
  if(step===delayStep){started.resolve?.();await gate;}
  return {confirmed:step!==failedStep};
 }]));
 const legal={id,kind:'erasure',decision:approved?'approved':'pending',
  legalReview:true,subjectVerified:true,holdCleared:true,recordId:'entry_123',reference:'DIP-2026-123456789ABC'};
 const runner=createLockedErasureRunner({enabled:true,caseJournal:journal,
  authorize:async p=>p===principal,loadCase:async()=>legal,adapters,
  ownerFactory:()=>String(++owners).padStart(16,'0'),
  clock:()=> '2026-11-19T16:00:00Z'});
 return {runner,journal,calls,principal,legal,unblock,started};
}
test('désactivé par défaut',async()=>{
 await assert.rejects(createLockedErasureRunner().run({},id),/non activé/);
});
test('dépendances exigées',()=>{
 assert.throws(()=>createLockedErasureRunner({enabled:true}),/incomplètes/);
});
test('refus avant verrou pour utilisateur non autorisé',async()=>{
 const f=fixture();await assert.rejects(f.runner.run({},id),/Non autorisé/);
 assert.equal(await f.journal.inspect(id),null);
});
test('refus avant verrou sans validation humaine',async()=>{
 const f=fixture({approved:false});await assert.rejects(f.runner.run(f.principal,id),/non approuvée/);
 assert.equal(await f.journal.inspect(id),null);
});
test('sept opérations fictives, clôture puis libération',async()=>{
 const f=fixture();const result=await f.runner.run(f.principal,id);
 assert.equal(result.state,'completed');
 assert.deepEqual(f.calls.map(x=>x.step),ERASURE_STEPS);
 assert(f.calls.every(x=>x.ownership.revision===1));
 assert.equal((await f.journal.inspect(id)).lockStatus,'released');
});
test('seconde exécution après clôture ne refait pas les opérations',async()=>{
 const f=fixture();await f.runner.run(f.principal,id);await f.runner.run(f.principal,id);
 assert.equal(f.calls.length,7);
});
test('défaillance : aucun faux succès, verrou conservé',async()=>{
 const f=fixture({failedStep:'erasePrivateRecords'});
 await assert.rejects(f.runner.run(f.principal,id),/non confirmée/);
 assert.equal((await f.journal.inspect(id)).lockStatus,'locked');
 assert.deepEqual((await f.journal.inspect(id)).checkpoint.completed,ERASURE_STEPS.slice(0,3));
});
test('un dossier bloqué interdit une reprise automatique',async()=>{
 const f=fixture({failedStep:'removeContactIndex'});
 await assert.rejects(f.runner.run(f.principal,id));
 await assert.rejects(f.runner.run(f.principal,id),/verrouillé/);
});
test('deux concurrents ne passent pas ensemble',async()=>{
 const f=fixture({delayStep:'blockPublication'});
 f.started.promise=new Promise(resolve=>f.started.resolve=resolve);
 const first=f.runner.run(f.principal,id);
 await f.started.promise;
 await assert.rejects(f.runner.run(f.principal,id),/verrouillé/);
 f.unblock();
 const result=await first;
 assert.equal(result.state,'completed');
 assert.equal(f.calls.length,7);
});
