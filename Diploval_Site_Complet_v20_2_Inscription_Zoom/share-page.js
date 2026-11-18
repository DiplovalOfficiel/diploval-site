(()=>{
'use strict';
// Partage d'une page publique Diploval : aucune donnée transmise avant un clic.
function normalizeUrl(value){
 try{
  const url=new URL(value||location.href,location.origin);
  if(url.origin!==location.origin)return null;
  url.search='';url.hash='';
  return url.href;
 }catch{return null;}
}
function init(root=document){
 root.querySelectorAll('[data-dv-share]:not([data-dv-share-ready])').forEach(host=>{
  const canonical=document.querySelector('link[rel="canonical"]')?.href;
  const rawUrl=host.getAttribute('data-share-url')||canonical||location.href;
  const url=normalizeUrl(rawUrl);
  if(!url)return;
  const title=(host.getAttribute('data-share-title')||document.querySelector('main h1')?.textContent||document.title).trim();
  host.dataset.dvShareReady='1';
  host.classList.add('dv-share');
  const heading=document.createElement('h2');heading.textContent='Partager cette page Diploval';
  const lead=document.createElement('p');lead.textContent='Diffusez le lien de cette page, avec son contexte et ses sources.';
  const controls=document.createElement('div');controls.className='dv-share-controls';
  const status=document.createElement('p');status.className='dv-share-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const link=(name,href,newTab=true)=>{
   const a=document.createElement('a');a.textContent=name;a.href=href;a.className='dv-share-action';
   if(newTab){a.target='_blank';a.rel='noopener noreferrer';}
   controls.append(a);
  };
  const button=(label,callback,cls='')=>{
   const b=document.createElement('button');b.type='button';b.className='dv-share-action '+cls;b.textContent=label;b.addEventListener('click',callback);controls.append(b);return b;
  };
  if(typeof navigator.share==='function'){
   button('Partager…',async()=>{
    try{await navigator.share({title,url});}
    catch(e){if(e.name!=='AbortError')status.textContent='Le partage natif n’a pas abouti. Utilisez un lien ou copiez l’adresse.';}
   },'dv-share-primary');
  }
  const enc=encodeURIComponent,txt=enc(title+'\n'+url);
  link('Facebook','https://www.facebook.com/sharer/sharer.php?u='+enc(url));
  link('Bluesky','https://bsky.app/intent/compose?text='+txt);
  link('LinkedIn','https://www.linkedin.com/sharing/share-offsite/?url='+enc(url));
  link('WhatsApp','https://wa.me/?text='+txt);
  link('X','https://twitter.com/intent/tweet?text='+enc(title)+'&url='+enc(url));
  link('E-mail','mailto:?subject='+enc(title+' — Diploval')+'&body='+enc(title+'\n\n'+url),false);
  button('Copier le lien',async()=>{
   try{await navigator.clipboard.writeText(url);status.textContent='Lien de la page copié.';}
   catch(e){status.textContent='Lien à copier : '+url;}
  });
  host.replaceChildren(heading,lead,controls,status);
 });
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>init()):init();
window.DiplovalShare={init};
})();