(()=>{
  'use strict';
  const viewers=[...document.querySelectorAll('[data-pdf-viewer]')];
  if(!viewers.length)return;
  const blobUrls=new Set();

  async function loadViewer(viewer){
    if(viewer.dataset.loaded==='true'||viewer.dataset.loading==='true')return;
    const source=viewer.dataset.pdfSrc;
    const frame=viewer.querySelector('[data-pdf-frame]');
    const status=viewer.querySelector('[data-pdf-status]');
    if(!source||!frame)return;
    viewer.dataset.loading='true';
    try{
      const response=await fetch(source,{credentials:'same-origin',cache:'no-store'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const blob=await response.blob();
      const url=URL.createObjectURL(blob);
      blobUrls.add(url);
      frame.addEventListener('load',()=>{if(status)status.hidden=true},{once:true});
      frame.src=`${url}#page=1&zoom=page-width`;
      viewer.dataset.loaded='true';
    }catch(error){
      console.error('Diploval PDF viewer:',error);
      if(status){
        status.hidden=false;
        status.classList.add('is-error');
        status.innerHTML=`<strong>Le lecteur intégré n’a pas pu charger ce document.</strong><span>Vous pouvez toujours <a href="${source}" target="_blank" rel="noopener">ouvrir le PDF dans un nouvel onglet</a>.</span>`;
      }
      frame.hidden=true;
    }finally{
      delete viewer.dataset.loading;
    }
  }

  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){loadViewer(entry.target);observer.unobserve(entry.target)}
      });
    },{rootMargin:'500px 0px'});
    viewers.forEach(v=>observer.observe(v));
  }else viewers.forEach(loadViewer);

  window.addEventListener('beforeunload',()=>blobUrls.forEach(url=>URL.revokeObjectURL(url)));
})();
