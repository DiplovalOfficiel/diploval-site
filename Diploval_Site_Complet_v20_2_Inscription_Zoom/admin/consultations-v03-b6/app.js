(() => {
 'use strict';
 // Démonstration exclusivement : aucune API, aucun stockage, aucun courrier.
 const data=()=>[
  {id:'example-1',reference:'CE-2026-A1B2C3D4E5F6',topic:'Engagements électoraux',status:'pending',
   date:'17 novembre 2026',target:'24 novembre 2026',late:false,
   question:'Comment informer les citoyens des étapes de mise en œuvre des engagements et des difficultés rencontrées, sans promettre une exécution automatique ?',
   response:null},
  {id:'example-2',reference:'CE-2026-B1C2D3E4F5A6',topic:'Charte du dialogue',status:'pending',
   date:'5 novembre 2026',target:'12 novembre 2026',late:true,
   question:'Comment prendre en compte les nouvelles informations dans un échange contradictoire sans transformer le changement d’avis d’une personne en accusation personnelle ?',
   response:null},
  {id:'example-3',reference:'CE-2026-C1D2E3F4A5B6',topic:'Engagements électoraux',status:'appeal',
   date:'16 novembre 2026',target:'30 novembre 2026',late:false,
   question:'Je demande la réévaluation d’une contribution fictive précédemment refusée, afin de préciser sa portée et de fournir les sources utiles.',
   response:null},
  {id:'example-4',reference:'CE-2026-D1E2F3A4B5C6',topic:'Charte du dialogue',status:'closed',
   date:'18 novembre 2026',target:null,late:false,
   question:'Une contribution fictive a été examinée et sa décision a été consignée. Aucun nouvel objectif de délai n’est ajouté.',
   response:{status:'approved',message:'Votre contribution fictive a fait l’objet d’un examen. La décision est consultable dans votre dossier de démonstration.',draftedBy:'Examinateur A',approvedBy:'Superviseur B'}}
 ];
 let cases=data(),selected='example-1';
 const byId=id=>document.getElementById(id);
 const role=byId('role'),filter=byId('filter');
 const labels={pending:'À examiner',appeal:'Recours en cours',closed:'Décision enregistrée'};
 const make=(tag,cls,value)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(value!==undefined)node.textContent=String(value);
  return node;
 };
 const notice=message=>byId('announcement').textContent=message;
 const clear=el=>el.replaceChildren();
 const matches=r=>filter.value==='all'||filter.value===r.status
   ||filter.value==='late'&&r.late;
 const current=()=>cases.find(r=>r.id===selected&&matches(r));
 function stats(){
  byId('stat-pending').textContent=String(cases.filter(x=>x.status!=='closed').length);
  byId('stat-late').textContent=String(cases.filter(x=>x.late).length);
  byId('stat-drafts').textContent=String(cases.filter(x=>x.response?.status==='draft').length);
  byId('stat-approved').textContent=String(cases.filter(x=>x.response?.status==='approved').length);
 }
 function list(){
  const parent=byId('cases');clear(parent);
  const items=cases.filter(matches);
  if(!items.length){parent.append(make('p','empty','Aucun dossier fictif correspondant.'));return}
  if(!items.some(c=>c.id===selected))selected=items[0].id;
  items.forEach(r=>{
   const button=make('button','case'+(r.id===selected?' selected':''));button.type='button';
   button.setAttribute('aria-pressed',String(r.id===selected));
   button.append(make('span','reference',r.reference),make('strong','',r.topic));
   button.append(make('span','status '+(r.late?'late':r.status),
    r.late?'Objectif indicatif dépassé':labels[r.status]));
   button.append(make('span','mini',
    r.target?'Objectif fictif : '+r.target:'Dossier examiné · sans nouveau délai'));
   button.addEventListener('click',()=>{selected=r.id;render()});
   parent.append(button);
  });
 }
 function contentCard(title,body,alert=false){
  const card=make('article','content-card'+(alert?' alert':''));
  card.append(make('h3','',title),make('p','',body));
  return card;
 }
 function detail(){
  const root=byId('detail');clear(root);
  const r=current();
  if(!r){
   byId('detail-heading').textContent='Aucun dossier';
   byId('detail-caption').textContent='';
   root.append(make('p','empty','Modifiez le filtre pour choisir un dossier.'));
   return;
  }
  byId('detail-heading').textContent=r.reference;
  byId('detail-caption').textContent=r.topic+' · dépôt fictif le '+r.date;
  const row=make('div','meta');
  row.append(make('span','',labels[r.status]),make('span','','Délais internes simulés'));
  root.append(row);
  root.append(contentCard('Contribution ou recours de démonstration',r.question));
  const expected=r.target
   ?'Objectif indicatif fictif : '+r.target+(r.late?' · attention requise':' · dans la période simulée')
   :'Décision enregistrée. Aucun nouvel objectif de traitement automatique.';
  root.append(contentCard('Suivi du traitement',expected,r.late));
  const noticeCard=make('article','content-card');
  noticeCard.append(make('h3','','Réponse au contributeur'));
  if(!r.response)noticeCard.append(make('p','muted','Aucune réponse préparée dans cette simulation.'));
  else{
   noticeCard.append(make('p','',r.response.message));
   noticeCard.append(make('p','muted',r.response.status==='draft'
    ?'Brouillon rédigé par '+r.response.draftedBy+' · inaccessible au contributeur.'
    :'Approuvée par '+r.response.approvedBy+' · visible dans le dossier fictif du contributeur, aucun courriel envoyé.'));
  }
  root.append(noticeCard);
  const form=make('form');
  const reviewRole=role.value==='reviewer',supervisor=role.value==='supervisor';
  const canDraft=reviewRole&&!r.response;
  const canApprove=supervisor&&r.response?.status==='draft';
  const heading=canDraft?'Préparer une réponse privée':canApprove?'Seconde validation humaine':'Décisions interdites ou déjà traitées';
  form.append(make('h3','',heading));
  if(canDraft){
   const label=make('label','','Texte de la réponse destinée au contributeur');
   const textarea=make('textarea');textarea.required=true;textarea.minLength=20;textarea.maxLength=2000;
   textarea.placeholder='Expliquez les étapes, demandes de précision ou suites envisagées…';
   label.append(textarea);form.append(label);
   form.append(make('p','',"Un examinateur prépare cette réponse. Elle devra ensuite être approuvée par un superviseur distinct."));
   const actions=make('div','actions');
   const submit=make('button','button','Enregistrer le brouillon fictif');submit.type='submit';
   actions.append(submit);form.append(actions);
   form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    const content=textarea.value.trim();
    if(content.length<20){notice('La réponse doit contenir au moins 20 caractères.');return}
    r.response={status:'draft',message:content,draftedBy:'Examinateur A',approvedBy:null};
    notice('Réponse fictive préparée. Aucune publication ni notification envoyée.');
    render();
   });
  }else if(canApprove){
   form.append(make('p','',"Ce message a été préparé par l’Examinateur A. Le superviseur B peut le rendre visible dans le dossier fictif, après relecture."));
   const btn=make('button','button','Approuver dans la démonstration');btn.type='button';
   btn.addEventListener('click',()=>{
    r.response.status='approved';r.response.approvedBy='Superviseur B';
    notice('Seconde validation fictive effectuée. Aucun courrier réel envoyé.');
    render();
   });
   form.append(btn);
  }else{
   let message='Sélectionnez le rôle Examinateur pour rédiger une réponse.';
   if(supervisor&&!r.response)message='Un examinateur doit d’abord préparer le texte.';
   else if(reviewRole&&r.response?.status==='draft')message='La réponse attend le contrôle d’un superviseur distinct.';
   else if(r.response?.status==='approved')message='Réponse déjà approuvée dans la démonstration.';
   form.append(make('p','',message));
  }
  root.append(form);
 }
 function render(){stats();list();detail()}
 role.addEventListener('change',()=>{notice('Rôle fictif sélectionné : '+role.selectedOptions[0].textContent);render()});
 filter.addEventListener('change',()=>{selected='';render()});
 byId('reset').addEventListener('click',()=>{
  cases=data();selected='example-1';role.value='reviewer';filter.value='all';
  render();notice('Données fictives réinitialisées. Aucun dossier réel modifié.');
 });
 render();
})();
