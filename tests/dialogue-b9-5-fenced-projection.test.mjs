import test from 'node:test';
import assert from 'node:assert/strict';
import {createFencedProjectionFixture} from '../netlify/lib/dialogue-fenced-projection-fixture.mjs';
const caseId='case_123',reference='DIP-2026-123456789ABC';
const old={caseId,revision:1,owner:'aaaaaaaaaaaaaaaa'};
const next={caseId,revision:2,owner:'bbbbbbbbbbbbbbbb'};
function setup(){
 const f=createFencedProjectionFixture();
 f.install({caseId,reference,revision:1,owner:old.owner,text:'Une opinion fictive'});
 return f;
}
test('B9.5 publication initiale fictive visible',()=>{
 assert.equal(setup().readPublic(reference).text,'Une opinion fictive');
});
test('B9.5 blocage retire immédiatement la visibilité',()=>{
 const f=setup();assert.equal(f.blockPublication({caseId,reference,ownership:old}).confirmed,true);
 assert.equal(f.readPublic(reference),null);
});
test('B9.5 référence ne peut être supprimée avant blocage',()=>{
 const f=setup();assert.throws(()=>f.removePublicReference({caseId,reference,ownership:old}),/Dépublication/);
});
test('B9.5 suppression après blocage : accès public absent',()=>{
 const f=setup();f.blockPublication({caseId,reference,ownership:old});
 assert.equal(f.removePublicReference({caseId,reference,ownership:old}).confirmed,true);
 assert.equal(f.readPublic(reference),null);
});
test('B9.5 ancien opérateur rejeté après avance du fence',()=>{
 const f=setup();f.advanceFence(next);
 assert.throws(()=>f.blockPublication({caseId,reference,ownership:old}),/périmé/);
 assert.throws(()=>f.removePublicReference({caseId,reference,ownership:old}),/périmé/);
});
test('B9.5 nouveau détenteur peut bloquer et supprimer',()=>{
 const f=setup();f.advanceFence(next);
 f.blockPublication({caseId,reference,ownership:next});
 f.removePublicReference({caseId,reference,ownership:next});
 assert.equal(f.readPublic(reference),null);
});
test('B9.5 répétition idempotente de la dépublication',()=>{
 const f=setup();f.blockPublication({caseId,reference,ownership:old});
 f.blockPublication({caseId,reference,ownership:old});
 assert.equal(f.readPublic(reference),null);
});
test('B9.5 répétition idempotente du retrait de référence',()=>{
 const f=setup();f.blockPublication({caseId,reference,ownership:old});
 f.removePublicReference({caseId,reference,ownership:old});
 assert.equal(f.removePublicReference({caseId,reference,ownership:old}).confirmed,true);
});
test('B9.5 référence erronée et révision inventée rejetées',()=>{
 const f=setup();
 assert.throws(()=>f.blockPublication({caseId,reference:'DIP-2026-AAAAAAAAAAAA',ownership:old}),/périmé/);
 assert.throws(()=>f.blockPublication({caseId,reference,ownership:{...old,revision:99}}),/périmé/);
});
test('B9.5 lecture ne peut muter la projection interne',()=>{
 const f=setup();const p=f.readPublic(reference);p.text='corrompu';
 assert.equal(f.readPublic(reference).text,'Une opinion fictive');
});
