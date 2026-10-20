(()=>{
  'use strict';

  const viewers=[...document.querySelectorAll('[data-pdf-viewer]')];
  if(!viewers.length)return;

  const blobUrls=new Set();
  const mobileLike=()=>{
    const ua=navigator.userAgent||'';
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || window.matchMedia('(max-width: 820px)').matches;
  };

  function installMobileStyles(){
    if(document.getElementById('diploval-pdf-mobile-styles'))return;
    const style=document.createElement('style');
    style.id='diploval-pdf-mobile-styles';
    style.textContent=`
      @media (max-width:820px){
        .seo-pdf-reader.is-mobile-fallback .seo-pdf-frame-wrap{
          min-height:0!important;
          height:auto!important;
          overflow:visible!important;
          border:0!important;
          background:transparent!important;
        }
        .seo-pdf-reader.is-mobile-fallback [data-pdf-frame]{display:none!important}
        .seo-pdf-reader.is-mobile-fallback [data-pdf-status]{
          position:relative!important;
          inset:auto!important;
          min-height:0!important;
          padding:1rem!important;
          border:1px solid rgba(10,39,69,.10)!important;
          border-radius:13px!important;
          background:#f7f8f7!important;
          color:#5f7080!important;
          gap:.55rem!important;
        }
        .seo-pdf-mobile-icon{
          width:42px;height:42px;display:grid;place-items:center;
          border-radius:12px;background:#fff;border:1px solid rgba(10,39,69,.10);
          color:#0a2745;font-size:1.35rem;font-weight:800;
        }
        .seo-pdf-mobile-title{color:#0a2745;font-weight:850;font-size:.92rem;text-align:center}
        .seo-pdf-mobile-copy{max-width:390px;margin:0;text-align:center;font-size:.8rem;line-height:1.5;color:#657786}
        .seo-pdf-mobile-open{
          display:inline-flex;align-items:center;justify-content:center;
          min-height:46px;margin-top:.15rem;padding:.68rem .9rem;border-radius:10px;
          background:#0a2745;color:#fff!important;text-decoration:none!important;
          font-weight:800;font-size:.82rem;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function mobileFallback(viewer,source){
    installMobileStyles();
    viewer.classList.add('is-mobile-fallback');
    viewer.dataset.loaded='true';
    const frame=viewer.querySelector('[data-pdf-frame]');
    const status=viewer.querySelector('[data-pdf-status]');
    if(frame)frame.hidden=true;
    if(status){
      status.hidden=false;
      status.classList.remove('is-error');
      status.innerHTML=`
        <span class="seo-pdf-mobile-icon" aria-hidden="true">PDF</span>
        <strong class="seo-pdf-mobile-title">Document officiel disponible</strong>
        <p class="seo-pdf-mobile-copy">Sur certains navigateurs mobiles, l’affichage d’un PDF à l’intérieur d’une page est bloqué. Le document reste consultable en ligne dans un nouvel onglet.</p>
        <a class="seo-pdf-mobile-open" href="${source}" target="_blank" rel="noopener">Ouvrir le PDF officiel →</a>
      `;
    }
  }

  async function loadViewer(viewer){
    if(viewer.dataset.loaded==='true'||viewer.dataset.loading==='true')return;
    const source=viewer.dataset.pdfSrc;
    const frame=viewer.querySelector('[data-pdf-frame]');
    const status=viewer.querySelector('[data-pdf-status]');
    if(!source||!frame)return;

    if(mobileLike()){
      mobileFallback(viewer,source);
      return;
    }

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
