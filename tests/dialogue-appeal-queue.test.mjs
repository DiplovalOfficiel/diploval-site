import test from 'node:test';
import assert from 'node:assert/strict';
import {createAppealQueue} from '../netlify/lib/dialogue-appeal-queue.mjs';
const A='dossier-appqueue-001',B='dossier-appqueue-002',C='dossier-appqueue-003';
function setup({allow=true,candidates=null}={}){
 let access=allow,reads=0,indexReads=0;
 const proposals=new Map([
  [A,{entryId:A,reference:'CE-2026-001122334455',
   consultationId:'consultation-a',version:1,status:'pending',
   submittedAt:'2026-11-18T10:00:00Z',reason:'Je demande un réexamen motivé de cette décision.'}],
  [B,{entryId:B,reference:'CE-2026-001122334466',
   consultationId:'consultation-b',version:1,status:'pending',
   submittedAt:'2026-11-18T11:00:00Z',reason:'Une objection située hors du périmètre.'}],
  [C,{entryId:C,reference:'CE-2026-001122334477',
   consultationId:'consultation-a',version:2,status:'escalated',
   submittedAt:'2026-11-18T12:00:00Z',reason:'J’aimerais une médiation supplémentaire.'}]
 ]);
 const queue=createAppealQueue({
  listCandidateAppeals:async()=>{
   indexReads++;return candidates??[...proposals.values()].map(x=>({entryId:x.entryId,version:x.version}));
  },
  authorize:async()=>access,
  appeals:{forModerator:async(principal,{entryId,version})=>{
   reads++;
   if(entryId===B)throw Error('Accès non autorisé.');
   const e=proposals.get(entryId);
   return e&&e.version===version?structuredClone(e):null;
  }}
 });
 return {queue,proposals,setAccess:x=>{access=x},
  getReads:()=>reads,getIndex:()=>indexReads};
}
test('aucune file de recours sans index privé ni contrôles',()=>{
 assert.throws(()=>createAppealQueue(),/Index privé/);
});
test('une identité non autorisée est refusée avant l’index',async()=>{
 const e=setup({allow:false});
 await assert.rejects(()=>e.queue.list({role:'reviewer'}),/non autorisé/);
 assert.equal(e.getIndex(),0);assert.equal(e.getReads(),0);
});
test('recours du hors-périmètre jamais visibles',async()=>{
 const e=setup();
 const all=await e.queue.list({});
 assert.equal(all.appeals.length,1);
 assert.equal(all.appeals[0].entryId,A);
 assert(!JSON.stringify(all).includes(B));
});
test('file d’escalades : la bonne demande et aucune coordonnée',async()=>{
 const e=setup();
 const escalated=await e.queue.list({},{status:'escalated'});
 assert.deepEqual(escalated.appeals.map(x=>x.entryId),[C]);
 assert(!JSON.stringify(escalated).includes('privateContact'));
});
test('index périmé sans recours : ligne ignorée',async()=>{
 const e=setup({candidates:[{entryId:'dossier-missing-001',version:1},{entryId:A,version:1}]});
 assert.equal((await e.queue.list({})).appeals.length,1);
});
test('pagination des recours validée',async()=>{
 const e=setup();const first=await e.queue.list({},{status:'all',limit:1});
 assert.equal(first.appeals.length,1);
 assert.equal(first.nextCursor,1);
 const next=await e.queue.list({},{status:'all',limit:1,cursor:1});
 assert.deepEqual(next.appeals.map(x=>x.entryId),[C]);
 assert.equal(next.nextCursor,null);
});
test('filtres, pagination et index invalides refusés',async()=>{
 const e=setup();
 await assert.rejects(()=>e.queue.list({},{status:'published'}),/Statut/);
 await assert.rejects(()=>e.queue.list({},{limit:30}),/Pagination/);
 const invalid=setup({candidates:[{entryId:'../secret',version:1}]});
 await assert.rejects(()=>invalid.queue.list({}),/Index/);
});
test('une erreur du stockage autre qu’une interdiction ferme toute la file',async()=>{
 const queue=createAppealQueue({
  listCandidateAppeals:async()=>[{entryId:A,version:1}],
  authorize:async()=>true,
  appeals:{forModerator:async()=>{throw Error('Storage unavailable')}}
 });
 await assert.rejects(()=>queue.list({}),/Storage unavailable/);
});
