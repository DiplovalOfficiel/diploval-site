// Diploval V0.3 — B9.4: isolated integration of the B9.2 coordinator and B9.3 journal.
// NO PUBLIC ROUTE. Disabled by default. Storage adapters need their own fencing.
import {randomBytes} from 'node:crypto';
import {createErasureCoordinator,ERASURE_STEPS} from './dialogue-erasure-coordinator.mjs';

const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
export function createLockedErasureRunner({
 enabled=false,caseJournal,authorize,loadCase,adapters,
 clock=()=>new Date().toISOString(),
 ownerFactory=()=>randomBytes(24).toString('hex')
}={}){
 if(enabled!==true)return Object.freeze({run:async()=>{throw Error('B9.4 non activé.');}});
 if(!caseJournal||!['acquire','scoped','release'].every(k=>typeof caseJournal[k]==='function')
   ||typeof authorize!=='function'||typeof loadCase!=='function'||typeof clock!=='function'
   ||typeof ownerFactory!=='function'||!adapters
   ||ERASURE_STEPS.some(k=>typeof adapters[k]!=='function'))
   throw Error('Dépendances B9.4 incomplètes.');
 async function run(principal,caseId){
  if(!principal||typeof principal!=='object'||!ID.test(caseId||''))
   throw Error('Demande invalide.');
  if(await authorize(principal,caseId,'erase')!==true)throw Error('Non autorisé.');
  const item=await loadCase(caseId);
  if(!item||item.id!==caseId||item.kind!=='erasure'||item.decision!=='approved'
    ||item.legalReview!==true||item.subjectVerified!==true||item.holdCleared!==true)
   throw Error('Décision non approuvée.');
  const token=await caseJournal.acquire(caseId,ownerFactory());
  const scoped=caseJournal.scoped(token);
  // Revalidate journal ownership at each step. A source adapter must additionally
  // enforce fencing atomically with its own mutations: check-then-act is insufficient.
  const guarded=Object.fromEntries(ERASURE_STEPS.map(name=>[name,async args=>{
   await scoped.read(caseId);
   return adapters[name]({...args,ownership:{caseId:token.caseId,
    revision:token.revision,owner:token.owner}});
  }]));
  const coordinator=createErasureCoordinator({
   enabled:true,authorize,loadCase,journal:scoped,adapters:guarded,clock
  });
  // Never release when a step or checkpoint fails. Incident recovery requires
  // an independent supervised reconciliation, not an automatic unlock.
  const result=await coordinator.run(principal,caseId);
  if(result.state!=='completed')throw Error('Clôture non confirmée.');
  await caseJournal.release(token);
  return result;
 }
 return Object.freeze({run});
}
