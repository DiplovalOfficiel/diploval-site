// Diploval V0.3 / B9.5. Synthetic fenced projection store ONLY.
// In-memory test double: NOT a Netlify adapter, NOT durable and NOT production-safe.
const REF=/^[A-Z]{2,5}-\d{4}-[A-F0-9]{12,}$/;
const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const copy=x=>structuredClone(x);
export function createFencedProjectionFixture(){
 const cases=new Map(), publicEntries=new Map();
 const valid=(caseId,reference,ownership)=>{
  if(!ID.test(caseId||'')||!REF.test(reference||'')||!ownership
    ||ownership.caseId!==caseId||!Number.isSafeInteger(ownership.revision)
    ||ownership.revision<1||typeof ownership.owner!=='string')throw Error('Données de clôture invalides.');
 };
 // A single synchronous operation in this fixture combines fence verification
 // and mutation. No awaits: no interleaving in this test double.
 function install({caseId,reference,revision,owner,text}){
  valid(caseId,reference,{caseId,revision,owner});
  if(typeof text!=='string')throw Error('Texte fictif invalide.');
  if(cases.has(caseId))throw Error('Dossier fictif déjà présent.');
  cases.set(caseId,{caseId,reference,revision,owner,blocked:false});
  publicEntries.set(reference,{caseId,text});
 }
 function advanceFence({caseId,revision,owner}){
  const c=cases.get(caseId);
  if(!c||!Number.isSafeInteger(revision)||revision<=c.revision
    ||typeof owner!=='string'||!owner)throw Error('Révision de verrou invalide.');
  cases.set(caseId,{...c,revision,owner});
 }
 function blockPublication({caseId,reference,ownership}){
  valid(caseId,reference,ownership);
  const c=cases.get(caseId);
  if(!c||c.reference!==reference||c.revision!==ownership.revision||c.owner!==ownership.owner)
    throw Error('Opérateur périmé refusé.');
  cases.set(caseId,{...c,blocked:true});
  return {confirmed:true};
 }
 function removePublicReference({caseId,reference,ownership}){
  valid(caseId,reference,ownership);
  const c=cases.get(caseId);
  if(!c||c.reference!==reference||c.revision!==ownership.revision||c.owner!==ownership.owner)
    throw Error('Opérateur périmé refusé.');
  if(!c.blocked)throw Error('Dépublication préalable requise.');
  publicEntries.delete(reference);
  return {confirmed:true};
 }
 function readPublic(reference){
  const data=publicEntries.get(reference);
  if(!data)return null;
  const c=cases.get(data.caseId);
  return c&&!c.blocked?copy({reference,text:data.text}):null;
 }
 return Object.freeze({install,advanceFence,blockPublication,removePublicReference,readPublic});
}
