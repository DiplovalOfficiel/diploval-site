// Diploval V0.3 — file privée des demandes de réexamen.
// listCandidateAppeals : index serveur de paires (entryId,version).
// L'index ne confère AUCUN droit. Chaque recours est relu et filtré par le
// service de recours, qui revalide les droits sur la consultation associée.
const ID=/^[a-z0-9][a-z0-9_-]{2,79}$/i;
const STATUS=new Set(['pending','escalated','resolved','all']);
const MAX_CANDIDATES=1000;
export function createAppealQueue({listCandidateAppeals,appeals,authorize}={}){
 if(typeof listCandidateAppeals!=='function'||typeof appeals?.forModerator!=='function'
   ||typeof authorize!=='function')throw Error('Index privé, recours et autorisation nécessaires.');

 async function list(principal,{status='pending',limit=20,cursor=0}={}){
  if(await authorize(principal,'read_queue')!==true)throw Error('Accès non autorisé.');
  if(!STATUS.has(status))throw Error('Statut de recours invalide.');
  if(!Number.isSafeInteger(limit)||limit<1||limit>25
    ||!Number.isSafeInteger(cursor)||cursor<0)throw Error('Pagination invalide.');
  const candidates=await listCandidateAppeals();
  if(!Array.isArray(candidates)||candidates.length>MAX_CANDIDATES)
    throw Error('Index des recours indisponible ou incomplet.');
  const seen=new Set(),rows=[];
  for(const candidate of candidates){
   const id=candidate?.entryId,version=candidate?.version;
   if(!ID.test(id||'')||!Number.isSafeInteger(version)||version<1)
    throw Error('Index des recours invalide.');
   const key=id+':'+version;
   if(seen.has(key))continue;seen.add(key);
   if(await authorize(principal,'read_queue')!==true)throw Error('Accès révoqué.');
   let appeal;
   try{appeal=await appeals.forModerator(principal,{entryId:id,version});}
   catch(error){
    if(error?.message==='Accès non autorisé.')continue;
    throw error;
   }
   if(!appeal)continue;
   if(appeal.entryId!==id||appeal.version!==version)
    throw Error('Index des recours incohérent.');
   if(status!=='all'&&appeal.status!==status)continue;
   // Projection sans journal interne, coordonnées ni identité professionnelle.
   rows.push({
    entryId:id,reference:appeal.reference,consultationId:appeal.consultationId,
    version,status:appeal.status,submittedAt:appeal.submittedAt,
    reason:appeal.reason
   });
  }
  rows.sort((a,b)=>String(a.submittedAt).localeCompare(String(b.submittedAt))
    ||a.reference.localeCompare(b.reference));
  return {appeals:rows.slice(cursor,cursor+limit),
    nextCursor:cursor+limit<rows.length?cursor+limit:null};
 }
 return Object.freeze({list});
}
