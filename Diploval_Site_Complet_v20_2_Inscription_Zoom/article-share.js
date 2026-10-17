(()=>{
  const box=document.querySelector('[data-article-share]');if(!box)return;
  const url=document.querySelector('link[rel="canonical"]')?.href||location.href;
  const title=document.querySelector('h1')?.textContent||document.title;
  const status=box.querySelector('[role="status"]');
  const copy=async()=>{try{await navigator.clipboard.writeText(url);status.textContent='Lien de l’article copié.';}catch{status.textContent='Copiez ce lien : '+url;}};
  box.querySelector('[data-copy-article]')?.addEventListener('click',copy);
  const share=box.querySelector('[data-native-share]');if(share){share.hidden=!navigator.share;share.addEventListener('click',async()=>{try{await navigator.share({title,url});}catch(error){if(error.name!=='AbortError')status.textContent='Le partage n’a pas abouti. Vous pouvez copier le lien.'}});}
})();
