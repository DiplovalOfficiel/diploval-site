import test from 'node:test';
import assert from 'node:assert/strict';
import {createReferenceIntegrityInspector} from '../netlify/lib/dialogue-reference-integrity-inspector.mjs';
const reference='DIP-2026-ABCDEF123456',id='entry_123',admin={trusted:true};
function setup(claim={id},record={id,reference}){
 const objects=new Map();
 if(claim!==null)objects.set('dialogue-v03/references/'+reference,claim);
 if(record!==null)objects.set('dialogue-v03/records/'+id,record);
 let calls=0;
 const inspector=createReferenceIntegrityInspector({enabled:true,
  store:{getWithMetadata:async key=>{calls++;return objects.has(key)?{data:structuredClone(objects.get(key)),etag:'etag-'+calls}:null;}},
  authorize:async p=>p===admin});
 return {inspector,objects};
}
test('inactive by default',async()=>{
 await assert.rejects(createReferenceIntegrityInspector().inspect(admin,{reference}),/désactivé/);
});
test('requires trusted storage and server authorization',()=>{
 assert.throws(()=>createReferenceIntegrityInspector({enabled:true}),/incomplètes/);
});
test('consistent reference points to matching record',async()=>{
 const {inspector}=setup();const result=await inspector.inspect(admin,{reference});
 assert.equal(result.status,'consistent');assert.equal(result.safeToDelete,false);
});
test('missing record is a candidate, never automatic deletion',async()=>{
 const {inspector}=setup({id},null);const result=await inspector.inspect(admin,{reference});
 assert.equal(result.status,'orphan_candidate');assert.equal(result.safeToDelete,false);
});
test('missing reference is not a record to purge',async()=>{
 const {inspector}=setup(null,null);const result=await inspector.inspect(admin,{reference});
 assert.equal(result.status,'not_found');assert.equal(result.safeToDelete,false);
});
test('broken claim marked for human investigation',async()=>{
 const {inspector}=setup({id:'../escape'},null);
 assert.equal((await inspector.inspect(admin,{reference})).status,'invalid_claim');
});
test('cross-reference mismatch is not automatically reconciled',async()=>{
 const {inspector}=setup({id},{id,reference:'DIP-2026-FFFFFFFFFFFF'});
 const result=await inspector.inspect(admin,{reference});
 assert.equal(result.status,'cross_reference_mismatch');assert.equal(result.safeToDelete,false);
});
test('unauthorized identity rejected',async()=>{
 const {inspector}=setup();
 await assert.rejects(inspector.inspect({}, {reference}),/non autorisé/);
});
test('invalid reference rejected before any read',async()=>{
 const {inspector}=setup();
 await assert.rejects(inspector.inspect(admin,{reference:'../invalid'}),/invalide/);
});
test('unreliable storage metadata rejected',async()=>{
 const inspector=createReferenceIntegrityInspector({enabled:true,
  store:{getWithMetadata:async()=>({data:{id},etag:null})},authorize:async()=>true});
 await assert.rejects(inspector.inspect(admin,{reference}),/non fiable/);
});
