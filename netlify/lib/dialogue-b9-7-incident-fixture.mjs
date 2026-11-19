// Diploval V0.3 B9.7 — tests uniquement, stockage en mémoire et panne injectée.
// Ce fichier ne doit jamais être utilisé avec des données ni des secrets réels.
import {createErasureCaseJournal} from './dialogue-erasure-journal-b9.mjs';
import {createLockedErasureRunner} from './dialogue-erasure-locked-runner.mjs';
import {createFencedProjectionFixture} from './dialogue-fenced-projection-fixture.mjs';
import {ERASURE_STEPS} from './dialogue-erasure-coordinator.mjs';

export function createB97Scenario({failure='none'}={}){
 const caseId='case_987',recordId='entry_987',reference='DIP-2026-ABCDEF123456';
 const principal=Object.freeze({test:true}),records=new Map(),calls=[];
 let sequence=0, writeAttempt=0;
 const store={
  async getWithMetadata(key){
   const record=records.get(key);
   return record?{data:structuredClone(record.data),etag:record.etag}:null;
  },
  async set(key,json,opts={}){
   const existing=records.get(key);
   if(opts.onlyIfNew&&existing)return {modified:false};
   if(opts.onlyIfMatch&&(!existing||existing.etag!==opts.onlyIfMatch))
    return {modified:false};
   const value=JSON.parse(json);
   // Inject an interruption exactly after the publication-block adapter mutated
   // the fixture, but before the corresponding journal checkpoint is saved.
   if(failure==='post-mutation-checkpoint'&&value.checkpoint?.completed?.includes('blockPublication')
      &&!existing?.data?.checkpoint?.completed?.includes('blockPublication')){
    writeAttempt++;
    if(writeAttempt===1)throw Error('Injected journal write failure');
   }
   const etag='test-etag-'+(++sequence);
   records.set(key,{data:value,etag});
   return {modified:true,etag};
  }
 };
 const journal=createErasureCaseJournal({store,clock:()=> '2026-11-19T16:00:00Z'});
 const projection=createFencedProjectionFixture();
 const ownership={caseId,revision:1,owner:'0000000000000001'};
 projection.install({caseId,reference,revision:1,owner:ownership.owner,
   text:'Contribution intégralement fictive'});
 const adapters=Object.fromEntries(ERASURE_STEPS.map(step=>[step,async args=>{
   calls.push(step);
   if(step==='blockPublication')return projection.blockPublication(args);
   if(step==='removePublicReference')return projection.removePublicReference(args);
   if(failure==='adapter-rejection'&&step==='revokeAccess')return {confirmed:false};
   return {confirmed:true}; // All other adapters are explicit test doubles.
 }]));
 const loadCase=async()=>({id:caseId,recordId,reference,kind:'erasure',
   decision:'approved',legalReview:true,subjectVerified:true,holdCleared:true});
 const runner=createLockedErasureRunner({enabled:true,caseJournal:journal,adapters,
   authorize:async p=>p===principal,loadCase,
   ownerFactory:()=>ownership.owner,clock:()=> '2026-11-19T16:00:00Z'});
 return Object.freeze({caseId,principal,reference,journal,projection,runner,calls,
  inspect:async()=>journal.inspect(caseId)});
}
