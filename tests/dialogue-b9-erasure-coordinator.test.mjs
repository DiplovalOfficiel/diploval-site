import test from 'node:test';
import assert from 'node:assert/strict';
import {createErasureCoordinator,ERASURE_STEPS} from '../netlify/lib/dialogue-erasure-coordinator.mjs';
const id='case_123';
function setup({approval=true,failStep=null,writeFails=false}={}){
 const data=new Map(),calls=[],principal={type:'trusted'},caseData={id,kind:'erasure',decision:approval?'approved':'pending',legalReview:true,subjectVerified:true,holdCleared:true,recordId:'entry_123',reference:'DIP-2026-123456789ABC'};
 const adapters=Object.fromEntries(ERASURE_STEPS.map(s=>[s,async()=>{calls.push(s);return {confirmed:s!==failStep}}]));
 const coordinator=createErasureCoordinator({enabled:true,authorize:async(p)=>p===principal,loadCase:async()=>caseData,
 journal:{read:async k=>data.get(k)??null,write:async(k,v)=>{if(writeFails)return false;data.set(k,v);return true;}},adapters,clock:()=> '2026-11-19T15:00:00Z'});
 return {coordinator,calls,data,principal,adapters,caseData};
}
test('désactivé par défaut',async()=>{await assert.rejects(createErasureCoordinator().run({},id),/non activé/);});
test('dépendances obligatoires',()=>{assert.throws(()=>createErasureCoordinator({enabled:true}),/incomplètes/);});
test('refus sans identité autorisée',async()=>{const x=setup();await assert.rejects(x.coordinator.run({},id),/Autorisation/);assert.equal(x.calls.length,0);});
test('refus sans décision humaine',async()=>{const x=setup({approval:false});await assert.rejects(x.coordinator.run(x.principal,id),/Décision/);assert.equal(x.calls.length,0);});
test('parcours fictif ordonné et journalisé',async()=>{const x=setup();const r=await x.coordinator.run(x.principal,id);assert.equal(r.state,'completed');assert.deepEqual(x.calls,ERASURE_STEPS);assert.deepEqual(x.data.get(id).completed,ERASURE_STEPS);});
test('interruption bloquante sans poursuivre les étapes',async()=>{const x=setup({failStep:'erasePrivateRecords'});await assert.rejects(x.coordinator.run(x.principal,id),/non confirmée/);assert.deepEqual(x.calls,ERASURE_STEPS.slice(0,4));assert.deepEqual(x.data.get(id).completed,ERASURE_STEPS.slice(0,3));});
test('reprise uniquement des étapes non journalisées',async()=>{const x=setup({failStep:'erasePrivateRecords'});await assert.rejects(x.coordinator.run(x.principal,id));x.adapters.erasePrivateRecords=async()=>{x.calls.push('erasePrivateRecords');return {confirmed:true};};const r=await x.coordinator.run(x.principal,id);assert.equal(r.state,'completed');assert.deepEqual(x.calls.slice(4),ERASURE_STEPS.slice(3));});
test('idempotence après clôture',async()=>{const x=setup();await x.coordinator.run(x.principal,id);const n=x.calls.length;await x.coordinator.run(x.principal,id);assert.equal(x.calls.length,n);});
test('journal absent interdit tout geste',async()=>{const x=setup({writeFails:true});await assert.rejects(x.coordinator.run(x.principal,id),/Journal indisponible/);assert.equal(x.calls.length,0);});
test('état incohérent empêche la reprise',async()=>{const x=setup();x.data.set(id,{state:'running',caseId:id,completed:['verifyAbsence']});await assert.rejects(x.coordinator.run(x.principal,id),/Ordre/);assert.equal(x.calls.length,0);});
