import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createEntry,reviewRevision,proposeRevision,withdrawPublication
} from '../netlify/lib/dialogue-model.mjs';
import {createDialogueRepository} from '../netlify/lib/dialogue-storage.mjs';

const at='2026-11-18T22:00:00.000Z';
const principal={kind:'verified-test',email:'participant@example.test'};
const moderator={kind:'moderator-test'};
const stranger={kind:'unauthorized-test'};
const id='dossier-storage-001';
const reference='CE-2026-ABCDEF112233';
const make=({entryId=id,ref=reference,...fields}={})=>createEntry({
 consultationId:'engagements-electoraux',kind:'contribution',
 text:'Un argument fictif suffisamment développé pour un test automatique.',
 email:principal.email,displayMode:'pseudonym',publicLabel:'Citoyen témoin',
 processingAgreement:true,publicationAgreement:true,...fields
},{id:entryId,reference:ref,at});
function fakeStore(){
 const data=new Map();
 let next=0;
 let rejectConfirm=false;
 const api={
  data,
  async getWithMetadata(key){
   if(rejectConfirm)return null;
   const value=data.get(key);
   return value?{data:JSON.parse(value.json),etag:value.etag}:null;
  },
  async set(key,json,{onlyIfNew=false,onlyIfMatch=null}={}){
   const current=data.get(key);
   if(onlyIfNew&&current)return {modified:false,etag:current.etag};
   if(onlyIfMatch!==null&&(!current||current.etag!==onlyIfMatch))
     return {modified:false,etag:current?.etag};
   const etag='etag-'+(++next);
   data.set(key,{json,etag});
   return {modified:true,etag};
  },
  setRejectConfirm(value){rejectConfirm=value;}
 };
 return api;
}
// Politique de test seulement. En production, les principaux doivent venir
// de sessions réellement authentifiées côté serveur.
const authorize=(who,action,entry)=>{
 if(who?.kind==='moderator-test')return true;
 if(who?.kind==='verified-test'){
  if(action==='create')return true;
  if(action==='read_private'||action==='revise')
    return entry?.author?.privateContact===who.email;
 }
 return false;
};
function setup(){
 const store=fakeStore();
 return {store,repo:createDialogueRepository({store,authorize})};
}
const approve=e=>reviewRevision(e,{
 decision:'approve',actor:'Moderation fictive',expectedMutation:e.mutation,at
});
const revise=(e,text)=>proposeRevision(e,{text,expectedMutation:e.mutation,at});
async function writeAndApprove(repo,entry=make()){
 await repo.createPrivate(principal,entry);
 await repo.mutatePrivate(moderator,entry.id,{expectedMutation:0,operation:'moderate',transform:approve});
 return repo.readPrivate(moderator,entry.id);
}

