import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const folder=new URL('../Diploval_Site_Complet_v20_2_Inscription_Zoom/admin/consultations-v03-b6/',import.meta.url);
const html=fs.readFileSync(new URL('index.html',folder),'utf8');
const css=fs.readFileSync(new URL('style.css',folder),'utf8');
const js=fs.readFileSync(new URL('app.js',folder),'utf8');

test('aucune ambiguïté sur les données fictives, délais non adoptés et e-mails non envoyés',()=>{
 assert.match(html,/DÉMONSTRATION B6 · DONNÉES FICTIVES/);
 assert.match(html,/Aucun compte connecté, aucun courrier envoyé/);
 assert.match(html,/exemples non validés/);
 assert.match(html,/sans valeur réglementaire/);
});
test('la maquette ne possède aucun branchement aux données ou aux comptes réels',()=>{
 assert.doesNotMatch(js,/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b/);
 assert.doesNotMatch(js,/\blocalStorage\b|\bsessionStorage\b|\bdocument\.cookie\b/);
 assert.doesNotMatch(html,/<form[^>]*action=/i);
});
test('les exemples de délais sont clairement simulés',()=>{
 assert.match(js,/Objectif indicatif fictif/);
 assert.match(js,/Objectif interne dépassé|Objectif indicatif dépassé|Objectif indicatif fictif/);
 assert.match(html,/7 jours/);
 assert.match(html,/14 jours pour un recours/);
});
test('toute insertion de texte sensible passe par textContent',()=>{
 assert.match(js,/node\.textContent=String\(value\)/);
 assert.doesNotMatch(js,/\.innerHTML\s*=/);
 assert.doesNotMatch(js,/insertAdjacentHTML/);
});
test('la double validation ne donne aucun accès direct aux messages réels',()=>{
 assert.match(html,/Examinateur/);
 assert.match(html,/Superviseur/);
 assert.match(js,/r\.response\.status='approved'/);
 assert.match(js,/Aucun courrier réel envoyé/);
});
test('l’interface a une base mobile et des aides d’accessibilité',()=>{
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(html,/aria-live="polite"/);
 assert.match(html,/id="main"/);
 assert.match(html,/id="cases"/);
 assert.match(html,/id="detail"/);
});
test('le JavaScript de la maquette est valide',()=>{
 assert.doesNotThrow(()=>new Function(js));
});
