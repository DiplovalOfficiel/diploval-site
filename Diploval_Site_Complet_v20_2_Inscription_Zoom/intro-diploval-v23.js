/* Introduction facultative, une fois par session. Le site reste accessible si le script échoue. */
(() => {
  const dialog=document.getElementById('dv-opening');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  if(!dialog||typeof dialog.showModal!=='function'||motion.matches||document.hidden||location.hash)return;
  try{
    if(sessionStorage.getItem('diploval-opening-v1'))return;
    sessionStorage.setItem('diploval-opening-v1','1');
  }catch{return;}
  let timer;
  const close=()=>{clearTimeout(timer);if(dialog.open)dialog.close();};
  dialog.querySelector('.dv-opening-skip')?.addEventListener('click',close);
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('animationend',e=>{if(e.target===dialog&&e.animationName==='dv-opening-exit')close();});
  motion.addEventListener('change',e=>{if(e.matches)close();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)close();});
  timer=setTimeout(close,4000);
  try{dialog.showModal();}catch{close();}
})();
