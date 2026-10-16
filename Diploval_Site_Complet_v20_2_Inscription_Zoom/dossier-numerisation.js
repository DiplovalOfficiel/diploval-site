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
  function showError(message,focus){errorBox.textContent=message;errorBox.classList.add('is-visible');focus?.focus()}
  function clearError(){errorBox.textContent='';errorBox.classList.remove('is-visible')}
  function panel(name){tabs.forEach(b=>b.classList.toggle('active',b.dataset.panel===name));panels.forEach(p=>p.classList.toggle('active',p.id==='panel-'+name));document.querySelector('.dp-tabs-shell')?.scrollIntoView({behavior:'smooth',block:'start'})}
  tabs.forEach(b=>b.addEventListener('click',()=>panel(b.dataset.panel)));
  document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>panel(b.dataset.jump)));
  function step(n){clearError();document.querySelectorAll('.dp-formstep').forEach(x=>x.classList.toggle('active',x.dataset.formstep==n));document.querySelectorAll('.dp-stepbtn').forEach(x=>x.classList.toggle('active',x.dataset.step==n))}
  document.querySelectorAll('.dp-choice').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.dp-choice').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');if(typeField)typeField.value=b.textContent.trim();clearError()}));
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
  form?.addEventListener('submit',event=>{
    clearError();
    if(!typeField?.value){event.preventDefault();step(1);showError('Choisissez le type de contribution.',document.querySelector('.dp-choice'));return}
    if(!contribution?.value.trim()){event.preventDefault();step(2);showError('Votre contribution ne peut pas être vide.',contribution);return}
    if(!email?.checkValidity()){event.preventDefault();step(4);email?.reportValidity();return}
  });
})();
