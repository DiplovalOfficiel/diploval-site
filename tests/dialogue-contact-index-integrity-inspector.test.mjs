import test from 'node:test';
import assert from 'node:assert/strict';
import {createContactIndexIntegrityInspector} from '../netlify/lib/dialogue-contact-index-integrity-inspector.mjs';
const digest='a'.repeat(64),principal={trusted:true};
function fixture({ids=['entry_123'],records={'entry_123':{id:'entry_123',reference:'DIP-2026-ABCDEF123456',versions:[]}},allowed=true}={}){
 let indexReads=0,recordReads=0;
 const inspector=createContactIndexIntegrityInspector({enabled:true,
  index:{lookupByDigest:async()=>{indexReads++;return ids;}},
  repository:{readPrivate:async(_,id)=>{recordReads++;return records[id]??null;}},
  authorize:async p=>p===principal&&allowed});
 return {inspector,reads:()=>({indexReads,recordReads})};
}
test('off by default',async()=>{await assert.rejects(createContactIndexIntegrityInspector().inspect(principal,{digest}),/désactivé/);});
test('requires private index and repository',()=>{assert.throws(()=>createContactIndexIntegrityInspector({enabled:true}),/incomplètes/);});
test('present record does not prove contact ownership',async()=>{
 const x=fixture();const r=await x.inspector.inspect(principal,{digest});
 assert.equal(r.details[0].status,'record_exists_contact_unverified');
 assert.equal(r.contactOwnershipVerified,false);assert.equal(r.safeToDelete,false);
});
test('missing record is only a candidate for investigation',async()=>{
 const x=fixture({records:{}});const r=await x.inspector.inspect(principal,{digest});
 assert.equal(r.details[0].status,'missing_record_candidate');assert.equal(r.safeToDelete,false);
});
test('index with no entries returns empty diagnostic',async()=>{
 const r=await fixture({ids:[]}).inspector.inspect(principal,{digest});
 assert.equal(r.checkedCount,0);assert.equal(r.safeToDelete,false);
});
test('unauthorized caller is rejected before index lookup',async()=>{
 const x=fixture();await assert.rejects(x.inspector.inspect({}, {digest}),/non autorisé/);
 assert.equal(x.reads().indexReads,0);
});
test('invalid contact digest rejected before index lookup',async()=>{
 const x=fixture();await assert.rejects(x.inspector.inspect(principal,{digest:'real@email.invalid'}),/invalide/);
 assert.equal(x.reads().indexReads,0);
});
test('duplicate index entries cause failure',async()=>{
 const x=fixture({ids:['entry_123','entry_123']});
 await assert.rejects(x.inspector.inspect(principal,{digest}),/Doublon/);
});
test('invalid identifier causes fail-closed error',async()=>{
 const x=fixture({ids:['../escape']});
 await assert.rejects(x.inspector.inspect(principal,{digest}),/incohérent/);
});
test('invalid record reported without destructive repair',async()=>{
 const x=fixture({records:{entry_123:{id:'wrong',reference:'DIP-2026-ABCDEF123456',versions:[]}}});
 const r=await x.inspector.inspect(principal,{digest});
 assert.equal(r.details[0].status,'invalid_record');assert.equal(r.safeToDelete,false);
});
