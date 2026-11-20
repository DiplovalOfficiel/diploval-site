import test from 'node:test';
import assert from 'node:assert/strict';
import {createMutationRecoveryJournal} from '../netlify/lib/dialogue-mutation-recovery-journal.mjs';
const principal={trusted:true},id='operation_123',recordId='entry_123',reference='DIP-2026-ABCDEF123456';
const evidenceId='evidence_123456';
function fixture({authorized=true,verified=true}={}){
 const entries=new Map();let counter=0;
 const store={
  getWithMetadata:async k=>{const v=entries.get(k);return v?{data:structuredClone(v.data),etag:v.etag}:null;},
  set:async(k,raw,options={})=>{
   const prev=entries.get(k);
   if(options.onlyIfNew&&prev)return {modified:false};
   if(options.onlyIfMatch&&(!prev||prev.etag!==options.onlyIfMatch))return {modified:false};
   const etag='etag_'+(++counter);entries.set(k,{etag,data:JSON.parse(raw)});
   return {modified:true,etag};
  }
 };
 const journal=createMutationRecoveryJournal({enabled:true,store,
  authorize:async p=>p===principal&&authorized,verifyStep:async()=>verified});
 return {journal,entries};
}
const creation={id,recordId,reference,kind:'create'};
const correction={id,recordId,reference,kind:'rectify_contact'};
const confirm=(journal,step)=>journal.confirmStep(principal,{id,step,evidenceId});
test('disabled by default',async()=>assert.rejects(createMutationRecoveryJournal().begin(principal,creation),/désactivé/));
test('dependencies required',()=>assert.throws(()=>createMutationRecoveryJournal({enabled:true}),/manquantes/));
test('creation initially pending and visible only with server authorization',async()=>{
 const {journal}=fixture();await journal.begin(principal,creation);
 const x=await journal.inspect(principal,id);assert.equal(x.status,'pending');assert.deepEqual(x.confirmed,[]);
});
test('creation steps require strict order',async()=>{
 const {journal}=fixture();await journal.begin(principal,creation);
 await assert.rejects(confirm(journal,'contact_index_confirmed'),/hors ordre/);
 assert.equal((await journal.inspect(principal,id)).status,'pending');
});
test('creation completes after three independent acknowledgements',async()=>{
 const {journal}=fixture();await journal.begin(principal,creation);
 for(const s of ['reference_reserved','private_record_saved','contact_index_confirmed'])await confirm(journal,s);
 const x=await journal.inspect(principal,id);assert.equal(x.status,'complete');assert.equal(x.confirmed.length,3);
});
test('contact correction remains pending until old index and sessions revoked',async()=>{
 const {journal}=fixture();await journal.begin(principal,correction);
 for(const s of ['new_contact_verified','private_record_updated','new_index_confirmed'])await confirm(journal,s);
 assert.equal((await journal.inspect(principal,id)).status,'pending');
});
test('contact correction requires all five steps',async()=>{
 const {journal}=fixture();await journal.begin(principal,correction);
 for(const s of ['new_contact_verified','private_record_updated','new_index_confirmed','old_index_revoked','sessions_revoked'])await confirm(journal,s);
 assert.equal((await journal.inspect(principal,id)).status,'complete');
});
test('unverified external step cannot be recorded',async()=>{
 const {journal}=fixture({verified:false});await journal.begin(principal,creation);
 await assert.rejects(confirm(journal,'reference_reserved'),/non attesté/);
 assert.deepEqual((await journal.inspect(principal,id)).confirmed,[]);
});
test('anonymous caller cannot begin or inspect',async()=>{
 const {journal}=fixture();
 await assert.rejects(journal.begin({},creation),/Non autorisé/);
 await journal.begin(principal,creation);
 await assert.rejects(journal.inspect({},id),/Non autorisé/);
});
test('concurrent duplicate begin rejected by CAS',async()=>{
 const {journal}=fixture();const results=await Promise.allSettled([journal.begin(principal,creation),journal.begin(principal,creation)]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
});
test('complete operation cannot add another step',async()=>{
 const {journal}=fixture();await journal.begin(principal,creation);
 for(const s of ['reference_reserved','private_record_saved','contact_index_confirmed'])await confirm(journal,s);
 await assert.rejects(confirm(journal,'contact_index_confirmed'),/hors ordre/);
});
