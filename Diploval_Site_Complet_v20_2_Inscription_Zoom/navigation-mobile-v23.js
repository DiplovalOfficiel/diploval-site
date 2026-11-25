/* Diploval V2.3 — un contenu original, navigation mobile progressive. */
(() => {
  const mq=matchMedia('(max-width:760px)');
  const groups=[];
  const find=id=>document.getElementById(id);
  function setup(owner,container,entries,insertAfter){
    if(!owner||!container||entries.some(e=>!e.nodes.length||e.nodes.some(n=>!n)))return;
    const nav=document.createElement('nav');
    nav.className='dv-mobile-nav';
    nav.setAttribute('aria-label','Choisir la rubrique à consulter');
    const label=document.createElement('p');label.className='dv-mobile-nav__label';label.setAttribute('aria-live','polite');
    const buttons=document.createElement('div');buttons.className='dv-mobile-nav__buttons';
    const hint=document.createElement('p');hint.className='dv-mobile-nav__hint';hint.textContent='Faites glisser ou choisissez un numéro.';
    nav.append(label,buttons,hint);
    insertAfter.after(nav);
    const footer=document.createElement('nav');
    footer.className='dv-mobile-pager';footer.setAttribute('aria-label','Continuer la lecture des rubriques');
    const prev=document.createElement('button'),next=document.createElement('button');
    prev.type=next.type='button';prev.className='dv-mobile-pager-prev';next.className='dv-mobile-pager-next';
    footer.append(prev,next);container.append(footer);
    let active=0;
    const controls=entries.map((entry,i)=>{
      const button=document.createElement('button');button.type='button';button.textContent=String(i+1);
      button.dataset.dvIndex=String(i);button.setAttribute('aria-label',entry.label);
      if(entry.nodes.some(n=>n.id))button.setAttribute('aria-controls',entry.nodes.filter(n=>n.id).map(n=>n.id).join(' '));
      entry.nodes.forEach(n=>{n.classList.add('dv-mobile-panel');n.dataset.dvPanel=String(i);});
      buttons.append(button);return button;
    });
    function select(i){
      active=Math.max(0,Math.min(entries.length-1,i));
      entries.forEach((entry,j)=>entry.nodes.forEach(n=>n.classList.toggle('dv-mobile-inactive',j!==active)));
      controls.forEach((b,j)=>b.setAttribute('aria-pressed',String(j===active)));
      label.textContent=(active+1)+' / '+entries.length+' — '+entries[active].label;
      prev.hidden=active===0;next.hidden=active===entries.length-1;
      prev.textContent=active>0?'← '+entries[active-1].label:'';
      next.textContent=active<entries.length-1?entries[active+1].label+' →':'';
    }
    function continueTo(i){
      if(!mq.matches||i<0||i>=entries.length)return;
      select(i);
      requestAnimationFrame(()=>{
        controls[active].focus({preventScroll:true});
        const header=document.querySelector('.site-header');
        const offset=header?header.getBoundingClientRect().height:0;
        window.scrollTo({top:Math.max(0,window.scrollY+nav.getBoundingClientRect().top-offset-8),behavior:'instant'});
      });
    }
    prev.addEventListener('click',()=>continueTo(active-1));
    next.addEventListener('click',()=>continueTo(active+1));
    controls.forEach((button,i)=>button.addEventListener('click',()=>select(i)));
    nav.addEventListener('keydown',e=>{
      if(!mq.matches||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault();select(e.key==='Home'?0:e.key==='End'?entries.length-1:active+(e.key==='ArrowRight'?1:-1));controls[active].focus();
    });
    let touch=null;
    container.addEventListener('touchstart',e=>{
      if(!mq.matches||e.touches.length!==1||e.target.closest('input,textarea,select,button,a,[contenteditable],iframe')){touch=null;return;}
      const t=e.touches[0];touch={x:t.clientX,y:t.clientY};
    },{passive:true});
    container.addEventListener('touchcancel',()=>{touch=null;},{passive:true});
    container.addEventListener('touchend',e=>{
      if(!touch||!mq.matches||!e.changedTouches.length){touch=null;return;}
      const t=e.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;touch=null;
      if(Math.abs(dx)<65||Math.abs(dx)<Math.abs(dy)*1.6)return;
      continueTo(active+(dx<0?1:-1));
    },{passive:true});
    select(0);groups.push({owner,entries,select});
  }
  function sectionGroup(selector,items){
    const owner=document.querySelector(selector);if(!owner)return;
    setup(owner,owner,items.map(([id,label])=>({label,nodes:[find(id)]})),owner.querySelector(':scope>summary'));
  }
  sectionGroup('details.home-deep',[['publics','Nos publics'],['productions','Nos livrables'],['methode','Notre méthode'],['architecture','Nos fondamentaux']]);
  sectionGroup('details.home-more-info',[['garanties','Garanties et transparence'],['faq','Questions pratiques']]);
  const agenda=find('agenda'),shell=agenda?.querySelector('.agenda-shell');
  if(shell){
    const empty=(type,copy)=>{const p=document.createElement('p');p.className='dv-agenda-empty dv-agenda-empty-'+type;p.textContent=copy;return p;};
    const next=empty('next','Aucun prochain rendez-vous confirmé pour le moment.');
    const more=empty('more','Aucune autre date confirmée pour le moment.');
    const past=empty('past','Aucun rendez-vous passé affiché pour le moment.');
    find('admin-agenda-next').after(next);find('admin-agenda-more').after(more);find('admin-agenda-past').after(past);
    setup(agenda.closest('details'),shell,[
      {label:'Prochain rendez-vous',nodes:[find('admin-agenda-next'),next]},
      {label:'Prochaines dates',nodes:[find('admin-agenda-more'),more,shell.querySelector('.agenda-foot')]},
      {label:'Rendez-vous passés',nodes:[find('admin-agenda-past'),past]}
    ],shell.querySelector('.agenda-head'));
  }
  function reveal(target,scroll){
    if(!mq.matches||!target)return;
    for(const group of groups){
      const i=group.entries.findIndex(entry=>entry.nodes.some(n=>n===target||n.contains(target)));
      if(i<0)continue;
      group.owner.open=true;group.select(i);
      if(scroll)requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
    }
  }
  const hashTarget=()=>{try{return find(decodeURIComponent(location.hash.slice(1)));}catch{return null;}};
  window.addEventListener('hashchange',()=>reveal(hashTarget(),true));
  document.addEventListener('click',e=>{
    const a=e.target.closest?.('a[href^="#"],a[href^="/#"]');if(!a)return;
    try{reveal(find(decodeURIComponent(a.hash.slice(1))),false);}catch{}
  },true);
  mq.addEventListener('change',()=>reveal(hashTarget(),false));
  reveal(hashTarget(),Boolean(location.hash));
})();
