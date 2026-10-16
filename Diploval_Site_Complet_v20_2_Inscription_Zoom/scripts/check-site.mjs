import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const root=path.resolve(__dirname,'..');
const errors=[];
const warnings=[];
const exists=rel=>fs.existsSync(path.join(root,rel.replace(/^\//,'')));
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

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
for(const p of data['content/publications.json']?.publications||[]){localRef(p.pdf,`Publication « ${p.title} » / PDF`);localRef(p.cover,`Publication « ${p.title} » / couverture`);}
for(const c of data['content/communiques.json']?.communiques||[]){localRef(c.pdf,`Communiqué « ${c.title} » / PDF`);localRef(c.cover,`Communiqué « ${c.title} » / image`);}
for(const a of data['content/articles.json']?.articles||[]){localRef(a.cover,`Article « ${a.title} » / image`);}
for(const e of data['content/podcasts.json']?.episodes||[]){localRef(e.cover,`Podcast « ${e.title} » / image`);localRef(e.audio,`Podcast « ${e.title} » / audio`);}

function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(ent=>{const p=path.join(dir,ent.name);return ent.isDirectory()?walk(p):[p]})}
const htmlFiles=walk(root).filter(p=>p.endsWith('.html')&&!p.includes(`${path.sep}admin${path.sep}`));
const routeMap=new Map();
for(const p of htmlFiles){const rel=path.relative(root,p).split(path.sep).join('/');if(rel==='index.html'){routeMap.set('/',p);routeMap.set('/index.html',p)}else if(rel.endsWith('/index.html')){const r='/'+rel.slice(0,-10);routeMap.set(r,p);routeMap.set(r.replace(/\/$/,''),p)}else{routeMap.set('/'+rel,p);if(rel.endsWith('.html'))routeMap.set('/'+rel.slice(0,-5),p)}}
for(const [r,f] of Object.entries({'/points-information':'points-information.html','/communiques':'communiques.html','/propositions-contributions':'propositions-contributions.html','/dossiers/numerisation-securite-resilience':'dossier-numerisation.html'})){routeMap.set(r,path.join(root,f))}

const idsByFile=new Map();
for(const p of htmlFiles){const h=fs.readFileSync(p,'utf8');idsByFile.set(p,new Set([...h.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1])));if(/Maquette\s*:/i.test(h)||/Maquette de validation/i.test(h))errors.push(`${path.relative(root,p)} contient encore un libellé de maquette publique.`)}
let linkCount=0;
for(const p of htmlFiles){
  const rel=path.relative(root,p).split(path.sep).join('/');
  const pagePath=rel==='index.html'?'/':rel.endsWith('/index.html')?'/'+rel.slice(0,-10):'/'+rel;
  const html=fs.readFileSync(p,'utf8');
  for(const m of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)){
    const href=m[1].trim();linkCount++;
    if(!href||/^(https?:|mailto:|tel:|javascript:)/i.test(href))continue;
    if(href.startsWith('#')){const id=href.slice(1);if(id&&!idsByFile.get(p)?.has(id))errors.push(`${rel}: ancre absente ${href}`);continue;}
    let u;try{u=new URL(href,'https://diploval.fr'+pagePath)}catch{warnings.push(`${rel}: URL non analysable ${href}`);continue}
    const pathname=decodeURIComponent(u.pathname);
    const local=path.join(root,pathname.replace(/^\//,''));
    let target=fs.existsSync(local)?(fs.statSync(local).isDirectory()?path.join(local,'index.html'):local):routeMap.get(pathname)||routeMap.get(pathname.replace(/\/$/,''));
    if(!target||!fs.existsSync(target)){errors.push(`${rel}: lien interne introuvable → ${href}`);continue}
    if(u.hash && target.endsWith('.html')){const id=u.hash.slice(1);if(id&&!idsByFile.get(target)?.has(id))errors.push(`${rel}: ancre cible absente → ${href}`)}
  }
}

const dossier=read('dossier-numerisation.html');
if(!/name=["']contribution-numerisation-v1-1["']/.test(dossier)||! /data-netlify=["']true["']/.test(dossier))errors.push('Le formulaire de contribution Netlify est absent ou incomplet.');
if(!exists('scripts/generate-seo-pages.mjs'))errors.push('Générateur SEO absent.');
if(!exists('sitemap.xml'))errors.push('sitemap.xml absent.');

if(warnings.length){console.warn('Site check warnings:');warnings.forEach(x=>console.warn(' - '+x))}
if(errors.length){console.error('Site check FAILED:');errors.forEach(x=>console.error(' - '+x));process.exit(2)}
console.log(`Site check OK: ${htmlFiles.length} pages HTML, ${linkCount} liens internes/externes contrôlés, contenus JSON valides.`);
