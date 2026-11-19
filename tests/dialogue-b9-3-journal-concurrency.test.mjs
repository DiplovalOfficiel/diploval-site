import test from 'node:test';
import assert from 'node:assert/strict';
import {createErasureCaseJournal} from '../netlify/lib/dialogue-erasure-journal-b9.mjs';

function fixture(){
 const records=new Map();let n=0;
 const store={
  async getWithMetadata(key){const x=records.get(key);return x?{data:structuredClone(x.data),etag:x.etag}:null;},
  async set(key,text,opts={}){
   const old=records.get(key);
   if(opts.onlyIfNew&&old)return {modified:false};
   if(opts.onlyIfMatch&&(!old||opts.onlyIfMatch!==old.etag))return {modified:false};
   const etag='etag_'+(++n);
   records.set(key,{data:JSON.parse(text),etag});
   return {modified:true,etag};
  }
 };
 return {journal:createErasureCaseJournal({store,clock:()=> '2026-11-19T15:00:00Z'}),records};
}
const id='case_123',a='aaaaaaaaaaaaaaaa',b='bbbbbbbbbbbbbbbb';
test('refuse un stockage non conforme',()=>assert.throws(()=>createErasureCaseJournal(),/ETag/));
test('verrou acquis puis journal lu à vide',async()=>{const {journal}=fixture();const t=await journal.acquire(id,a);assert.equal(await journal.scoped(t).read(id),null);});
test('concurrence : un seul détenteur',async()=>{const {journal}=fixture();const result=await Promise.allSettled([journal.acquire(id,a),journal.acquire(id,b)]);assert.equal(result.filter(x=>x.status==='fulfilled').length,1);});
test('un second opérateur refusé sur dossier verrouillé',async()=>{const {journal}=fixture();await journal.acquire(id,a);await assert.rejects(journal.acquire(id,b),/verrouillé/);});
test('écriture du checkpoint confirmée',async()=>{const {journal}=fixture();const t=await journal.acquire(id,a);await journal.scoped(t).write(id,{caseId:id,state:'running',completed:['blockPublication']});assert.deepEqual((await journal.scoped(t).read(id)).completed,['blockPublication']);});
test('un autre dossier ne peut être lu ou modifié',async()=>{const {journal}=fixture();const t=await journal.acquire(id,a);await assert.rejects(journal.scoped(t).read('case_456'),/Périmètre/);await assert.rejects(journal.scoped(t).write('case_456',{caseId:'case_456',completed:[]}),/Checkpoint/);});
test('reprise après libération conserve checkpoint',async()=>{const {journal}=fixture();const t=await journal.acquire(id,a);await journal.scoped(t).write(id,{caseId:id,state:'running',completed:['blockPublication']});await journal.release(t);const next=await journal.acquire(id,b);assert.deepEqual((await journal.scoped(next).read(id)).completed,['blockPublication']);});
test('ancien propriétaire invalide après nouveau verrou',async()=>{const {journal}=fixture();const t=await journal.acquire(id,a);await journal.release(t);await journal.acquire(id,b);await assert.rejects(journal.scoped(t).read(id),/périmé/);});
test('verrou non libéré reste bloquant après interruption',async()=>{const {journal}=fixture();await journal.acquire(id,a);await assert.rejects(journal.acquire(id,b),/supervisée/);});
test('écriture CAS perdue refuse sans faux succès',async()=>{const {journal,records}=fixture();const t=await journal.acquire(id,a);const key=[...records.keys()][0];records.get(key).etag='changed_by_other';await assert.rejects(journal.scoped(t).write(id,{caseId:id,state:'running',completed:[]}),/Conflit CAS/);});
test('absence de confirmation ne débloque pas le dossier',async()=>{const {journal}=fixture();const t=await journal.acquire(id,a);await assert.rejects(journal.acquire(id,b));assert.equal((await journal.inspect(id)).lockStatus,'locked');await journal.release(t);assert.equal((await journal.inspect(id)).lockStatus,'released');});
