import test from 'node:test';
import assert from 'node:assert/strict';
import {createDialogueDataRights} from '../netlify/lib/dialogue-data-rights.mjs';

const author={type:'server-authenticated-author'};
const entry={id:'dossier_123',reference:'DIP-2026-123456789ABC',
 consultationId:'consult_1',kind:'contribution',createdAt:'2026-11-19',
 visibility:'private',publishedVersion:null,
 versions:[{number:1,text:'Texte fictif de participation',status:'pending',
 submittedAt:'2026-11-19',secret:'never'}],
 author:{privateContact:'test@example.invalid',publicLabel:null,secret:'never'},
 audit:[{secret:'never'}]};
const mock=({allowed=true,recorded=true,audited=true}={})=>{
 const events=[];
 const service=createDialogueDataRights({
  authorRepository:{readPrivate:async(_,id)=>id===entry.id?structuredClone(entry):null},
  authorize:async(p,id)=>allowed&&p===author&&id===entry.id,
  recordRequest:async()=>recorded?{reference:'RIGHT-001'}:null,
  auditEvent:async e=>{events.push(e);if(!audited)throw Error('Audit impossible');},
  clock:()=> '2026-11-19T12:00:00Z'
 });
 return {service,events};
};
test('export limité sans secrets internes',async()=>{
 const {service,events}=mock();
 const result=await service.access(author,entry.id);
 assert.equal(result.data.reference,entry.reference);
 assert.equal(result.data.privateContact,'test@example.invalid');
 assert.equal(JSON.stringify(result).includes('never'),false);
 assert.equal(events.length,1);
});
test('accès interdit à un autre auteur et id invalide',async()=>{
 const {service}=mock();
 await assert.rejects(service.access({},entry.id),/non autorisé/);
 await assert.rejects(service.access(author,'../foo'),/invalide/);
});
test('absence de registre bloque la remise d’export',async()=>{
 await assert.rejects(mock({recorded:false}).service.access(author,entry.id),/non enregistrée/);
});
test('échec du journal d’audit bloque la remise d’export',async()=>{
 await assert.rejects(mock({audited:false}).service.access(author,entry.id),/Audit impossible/);
});
test('effacement demandé sans suppression prématurée',async()=>{
 const result=await mock().service.requestChange(author,entry.id,{
  kind:'erasure',details:'Effacer ce dossier de test fictif'});
 assert.equal(result.status,'pending_review');assert.equal(result.executed,false);
});
test('rectification demandée sans mutation non validée',async()=>{
 const result=await mock().service.requestChange(author,entry.id,{
  kind:'rectification',details:'Corriger mon adresse électronique'});
 assert.equal(result.executed,false);
 assert.equal(entry.author.privateContact,'test@example.invalid');
});
test('types inconnus et détails insuffisants rejetés',async()=>{
 const {service}=mock();
 await assert.rejects(service.requestChange(author,entry.id,{kind:'bogus',details:'un motif détaillé'}),/inconnu/);
 await assert.rejects(service.requestChange(author,entry.id,{kind:'erasure',details:'court'}),/insuffisantes/);
});
test('les adaptateurs obligatoires sont exigés',()=>{
 assert.throws(()=>createDialogueDataRights(),/Lecture privée/);
 assert.throws(()=>createDialogueDataRights({authorRepository:{readPrivate:()=>null}}),/Authentification/);
});
