(()=>{
'use strict';
// Sur téléphone, ouvrir directement le PDF dans le lecteur natif du navigateur.
// Sur ordinateur, garder la lecture dans la page avec agrandissement facultatif.
const mobile=()=>/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'')||(window.matchMedia&&window.matchMedia('(max-width:820px)').matches);
const urls=new Set();
const locked=new Set();
function style(){
 if(document.getElementById('dv-pdf-reader-style'))return;
 const el=document.createElement('style');el.id='dv-pdf-reader-style';
 el.textContent=[
 '.dv-pdf-native .seo-pdf-frame-wrap{display:none!important}',
 '.dv-pdf-native .seo-pdf-reader-head{align-items:center}',
 '.dv-pdf-reader-hint{color:#5b6f7d;font-size:14px;line-height:1.5;margin:.65rem 0 0}',
 '.dv-pdf-fullscreen-control{display:inline-flex;align-items:center;justify-content:center;min-height:44px;border:1px solid #bccad2;border-radius:9px;padding:8px 13px;background:#0a2745;color:#fff;font:inherit;font-weight:700;cursor:pointer}',
 '.dv-pdf-fullscreen .dv-pdf-fullscreen-control{background:#fff;color:#0a2745}',
 '.dv-pdf-fullscreen:fullscreen{width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;overflow:auto!important;border-radius:0!important;padding:12px!important;background:#f5f6f7!important}',
 '.dv-pdf-fullscreen.dv-pdf-overlay{position:fixed!important;inset:0!important;z-index:2147483000!important;width:100vw!important;height:100dvh!important;max-width:none!important;overflow:auto!important;padding:12px!important;margin:0!important;border-radius:0!important;background:#f5f6f7!important}',
 'body.dv-pdf-no-scroll{overflow:hidden!important}',
 '.dv-pdf-fullscreen .seo-pdf-reader-head{position:sticky;top:0;z-index:3;background:#f5f6f7;padding:8px 0}',
 '.dv-pdf-fullscreen .seo-pdf-frame-wrap{height:calc(100dvh - 115px)!important;max-height:none!important;min-height:260px!important}',
 '.dv-pdf-fullscreen .seo-pdf-frame-wrap iframe{height:100%!important;min-height:260px!important}',
 '.dv-pdf-fullscreen.dp-viewer iframe{height:calc(100dvh - 75px)!important;min-height:260px!important}',
 '.dv-pdf-fullscreen.dp-viewer{padding-top:60px!important}',
 '.dv-pdf-fullscreen.dp-viewer .dv-pdf-fullscreen-control{position:absolute;top:12px;right:12px;z-index:3}',
 '@media(max-width:820px){.dv-pdf-native .seo-pdf-reader-head{display:block}.dv-pdf-native .seo-pdf-actions{display:flex;flex-direction:column;align-items:stretch}.dv-pdf-native .seo-pdf-actions a{min-height:48px;justify-content:center}.article-pdf .seo-pdf-reader{display:none!important}.dp-viewer.dv-pdf-native{display:none!important}}'
 ].join('\n');
 document.head.appendChild(el);
}
function setupFullscreen(host){
 if(!host||host.querySelector('.dv-pdf-fullscreen-control'))return;
 const button=document.createElement('button');
 button.type='button';button.className='dv-pdf-fullscreen-control';
 const toolbar=host.classList.contains('seo-pdf-reader')?(host.querySelector('.seo-pdf-reader-head')||host):host;
 toolbar.append(button);
 let overlay=false;
 const update=()=>{
  const active=overlay||document.fullscreenElement===host;
  host.classList.toggle('dv-pdf-fullscreen',active);
  button.textContent=active?'Réduire le lecteur':'Agrandir le lecteur';
  button.setAttribute('aria-label',active?'Quitter le plein écran PDF':'Agrandir le lecteur PDF');
  button.setAttribute('aria-pressed',String(active));
 };
 const release=()=>{overlay=false;host.classList.remove('dv-pdf-overlay');locked.delete(host);if(!locked.size)document.body.classList.remove('dv-pdf-no-scroll');update();};
 const fallback=()=>{overlay=true;host.classList.add('dv-pdf-overlay');locked.add(host);document.body.classList.add('dv-pdf-no-scroll');update();};
 button.addEventListener('click',async()=>{
  if(overlay){release();return;}
  if(document.fullscreenElement===host){try{await document.exitFullscreen();}catch(e){console.warn('PDF sortie du plein écran',e);}return;}
  try{if(!host.requestFullscreen)throw new Error('API non disponible');await host.requestFullscreen();update();}
  catch(e){fallback();}
 });
 document.addEventListener('fullscreenchange',update);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&overlay)release();});
 update();
}
async function desktopReader(host,source,frame,status){
 if(host.dataset.dvLoaded||host.dataset.dvLoading)return;
 host.dataset.dvLoading='1';
 try{
  const response=await fetch(source,{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const blob=await response.blob();
  if(blob.type&&!/pdf/i.test(blob.type))throw new Error('Document inattendu');
  const url=URL.createObjectURL(blob);urls.add(url);
  frame.addEventListener('load',()=>{if(status)status.hidden=true},{once:true});
  frame.src=url+'#page=1&zoom=page-width';
  host.dataset.dvLoaded='1';
 }catch(e){
  console.error('Diploval lecteur PDF :',e);
  frame.hidden=true;
  if(status){status.hidden=false;status.textContent='La lecture intégrée est indisponible. Vous pouvez ouvrir ou télécharger le PDF.';}
 }finally{delete host.dataset.dvLoading;}
}
function inView(host,callback){
 if('IntersectionObserver' in window){
  const o=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){o.disconnect();callback();}},{rootMargin:'400px 0px'});
  o.observe(host);
 }else callback();
}
style();
document.querySelectorAll('[data-pdf-viewer]').forEach(host=>{
 const source=host.dataset.pdfSrc,frame=host.querySelector('[data-pdf-frame]'),status=host.querySelector('[data-pdf-status]');
 if(!source||!frame)return;
 if(mobile()){
  host.classList.add('dv-pdf-native');
  const first=host.querySelector('.seo-pdf-actions a:not([download])');
  if(first){first.textContent='Lire le PDF';first.href=source;first.target='_blank';first.rel='noopener';}
  if(!host.querySelector('.dv-pdf-reader-hint')){
   const hint=document.createElement('p');hint.className='dv-pdf-reader-hint';
   hint.textContent='Le PDF s’ouvre dans le lecteur du téléphone. Vous pouvez passer en paysage si vous préférez.';
   const header=host.querySelector('.seo-pdf-reader-head');
   if(header)header.insertAdjacentElement('afterend',hint);
  }
  frame.hidden=true;if(status)status.hidden=true;
 }else{
  setupFullscreen(host);
  inView(host,()=>desktopReader(host,source,frame,status));
 }
});
const consult=document.getElementById('dp-pdf-frame');
if(consult){
 const host=consult.closest('.dp-viewer');
 if(host){
  if(mobile()){host.classList.add('dv-pdf-native');consult.hidden=true;}
  else setupFullscreen(host);
 }
}
window.DiplovalPDFViewer={isMobile:mobile,setupFullscreen};
window.addEventListener('beforeunload',()=>urls.forEach(url=>URL.revokeObjectURL(url)));
})();