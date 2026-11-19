import test from 'node:test';
import assert from 'node:assert/strict';
import {createModeratorAccess} from '../netlify/lib/dialogue-moderator-access.mjs';

const consultationA={id:'dossier-101',consultationId:'consultation-a'};
const consultationB={id:'dossier-102',consultationId:'consultation-b'};
function setup(role='observer'){
 let enabled=true;
 const accounts=new Map([['staff-001',{
  active:true,roles:[role],consultationIds:['consultation-a'],allConsultations:false
 }]]);
 const access=createModeratorAccess({
  verifySession:async request=>{
   if(!enabled||request?.sessionToken!=='verified')return null;
   return {staffId:'staff-001',label:'Modérateur de test'};
  },
  loadGrants:async staffId=>structuredClone(accounts.get(staffId))
 });
 return {access,accounts,setEnabled:v=>{enabled=v},request:{sessionToken:'verified'}};
}
test('aucun fournisseur réel de session et habilitations = accès impossible',()=>{
 assert.throws(()=>createModeratorAccess(),/Session professionnelle/);
 assert.throws(()=>createModeratorAccess({verifySession:async()=>true}),/registre privé/);
});
test('session non authentifiée : aucun principal',async()=>{
 const e=setup('supervisor');
 assert.equal(await e.access.authenticate({sessionToken:'fake'}),null);
});
test('lecture seule : observer ne peut pas approuver ni retirer',async()=>{
 const e=setup('observer'),identity=await e.access.authenticate(e.request);
 assert(identity.principal);
 assert.equal(identity.label,'Modérateur de test');
 assert.equal(await e.access.authorize(identity.principal,'lookup_private'),true);
 assert.equal(await e.access.authorize(identity.principal,'read_private',consultationA),true);
 assert.equal(await e.access.authorize(identity.principal,'moderate',consultationA),false);
 assert.equal(await e.access.authorize(identity.principal,'withdraw',consultationA),false);
});
test('reviewer : contrôle du texte et modération dans un périmètre attribué',async()=>{
 const e=setup('reviewer'),identity=await e.access.authenticate(e.request);
 assert.equal(await e.access.authorize(identity.principal,'read_private',consultationA),true);
 assert.equal(await e.access.authorize(identity.principal,'moderate',consultationA),true);
 assert.equal(await e.access.authorize(identity.principal,'withdraw',consultationA),false);
 assert.equal(await e.access.authorize(identity.principal,'moderate',consultationB),false);
});
test('supervisor : retrait permis seulement sur consultation attribuée',async()=>{
 const e=setup('supervisor'),identity=await e.access.authenticate(e.request);
 assert.equal(await e.access.authorize(identity.principal,'withdraw',consultationA),true);
 assert.equal(await e.access.authorize(identity.principal,'withdraw',consultationB),false);
});
test('accès global seulement si attribué expressément à un supervisor',async()=>{
 const e=setup('reviewer'),identity=await e.access.authenticate(e.request);
 e.accounts.get('staff-001').allConsultations=true;
 assert.equal(await e.access.authorize(identity.principal,'moderate',consultationB),false);
 e.accounts.get('staff-001').roles=['supervisor'];
 assert.equal(await e.access.authorize(identity.principal,'moderate',consultationB),true);
});
test('suspension de l’habilitation : refus immédiatement après',async()=>{
 const e=setup('supervisor'),identity=await e.access.authenticate(e.request);
 assert.equal(await e.access.authorize(identity.principal,'moderate',consultationA),true);
 e.accounts.get('staff-001').active=false;
 assert.equal(await e.access.authorize(identity.principal,'moderate',consultationA),false);
});
test('révocation de la session : même principal immédiatement inutilisable',async()=>{
 const e=setup('supervisor'),identity=await e.access.authenticate(e.request);
 e.setEnabled(false);
 assert.equal(await e.access.authorize(identity.principal,'lookup_private'),false);
 assert.equal(await e.access.authorize(identity.principal,'read_private',consultationA),false);
});
test('réduction du périmètre : le droit disparaît sans nouvelle connexion',async()=>{
 const e=setup('reviewer'),identity=await e.access.authenticate(e.request);
 assert.equal(await e.access.authorize(identity.principal,'moderate',consultationA),true);
 e.accounts.get('staff-001').consultationIds=['consultation-b'];
 assert.equal(await e.access.authorize(identity.principal,'moderate',consultationA),false);
 assert.equal(await e.access.authorize(identity.principal,'moderate',consultationB),true);
});
test('principal JSON forgé : aucun droit, même si rôle supervisor',async()=>{
 const e=setup('supervisor'),identity=await e.access.authenticate(e.request);
 assert.equal(await e.access.authorize({type:'verified-moderation'},'moderate',consultationA),false);
 assert.equal(await e.access.authorize(JSON.parse(JSON.stringify(identity.principal)),'moderate',consultationA),false);
 assert.equal(await e.access.authorize(null,'lookup_private'),false);
});
test('action create inconnue ou permissions inconnues : refus',async()=>{
 const e=setup('supervisor'),identity=await e.access.authenticate(e.request);
 assert.equal(await e.access.authorize(identity.principal,'create',consultationA),false);
 assert.equal(await e.access.authorize(identity.principal,'delete_all',consultationA),false);
});
test('rôle hors liste ou profil incohérent : aucun droit',async()=>{
 const e=setup('observer');
 e.accounts.get('staff-001').roles=['administrator'];
 assert.equal(await e.access.authenticate(e.request),null);
 e.accounts.get('staff-001').roles=['observer'];
 e.accounts.get('staff-001').consultationIds=['../../private'];
 assert.equal(await e.access.authenticate(e.request),null);
});
test('aucun périmètre : aucune lecture de dossier, même avec un rôle valide',async()=>{
 const e=setup('reviewer'),identity=await e.access.authenticate(e.request);
 e.accounts.get('staff-001').consultationIds=[];
 assert.equal(await e.access.authorize(identity.principal,'read_private',consultationA),false);
});
test('autorisation inexistante avant présentation d’un dossier : lecture seule',async()=>{
 const e=setup('supervisor'),identity=await e.access.authenticate(e.request);
 assert.equal(await e.access.authorize(identity.principal,'moderate'),false);
 assert.equal(await e.access.authorize(identity.principal,'withdraw',{consultationId:'autre'}),false);
});
