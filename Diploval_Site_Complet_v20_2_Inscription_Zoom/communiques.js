(() => {
'use strict';
const esc = v => String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const attr = v => esc(v).replace(/`/g,'&#96;');
const slugify = v => String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);
const textParagraphs = v => String(v||'').split(/\n\s*\n/).filter(Boolean).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('');
const dateKey = d => String(d||'').slice(0,10);
const formatDate = d => {if(!d)return ''; const x=new Date(`${dateKey(d)}T12:00:00`); return Number.isNaN(x.getTime())?String(d):new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric'}).format(x)};
const typeLabel = t => t==='presidence' ? 'Présidence de Diploval' : 'Diploval · Institutionnel';
const signature = c => c.signature || (c.type==='presidence' ? 'Souix Nathorod\nPrésident de Diploval\nFranck Saubin à l’état civil' : 'Diploval\nPrésidence de Diploval');
let data=[]; let filter='all';

async function getData(){try{const r=await fetch('content/communiques.json',{cache:'no-store'});if(!r.ok)throw new Error(r.status);return await r.json()}catch(e){console.warn(e);return {communiques:[]}}}
function idOf(c){return c.id||slugify(c.title)}
function publicList(){return data.filter(c=>c.visible!==false && c.status!=='Brouillon').sort((a,b)=>String(b.date).localeCompare(String(a.date)))}
function card(c){
 const id=idOf(c), type=c.type==='presidence'?'presidence':'institutionnel';
 return `<article class="communique-card communique-${type}">
 <div class="communique-card-top"><span class="communique-kind">${esc(typeLabel(type))}</span><span class="communique-scope">${esc(c.scope||'')}</span></div>
 ${c.cover?`<img class="communique-cover" src="${attr(c.cover)}" alt="Image de présentation : ${attr(c.title)}" loading="lazy">`:''}
 <div class="communique-card-body"><time>${esc(formatDate(c.date))}</time><h3>${esc(c.title)}</h3><p>${esc(c.summary||'')}</p>
 <a class="communique-read" href="/communiques/${encodeURIComponent(id)}/">Lire le communiqué →</a></div></article>`;
}
function render(){
 const host=document.querySelector('#communiques-list'); if(!host)return;
 const list=publicList().filter(c=>filter==='all'||c.type===filter);
 host.innerHTML=list.length?list.map(card).join(''):'<p class="communiques-empty">Aucun communiqué ne correspond à ce filtre.</p>';
}
function renderDetail(id){
 const c=publicList().find(x=>idOf(x)===id), host=document.querySelector('#communique-detail'), list=document.querySelector('#communiques-list');
 if(!c||!host)return false; if(list)list.hidden=true; host.hidden=false;
 const type=c.type==='presidence'?'presidence':'institutionnel';
 const sig=signature(c).split('\n').map(esc).join('<br>');
 host.innerHTML=`<button class="communique-back" id="communique-back">← Tous les communiqués</button>
 <article class="communique-full communique-${type}">
 <header><span class="communique-kind">${esc(typeLabel(type))}</span><span class="communique-scope">${esc(c.scope||'')}</span><time>${esc(formatDate(c.date))}</time>
 <h2>${esc(c.title)}</h2><p>${esc(c.summary||'')}</p></header>
 ${c.cover?`<img class="communique-full-cover" src="${attr(c.cover)}" alt="" loading="lazy">`:''}
 <div class="communique-full-body">${textParagraphs(c.body||'')}</div>
 ${c.correction_note?`<div class="communique-correction"><strong>Correction / mise à jour :</strong> ${esc(c.correction_note)}</div>`:''}
 <footer><p class="communique-signature">${sig}</p>${c.pdf?`<a class="button button-document" href="${attr(c.pdf)}" target="_blank" rel="noopener">Consulter le PDF officiel →</a>`:''}<button class="button button-outline" id="copy-communique-link" type="button">Copier le lien</button></footer>
 </article>`;
 document.querySelector('#communique-back')?.addEventListener('click',()=>{host.hidden=true;if(list)list.hidden=false;history.replaceState({},'', '/communiques');window.scrollTo({top:document.querySelector('#liste-communiques').offsetTop-80,behavior:'smooth'})});
 document.querySelector('#copy-communique-link')?.addEventListener('click',async e=>{try{await navigator.clipboard.writeText(location.href);e.currentTarget.textContent='Lien copié ✓'}catch{e.currentTarget.textContent='Copiez l’adresse du navigateur'}});
 return true;
}
document.querySelectorAll('.communique-filter').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.communiqueFilter;document.querySelectorAll('.communique-filter').forEach(x=>{const a=x===b;x.classList.toggle('active',a);x.setAttribute('aria-pressed',String(a))});render()}));
getData().then(d=>{data=d.communiques||[]; const id=new URL(location.href).searchParams.get('id'); if(!(id&&renderDetail(id))) render();});
})();
