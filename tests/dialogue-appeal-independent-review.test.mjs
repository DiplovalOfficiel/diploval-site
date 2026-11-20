import test from 'node:test';
import assert from 'node:assert/strict';
import {createEntry,reviewRevision} from '../netlify/lib/dialogue-model.mjs';
import {createAppealService} from '../netlify/lib/dialogue-appeals.mjs';

const id='dossier_fonc01',reference='CE-2026-ABCDEF123456';
const author={user:'author'},initial={staffId:'staff_initial'},other={staffId:'staff_other'};
function fixture({initialIdentifiable=true,secondValid=true}={}){
 const mem=new Map();let n=0;
 const store={
  getWithMetadata:async k=>{const v=mem.get(k);return v?{data:structuredClone(v.data),etag:v.etag}:null},
  set:async(k,value,{onlyIfNew=false,onlyIfMatch}={})=>{
   const v=mem.get(k);
   if(onlyIfNew&&v)return {modified:false};
   if(onlyIfMatch&&(!v||v.etag!==onlyIfMatch))return {modified:false};
   const etag='etag-'+(++n);mem.set(k,{etag,data:JSON.parse(value)});return {modified:true,etag};
  }
 };
 let entry=createEntry({consultationId:'consultation_123',kind:'contribution',
  text:'Démonstration fictive de contrôle contradictoire de modération.',
  displayMode:'without_name',email:'fake@example.invalid',
  processingAgreement:true,publicationAgreement:true},
  {id,reference,at:'2026-11-20T07:00:00Z'});
 entry=reviewRevision(entry,{decision:'reject',actor:'Modérateur initial',
  reason:'Motif de refus fictif et documenté',expectedMutation:0,at:'2026-11-20T07:01:00Z'});
 const attestations=[];
 const service=createAppealService({
  store,
  readAuthorEntry:async p=>p===author?structuredClone(entry):null,
  readModeratorEntry:async p=>p===initial||p===other?structuredClone(entry):null,
  authorizeModerator:async()=>true,
  // In this synthetic test, a server-trusted identity index links the initial
  // decision to immutable staff id. The production equivalent remains missing.
  verifyIndependentReviewer:async({principal,entry:record,appeal})=>{
   attestations.push(principal.staffId);
   const original=record.audit.findLast(a=>a.action==='rejected'&&a.version===appeal.version);
   const originatingId=original&&initialIdentifiable?'staff_initial':null;
   return !!originatingId&&!!principal.staffId&&principal.staffId!==originatingId
    &&secondValid;
  },
  clock:()=> '2026-11-20T07:10:00Z'
 });
 const appeal=async()=>service.submit(author,{entryId:id,reason:'Je sollicite un réexamen motivé du refus fictif.'});
 const decide=p=>service.decide(p,{entryId:id,version:1,decision:'maintain',
  reason:'Décision de réexamen fictive, indépendante et argumentée.',
  actor:'Affichage non probant'});
 return {service,appeal,decide,attestations};
}
test('FONC-01: service fails closed without independent attestation adapter',()=>{
 assert.throws(()=>createAppealService({store:{getWithMetadata(){},set(){}},
  readAuthorEntry:async()=>{},readModeratorEntry:async()=>{},
  authorizeModerator:async()=>true}),/Stockage chiffré/);
});
test('FONC-01: original decision-maker cannot review own refusal',async()=>{
 const x=fixture();await x.appeal();
 await assert.rejects(x.decide(initial),/Indépendance du réexamen non vérifiée/);
 assert.equal((await x.service.own(author,{entryId:id,version:1})).status,'pending');
});
test('FONC-01: another verified reviewer can decide, without publication',async()=>{
 const x=fixture();await x.appeal();
 const result=await x.decide(other);
 assert.equal(result.status,'resolved');
 assert.equal(result.decision.outcome,'maintain');
});
test('FONC-01: unknown initial reviewer blocks decision',async()=>{
 const x=fixture({initialIdentifiable:false});await x.appeal();
 await assert.rejects(x.decide(other),/Indépendance du réexamen non vérifiée/);
});
test('FONC-01: failed trusted review check blocks decision',async()=>{
 const x=fixture({secondValid:false});await x.appeal();
 await assert.rejects(x.decide(other),/Indépendance du réexamen non vérifiée/);
});
