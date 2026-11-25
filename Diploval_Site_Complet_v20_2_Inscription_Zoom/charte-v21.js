/* Carrousel de présentation : navigation au clavier et au toucher, sans lecture automatique. */
(() => {
 const track=document.querySelector('.dv-v2-intro__track');
 const links=Array.from(document.querySelectorAll('.dv-v2-intro__nav a'));
 if(!track||!links.length)return;
 const panels=Array.from(track.querySelectorAll('.dv-v2-intro__panel'));
 const setCurrent=()=>{
  const left=track.getBoundingClientRect().left;
  let current=0,distance=Infinity;
  panels.forEach((p,i)=>{const d=Math.abs(p.getBoundingClientRect().left-left);if(d<distance){current=i;distance=d;}});
  links.forEach((a,i)=>i===current?a.setAttribute('aria-current','true'):a.removeAttribute('aria-current'));
 };
 const go=i=>{const p=panels[i];if(!p)return;const offset=p.getBoundingClientRect().left-track.getBoundingClientRect().left+track.scrollLeft;track.scrollTo({left:offset,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});};
 links.forEach((a,i)=>a.addEventListener('click',e=>{e.preventDefault();go(i);}));
 track.addEventListener('scroll',setCurrent,{passive:true});
 track.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const current=Math.max(0,links.findIndex(a=>a.hasAttribute('aria-current')));go(e.key==='Home'?0:e.key==='End'?panels.length-1:Math.max(0,Math.min(panels.length-1,current+(e.key==='ArrowRight'?1:-1))));});
 track.classList.add('dv-enhanced');setCurrent();
})();
