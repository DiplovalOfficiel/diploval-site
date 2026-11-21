import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../Diploval_Site_Complet_v20_2_Inscription_Zoom');
const doc = JSON.parse(fs.readFileSync(path.join(root,'content/dictionnaire.json'),'utf8'));

test('Le Dico expose une liste de définitions structurées', () => {
  assert.ok(Array.isArray(doc.entries));
  assert.ok(doc.entries.length >= 120);
  const slugs = new Set();
  for (const item of doc.entries) {
    assert.match(item.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(!slugs.has(item.slug),'Identifiant en double : '+item.slug);
    slugs.add(item.slug);
    for (const field of ['term','category','definition']) assert.ok(String(item[field]||'').trim(),field+' manquant pour '+item.slug);
    assert.ok(['Brouillon','Publié'].includes(item.status));
    assert.ok(typeof item.visible === 'boolean');
    assert.ok(Array.isArray(item.aliases||[]));
    assert.ok(Array.isArray(item.related||[]));
    assert.ok(Array.isArray(item.references||[]));
    assert.ok(['Explication générale','Repère juridique','Repère scientifique','Repère institutionnel','Fondement juridique identifié'].includes(item.reference_nature), 'Nature de référence : '+item.slug);
    if (item.reference_nature === 'Fondement juridique identifié') {
      assert.ok(item.reference_source_label,'Texte juridique non identifié : '+item.slug);
      assert.match(item.reference_source_url||'',/^https:\/\//,'Lien vers le texte juridique manquant : '+item.slug);
    }
    if (item.diploval_view !== undefined) assert.ok(typeof item.diploval_view === 'string');
  }
});

test('Les deux lectures restent distinctes des textes officiels', () => {
  const generator = fs.readFileSync(path.join(root,'scripts/generate-dico.mjs'),'utf8');
  assert.match(generator,/Définition de référence/);
  assert.match(generator,/Lecture Diploval — fondements du vivant/);
  assert.match(generator,/Elle ne remplace pas la définition de référence/);
  assert.match(generator,/référence juridique officielle manquante/);
  assert.ok(doc.entries.filter(e => e.diploval_view).length >= 10);
  assert.ok(doc.entries.some(e => e.slug === 'biodiversite' && e.reference_source_url.includes('legifrance.gouv.fr')));
});

test('Les nouveaux mots sont publiés seulement après double validation', () => {
  const code = fs.readFileSync(path.join(root,'scripts/generate-dico.mjs'),'utf8');
  assert.match(code,/entry\.status === 'Publié' && entry\.visible === true/);
  const linking = fs.readFileSync(path.join(root,'dico-links.js'),'utf8');
  assert.match(linking,/e\.status === 'Publié' && e\.visible === true/);
});

test('Les fiches dans l’index signalent clairement comment lire la définition complète', () => {
  const generator = fs.readFileSync(path.join(root,'scripts/generate-dico.mjs'),'utf8');
  const css = fs.readFileSync(path.join(root,'dico.css'),'utf8');
  assert.match(generator,/Voir la définition complète/);
  assert.match(generator,/dv-dico-more/);
  assert.match(css,/dv-dico-entry \.dv-dico-more/);
});

test('La navigation et les scripts du Dico sont reliés', () => {
  const template = fs.readFileSync(path.join(root,'scripts/templates/site-header.template'),'utf8');
  assert.match(template,/href="\/dico\/"/);
  const build = fs.readFileSync(path.join(root,'scripts/generate-seo-pages.mjs'),'utf8');
  assert.match(build,/generateDico\(root/);
  assert.match(build,/dico-links\.js/);
});

test('Toutes les fiches publiques et références croisées sont cohérentes', () => {
  const ids = new Set(doc.entries.map(e=>e.slug));
  assert.equal(ids.size,doc.entries.length,'Identifiants de fiches dupliqués');
  assert.ok(doc.entries.every(e=>e.status==='Publié' && e.visible===true));
  for (const e of doc.entries) {
    assert.ok(e.related.every(id=>ids.has(id) && id!==e.slug),'Renvoi inexistant ou vers soi-même : '+e.slug);
    for (const source of e.references||[]) {
      assert.ok(source.label,'Source sans intitulé : '+e.slug);
      assert.match(source.url,/^https:\/\//,'Source sans URL sécurisée : '+e.slug);
    }
  }
});

