import test from 'node:test';
import assert from 'node:assert/strict';
import {createB97Scenario} from '../netlify/lib/dialogue-b9-7-incident-fixture.mjs';
import {ERASURE_STEPS} from '../netlify/lib/dialogue-erasure-coordinator.mjs';

test('B9.7: chemin fictif complet bloque puis supprime la projection',async()=>{
 const x=createB97Scenario();
 assert.equal(x.projection.readPublic(x.reference)?.text,'Contribution intégralement fictive');
 const response=await x.runner.run(x.principal,x.caseId);
 assert.equal(response.state,'completed');
 assert.deepEqual(x.calls,ERASURE_STEPS);
 assert.equal(x.projection.readPublic(x.reference),null);
 assert.equal((await x.inspect()).lockStatus,'released');
});
test('B9.7: panne après blocage mais avant checkpoint conserve le verrou',async()=>{
 const x=createB97Scenario({failure:'post-mutation-checkpoint'});
 await assert.rejects(x.runner.run(x.principal,x.caseId),/Injected journal write failure/);
 assert.equal(x.projection.readPublic(x.reference),null);
 assert.equal((await x.inspect()).lockStatus,'locked');
 assert.deepEqual((await x.inspect()).checkpoint.completed,[]);
 assert.deepEqual(x.calls,['blockPublication']);
});
test('B9.7: redémarrage non supervisé après panne refusé',async()=>{
 const x=createB97Scenario({failure:'post-mutation-checkpoint'});
 await assert.rejects(x.runner.run(x.principal,x.caseId));
 await assert.rejects(x.runner.run(x.principal,x.caseId),/verrouillé/);
 assert.deepEqual(x.calls,['blockPublication']);
});
test('B9.7: échec d’un second adaptateur bloque toutes étapes ultérieures',async()=>{
 const x=createB97Scenario({failure:'adapter-rejection'});
 await assert.rejects(x.runner.run(x.principal,x.caseId),/non confirmée/);
 assert.equal(x.projection.readPublic(x.reference),null);
 assert.deepEqual(x.calls,ERASURE_STEPS.slice(0,2));
 assert.deepEqual((await x.inspect()).checkpoint.completed,['blockPublication']);
 assert.equal((await x.inspect()).lockStatus,'locked');
});
test('B9.7: la simulation ne contient aucun stockage externe ni utilisateur réel',async()=>{
 const x=createB97Scenario();
 assert.equal(x.reference,'DIP-2026-ABCDEF123456');
 assert.equal((await x.inspect()),null);
});
