// Diploval V0.3 — B9.2. Internal only: no HTTP entry point, disabled by default.
// The application must supply trusted authorization, durable journal and idempotent adapters.
const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
export const ERASURE_STEPS=Object.freeze([
  'blockPublication','revokeAccess','removeContactIndex','erasePrivateRecords',
  'removePublicReference','reconcileBackups','verifyAbsence'
]);
const fail=message=>new Error(message);
const validStatus=x=>x&&typeof x==='object'&&typeof x.state==='string';
export function createErasureCoordinator({enabled=false,authorize,loadCase,journal,adapters,clock=()=>new Date().toISOString()}={}){
  if(enabled!==true)return Object.freeze({run:async()=>{throw fail('Effacement B9.2 non activé.');}});
  if(typeof authorize!=='function'||typeof loadCase!=='function'||typeof clock!=='function'
     ||!journal||typeof journal.read!=='function'||typeof journal.write!=='function'
     ||!adapters||ERASURE_STEPS.some(step=>typeof adapters[step]!=='function'))
    throw fail('Dépendances sécurisées B9.2 incomplètes.');
  async function run(principal,caseId){
    if(!principal||typeof principal!=='object'||!ID.test(caseId||''))throw fail('Dossier invalide.');
    if(await authorize(principal,caseId,'erase')!==true)throw fail('Autorisation absente.');
    const item=await loadCase(caseId);
    // Approval must come from trusted server-side case storage.
    if(!item||item.id!==caseId||item.kind!=='erasure'||item.decision!=='approved'
       ||item.legalReview!==true||item.subjectVerified!==true||item.holdCleared!==true)
      throw fail('Décision juridique et contrôle humain manquants.');
    let checkpoint=await journal.read(caseId);
    if(checkpoint!==null&&(!validStatus(checkpoint)||checkpoint.caseId!==caseId
       ||!Array.isArray(checkpoint.completed)||checkpoint.completed.some(s=>!ERASURE_STEPS.includes(s))
       ||new Set(checkpoint.completed).size!==checkpoint.completed.length))
      throw fail('Journal de reprise incohérent.');
    if(checkpoint===null){
      checkpoint={caseId,state:'running',completed:[],createdAt:clock()};
      if(await journal.write(caseId,structuredClone(checkpoint))!==true)throw fail('Journal indisponible.');
    }
    if(checkpoint.state==='completed'){
      if(checkpoint.completed.length!==ERASURE_STEPS.length)throw fail('Journal de clôture incomplet.');
      return Object.freeze({state:'completed',caseId,steps:checkpoint.completed.slice()});
    }
    if(checkpoint.state!=='running'&&checkpoint.state!=='blocked')throw fail('État non autorisé.');
    for(let index=0;index<ERASURE_STEPS.length;index++){
      const name=ERASURE_STEPS[index];
      if(checkpoint.completed.includes(name))continue;
      if(checkpoint.completed.length!==index)throw fail('Ordre des opérations non vérifiable.');
      let result;
      try{result=await adapters[name]({caseId,recordId:item.recordId,reference:item.reference});}
      catch(e){throw fail('Effacement interrompu à '+name+' ; reprise contrôlée nécessaire.');}
      if(!result||result.confirmed!==true)throw fail('Opération non confirmée : '+name);
      const next={...checkpoint,state:'running',completed:[...checkpoint.completed,name],updatedAt:clock()};
      if(await journal.write(caseId,structuredClone(next))!==true)
        throw fail('Journal non confirmé après '+name+' ; vérification manuelle avant reprise.');
      checkpoint=next;
    }
    const complete={...checkpoint,state:'completed',completedAt:clock()};
    if(await journal.write(caseId,structuredClone(complete))!==true)
      throw fail('Finalisation du journal non confirmée.');
    return Object.freeze({state:'completed',caseId,steps:complete.completed.slice()});
  }
  return Object.freeze({run});
}
