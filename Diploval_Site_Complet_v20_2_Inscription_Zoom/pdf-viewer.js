(()=>{
'use strict';
const mobile=()=>/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'')||(window.matchMedia&&window.matchMedia('(max-width:820px)').matches);
const urls=new Set();
const libUrl='https://unpkg.com/pdfjs-dist@4.10.38/legacy/build/pdf.mjs';
const workerUrl='https://unpkg.com/pdfjs-dist@4.10.38/legacy/build/pdf.worker.mjs';
let libPromise;
function pdfLib(){return libPromise||(libPromise=import(libUrl).then(m=>{m.GlobalWorkerOptions.workerSrc=workerUrl;return m}));}
function styles(){
 if(document.getElementById('dv-pdf-styles'))return;
 const s=document.createElement('style');s.id='dv-pdf-styles';
 s.textContent=[
 '.dv-pdf-mobile .seo-pdf-frame-wrap{height:auto!important;min-height:0!important;overflow:visible!important;padding:12px!important}',
 '.dv-pdf-mobile [data-pdf-frame],.dv-pdf-mobile .seo-pdf-status{display:none!important}',
 '.dp-viewer.dv-pdf-mobile iframe{display:none!important}',
 '.dp-viewer.dv-pdf-mobile{height:auto!important;min-height:0!important}',
 '.dv-pdf-reader{width:100%;min-width:0;text-align:center;color:#0a2745}',
 '.dv-pdf-controls{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:9px;padding:10px 0 14px}',
 '.dv-pdf-controls button,.dv-pdf-controls input{font:inherit;font-size:14px;padding:10px 12px;border:1px solid #b7c7d1;border-radius:8px;background:#fff;color:#0a2745}',
 '.dv-pdf-controls button{cursor:pointer;min-height:44px;font-weight:700}',
 '.dv-pdf-controls button:disabled{opacity:.45;cursor:default}',
 '.dv-pdf-controls input{width:65px;text-align:center;min-height:44px;box-sizing:border-box}',
 '.dv-pdf-reader canvas{display:block;max-width:100%;height:auto!important;margin:0 auto;background:#fff;box-shadow:0 3px 15px rgba(0,0,0,.12)}',
 '.dv-pdf-canvas-wrap{width:100%;overflow-x:auto;padding:4px 0 12px}',
 '.dv-pdf-status{font-size:14px;line-height:1.55;padding:10px 6px;color:#4a6070}',
 '.dv-pdf-links{display:flex;justify-content:center;flex-wrap:wrap;gap:10px;padding:8px 0 12px}',
 '.dv-pdf-links a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:9px 14px;border:1px solid #0a2745;border-radius:9px;background:#0a2745;color:#fff!important;text-decoration:none!important;font-weight:700;font-size:14px}',
 '.dv-pdf-links a+a{background:#fff;color:#0a2745!important}'
 ].join('');
 document.head.appendChild(s);
}
// Large documents render one page at a time to avoid mobile memory exhaustion.
async function mobileReader(host,source,frame,status){
 if(host.dataset.dvLoaded||host.dataset.dvLoading)return;
 host.dataset.dvLoading='1';styles();host.classList.add('dv-pdf-mobile');
 if(frame){frame.hidden=true;frame.style.display='none';}
 if(status)status.hidden=true;
 const reader=document.createElement('div');reader.className='dv-pdf-reader';
 reader.innerHTML='<nav class="dv-pdf-controls" aria-label="Navigation PDF"><button type="button" data-prev>Précédente</button><label>Page <input type="number" min="1" value="1" data-page aria-label="Numéro de page"></label><span data-total></span><button type="button" data-next>Suivante</button></nav><div class="dv-pdf-canvas-wrap"><canvas aria-label="Page du document PDF"></canvas></div><p class="dv-pdf-status" role="status" aria-live="polite">Chargement du document…</p><div class="dv-pdf-links"></div>';
 const links=reader.querySelector('.dv-pdf-links');
 const open=document.createElement('a');open.href=source;open.target='_blank';open.rel='noopener';open.textContent='Ouvrir le PDF';
 const down=document.createElement('a');down.href=source;down.download='';down.textContent='Télécharger le PDF';links.append(open,down);
 const canvas=reader.querySelector('canvas'),counter=reader.querySelector('[data-page]'),total=reader.querySelector('[data-total]'),prev=reader.querySelector('[data-prev]'),next=reader.querySelector('[data-next]'),msg=reader.querySelector('.dv-pdf-status');
 const mount=host.classList.contains('seo-pdf-reader')?host.querySelector('.seo-pdf-frame-wrap'):host;
 mount.append(reader);
 try{
  const pdfjs=await pdfLib(),pdf=await pdfjs.getDocument({url:source}).promise;
  total.textContent='/ '+pdf.numPages;counter.max=String(pdf.numPages);let current=1,pending=Promise.resolve();
  function render(value){
   const n=Math.min(pdf.numPages,Math.max(1,Number(value)||1));
   pending=pending.catch(()=>{}).then(async()=>{
    msg.textContent='Affichage de la page '+n+'…';
    const page=await pdf.getPage(n),unit=page.getViewport({scale:1});
    const width=Math.max(180,Math.min(900,reader.querySelector('.dv-pdf-canvas-wrap').clientWidth-12));
    const scale=Math.min(2,Math.max(.25,width/unit.width)),density=Math.min(2,window.devicePixelRatio||1);
    const viewport=page.getViewport({scale:scale*density});
    canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    canvas.style.width=Math.round(unit.width*scale)+'px';canvas.style.height=Math.round(unit.height*scale)+'px';
    await page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport}).promise;
    current=n;counter.value=String(n);prev.disabled=n<=1;next.disabled=n>=pdf.numPages;msg.textContent='Page '+n+' sur '+pdf.numPages+'.';
    page.cleanup();
   });return pending;
  }
  prev.addEventListener('click',()=>render(current-1));next.addEventListener('click',()=>render(current+1));
  counter.addEventListener('change',()=>render(counter.value));await render(1);
  host.dataset.dvLoaded='1';
 }catch(e){
  console.error('Diploval PDF mobile:',e);
  reader.querySelector('.dv-pdf-controls').hidden=true;reader.querySelector('.dv-pdf-canvas-wrap').hidden=true;
  msg.textContent='La lecture intégrée est indisponible sur cet appareil. Vous pouvez ouvrir ou télécharger le PDF.';
 }finally{delete host.dataset.dvLoading}
}
async function desktopReader(viewer,source,frame,status){
 if(viewer.dataset.dvLoaded||viewer.dataset.dvLoading)return;
 viewer.dataset.dvLoading='1';
 try{
  const response=await fetch(source,{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const blob=await response.blob(),url=URL.createObjectURL(blob);urls.add(url);
  frame.addEventListener('load',()=>{if(status)status.hidden=true},{once:true});
  frame.src=url+'#page=1&zoom=page-width';viewer.dataset.dvLoaded='1';
 }catch(e){
  console.error('Diploval PDF:',e);if(status){status.hidden=false;status.textContent='Le lecteur intégré ne peut pas afficher le document. Utilisez le lien de téléchargement.';}frame.hidden=true;
 }finally{delete viewer.dataset.dvLoading}
}
function inView(el,callback){
 if('IntersectionObserver' in window){
  const obs=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){obs.disconnect();callback();}},{rootMargin:'400px 0px'});obs.observe(el);
 }else callback();
}
document.querySelectorAll('[data-pdf-viewer]').forEach(v=>{
 const source=v.dataset.pdfSrc,frame=v.querySelector('[data-pdf-frame]'),status=v.querySelector('[data-pdf-status]');
 if(source&&frame)inView(v,()=>mobile()?mobileReader(v,source,frame,status):desktopReader(v,source,frame,status));
});
const consultFrame=document.getElementById('dp-pdf-frame');
if(consultFrame&&mobile()){
 const host=consultFrame.closest('.dp-viewer'),source=consultFrame.dataset.pdfSrc;
 if(host&&source)inView(host,()=>mobileReader(host,source,consultFrame,null));
}
window.DiplovalPDFViewer={isMobile:mobile};
window.addEventListener('beforeunload',()=>urls.forEach(u=>URL.revokeObjectURL(u)));
})();