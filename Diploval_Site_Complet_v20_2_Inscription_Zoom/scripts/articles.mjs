import news from '../article-state.js';
import {publicationId} from './consultations.mjs';
import fs from 'node:fs';
import path from 'node:path';
import format from '../article-format.js';
const {esc,safeURL,render,excerpt}=format;
const slug=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100).replace(/-$/,'');
export const articleId=a=>a.id||slug(a.title);
const local=v=>'/'+String(v).replace(/^\//,'');
function dateLabel(d){if(!d)return'';const date=new Date(String(d).slice(0,10)+'T12:00:00Z');return Number.isNaN(date.getTime())?String(d):new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',day:'numeric',month:'long',year:'numeric'}).format(date);}
export function articleCard(a){const id=articleId(a),url='/actualites/'+id+'/';return `<article class="actualite-card">${a.cover?`<a href="${url}" aria-label="Lire ${esc(a.title)}"><img src="${esc(local(a.cover))}" alt="${esc(a.cover_alt===undefined?a.title:a.cover_alt)}" loading="lazy"></a>`:''}<div class="actualite-card-body"><small>${esc(news.category(a))}</small><time class="actualite-date" datetime="${esc(a.date||'')}">${esc(dateLabel(a.date))}</time><h3><a href="${url}">${esc(a.title)}</a></h3><p>${esc(excerpt(a.intro||a.body))}</p><a class="article-read" href="${url}">Lire l’actualité →</a></div></article>`;}
export function generateArticles(root,articles,helpers){
  const {head,layout,org,website,breadcrumb,abs,description,addMap}=helpers;
  const list=articles.filter(a=>news.isPublic(a)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  const dossiers=JSON.parse(fs.readFileSync(path.join(root,'content/dossiers.json'),'utf8')).dossiers||[];
  const publications=JSON.parse(fs.readFileSync(path.join(root,'content/publications.json'),'utf8')).publications||[];
  const dossierIds=new Set();for(const d of dossiers){const id=news.id(d);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)||dossierIds.has(id))throw Error('Identifiant de dossier invalide ou en double : '+id);dossierIds.add(id);}
  const ongoing=dossiers.filter(d=>d.visible!==false&&['en_cours','finalisation'].includes(d.status));
  function associated(a){if(!a.dossier_id)return '';const d=dossiers.find(d=>news.id(d)===a.dossier_id);if(!d)throw Error('Dossier associé introuvable pour « '+a.title+' ». Retirer ou corriger la relation dans l’administration.');if(d.visible===false)return '';const p=publications.find(p=>publicationId(p)===d.publication_id&&p.visible!==false&&p.pdf&&!['Brouillon','Archivé'].includes(p.status));const url=p?'/publications/'+publicationId(p)+'/':ongoing.includes(d)?'/#dossier-'+news.id(d):'';return url?'<aside class="article-associated"><h2>Dossier Diploval associé</h2><a href="'+esc(url)+'">'+esc(d.title)+' →</a></aside>':'';}
  const seen=new Set();for(const a of list){const id=articleId(a);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)||seen.has(id))throw Error('Identifiant d’article invalide ou en double : '+id);seen.add(id);}
  const dir=path.join(root,'actualites');
  if(fs.existsSync(dir))for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name,'index.html');if(item.isDirectory()&&!seen.has(item.name)&&fs.existsSync(file)&&fs.readFileSync(file,'utf8').includes('seo-detail-page'))fs.unlinkSync(file);}
  for(const a of list){
    const id=articleId(a),url='https://diploval.fr/actualites/'+id+'/',img=abs(a.social_image||a.cover),desc=description(a.seo_description,excerpt(a.intro||a.body)),date=String(a.published_at||a.date||'').slice(0,10);
    const sources=(a.sources||[]).filter(s=>s.label||s.url);
    for(const source of sources)if(!source.label||!/^https?:\/\//i.test(source.url||'')||!safeURL(source.url))throw Error('Source d’article : indiquer un titre et une adresse HTTP(S) valide pour « '+a.title+' ».');
    const sourcesHtml=sources.length?`<section class="article-sources" aria-labelledby="article-sources-title"><h2 id="article-sources-title">Sources et références</h2><ol>${sources.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>${s.publisher||s.date?`<div>${esc([s.publisher,s.date].filter(Boolean).join(' · '))}</div>`:''}${s.note?`<p>${esc(s.note)}</p>`:''}</li>`).join('')}</ol></section>`:'';
    const share=`<section class="article-share" data-article-share aria-label="Partager cette actualité"><h2>Partager cette actualité</h2><button type="button" data-copy-article>Copier le lien</button><button type="button" hidden data-native-share>Partager…</button><a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener noreferrer">Facebook</a><a href="https://bsky.app/intent/compose?text=${encodeURIComponent(a.title+'\n'+url)}" target="_blank" rel="noopener noreferrer">Bluesky</a><a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}" target="_blank" rel="noopener noreferrer">LinkedIn</a><a href="mailto:?subject=${encodeURIComponent(a.title)}&amp;body=${encodeURIComponent(url)}">E-mail</a><span role="status" aria-live="polite"></span></section>`;
    const body=`${a.cover?`<img class="article-cover" src="${esc(local(a.cover))}" alt="${esc(a.cover_alt===undefined?a.title:a.cover_alt)}">`:''}<div class="article-prose">${render(a.body||'')}</div>${a.link&&safeURL(a.link)?`<p><a href="${esc(safeURL(a.link))}" rel="noopener noreferrer">${esc(a.link_label||'En savoir plus')} →</a></p>`:''}${a.correction_note?`<aside class="article-correction"><h2>Correction / mise à jour</h2><p>${esc(a.correction_note)}</p>${a.updated_at?`<small>${esc(dateLabel(a.updated_at))}</small>`:''}</aside>`:''}${associated(a)}${sourcesHtml}${share}<p><a href="/#actualites">← Actualités Diploval</a></p>`;
    const graph={'@context':'https://schema.org','@graph':[org,website,{'@type':'Article','@id':url+'#article',url,headline:a.title,description:desc,...(/^\d{4}-\d{2}-\d{2}$/.test(date)?{datePublished:date,...(a.updated_at?{dateModified:a.updated_at}:{})}:{}),inLanguage:'fr-FR',author:{'@id':'https://diploval.fr/#organization'},publisher:{'@id':'https://diploval.fr/#organization'},image:img,mainEntityOfPage:url},breadcrumb([['Accueil','https://diploval.fr/'],['Actualités Diploval','https://diploval.fr/#actualites'],[a.title,url]])]};
    const html=(head({title:a.title+' — Diploval',desc,url,image:img,type:'article',jsonld:graph,articleDate:date})+layout({back:['Actualités Diploval','/#actualites'],eyebrow:news.category(a),title:a.title,lead:a.intro||'',meta:[dateLabel(a.published_at||a.date),a.updated_at?'Mis à jour le '+dateLabel(a.updated_at):''],body,side:''})).replace('class="seo-detail-page"','class="seo-detail-page article-page"').replace('</head>','<link rel="stylesheet" href="/article.css?v=1"></head>').replace('</body>','<script src="/article-share.js?v=1"></script></body>');
    fs.mkdirSync(path.join(dir,id),{recursive:true});fs.writeFileSync(path.join(dir,id,'index.html'),html);addMap(url,date);
  }
  // Also expose concise cards without waiting for JavaScript.
  const homePath=path.join(root,'index.html');let home=fs.readFileSync(homePath,'utf8');
  const dossierCards=ongoing.map((d,i)=>`<article class="ongoing-v206__card" id="dossier-${news.id(d)}"><div class="ongoing-v206__cardtop"><span class="ongoing-v206__status">${d.status==='finalisation'?'En finalisation':'En cours'}</span><span>${esc(d.scope)}</span></div><h4>${esc(d.title)}</h4><p>${esc(d.summary)}</p><div class="ongoing-v206__foot"><span>Instruction en cours</span><span>Publication à venir</span></div></article>`).join('');
  const dossierMarkup='<!-- dossiers:start -->'+dossierCards+'<!-- dossiers:end -->';
  if(home.includes('<!-- dossiers:start -->'))home=home.replace(/<!-- dossiers:start -->[\s\S]*?<!-- dossiers:end -->/,()=>dossierMarkup);else home=home.replace(/(<div[^>]*id="admin-ongoing-grid"[^>]*>)[\s\S]*?<\/div>/,(_,open)=>open+dossierMarkup+'</div>');
  home=home.replace(/<div[^>]*class="ongoing-v206 reveal"[^>]*>/,tag=>ongoing.length?tag.replace(/\s+hidden(?:="[^"]*")?/,''):tag.includes('hidden')?tag:tag.replace('>',' hidden>'));
  home=home.replace(/(<h2[^>]*id="actualites-title"[^>]*>)[\s\S]*?<\/h2>/,'$1Actualités Diploval</h2>').replace('Actualités &amp; mises à jour','Actualités Diploval').replace('Courtes nouvelles, avancées de dossiers, contributions et informations pratiques publiées directement par Diploval.','Publications, consultations citoyennes, avancées des dossiers et vie institutionnelle de Diploval.');
  const cards='<!-- articles:start -->'+list.map(articleCard).join('')+'<!-- articles:end -->';
  if(home.includes('<!-- articles:start -->'))home=home.replace(/<!-- articles:start -->[\s\S]*?<!-- articles:end -->/,cards);
  else home=home.replace(/(<div[^>]*id="admin-articles-list"[^>]*>)[\s\S]*?<\/div>/,'$1'+cards+'</div>');
  home=home.replace(/<section\b[^>]*id="actualites"[^>]*>/,tag=>list.length?tag.replace(/\s+hidden(?:="[^"]*")?/,''):tag.includes('hidden')?tag:tag.replace('>',' hidden>'));
  if(!home.includes('/article-state.js'))home=home.replace(/<script[^>]*src="\/?content-admin\.js[^"]*"[^>]*><\/script>/,tag=>'<script src="/article-state.js?v=1"></script>'+tag);
  if(!home.includes('/article.css?'))home=home.replace('</head>','<link rel="stylesheet" href="/article.css?v=1"></head>');
  home=home.replace(/content-admin\.js\?v=\d+/g,'content-admin.js?v=32');fs.writeFileSync(homePath,home);
}
