import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const root=path.resolve(__dirname,'..');
const errors=[];
const warnings=[];
const exists=rel=>fs.existsSync(path.join(root,String(rel).replace(/^\//,'')));
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const relp=p=>path.relative(root,p).split(path.sep).join('/');

// 1. JSON edited through /admin must remain valid.
const contentFiles=['content/publications.json','content/dossiers.json','content/agenda.json','content/communiques.json','content/articles.json','content/podcasts.json','content/site-settings.json','content/points-information.json'];
const data={};
for(const f of contentFiles){
  try{data[f]=JSON.parse(read(f));}catch(e){errors.push(`${f}: JSON invalide ou fichier absent (${e.message})`)}
}

const localRef=(value,label)=>{
  if(!value || /^https?:\/\//i.test(value) || /^mailto:/i.test(value) || /^tel:/i.test(value) || value.startsWith('#')) return;
  const clean=String(value).split('#')[0].split('?')[0].replace(/^\//,'');
  if(clean && !exists(clean)) errors.push(`${label}: fichier local introuvable → ${value}`);
};
for(const p of data['content/publications.json']?.publications||[]){localRef(p.pdf,`Publication « ${p.title} » / PDF`);localRef(p.cover,`Publication « ${p.title} » / couverture`)}
for(const c of data['content/communiques.json']?.communiques||[]){localRef(c.pdf,`Communiqué « ${c.title} » / PDF`);localRef(c.cover,`Communiqué « ${c.title} » / image`)}
for(const a of data['content/articles.json']?.articles||[]){localRef(a.cover,`Article « ${a.title} » / image`)}
for(const e of data['content/podcasts.json']?.episodes||[]){localRef(e.cover,`Podcast « ${e.title} » / image`);localRef(e.audio,`Podcast « ${e.title} » / audio`)}

function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(ent=>{const p=path.join(dir,ent.name);return ent.isDirectory()?walk(p):[p]})}
const allFiles=walk(root);
const htmlFiles=allFiles.filter(p=>p.endsWith('.html')&&!p.includes(`${path.sep}admin${path.sep}`));
const jsFiles=allFiles.filter(p=>p.endsWith('.js')||p.endsWith('.mjs')).filter(p=>!p.includes(`${path.sep}admin${path.sep}`));
const css=exists('styles.css')?read('styles.css'):'';

// 2. Public route mapping, including Netlify rewrites and a synthetic point detail route.
const routeMap=new Map();
for(const p of htmlFiles){
  const rel=relp(p);
  if(rel==='index.html'){routeMap.set('/',p);routeMap.set('/index.html',p)}
  else if(rel.endsWith('/index.html')){const r='/'+rel.slice(0,-10);routeMap.set(r,p);routeMap.set(r.replace(/\/$/,''),p)}
  else{routeMap.set('/'+rel,p);if(rel.endsWith('.html'))routeMap.set('/'+rel.slice(0,-5),p)}
}
for(const [r,f] of Object.entries({
  '/points-information':'points-information.html',
  '/points-information/__route-test__':'points-information.html',
  '/communiques':'communiques.html',
  '/propositions-contributions':'propositions-contributions.html',
  '/dossiers/numerisation-securite-resilience':'dossier-numerisation.html'
})){routeMap.set(r,path.join(root,f))}

const idsByFile=new Map();
for(const p of htmlFiles){
  const h=fs.readFileSync(p,'utf8');
  idsByFile.set(p,new Set([...h.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1])));
  if(/Maquette\s*:/i.test(h)||/Maquette de validation/i.test(h))errors.push(`${relp(p)} contient encore un libellé de maquette publique.`);
  // CSP allows JSON-LD inline, but executable inline JS is intentionally forbidden.
  for(const m of h.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
    const attrs=m[1]||''; const body=(m[2]||'').trim();
    if(/\bsrc\s*=/.test(attrs)||!body) continue;
    const type=(attrs.match(/\btype=["']([^"']+)["']/i)||[])[1]||'';
    if(type && /ld\+json|application\/json/i.test(type)) continue;
    errors.push(`${relp(p)} contient un script exécutable inline incompatible avec la CSP.`);
  }
  if(/class=["'][^"']*site-footer/.test(h) && !/\.site-footer\s*\{/.test(css)) errors.push(`${relp(p)} utilise .site-footer sans style correspondant.`);
  if(/class=["'][^"']*\bfooter\b/.test(h) && !/\.footer\s*\{/.test(css)) errors.push(`${relp(p)} utilise .footer sans style correspondant.`);
}

const publicRoutesForFile=new Map();
for(const [route,file] of routeMap){
  if(!publicRoutesForFile.has(file)) publicRoutesForFile.set(file,[]);
  publicRoutesForFile.get(file).push(route);
}

function targetForPath(pathname){
  const clean=pathname.replace(/^\//,'');
  const local=path.join(root,clean);
  if(fs.existsSync(local)) return fs.statSync(local).isDirectory()?path.join(local,'index.html'):local;
  return routeMap.get(pathname)||routeMap.get(pathname.replace(/\/$/,''));
}

let linkCount=0, resourceCount=0;
for(const [route,p] of routeMap){
  if(!p.endsWith('.html')||!fs.existsSync(p)) continue;
  const h=fs.readFileSync(p,'utf8');
  const rel=relp(p);
  const base='https://diploval.fr'+route;

  // Resource references must resolve correctly from their actual public URL.
  const refs=[];
  for(const m of h.matchAll(/<(?:img|script|iframe|audio|video|source)\b[^>]*\b(?:src|poster)=["']([^"']+)["'][^>]*>/gi)) refs.push(m[1]);
  for(const m of h.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)){
    const tag=m[0]; if(/rel=["'][^"']*(?:stylesheet|icon|preload|manifest)[^"']*["']/i.test(tag)) refs.push(m[1]);
  }
  for(const ref of refs){
    if(!ref||/^(?:https?:|data:|blob:|mailto:|tel:|#)/i.test(ref)) continue;
    resourceCount++;
    let u; try{u=new URL(ref,base)}catch{errors.push(`${rel} @ ${route}: ressource non analysable → ${ref}`);continue}
    const target=targetForPath(decodeURIComponent(u.pathname));
    if(!target||!fs.existsSync(target)) errors.push(`${rel} @ ${route}: ressource locale introuvable → ${ref} (résout vers ${u.pathname})`);
  }

  // Links and anchors.
  for(const m of h.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)){
    const href=m[1].trim(); linkCount++;
    if(!href||/^(https?:|mailto:|tel:|javascript:)/i.test(href))continue;
    if(href.startsWith('#')){const id=href.slice(1);if(id&&!idsByFile.get(p)?.has(id))errors.push(`${rel}: ancre absente ${href}`);continue}
    let u;try{u=new URL(href,base)}catch{warnings.push(`${rel}: URL non analysable ${href}`);continue}
    const target=targetForPath(decodeURIComponent(u.pathname));
    if(!target||!fs.existsSync(target)){errors.push(`${rel} @ ${route}: lien interne introuvable → ${href} (résout vers ${u.pathname})`);continue}
    if(u.hash && target.endsWith('.html')){const id=u.hash.slice(1);if(id&&!idsByFile.get(target)?.has(id))errors.push(`${rel}: ancre cible absente → ${href}`)}
  }
}

// 3. JS syntax must be valid.
for(const p of jsFiles){
  const r=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});
  if(r.status!==0) errors.push(`${relp(p)}: erreur de syntaxe JavaScript → ${(r.stderr||r.stdout||'').trim().split('\n').slice(-2).join(' ')}`);
}

// 4. Critical interactive features.
const dossier=read('dossier-numerisation.html');
if(!/name=["']contribution-numerisation-v1-1["']/.test(dossier)||!/data-netlify=["']true["']/.test(dossier))errors.push('Le formulaire de contribution Netlify est absent ou incomplet.');
if(!/src=["']\/dossier-numerisation\.js/.test(dossier))errors.push('Le script externe du dossier participatif n’est pas chargé par une URL racine sûre.');
const points=read('points-information.html');
if(!/id=["']niveaux["']/.test(points)||!/id=["']suivis["']/.test(points))errors.push('Les ancres Niveaux/Suivis de la page Points d’information sont absentes.');
if(!/fetch\(["']\/content\/points-information\.json/.test(read('points-information.js')))errors.push('points-information.js doit charger son JSON depuis /content pour fonctionner sur les URLs de suivi imbriquées.');
if(!exists('scripts/generate-seo-pages.mjs'))errors.push('Générateur SEO absent.');
if(!exists('sitemap.xml'))errors.push('sitemap.xml absent.');


// 5. Netlify header policy: specific rules must precede the catch-all.
// The dossier PDF is intentionally embeddable only by Diploval itself.
try{
  const nt=read('netlify.toml');
  const pdfPos=nt.indexOf('for = "/assets/documents/*"');
  const adminPos=nt.indexOf('for = "/admin/*"');
  const contentPos=nt.indexOf('for = "/content/*"');
  const globalPos=nt.indexOf('for = "/*"');
  if(pdfPos<0||globalPos<0||pdfPos>globalPos) errors.push('netlify.toml : la règle PDF doit être placée avant la règle générale /*.');
  if(adminPos<0||adminPos>globalPos) errors.push('netlify.toml : la règle /admin/* doit précéder la règle générale /*.');
  if(contentPos<0||contentPos>globalPos) errors.push('netlify.toml : la règle /content/* doit précéder la règle générale /*.');
  const pdfBlock=(nt.match(/\[\[headers\]\]\s*\n\s*for = "\/assets\/documents\/\*"\s*\n\s*\[headers\.values\]([\s\S]*?)(?=\n\[\[|$)/)||[])[1]||'';
  if(!/X-Frame-Options\s*=\s*"SAMEORIGIN"/.test(pdfBlock)) errors.push('netlify.toml : les PDF doivent autoriser l’intégration SAMEORIGIN.');
  if(!/frame-ancestors 'self'/.test(pdfBlock)) errors.push("netlify.toml : la CSP PDF doit contenir frame-ancestors 'self'.");
}catch(e){errors.push(`netlify.toml : contrôle des en-têtes impossible (${e.message})`)}

if(warnings.length){console.warn('Site check warnings:');warnings.forEach(x=>console.warn(' - '+x))}
if(errors.length){console.error('Site check FAILED:');errors.forEach(x=>console.error(' - '+x));process.exit(2)}
console.log(`Site check OK: ${htmlFiles.length} pages HTML, ${linkCount} liens et ${resourceCount} ressources contrôlés, JSON et JavaScript valides.`);
