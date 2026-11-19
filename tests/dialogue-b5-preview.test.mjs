import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base=new URL('../Diploval_Site_Complet_v20_2_Inscription_Zoom/admin/consultations-v03-b5/',import.meta.url);
const html=fs.readFileSync(new URL('index.html',base),'utf8');
const app=fs.readFileSync(new URL('app.js',base),'utf8');
const css=fs.readFileSync(new URL('style.css',base),'utf8');

test('maquette B5 : signale explicitement son caractère fictif et non actif',()=>{
 assert.match(html,/DÉMONSTRATION B5 — DONNÉES FICTIVES/);
 assert.match(html,/Aucune connexion réelle, aucune sauvegarde, aucun courriel ni publication/);
 assert.match(html,/ne sont simulées que dans cette page/);
});
test('maquette non reliée aux API ou au stockage du site',()=>{
 assert.doesNotMatch(app,/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b/);
 assert.doesNotMatch(app,/\blocalStorage\b|\bsessionStorage\b|\bdocument\.cookie\b/);
 assert.doesNotMatch(html,/<form[^>]*action=/i);
});
test('les champs contrôlables ne confèrent jamais un droit serveur',()=>{
 assert.match(html,/Rôle simulé/);
 assert.match(html,/value="observer"/);
 assert.match(html,/value="reviewer"/);
 assert.match(html,/value="supervisor"/);
 assert.match(app,/AUCUN appel réseau, stockage, cookie ou capacité réelle de publication/);
});
test('textes des dossiers insérés via textContent, pas via du HTML dynamique',()=>{
 assert.match(app,/e\.textContent=String\(text\)/);
 assert.doesNotMatch(app,/\.innerHTML\s*=/);
 assert.doesNotMatch(app,/\binsertAdjacentHTML\s*\(/);
});
test('présence du parcours file, recours, historique et des motifs',()=>{
 for(const text of ['data-view="pending"','data-view="appeals"','data-view="history"','id="case-list"','id="review-actions"']){
  assert(html.includes(text),text);
 }
 assert.match(app,/textarea\.minLength=10/);
 assert.match(app,/r\.appeal\.status=decision==='escalate'/);
 assert.match(app,/Aucun effet sur le site/);
});
test('responsive et présentation accessibles sur petit écran',()=>{
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(html,/aria-live="polite"/);
 assert.match(html,/id="main"/);
 assert.match(html,/rel="stylesheet" href="\.\/style\.css/);
 assert.match(html,/src="\.\/app\.js/);
});
test('syntaxe JS de la maquette valide',()=>{
 assert.doesNotThrow(()=>new Function(app));
});
