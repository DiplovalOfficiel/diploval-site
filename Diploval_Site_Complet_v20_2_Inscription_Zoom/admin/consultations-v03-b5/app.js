(() => {
 'use strict';
 // DEMONSTRATION EXCLUSIVEMENT : jeux de données construits en mémoire.
 // AUCUN appel réseau, stockage, cookie ou capacité réelle de publication.
 const initial=()=>[
  {id:'demo-a',reference:'CE-2026-AAAABBBB0001',consultation:'elections',
   type:'Contribution',date:'19 novembre 2026, 09 h 10',state:'pending',
   versions:[{number:1,status:'pending',text:'Comment garantir qu’un engagement électoral puisse être expliqué puis suivi après l’élection, sans réduire les contraintes institutionnelles à un simple slogan ?'}],history:[],appeal:null},
  {id:'demo-b',reference:'CE-2026-AAAABBBB0002',consultation:'dialogue',
   type:'Proposition pour la charte',date:'19 novembre 2026, 09 h 26',state:'pending',
   versions:[{number:1,status:'pending',text:'Une personne doit pouvoir changer d’avis et expliquer ce qui l’a conduite à réévaluer son argument. Les critiques doivent porter sur les idées et leurs effets, pas sur sa dignité.'}],history:[],appeal:null},
  {id:'demo-c',reference:'CE-2026-AAAABBBB0003',consultation:'elections',
   type:'Contribution',date:'18 novembre 2026, 16 h 04',state:'rejected',
   versions:[{number:1,status:'rejected',text:'Je propose de rapprocher les engagements électoraux de leur calendrier de mise en œuvre.'}],
   history:[{action:'Contribution refusée',date:'18 novembre, 17 h 12',reason:'Les éléments nécessaires à la comparaison doivent être précisés.'}],
   appeal:{status:'pending',reason:'Je demande un réexamen : ma proposition ne visait pas à présenter les engagements comme des obligations automatiques. Je peux apporter des précisions.',history:[]}},
  {id:'demo-d',reference:'CE-2026-AAAABBBB0004',consultation:'elections',
   type:'Contribution',date:'18 novembre 2026, 13 h 18',state:'approved',
   versions:[{number:1,status:'approved',text:'Publier un calendrier d’étapes, puis expliquer publiquement les retards et les obstacles rencontrés, pourrait permettre un suivi plus lisible.'}],
   history:[{action:'Publication validée',date:'18 novembre, 15 h 20',reason:'Contribution recevable et publication autorisée.'}],appeal:null},
  {id:'demo-e',reference:'CE-2026-AAAABBBB0005',consultation:'dialogue',
   type:'Contribution',date:'17 novembre 2026, 15 h 42',state:'withdrawn',
   versions:[{number:1,status:'approved',text:'Une publication fictive retirée pour illustrer la prudence et le contrôle humain.'}],
   history:[{action:'Publication retirée',date:'18 novembre, 10 h 30',reason:'Retrait fictif et motivé de la publication.'}],appeal:null}
 ];
 const $=id=>document.getElementById(id);
 let records=initial(),view='pending',selectedId=null;
 const role=$('demo-role'),consultation=$('demo-consultation');
 const states={pending:'À examiner',approved:'Publié',rejected:'Non retenu',withdrawn:'Retiré',
  escalated:'Transmis au superviseur',resolved:'Recours traité'};
 const themes={elections:'Engagements électoraux',dialogue:'Charte du dialogue'};
 const canReview=()=>['reviewer','supervisor'].includes(role.value);
 const canWithdraw=()=>role.value==='supervisor';
 const create=(tag,className,text)=>{
  const e=document.createElement(tag);if(className)e.className=className;
  if(text!==undefined)e.textContent=String(text);return e;
 };
 const reset=element=>element.replaceChildren();
 const announce=message=>$('announcer').textContent=message;
 const pill=(label,status)=>{
  const e=create('span','pill '+status,label);return e;
 };
 const matches=r=>consultation.value==='all'||r.consultation===consultation.value;
 const inView=r=>view==='pending'?r.state==='pending'
  :view==='appeals'?r.appeal&&['pending','escalated'].includes(r.appeal.status)
  :r.state!=='pending'||r.appeal?.status==='resolved';
 const visible=()=>records.filter(r=>matches(r)&&inView(r));
 function renderMetrics(){
  const items=records.filter(matches);
  $('metric-pending').textContent=String(items.filter(r=>r.state==='pending').length);
  $('metric-appeals').textContent=String(items.filter(r=>['pending','escalated'].includes(r.appeal?.status)).length);
  $('metric-resolved').textContent=String(items.filter(r=>r.state==='approved'||r.state==='rejected'||r.appeal?.status==='resolved').length);
  $('metric-withdrawn').textContent=String(items.filter(r=>r.state==='withdrawn').length);
 }
 function choose(id){
  selectedId=id;render();
 }
 function renderList(){
  const list=$('case-list');reset(list);
  const options=visible();
  if(!options.length){list.append(create('p','empty','Aucun dossier fictif dans cette rubrique.'));return}
  if(!options.some(r=>r.id===selectedId))selectedId=options[0].id;
  options.forEach(r=>{
   const button=create('button','case-button'+(r.id===selectedId?' selected':''));button.type='button';
   button.setAttribute('aria-pressed',String(r.id===selectedId));
   const meta=create('span','micro');
   meta.append(create('span','',r.reference),
    pill(view==='appeals'?states[r.appeal.status]:states[r.state],
      view==='appeals'?r.appeal.status:r.state));
   button.append(meta,create('strong','',themes[r.consultation]+' · '+r.type),
    create('span','excerpt',view==='appeals'?r.appeal.reason:r.versions.at(-1).text));
   button.addEventListener('click',()=>choose(r.id));list.append(button);
  });
 }
 const addMeta=(parent,text)=>parent.append(create('span','',text));
 function createForm(r){
  const form=create('form','action-form');const appealView=view==='appeals';
  const isPending=r.state==='pending',reviewAllowed=canReview();
  const appealPending=appealView&&r.appeal?.status==='pending';
  const appealEscalated=appealView&&r.appeal?.status==='escalated';
  const isHistory=view==='history';
  const mayWithdraw=isHistory&&r.state==='approved'&&canWithdraw();
  const mayAct=appealPending&&reviewAllowed||appealEscalated&&canWithdraw()
   ||!appealView&&isPending&&reviewAllowed||mayWithdraw;
  form.append(create('h3','',appealView?'Réponse au recours':mayWithdraw?'Retrait de publication':'Décision de modération'));
  if(!mayAct){
   let msg='Ce dossier ne nécessite pas d’action dans la rubrique sélectionnée.';
   if(role.value==='observer')msg='Ce rôle de consultation ne peut pas prendre de décision.';
   else if(appealEscalated)msg='Ce recours a été transmis à un superviseur : cette décision lui est réservée.';
   else if(isHistory&&r.state==='approved')msg='Le retrait d’une publication est réservé au superviseur.';
   const note=create('p','alert',msg);form.append(note);return form;
  }
  const label=create('label','','Suite à donner');
  const selection=create('select');selection.required=true;
  const options=appealView?(
   appealEscalated
    ?[['maintain','Confirmer la décision initiale'],['invite_revision','Inviter à reformuler']]
    :[['maintain','Maintenir la décision'],['invite_revision','Inviter à reformuler'],['escalate','Transmettre au superviseur']]
  ):mayWithdraw?[['withdraw','Retirer la publication']]:[
   ['approve','Autoriser la publication'],['reject','Refuser la publication']
  ];
  options.forEach(([value,text])=>{const option=create('option','',text);option.value=value;selection.append(option)});
  label.append(selection);form.append(label);
  const memo=create('label','','Motif de la décision (obligatoire)');
  const textarea=create('textarea');textarea.required=true;textarea.minLength=10;textarea.maxLength=2000;
  textarea.placeholder='Expliquez votre décision de façon factuelle et respectueuse…';
  memo.append(textarea);form.append(memo);
  form.append(create('p','',appealView
   ?'Un recours favorable ne publie aucun texte : une nouvelle procédure distincte reste nécessaire.'
   :'L’action simulée ne sera enregistrée sur aucun serveur et n’affectera aucune page publique.'));
  const actions=create('div','actions');
  const submit=create('button','btn','Confirmer dans la simulation');submit.type='submit';actions.append(submit);
  form.append(actions);
  form.addEventListener('submit',event=>{
   event.preventDefault();
   if(!form.reportValidity())return;
   const decision=selection.value,reason=textarea.value.trim(),when='19 novembre, démonstration';
   if(reason.length<10){announce('Veuillez motiver la décision en au moins dix caractères.');return}
   if(view==='appeals'){
    r.appeal.status=decision==='escalate'?'escalated':'resolved';
    r.appeal.history.push({action:decision==='escalate'
     ?'Recours transmis au superviseur'
     :decision==='maintain'?'Décision confirmée':'Révision proposée',
     date:when,reason});
   }else if(decision==='approve'||decision==='reject'){
    r.state=decision==='approve'?'approved':'rejected';
    r.versions.at(-1).status=r.state;
    r.history.push({action:decision==='approve'?'Publication validée':'Contribution refusée',date:when,reason});
    if(decision==='reject')r.appeal=null; // un éventuel recours sera initié par son auteur dans le vrai service
   }else if(decision==='withdraw'){
    r.state='withdrawn';
    r.history.push({action:'Publication retirée',date:when,reason});
   }
   announce('Décision fictive enregistrée en mémoire : '+states[r.state]+'. Aucun effet sur le site.');
   render();
  });
  return form;
 }
 function renderDetail(){
  const r=records.find(x=>x.id===selectedId&&matches(x)&&inView(x));
  const host=$('detail-content'),actions=$('review-actions');reset(host);reset(actions);
  if(!r){
   $('detail-heading').textContent='Choisissez un dossier';
   $('detail-intro').textContent='Les fiches restent privées et nécessitent des habilitations réelles pour fonctionner.';
   return;
  }
  $('detail-heading').textContent=r.reference;
  $('detail-intro').textContent=themes[r.consultation]+' · '+r.date;
  const meta=create('div','details-meta');
  addMeta(meta,r.type);addMeta(meta,states[r.state]);
  addMeta(meta,'Version '+r.versions.at(-1).number);
  host.append(meta);
  const contribution=create('article','content-card');
  contribution.append(create('h3','','Contribution originale (fictive)'));
  r.versions.forEach(v=>{
   contribution.append(create('p','',v.text),
    create('p','small','Version '+v.number+' · '+states[v.status]||v.status));
  });
  host.append(contribution);
  if(r.appeal){
   const appeal=create('article','content-card');
   appeal.append(create('h3','','Demande de réexamen · '+states[r.appeal.status]),
    create('p','',r.appeal.reason));
   host.append(appeal);
  }
  const history=[...r.history,...(r.appeal?.history||[])];
  if(history.length){
   const timeline=create('ol','timeline');
   history.forEach(item=>{
    const li=create('li','');
    li.append(create('strong','',item.action+' · '+item.date),
     create('p','small',item.reason));
    timeline.append(li);
   });
   host.append(create('h3','','Historique privé simulé'),timeline);
  }
  actions.append(createForm(r));
 }
 function renderTabs(){
  document.querySelectorAll('[data-view]').forEach(b=>{
   const active=b.dataset.view===view;
   b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));
   b.tabIndex=active?0:-1;
  });
 }
 function render(){renderMetrics();renderTabs();renderList();renderDetail()}
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{
  view=b.dataset.view;selectedId=null;render();
 }));
 role.addEventListener('change',()=>{announce('Rôle simulé : '+role.selectedOptions[0].textContent);render()});
 consultation.addEventListener('change',()=>{selectedId=null;render()});
 $('reset-demo').addEventListener('click',()=>{
  records=initial();view='pending';selectedId=null;role.value='reviewer';consultation.value='all';
  render();announce('La démonstration a été réinitialisée. Aucune donnée réelle n’a été modifiée.');
 });
 render();
})();