test('aucun stockage sans autorisation vérifiée injectée',()=>{
 assert.throws(()=>createDialogueRepository({store:fakeStore()}),/politique d’autorisation/);
 assert.throws(()=>createDialogueRepository({store:fakeStore(),authorize}),/aucune/);
});
test('le dépôt est privé et vérifié après réservation de référence',async()=>{
 const {repo,store}=setup();
 const saved=await repo.createPrivate(principal,make());
 assert.equal(saved.id,id);
 assert.equal(store.data.size,2);
 assert.equal(await repo.readPublicReference(reference),null);
 assert.equal((await repo.readPrivate(principal,id)).visibility,'private');
});
test('l’identifiant interne ne donne aucun droit d’accès aux données',async()=>{
 const {repo}=setup();
 await repo.createPrivate(principal,make());
 await assert.rejects(()=>repo.readPrivate(stranger,id),/non autorisé/);
 await assert.rejects(()=>repo.mutatePrivate(stranger,id,{
  expectedMutation:0,operation:'moderate',transform:approve
 }),/non autorisé/);
});
test('la projection publique ne contient ni email, ni audit, ni auteur interne',async()=>{
 const {repo}=setup();
 await writeAndApprove(repo);
 const published=await repo.readPublicReference(reference);
 assert.equal(published.version,1);
 assert.deepEqual(Object.keys(published).sort(),[
  'consultationId','kind','publicAuthor','publishedAt','reference','text','version'
 ]);
 assert(!JSON.stringify(published).includes(principal.email));
 assert(!JSON.stringify(published).includes('Moderation fictive'));
});
test('une référence déjà réservée ne peut pas pointer vers une autre contribution',async()=>{
 const {repo,store}=setup();
 await repo.createPrivate(principal,make());
 const duplicate=make({entryId:'dossier-storage-002'});
 await assert.rejects(()=>repo.createPrivate(principal,duplicate),/Conflit/);
 assert.equal(store.data.size,2);
 assert.equal((await repo.readPrivate(moderator,id)).reference,reference);
});
test('les changements concurrents et obsolètes sont refusés',async()=>{
 const {repo}=setup();
 await writeAndApprove(repo);
 await repo.mutatePrivate(principal,id,{
  operation:'revise',expectedMutation:1,
  transform:e=>revise(e,'Un argument enrichi par de nouvelles sources vérifiables.')
 });
 await assert.rejects(()=>repo.mutatePrivate(principal,id,{
  operation:'revise',expectedMutation:1,
  transform:e=>revise(e,'Une autre version concurrente non acceptée.')
 }),/Conflit/);
});
test('une révision en attente ne remplace pas le texte visible',async()=>{
 const {repo}=setup();
 await writeAndApprove(repo);
 await repo.mutatePrivate(principal,id,{
  operation:'revise',expectedMutation:1,
  transform:e=>revise(e,'J’ai évolué et propose une autre approche de ce débat.')
 });
 const displayed=await repo.readPublicReference(reference);
 assert.equal(displayed.version,1);
 assert(!displayed.text.includes('évolué'));
});
test('après nouvelle modération, seule la révision approuvée devient publique',async()=>{
 const {repo}=setup();
 await writeAndApprove(repo);
 await repo.mutatePrivate(principal,id,{
  operation:'revise',expectedMutation:1,
  transform:e=>revise(e,'Une version révisée du raisonnement, avec nuances supplémentaires.')
 });
 await repo.mutatePrivate(moderator,id,{operation:'moderate',expectedMutation:2,transform:approve});
 const displayed=await repo.readPublicReference(reference);
 assert.equal(displayed.version,2);
 assert.match(displayed.text,/nuances/);
 const archived=await repo.readPrivate(moderator,id);
 assert.equal(archived.versions.length,2);
});
test('une contribution retirée disparaît de la projection publique',async()=>{
 const {repo}=setup();
 await writeAndApprove(repo);
 await repo.mutatePrivate(moderator,id,{
  operation:'withdraw',expectedMutation:1,
  transform:e=>withdrawPublication(e,{
   actor:'Modérateur fictif',reason:'Retrait autorisé par l’auteur.',
   expectedMutation:e.mutation,at
  })
 });
 assert.equal(await repo.readPublicReference(reference),null);
});
test('l’autorisation de publication et le contact ne peuvent pas être réécrits silencieusement',async()=>{
 const {repo}=setup();
 await writeAndApprove(repo);
 await assert.rejects(()=>repo.mutatePrivate(moderator,id,{
  operation:'revise',expectedMutation:1,
  transform:e=>{
   const changed=revise(e,'Une nouvelle version avec consentement modifié à tort.');
   changed.permissions.publicationAt=null;
   return changed;
  }
 }),/Mutation interdite/);
});
test('aucun enregistrement n’est annoncé si la confirmation échoue',async()=>{
 const {repo,store}=setup();
 const rawSet=store.set.bind(store);
 let writes=0;
 store.set=async(...args)=>{
  const result=await rawSet(...args);
  if(++writes===1)store.setRejectConfirm(true);
  return result;
 };
 await assert.rejects(()=>repo.createPrivate(principal,make()),/non confirmé|incohérent/);
 assert.equal(store.data.size,1); // réservation sans fiche : bloquée et non publique
});
test('un journal incohérent ne permet pas de sauver une mutation',async()=>{
 const {repo}=setup();
 await writeAndApprove(repo);
 await assert.rejects(()=>repo.mutatePrivate(moderator,id,{
  operation:'moderate',expectedMutation:1,
  transform:e=>({...e,mutation:2,audit:[...e.audit]})
 }),/journal incohérents/);
});
test('les références publiques ne permettent pas une lecture privée par construction',async()=>{
 const {repo}=setup();
 await writeAndApprove(repo);
 assert.equal(await repo.readPublicReference('CE-2026-000000000001'),null);
 await assert.rejects(()=>repo.readPrivate(stranger,id),/non autorisé/);
});
