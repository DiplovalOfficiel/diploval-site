import test from 'node:test';
import assert from 'node:assert/strict';
import {createErasureCaseJournal} from '../netlify/lib/dialogue-erasure-journal-b9.mjs';
import {createErasureReconciler} from '../netlify/lib/dialogue-erasure-reconciler.mjs';

const id='case_987',oldOwner='aaaaaaaaaaaaaaaa',newOwner='bbbbbbbbbbbbbbbb';
async function fixture(options={}){
 const records=new Map();let serial=0, auditCount=0;
 const store={
  async getWithMetadata(key){const x=records.get(key);return x?{data:structuredClone(x.data),etag:x.etag}:null;},
  async set(key,content,flags={}){
   const previous=records.get(key);
   if(flags.onlyIfNew&&previous)return {modified:false};
   if(flags.onlyIfMatch&&(!previous||previous.etag!==flags.onlyIfMatch))return {modified:false};
   const value=JSON.parse(content),etag='etag_'+(++serial);
   records.set(key,{etag,data:value});return {modified:true,etag};
  }
 };
 const journal=createErasureCaseJournal({store,clock:()=> '2026-11-19T16:00:00Z'});
 const token=await journal.acquire(id,oldOwner);
 await journal.scoped(token).write(id,{caseId:id,state:'running',completed:[],
  createdAt:'2026-11-19T16:00:00Z'});
 const principal={type:'supervisor'};
 const reconciler=createErasureReconciler({
  enabled:true,journal,
  loadCase:async()=>({id,kind:'erasure',decision:'approved',legalReview:true,
   subjectVerified:true,holdCleared:true,recordId:'entry_987',reference:'DIP-2026-ABCDEF123456'}),
  authorizeSupervisor:async p=>p===principal&&options.authorized!==false,
  verifyQuiescence:async()=>options.quiet!==false,
  verifyEffect:async({step})=>step==='blockPublication'&&options.effect!==false,
  recordAudit:async()=>{auditCount++;return options.audit!==false;},
  ownerFactory:()=>newOwner
 });
 const args={caseId:id,expectedRevision:1,confirmedStep:'blockPublication',
   evidenceId:'evidence_123456789'};
 return {journal,reconciler,principal,token,args,audits:()=>auditCount};
}
test('B9.8 désactivé par défaut',async()=>{
 await assert.rejects(createErasureReconciler().reconcile({},{}),/non activé/);
});
test('B9.8 exige toutes les dépendances',()=>{
 assert.throws(()=>createErasureReconciler({enabled:true}),/absentes/);
});
test('B9.8 autorisation de supervision requise',async()=>{
 const x=await fixture();await assert.rejects(x.reconciler.reconcile({},x.args),/non autorisée/);
});
test('B9.8 effet non confirmé bloque la correction',async()=>{
 const x=await fixture({effect:false});
 await assert.rejects(x.reconciler.reconcile(x.principal,x.args),/non vérifié/);
 assert.deepEqual((await x.journal.inspect(id)).checkpoint.completed,[]);
});
test('B9.8 ancien exécutant encore actif bloque la correction',async()=>{
 const x=await fixture({quiet:false});
 await assert.rejects(x.reconciler.reconcile(x.principal,x.args),/non neutralisé/);
});
test('B9.8 défaut de traçabilité bloque la correction',async()=>{
 const x=await fixture({audit:false});
 await assert.rejects(x.reconciler.reconcile(x.principal,x.args),/audit/);
 assert.deepEqual((await x.journal.inspect(id)).checkpoint.completed,[]);
});
test('B9.8 réparation contrôlée avance la révision et reste verrouillée',async()=>{
 const x=await fixture();
 const r=await x.reconciler.reconcile(x.principal,x.args);
 assert.equal(r.state,'locked_reconciled');
 assert.equal(r.automaticResume,false);
 assert.equal(r.revision,2);
 const state=await x.journal.inspect(id);
 assert.equal(state.lockStatus,'locked');
 assert.deepEqual(state.checkpoint.completed,['blockPublication']);
 assert.equal(x.audits(),1);
});
test('B9.8 ancien détenteur ne peut plus écrire au journal',async()=>{
 const x=await fixture();await x.reconciler.reconcile(x.principal,x.args);
 await assert.rejects(x.journal.scoped(x.token).read(id),/périmé/);
});
test('B9.8 aucune reprise automatique après réparation',async()=>{
 const x=await fixture();await x.reconciler.reconcile(x.principal,x.args);
 await assert.rejects(x.journal.acquire(id,'cccccccccccccccc'),/verrouillé/);
});
test('B9.8 double réconciliation sur ancienne révision refusée',async()=>{
 const x=await fixture();await x.reconciler.reconcile(x.principal,x.args);
 await assert.rejects(x.reconciler.reconcile(x.principal,x.args),/différent/);
});
test('B9.8 refuse une étape non consécutive',async()=>{
 const x=await fixture();
 await assert.rejects(x.reconciler.reconcile(x.principal,{...x.args,confirmedStep:'erasePrivateRecords'}),/incorrecte/);
});
