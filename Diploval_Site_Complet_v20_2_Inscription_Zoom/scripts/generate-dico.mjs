import fs from 'node:fs';
import path from 'node:path';
import { publicationId, isPublic } from './consultations.mjs';

const SITE = 'https://diploval.fr';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').replace(/[’]/g, "'");
const slugOk = slug => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
const lastmodOk = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '');
const published = entry => entry && entry.status === 'Publié' && entry.visible === true;
const paragraphs = value => String(value || '').split(/\n\s*\n/).filter(Boolean).map(p => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join('');
const webImage = SITE + '/assets/diploval-partage.jpg';
const safeExternal = url => /^https:\/\/[a-z0-9.-]+(?:[:/][^\s"'<>]*)?$/i.test(String(url || ''));
function firstLetter(term) { const c = norm(term).charAt(0).toUpperCase(); return /^[A-Z]$/.test(c) ? c : '#'; }
function termIsIn(phrase, text) {
  const lower = norm(text);
  const word = norm(phrase);
  if (!word) return false;
  let pos = lower.indexOf(word);
  while (pos !== -1) {
    const before = pos ? lower[pos - 1] : '';
    const after = lower[pos + word.length] || '';
    if (!/[a-z0-9]/i.test(before) && !/[a-z0-9]/i.test(after)) return true;
    pos = lower.indexOf(word, pos + 1);
  }
  return false;
}
export function generateDico(root, {head,layout,org,website,breadcrumb,addMap}) {
  const file = path.join(root, 'content/dictionnaire.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(raw.entries)) throw Error('Dico : la liste entries est absente.');
  const slugs = new Set();
  for (const entry of raw.entries) {
    if (!slugOk(entry.slug) || slugs.has(entry.slug)) throw Error('Dico : identifiant incorrect ou en double : ' + entry.slug);
    if (!entry.term || !entry.definition || !entry.category) throw Error('Dico : terme, catégorie ou définition manquante : ' + entry.slug);
    if (!['Brouillon', 'Publié'].includes(entry.status)) throw Error('Dico : statut incorrect : ' + entry.slug);
    if (entry.references && !Array.isArray(entry.references)) throw Error('Dico : références incorrectes : ' + entry.slug);
    const kinds = ['Explication générale','Repère juridique','Repère scientifique','Repère institutionnel','Fondement juridique identifié'];
    if (entry.reference_nature && !kinds.includes(entry.reference_nature)) throw Error('Dico : nature de référence incorrecte : ' + entry.slug);
    if (entry.reference_nature === 'Fondement juridique identifié' &&
      !(entry.reference_source_label && safeExternal(entry.reference_source_url))) {
      throw Error('Dico : référence juridique officielle manquante : ' + entry.slug);
    }
    if (entry.diploval_view && typeof entry.diploval_view !== 'string') throw Error('Dico : lecture Diploval invalide : ' + entry.slug);
    slugs.add(entry.slug);
  }
  const entries = raw.entries.filter(published).sort((a,b) => a.term.localeCompare(b.term, 'fr', {sensitivity:'base'}));
  const allowed = new Set(entries.map(e => e.slug));
  const pubs = JSON.parse(fs.readFileSync(path.join(root, 'content/publications.json'), 'utf8')).publications || [];
  const write = (relative, html) => {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), {recursive:true});
    fs.writeFileSync(target, html);
  };
  const extra = html => html.replace('</head>', '<link rel="stylesheet" href="/dico.css?v=1"></head>');
  const grouping = [...new Set(entries.map(e => firstLetter(e.term)))].sort((a,b) => a.localeCompare(b, 'fr'));
  const alpha = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(l => grouping.includes(l) ?
    '<a href="#dico-' + l + '" aria-label="Aller à la lettre ' + l + '">' + l + '</a>' :
    '<span aria-hidden="true">' + l + '</span>').join('');
  const groups = grouping.map(letter => {
    const cards = entries.filter(e => firstLetter(e.term) === letter).map(e =>
      '<li class="dv-dico-entry" data-dico-search="' + esc([e.term, e.category, e.definition, ...(e.aliases || [])].join(' ')) + '">' +
      '<a href="/dico/' + e.slug + '/"><strong>' + esc(e.term) + '</strong><span>' + esc(e.definition) + '</span></a>' +
      '<small>' + esc(e.category) + '</small></li>').join('');
    return '<section class="dv-dico-group" id="dico-' + letter + '" data-dico-group><h2>' + letter + '</h2><ul>' + cards + '</ul></section>';
  }).join('');
  const indexUrl = SITE + '/dico/';
  const indexGraph = {'@context':'https://schema.org','@graph':[org,website,{
    '@type':'CollectionPage', '@id':indexUrl + '#collection',url:indexUrl,
    name:'Le Dico Diploval',description:'Dictionnaire citoyen des mots du droit, de la diplomatie, des institutions et du vivant.',
    inLanguage:'fr-FR',mainEntity:{'@type':'DefinedTermSet',name:'Le Dico Diploval',url:indexUrl}
  },breadcrumb([['Accueil',SITE + '/'],['Le Dico Diploval',indexUrl]])]};
  const body = '<div class="dv-dico" id="dico-page"><label class="dv-dico-label" for="dico-search">Rechercher un mot ou une expression</label>' +
    '<input id="dico-search" type="search" autocomplete="off" placeholder="Ex. souveraineté, résilience, jurisprudence…" aria-describedby="dico-count">' +
    '<nav class="dv-dico-alpha" aria-label="Index alphabétique">' + alpha + '</nav>' +
    '<p id="dico-count" role="status" aria-live="polite">' + entries.length + ' définitions disponibles</p>' +
    '<div id="dico-groups">' + groups + '</div>' +
    '<p id="dico-empty" hidden>Aucun terme ne correspond à cette recherche.</p></div>';
  const side = '<div class="seo-detail-card"><h2>Comment utiliser le Dico ?</h2><p>Chaque fiche présente le sens de référence d’un terme et, lorsque c’est utile, la manière dont Diploval l’aborde.</p><p>Une interprétation propre à Diploval ne remplace jamais une définition juridique, scientifique ou institutionnelle établie.</p><p>Les références sont indiquées lorsque des textes précis peuvent être identifiés.</p></div>';
  let indexHtml = head({title:'Le Dico Diploval — mots et expressions expliqués',desc:'Comprendre les mots du droit, de la diplomatie, des institutions, de l’économie et du vivant. Définitions classées de A à Z et recherche.',url:indexUrl,image:webImage,jsonld:indexGraph}) +
    layout({back:['Accueil','/'],eyebrow:'Ressources pour comprendre',title:'Le Dico Diploval',lead:'Des définitions accessibles, des références et, lorsque c’est pertinent, le regard de Diploval sur les conditions du vivant.',body,side});
  indexHtml = extra(indexHtml).replace('</body>', '<script src="/dico.js?v=1" defer></script></body>');
  write('dico/index.html',indexHtml);
  addMap(indexUrl);
  for (const entry of entries) {
    const url = SITE + '/dico/' + entry.slug + '/';
    const publishedDate = lastmodOk(entry.updated_at) ? entry.updated_at : '';
    const graph = {'@context':'https://schema.org','@graph':[org,website,{
      '@type':'DefinedTerm','@id':url+'#term',url,name:entry.term,description:entry.definition,
      inDefinedTermSet:{'@type':'DefinedTermSet',name:'Le Dico Diploval',url:indexUrl},
      ...(publishedDate ? {dateModified:publishedDate} : {})
    },breadcrumb([['Accueil',SITE+'/'],['Le Dico Diploval',indexUrl],[entry.term,url]])]};
    const references = (entry.references || []).filter(r => r && r.label && safeExternal(r.url));
    const sourceHtml = references.length ? '<h2>Références</h2><ul>' +
      references.map(r => '<li><a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' + esc(r.label) + '</a></li>').join('') + '</ul>' : '';
    const related = (entry.related || []).filter(slug => allowed.has(slug) && slug !== entry.slug);
    const relatedHtml = related.length ? '<h2>Voir aussi</h2><ul>' +
      related.map(slug => {
        const other = entries.find(x => x.slug === slug);
        return '<li><a href="/dico/' + slug + '/">' + esc(other.term) + '</a></li>';
      }).join('') + '</ul>' : '';
    const phrases = [entry.term, ...(entry.aliases || [])];
    const matches = pubs.filter(isPublic).filter(p =>
      phrases.some(term => termIsIn(term, [p.title,p.summary,p.short_summary,p.keywords].filter(Boolean).join(' ')))).slice(0,5);
    const usedIn = matches.length ? '<h2>Dans les publications Diploval</h2><ul>' +
      matches.map(p => '<li><a href="/publications/' + encodeURIComponent(publicationId(p)) + '/">' + esc(p.title) + '</a></li>').join('') + '</ul>' : '';
    const sourceLink = entry.reference_source_label && safeExternal(entry.reference_source_url)
      ? '<p class="dv-dico-official"><strong>Texte de référence :</strong> <a href="' + esc(entry.reference_source_url) + '" target="_blank" rel="noopener noreferrer">' + esc(entry.reference_source_label) + '</a></p>' : '';
    const perspective = entry.diploval_view
      ? '<section class="dv-dico-perspective" aria-labelledby="dico-perspective-title"><h2 id="dico-perspective-title">Lecture Diploval — fondements du vivant</h2>' +
        paragraphs(entry.diploval_view) +
        '<p class="dv-dico-perspective-note">Cette lecture présente l’approche éditoriale de Diploval. Elle ne remplace pas la définition de référence ni les textes de droit applicables. <a href="/publications/charte/">Consulter notre Charte des fondamentaux du vivant</a>.</p></section>' : '';
    const main = '<div class="dv-dico-definition"><p class="dv-dico-category">' + esc(entry.category) + '</p>' +
      '<section class="dv-dico-reference" aria-labelledby="dico-reference-title"><h2 id="dico-reference-title">Définition de référence</h2>' +
      '<p class="dv-dico-reference-kind">' + esc(entry.reference_nature || 'Explication générale') + '</p>' +
      '<p class="dv-dico-short">' + esc(entry.definition) + '</p>' +
      (entry.details ? '<h3>Pour mieux comprendre</h3>' + paragraphs(entry.details) : '') +
      sourceLink + '</section>' + perspective +
      ((entry.aliases || []).length ? '<p class="dv-dico-aliases"><strong>Autres formulations :</strong> ' + esc(entry.aliases.join(' · ')) + '</p>' : '') +
      relatedHtml + usedIn + sourceHtml +
      '<p class="dv-dico-return"><a href="/dico/">← Revenir au Dico</a></p></div>';
    const aside = '<div class="seo-detail-card"><h2>À propos de cette fiche</h2><p>La définition de référence décrit le sens établi ou documenté du terme. Lorsque Diploval propose sa propre lecture, elle est identifiée séparément et n’a pas de valeur juridique officielle.</p>' +
      (publishedDate ? '<p>Révisée le ' + esc(publishedDate) + '</p>' : '') +
      '<p><a href="mailto:contact@diploval.fr?subject=' + encodeURIComponent('Correction Dico : ' + entry.term) + '">Signaler une imprécision</a></p></div>';
    const html = extra(head({title:entry.term+' — Le Dico Diploval',desc:entry.definition.slice(0,155),url,image:webImage,jsonld:graph}) +
      layout({back:['Le Dico Diploval','/dico/'],eyebrow:'Dictionnaire · '+entry.category,title:entry.term,lead:'Définition, contexte et lecture du vivant',body:main,side:aside}));
    write('dico/'+entry.slug+'/index.html',html);
    addMap(url,publishedDate);
  }
  const dicoDir = path.join(root,'dico');
  for(const item of fs.readdirSync(dicoDir,{withFileTypes:true})) {
    if (!item.isDirectory() || allowed.has(item.name)) continue;
    const target=path.join(dicoDir,item.name,'index.html');
    if (fs.existsSync(target) && fs.readFileSync(target,'utf8').includes('Le Dico Diploval')) fs.unlinkSync(target);
  }
  return {total:raw.entries.length,published:entries.length};
}
