import test from 'node:test';
import assert from 'node:assert/strict';
import {createEntry,reviewRevision,proposeRevision,withdrawPublication} from '../netlify/lib/dialogue-model.mjs';
import {createDialogueRepository} from '../netlify/lib/dialogue-storage.mjs';
import {createDialogueDataRights} from '../netlify/lib/dialogue-data-rights.mjs';

// True software composition (domain + repository + rights), but only test doubles
// for persistence/authentication and NO real citizen or institution accounts.
const contributor=Object.freeze({type:'fictional-contributor'});
const moderator=Object.freeze({type:'fictional-moderator'});
const stranger=Object.freeze({type:'fictional-stranger'});
const ID='entry_123',REF='CE-2026-ABCDEF123456',CONSULT='consultation_123';
const BASE={id:ID,reference:REF,consultationId:CONSULT,kind:'contribution',
 text:'Contribution fictive : protéger les rivières, les sols et la vie locale.',
 email:'fiction@example.invalid',displayMode:'without_name',
 processingAgreement:true,publicationAgreement:true};
function scenario({publicationAgreement=true}={}){
 const values=new Map();let number=0;
 const store={
  getWithMetadata:async path=>{
   const x=values.get(path);return x?{data:structuredClone(x.value),etag:x.etag}:null;
  },
  set:async(path,body,options={})=>{
   const previous=values.get(path);
   if(options.onlyIfNew&&previous)return {modified:false};
   if(options.onlyIfMatch&&(!previous||previous.etag!==options.onlyIfMatch))
    return {modified:false};
   const etag='etag_'+(++number);values.set(path,{value:JSON.parse(body),etag});
   return {modified:true,etag};
  }
 };
 const authorize=async(principal,action)=>{
  if(principal===moderator)return ['lookup_private','read_private','moderate','withdraw'].includes(action);
  if(principal===contributor)return ['create','lookup_private','read_private','revise'].includes(action);
  return false;
 };
 const repository=createDialogueRepository({store,authorize});
 const rightsRequests=[],audits=[];
 const rights=createDialogueDataRights({
  authorRepository:repository,
  authorize:async(p,id)=>p===contributor&&id===ID,
  recordRequest:async x=>{rightsRequests.push(structuredClone(x));return {reference:'RIGHTS-'+rightsRequests.length};},
  auditEvent:async x=>{audits.push(structuredClone(x));return true;},
  clock:()=> '2026-11-19T16:00:00Z'
 });
 const entry=createEntry({...BASE,publicationAgreement},
  {id:ID,reference:REF,at:'2026-11-19T16:00:00Z'});
 return {repository,rights,entry,rightsRequests,audits};
}
test('parcours: brouillon privé puis publication décidée humainement',async()=>{
 const x=scenario();
 await x.repository.createPrivate(contributor,x.entry);
 assert.equal(await x.repository.readPublicReference(REF),null);
 const outcome=await x.repository.mutatePrivate(moderator,ID,{
  expectedMutation:0,operation:'moderate',
  transform:record=>reviewRevision(record,{decision:'approve',
   actor:'moderator_fictif',expectedMutation:record.mutation})
 });
 assert.equal(outcome.mutation,1);
 const publicEntry=await x.repository.readPublicReference(REF);
 assert.equal(publicEntry.reference,REF);
 assert.equal(publicEntry.publicAuthor,'Participant sans nom affiché');
 assert.equal('author' in publicEntry,false);
 assert.equal('audit' in publicEntry,false);
 assert.equal('privateContact' in publicEntry,false);
});
test('parcours: choix de non-publication respecte le refus du contributeur',async()=>{
 const x=scenario({publicationAgreement:false});
 await x.repository.createPrivate(contributor,x.entry);
 await assert.rejects(x.repository.mutatePrivate(moderator,ID,{
  expectedMutation:0,operation:'moderate',
  transform:record=>reviewRevision(record,{decision:'approve',
   actor:'moderator_fictif',expectedMutation:record.mutation})
 }),/autorisation de publication/);
 assert.equal(await x.repository.readPublicReference(REF),null);
});
test('parcours: version déposée attend modération, ancienne version seule visible',async()=>{
 const x=scenario();await x.repository.createPrivate(contributor,x.entry);
 await x.repository.mutatePrivate(moderator,ID,{expectedMutation:0,operation:'moderate',
  transform:r=>reviewRevision(r,{decision:'approve',actor:'moderator_fictif',expectedMutation:r.mutation})});
 const initial=(await x.repository.readPublicReference(REF)).text;
 await x.repository.mutatePrivate(contributor,ID,{expectedMutation:1,operation:'revise',
  transform:r=>proposeRevision(r,{text:'Deuxième proposition fictive, sous contrôle de modération.',
   expectedMutation:r.mutation})});
 assert.equal((await x.repository.readPublicReference(REF)).text,initial);
 assert.equal((await x.repository.readPrivate(contributor,ID)).versions.length,2);
});
test('parcours: retrait de publication masque la contribution',async()=>{
 const x=scenario();await x.repository.createPrivate(contributor,x.entry);
 await x.repository.mutatePrivate(moderator,ID,{expectedMutation:0,operation:'moderate',
  transform:r=>reviewRevision(r,{decision:'approve',actor:'moderator_fictif',expectedMutation:r.mutation})});
 await x.repository.mutatePrivate(moderator,ID,{expectedMutation:1,operation:'withdraw',
  transform:r=>withdrawPublication(r,{actor:'moderator_fictif',
   reason:'Retrait après examen contradictoire fictif',expectedMutation:r.mutation})});
 assert.equal(await x.repository.readPublicReference(REF),null);
});
test('parcours: accès RGPD autorisé, demande d’effacement sans exécution automatique',async()=>{
 const x=scenario();await x.repository.createPrivate(contributor,x.entry);
 const exportResult=await x.rights.access(contributor,ID);
 assert.equal(exportResult.data.reference,REF);
 assert.equal(exportResult.data.privateContact,'fiction@example.invalid');
 const request=await x.rights.requestChange(contributor,ID,{
  kind:'erasure',details:'Je souhaite demander un effacement après revue humaine.'});
 assert.equal(request.status,'pending_review');
 assert.equal(request.executed,false);
 assert.equal(x.rightsRequests.length,2);
 assert.equal((await x.repository.readPrivate(contributor,ID)).id,ID);
});
test('parcours: un tiers ne peut consulter le dossier ni demander un export RGPD',async()=>{
 const x=scenario();await x.repository.createPrivate(contributor,x.entry);
 await assert.rejects(x.repository.readPrivate(stranger,ID),/non autorisé/);
 await assert.rejects(x.rights.access(stranger,ID),/non autorisé/);
});
test('parcours: refus de révision périmée sur une décision de modération',async()=>{
 const x=scenario();await x.repository.createPrivate(contributor,x.entry);
 await x.repository.mutatePrivate(moderator,ID,{expectedMutation:0,operation:'moderate',
  transform:r=>reviewRevision(r,{decision:'approve',actor:'moderator_fictif',expectedMutation:r.mutation})});
 await assert.rejects(x.repository.mutatePrivate(moderator,ID,{expectedMutation:0,
  operation:'withdraw',transform:r=>withdrawPublication(r,{actor:'moderator_fictif',
   reason:'Contrôle de retrait sur version périmée',expectedMutation:r.mutation})
 }),/Conflit/);
 assert.ok(await x.repository.readPublicReference(REF));
});
