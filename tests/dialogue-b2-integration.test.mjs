import test from 'node:test';
import assert from 'node:assert/strict';
import {createEntry,reviewRevision} from '../netlify/lib/dialogue-model.mjs';
import {createDialogueRepository} from '../netlify/lib/dialogue-storage.mjs';
import {createAuthorAccess} from '../netlify/lib/dialogue-author-access.mjs';
import {createEncryptedStore} from '../netlify/lib/dialogue-encrypted-store.mjs';

const at='2026-11-19T10:00:00.000Z',entryId='dossier-b2-integration-001';
const reference='CE-2026-AABBCCDDEEFF',email='participant-integration@example.test';
const secret=Buffer.alloc(32,0x51),key=Buffer.alloc(32,0x52);
const initial=()=>createEntry({
 consultationId:'engagements-electoraux',kind:'contribution',
 text:'La contribution de démonstration doit demeurer privée avant validation.',
 email,displayMode:'pseudonym',publicLabel:'Participant fictif',
 processingAgreement:true,publicationAgreement:true
},{at,id:entryId,reference});
function setup(){
 const map=new Map();let n=0,now=Date.parse(at);
 const raw={
  map,
  async getWithMetadata(path){
   const x=map.get(path);
   return x?{etag:x.etag,data:JSON.parse(x.value)}:null;
  },
  async set(path,value,{onlyIfNew=false,onlyIfMatch=null}={}){
   const x=map.get(path);
   if(onlyIfNew&&x)return {modified:false,etag:x.etag};
   if(onlyIfMatch!==null&&(!x||x.etag!==onlyIfMatch))
    return {modified:false,etag:x?.etag};
   const etag='etag-'+(++n);map.set(path,{etag,value});return {modified:true,etag};
  }
 };
 const store=createEncryptedStore({store:raw,key});
 // Administrateur fictif sans session : UNIQUEMENT pour préparer les essais.
 const seed=createDialogueRepository({store,authorize:async()=>true});
 const messages=[];
 const access=createAuthorAccess({
  store,secret,loadEntry:async id=>seed.readPrivate({testOnly:true},id),
  sendLink:async msg=>{messages.push(msg)},clock:()=>now
 });
 const authorRepo=createDialogueRepository({store,authorize:access.authorize});
 return {raw,seed,authorRepo,access,messages,advance:ms=>{now+=ms}};
}
test('parcours B1+B2 : données chiffrées, courrier fictif, auteur seul admis',async()=>{
 const s=setup();
 await s.seed.createPrivate({testOnly:true},initial());
 assert.equal(await s.seed.readPublicReference(reference),null);
 const storedText=[...s.raw.map.values()].map(x=>x.value).join('\n');
 assert(!storedText.includes(email));
 assert(!storedText.includes('La contribution de démonstration'));
 assert.deepEqual(await s.access.requestLink({entryId,email}),{accepted:true});
 assert.equal(s.messages.length,1);
 const {token}=s.messages[0];
 assert.equal(token.length,43);
 const before=[...s.raw.map.values()].map(x=>x.value).join('\n');
 assert(!before.includes(token));
 const session=await s.access.redeemLink(token);
 const principal=await s.access.authenticate(session.sessionToken);
 assert(principal);
 const personal=await s.authorRepo.readPrivate(principal,entryId);
 assert.equal(personal.author.privateContact,email);
 assert.equal(personal.visibility,'private');
 await assert.rejects(()=>s.authorRepo.readPrivate({type:'author'},entryId),/non autorisé/);
 await assert.rejects(()=>s.authorRepo.mutatePrivate(principal,entryId,{
  expectedMutation:0,operation:'moderate',
  transform:r=>reviewRevision(r,{
   decision:'approve',actor:'inconnu',expectedMutation:r.mutation,at
  })
 }),/non autorisé/);
});
test('seule la modération habilitée fictive rend l’argument public',async()=>{
 const s=setup();
 await s.seed.createPrivate({testOnly:true},initial());
 await s.access.requestLink({entryId,email});
 const {sessionToken}=await s.access.redeemLink(s.messages[0].token);
 const principal=await s.access.authenticate(sessionToken);
 assert.equal(await s.seed.readPublicReference(reference),null);
 await s.seed.mutatePrivate({testOnly:true},entryId,{
  operation:'moderate',expectedMutation:0,
  transform:r=>reviewRevision(r,{
   decision:'approve',actor:'Modérateur fictif',expectedMutation:r.mutation,at
  })
 });
 const pub=await s.seed.readPublicReference(reference);
 assert.equal(pub.version,1);
 assert(!JSON.stringify(pub).includes(email));
 assert(!JSON.stringify(pub).includes('Modérateur fictif'));
 assert.equal((await s.authorRepo.readPrivate(principal,entryId)).publishedVersion,1);
});
test('expirer la session empêche l’accès chiffré même après un dépôt valide',async()=>{
 const s=setup();
 await s.seed.createPrivate({testOnly:true},initial());
 await s.access.requestLink({entryId,email});
 const {sessionToken}=await s.access.redeemLink(s.messages[0].token);
 const principal=await s.access.authenticate(sessionToken);
 s.advance(2*60*60*1000);
 assert.equal(await s.access.authorize(principal,'lookup_private'),false);
 await assert.rejects(()=>s.authorRepo.readPrivate(principal,entryId),/non autorisé/);
});
test('altération du stockage chiffré : refuser la lecture plutôt que publier',async()=>{
 const s=setup();
 await s.seed.createPrivate({testOnly:true},initial());
 const path='dialogue-v03/records/'+entryId,row=s.raw.map.get(path);
 const data=JSON.parse(row.value);
 data.payload=(data.payload.startsWith('A')?'B':'A')+data.payload.slice(1);
 s.raw.map.set(path,{etag:row.etag,value:JSON.stringify(data)});
 await assert.rejects(()=>s.seed.readPrivate({testOnly:true},entryId),/intégrité non vérifiée/);
 await assert.rejects(()=>s.seed.readPublicReference(reference),/intégrité non vérifiée/);
});
