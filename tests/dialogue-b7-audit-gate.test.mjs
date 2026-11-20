import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const lib=new URL('../netlify/lib/dialogue-service-v03.mjs',import.meta.url);
const gate=JSON.parse(fs.readFileSync(new URL('../docs/consultations/DIPLOVAL_V03_B7_gate_NO_GO.json',import.meta.url),'utf8'));
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const drafts={
 privacy:'docs/consultations/DIPLOVAL_V03_B7_PROJET_politique_confidentialite.md',
 terms:'docs/consultations/DIPLOVAL_V03_B7_PROJET_CGU_participation.md',
 charter:'docs/consultations/DIPLOVAL_V03_B7_PROJET_charte_moderation.md',
 audit:'docs/consultations/DIPLOVAL_V03_B7_audit_preparation_NO_GO.md',
 register:'docs/consultations/DIPLOVAL_V03_B7_preenregistrement_traitements_AIPD.md'
};

test('l’audit interdit explicitement toute mise en service de V0.3',()=>{
 assert.equal(gate.release,'NO_GO');
 assert.equal(gate.actual_processing_enabled,false);
 assert.equal(gate.legal_docs_published,false);
 assert.equal(gate.approval_date,null);
 assert.equal(gate.blocking.length,16);
 assert(gate.blocking.every(v=>v.state==='OPEN'));
});
test('aucune Netlify Function n’expose le contrôleur interne V0.3',()=>{
 const dir=new URL('../netlify/functions/',import.meta.url);
 const files=fs.readdirSync(dir).filter(f=>/\.(mjs|js)$/.test(f));
 assert(files.length>0);
 for(const name of files){
  const contents=fs.readFileSync(new URL(name,dir),'utf8');
  assert.doesNotMatch(contents,/dialogue-service-v03|dialogue-contributor-responses|dialogue-followup|createDialogueInternalHandler/);
 }
});
test('le contrôleur reste désactivé en l’absence d’activation explicite',()=>{
 const code=fs.readFileSync(lib,'utf8');
 assert.match(code,/enabled=false/);
 assert.match(code,/if\(enabled!==true\)/);
});
test('la politique et les CGU restent des brouillons non publiables',()=>{
 for(const path of [drafts.privacy,drafts.terms,drafts.charter]){
  const content=read(path);
  assert.match(content,/PROJET|DRAFT|DOCUMENT INTERNE/i);
  assert.match(content,/NON|NE PAS|PAS APPLICABLE|NON ADOPTÉ/i);
 }
});
test('les documents sont distincts et les CGU ne remplacent pas la notice RGPD',()=>{
 const privacy=read(drafts.privacy),terms=read(drafts.terms);
 assert.match(privacy,/article 9|art\. 9|art. 9/i);
 assert.match(terms,/politique de confidentialité distincte/i);
 assert.match(terms,/ne vaut ni consentement global|ne vaut ni consentement/i);
});
test('projets RGPD et CGU signalent les informations non encore déterminées',()=>{
 const policy=read(drafts.privacy),cgu=read(drafts.terms);
 assert.match(policy,/\[à établir\]|\[à déterminer\]|\[à confirmer\]/i);
 assert.match(cgu,/\[à formaliser\]|\[à adopter\]|\[à définir\]/i);
});
test('préregistre et audit couvrent AIPD, sous-traitants, effacement et données sensibles',()=>{
 for(const path of [drafts.audit,drafts.register]){
  const content=read(path);
  for(const needle of ['AIPD','sensibles','sous-traitants','effacement'])
   assert(content.toLowerCase().includes(needle.toLowerCase()),path+': '+needle);
 }
});
test('les textes juridiques B7 ne se trouvent pas dans le dossier public publié',()=>{
 const publish=read('netlify.toml');
 assert.match(publish,/publish = "Diploval_Site_Complet_v20_2_Inscription_Zoom"/);
 for(const path of Object.values(drafts))assert(path.startsWith('docs/consultations/'));
});
