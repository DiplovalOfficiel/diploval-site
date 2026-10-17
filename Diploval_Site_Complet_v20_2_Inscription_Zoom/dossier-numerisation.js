(()=>{
  const tabs=[...document.querySelectorAll('.dp-tab')],panels=[...document.querySelectorAll('.dp-panel')];
  const form=document.getElementById('dp-form');
  const typeField=document.getElementById('contribution-type');
  const contribution=form?.querySelector('[name="contribution"]');
  const email=form?.querySelector('[name="email"]');
  const errorBox=document.createElement('div');
  errorBox.className='dp-form-error';
  errorBox.setAttribute('role','alert');
  errorBox.setAttribute('aria-live','polite');
  form?.prepend(errorBox);
  const pdfFrame=document.getElementById('dp-pdf-frame');
  let pdfBlobUrl='';
  let pdfLoading=null;
  async function loadPdfViewer(){
    if(!pdfFrame || pdfFrame.dataset.loaded==='true') return;
    if(pdfLoading) return pdfLoading;
    const source=pdfFrame.dataset.pdfSrc;
    if(!source) return;
    pdfLoading=(async()=>{
      try{
        const response=await fetch(source,{credentials:'same-origin',cache:'no-store'});
        if(!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob=await response.blob();
        pdfBlobUrl=URL.createObjectURL(blob);
        pdfFrame.src=`${pdfBlobUrl}#page=1&zoom=page-width`;
        pdfFrame.dataset.loaded='true';
      }catch(error){
        console.error('Diploval PDF viewer:',error);
        const viewer=pdfFrame.closest('.dp-viewer');
        if(viewer){
          const fallback=document.createElement('div');
          fallback.className='dp-pdf-fallback';
          fallback.innerHTML='<strong>Le lecteur intégré n’a pas pu charger le document.</strong><span>Le PDF reste disponible directement : </span><a href="'+source+'" target="_blank" rel="noopener">ouvrir le dossier dans un nouvel onglet</a>';
          viewer.replaceChildren(fallback);
        }
      }finally{pdfLoading=null}
    })();
    return pdfLoading;
  }
  window.addEventListener('beforeunload',()=>{if(pdfBlobUrl)URL.revokeObjectURL(pdfBlobUrl)});
  function showError(message,focus){errorBox.textContent=message;errorBox.classList.add('is-visible');focus?.focus()}
  function clearError(){errorBox.textContent='';errorBox.classList.remove('is-visible')}
  function panel(name){tabs.forEach(b=>{const active=b.dataset.panel===name;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});panels.forEach(p=>p.classList.toggle('active',p.id==='panel-'+name));if(name==='lire')loadPdfViewer();document.querySelector('.dp-tabs-shell')?.scrollIntoView({behavior:'smooth',block:'start'})}
  tabs.forEach(b=>b.addEventListener('click',()=>panel(b.dataset.panel)));
  document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>panel(b.dataset.jump)));
  function review(){
    const target=document.getElementById('dp-review');if(!target||!form)return;
    const dl=document.createElement('dl');
    [['Type de contribution',typeField?.value],['Votre contribution',contribution?.value],['Partie concernée',form.elements.partie_dossier?.value],['Source ou référence',form.elements.source?.value],['Alternative proposée',form.elements.alternative?.value]].forEach(([label,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value?.trim()||'Non renseigné';dl.append(dt,dd)});
    target.replaceChildren(dl);
  }
  function step(n){clearError();document.querySelectorAll('.dp-formstep').forEach(x=>x.classList.toggle('active',x.dataset.formstep==n));document.querySelectorAll('.dp-stepbtn').forEach(x=>{const active=x.dataset.step==n;x.classList.toggle('active',active);if(active)x.setAttribute('aria-current','step');else x.removeAttribute('aria-current')});if(Number(n)===4)review();const heading=document.querySelector('.dp-formstep.active h3');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true})}}
  document.querySelectorAll('.dp-choice').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.dp-choice').forEach(x=>{x.classList.remove('selected');x.setAttribute('aria-pressed','false')});b.classList.add('selected');b.setAttribute('aria-pressed','true');if(typeField)typeField.value=b.textContent.trim();clearError()}));
  document.querySelectorAll('[data-next]').forEach(b=>b.addEventListener('click',()=>{
    const current=b.closest('.dp-formstep')?.dataset.formstep;
    if(current==='1' && !typeField?.value){showError('Choisissez d’abord le type de contribution.',document.querySelector('.dp-choice'));return}
    if(current==='2' && !contribution?.value.trim()){showError('Expliquez votre contribution avant de continuer.',contribution);return}
    step(b.dataset.next)
  }));
  document.querySelectorAll('[data-prev]').forEach(b=>b.addEventListener('click',()=>step(b.dataset.prev)));
  document.querySelectorAll('.dp-stepbtn').forEach(b=>b.addEventListener('click',()=>{
    const target=Number(b.dataset.step||1);
    if(target>1 && !typeField?.value){step(1);showError('Choisissez d’abord le type de contribution.',document.querySelector('.dp-choice'));return}
    if(target>2 && !contribution?.value.trim()){step(2);showError('Expliquez votre contribution avant de continuer.',contribution);return}
    step(target)
  }));
  const today=()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).reduce((a,x)=>{a[x.type]=x.value;return a},{});return `${parts.year}-${parts.month}-${parts.day}`};
  function isOpen(){if(!form)return false;const d=today();return form.dataset.status==='Consultation ouverte'&&(!form.dataset.opens||d>=form.dataset.opens.slice(0,10))&&(!form.dataset.closes||d<=form.dataset.closes.slice(0,10))}
  function refreshAvailability(){if(!form||isOpen())return;form.querySelectorAll('input,select,textarea,button').forEach(x=>x.disabled=true);showError('Le recueil des contributions n’est pas ouvert. Consultez le calendrier et les suites du dossier.');}
  refreshAvailability();window.addEventListener('focus',refreshAvailability);
  form?.addEventListener('submit',event=>{
    clearError();
    if(!isOpen()){event.preventDefault();refreshAvailability();return}
    if(!typeField?.value){event.preventDefault();step(1);showError('Choisissez le type de contribution.',document.querySelector('.dp-choice'));return}
    if(!contribution?.value.trim()){event.preventDefault();step(2);showError('Votre contribution ne peut pas être vide.',contribution);return}
    if(!email?.checkValidity()){event.preventDefault();step(4);email?.reportValidity();return}
    const acknowledgement=form.querySelector('[name="acknowledgement"]');
    if(!acknowledgement?.checked){event.preventDefault();step(4);showError('Confirmez la relecture de votre contribution et la prise de connaissance de l’utilisation de vos coordonnées.',acknowledgement);return}
    if(!form.checkValidity()){event.preventDefault();form.reportValidity();return}
    const submit=form.querySelector('[type="submit"]');if(submit){submit.disabled=true;submit.textContent='Envoi en cours…'}
    // A native POST preserves Netlify Forms and its success/error navigation.
    // Re-enable after a navigation failure or a return from browser history.
    setTimeout(()=>{if(submit){submit.disabled=false;submit.textContent='Envoyer la contribution →'}},15000);
  });
  window.addEventListener('pageshow',()=>{const b=form?.querySelector('[type="submit"]');if(b){b.disabled=false;b.textContent='Envoyer la contribution →'}refreshAvailability()});
})();
