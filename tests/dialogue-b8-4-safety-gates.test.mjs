import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDialogueInternalHandler} from '../netlify/lib/dialogue-service-v03.mjs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const gate=JSON.parse(read('docs/consultations/DIPLOVAL_V03_B7_gate_NO_GO.json'));
const paths={
 storage:'netlify/lib/dialogue-storage.mjs',
 encrypted:'netlify/lib/dialogue-encrypted-store.mjs',
 access:'netlify/lib/dialogue-author-access.mjs',
 index:'netlify/lib/dialogue-contact-index.mjs',
 api:'netlify/lib/dialogue-service-v03.mjs',
 plan:'docs/consultations/DIPLOVAL_V03_B8_3_securite_conservation_droits_NO_GO.md'
};

test('B8.4: la porte juridique reste NO GO et 16 conditions ouvertes',()=>{
 assert.equal(gate.release,'NO_GO');
 assert.equal(gate.actual_processing_enabled,false);
 assert.equal(gate.legal_docs_published,false);
 assert.equal(gate.approval_date,null);
 assert.equal(gate.blocking.length,16);
 assert(gate.blocking.every(x=>x.state==='OPEN'));
});

test('B8.4: la route HTTP fictive est désactivée sans configuration',async()=>{
 const handler=createDialogueInternalHandler();
 const response=await handler(new Request('https://example.invalid/public/entry'));
 assert.equal(response.status,503);
 assert.match((await response.json()).error,/non activé/i);
});

test('B8.4: aucune Netlify Function ne référence le contrôleur V0.3',()=>{
 const dir=new URL('../netlify/functions/',import.meta.url);
 for(const name of fs.readdirSync(dir).filter(x=>/\.(js|mjs)$/.test(x))){
  assert.doesNotMatch(fs.readFileSync(new URL(name,dir),'utf8'),
   /dialogue-service-v03|createDialogueInternalHandler/);
 }
});

test('B8.4: un stockage sans politique d’autorisation est refusé',async()=>{
 const {createDialogueRepository}=await import('../netlify/lib/dialogue-storage.mjs');
 const store={getWithMetadata:async()=>null,set:async()=>({modified:true,etag:'t'})};
 assert.throws(()=>createDialogueRepository({store}),/autorisation|authoriz/i);
});

test('B8.4: une clé de chiffrement trop courte est rejetée',async()=>{
 const {createEncryptedStore}=await import('../netlify/lib/dialogue-encrypted-store.mjs');
 const store={getWithMetadata:async()=>null,set:async()=>({modified:true,etag:'t'})};
 assert.throws(()=>createEncryptedStore({store,key:Buffer.alloc(16)}),/256/);
});

test('B8.4: une clé HMAC de suivi insuffisante est rejetée',async()=>{
 const {createPrivateContactIndex}=await import('../netlify/lib/dialogue-contact-index.mjs');
 const store={getWithMetadata:async()=>null,set:async()=>({modified:true,etag:'t'})};
 assert.throws(()=>createPrivateContactIndex({store,secret:Buffer.alloc(8)}),/256/);
});

test('B8.4: accès auteur sans service d’envoi ne peut pas être initialisé',async()=>{
 const {createAuthorAccess}=await import('../netlify/lib/dialogue-author-access.mjs');
 const store={getWithMetadata:async()=>null,set:async()=>({modified:true,etag:'t'})};
 assert.throws(()=>createAuthorAccess({store,secret:Buffer.alloc(32),loadEntry:async()=>null}),/envoi/i);
});

test('B8.4: aucun opérateur d’effacement ou d’export dans le dépôt de base',async()=>{
 const {createDialogueRepository}=await import('../netlify/lib/dialogue-storage.mjs');
 const store={getWithMetadata:async()=>null,set:async()=>({modified:true,etag:'t'})};
 const repo=createDialogueRepository({store,authorize:async()=>false});
 assert.equal(typeof repo.deletePrivate,'undefined');
 assert.equal(typeof repo.exportPrivate,'undefined');
 assert.equal(typeof repo.purge,'undefined');
});

test('B8.4: le contrôleur est dépendant d’une limitation de débit externe',()=>{
 assert.match(read(paths.api),/typeof rateLimit!=='function'/);
 assert.match(read(paths.api),/await rateLimit/);
});

test('B8.4: le plan annonce honnêtement que les tests de restauration ne sont pas réalisés',()=>{
 const plan=read(paths.plan);
 assert.match(plan,/restauration/);
 assert.match(plan,/aucune implémentation de purge/i);
 assert.match(plan,/données fictives/i);
});
