(()=>{
'use strict';
// PROTOTYPE ISOLÉ : pas d'API, pas de stockage, pas de données réelles ni d'authentification.
// Chaque action disparaît au rechargement ; tous les identifiants et messages sont fictifs.
const $=id=>document.getElementById(id);
const tabs=[...document.querySelectorAll('[data-tab]')];
const views=['threads','personal','moderation'];
const activity=$('activity');
const announce=message=>{activity.textContent=message;};
const initialQueue=[
 {id:'DEMO-001',kind:'Réponse',ref:'CE-2026-0013',message:'Une personne demande que les obstacles institutionnels soient présentés avec leurs sources.',state:'À examiner'},
 {id:'DEMO-002',kind:'Signalement',ref:'CE-2026-0012',message:'Signalement fictif : vérifier un éventuel lien partagé sans autorisation.',state:'À examiner'},
 {id:'DEMO-003',kind:'Révision',ref:'CE-2026-0012',message:'La contribution pourrait préciser les modalités de publication des justifications.',state:'À examiner'}
];
const queue=initialQueue.map(x=>({...x}));let counter=queue.length+1;
function showView(view,{focus=false}={}){
 if(!views.includes(view))return;
 for(const tab of tabs){
  const selected=tab.dataset.tab===view;
  tab.setAttribute('aria-selected',String(selected));
  tab.tabIndex=selected?0:-1;
  if(selected&&focus)tab.focus({preventScroll:true});
 }
 for(const name of views)$('view-'+name).hidden=name!==view;
 if(view==='moderation')renderQueue();
}
tabs.forEach((tab,i)=>{
 tab.addEventListener('click',()=>showView(tab.dataset.tab));
 tab.addEventListener('keydown',e=>{
  const commands=['ArrowRight','ArrowLeft','Home','End'];
  if(!commands.includes(e.key))return;
  e.preventDefault();
  let j=e.key==='Home'?0:e.key==='End'?tabs.length-1:e.key==='ArrowRight'?(i+1)%tabs.length:(i+tabs.length-1)%tabs.length;
  showView(tabs[j].dataset.tab,{focus:true});
 });
});
document.querySelectorAll('[data-open-view]').forEach(link=>{
 link.addEventListener('click',e=>{
  e.preventDefault();showView(link.dataset.openView);
  const active=tabs.find(x=>x.dataset.tab===link.dataset.openView);active?.scrollIntoView({block:'nearest'});
 });
});
const threads=[...document.querySelectorAll('.thread')];
const filterTheme=$('filter-theme'),filterSearch=$('filter-search');
function filterThreads(){
 const value=filterSearch.value.trim().toLocaleLowerCase('fr');
 let n=0;
 for(const t of threads){
  const matched=(!filterTheme.value||t.dataset.theme===filterTheme.value)
   &&(!value||t.textContent.toLocaleLowerCase('fr').includes(value));
  t.hidden=!matched;
  if(matched)n++;
 }
 $('filter-count').textContent=n+' fil'+(n===1?'':'s')+' affiché'+(n===1?'':'s');
 $('no-results').hidden=n>0;
}
filterTheme.addEventListener('change',filterThreads);
filterSearch.addEventListener('input',filterThreads);

let replyTarget=null,reportTarget=null;
function closeEditors(){
 $('reply-composer').hidden=true;$('report-composer').hidden=true;
 replyTarget=null;reportTarget=null;
}
function openEditor(which,ref){
 closeEditors();
 const box=$(which+'-composer');
 if(!box)return;
 if(which==='reply'){
  replyTarget=ref;
  $('reply-context').textContent='Argument concerné : '+ref;
 }else{
  reportTarget=ref;
  $('report-context').textContent='Contenu à examiner : '+ref;
 }
 box.hidden=false;box.scrollIntoView({behavior:'smooth',block:'center'});
 box.querySelector('textarea,select')?.focus({preventScroll:true});
}
document.querySelectorAll('[data-reply]').forEach(b=>b.addEventListener('click',()=>openEditor('reply',b.dataset.reply)));
document.querySelectorAll('[data-flag]').forEach(b=>b.addEventListener('click',()=>openEditor('report',b.dataset.flag)));
$('reply-cancel').addEventListener('click',closeEditors);
$('report-cancel').addEventListener('click',closeEditors);
function addQueue(kind,ref,message){
 const id='DEMO-'+String(counter++).padStart(3,'0');
 queue.unshift({id,kind,ref,message,state:'À examiner'});
 return id;
}
$('reply-form').addEventListener('submit',e=>{
 e.preventDefault();
 const input=$('reply-text');
 if(!replyTarget||!input.reportValidity())return;
 const content=input.value.trim();
 if(content.length<10){announce('La réponse fictive doit comporter au moins dix caractères.');input.focus();return;}
 const ref=replyTarget;
 const id=addQueue('Réponse',ref,content);
 input.value='';closeEditors();
 announce('Dépôt fictif '+id+' : réponse placée en attente de modération. Elle n’est pas visible dans les échanges publics.');
});
$('report-form').addEventListener('submit',e=>{
 e.preventDefault();
 const choice=$('report-reason');
 if(!reportTarget||!choice.reportValidity())return;
 const ref=reportTarget;
 const details=$('report-details').value.trim();
 const id=addQueue('Signalement',ref,choice.value+(details?' — '+details:''));
 $('report-form').reset();closeEditors();
 announce('Signalement fictif '+id+' : transmis à la file de modération de cette page. Le contenu n’a pas été masqué automatiquement.');
});
$('copy-ref').addEventListener('click',async()=>{
 const id=$('personal-ref').textContent;
 try{await navigator.clipboard.writeText(id);announce('Référence fictive copiée. Elle ne donne aucun accès à un dossier réel.');}
 catch{announce('Référence fictive à copier : '+id);}
});
$('revision-form').addEventListener('submit',e=>{
 e.preventDefault();
 const input=$('revision-text');
 if(!input.reportValidity())return;
 const text=input.value.trim();
 if(text.length<15){announce('La proposition fictive doit contenir au moins quinze caractères.');input.focus();return;}
 const id=addQueue('Révision','CE-2026-0012',text);
 const li=document.createElement('li');const strong=document.createElement('strong');const span=document.createElement('span');
 strong.textContent='Révision proposée — attente de contrôle';span.textContent='Simulation '+id+' : le texte public précédent reste inchangé.';
 li.append(strong,span);$('revision-history').append(li);
 announce('Proposition fictive '+id+' placée en modération. L’ancienne version publique reste visible.');
});

const node=(tag,cls,text)=>{
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(text!==undefined)n.textContent=text;
 return n;
};
function appendPublicReply(record){
 const thread=threads.find(t=>t.dataset.thread===record.ref);
 if(!thread)return;
 const reply=node('div','reply');
 reply.append(node('strong','', 'Participant de démonstration · message fictif'),node('p','',record.message));
 const replies=thread.querySelector('.replies');
 replies?.append(reply);
 filterThreads();
}
function acceptRevision(record){
 if(record.ref!=='CE-2026-0012')return;
 const thread=threads.find(t=>t.dataset.thread===record.ref);
 if(thread){
  thread.querySelector('.argument-text').textContent='« '+record.message+' »';
  thread.querySelector('.attribution').textContent='Argument fictif · Participant A · nouvelle version autorisée (simulation)';
 }
 const quote=$('view-personal').querySelector('blockquote');
 quote.textContent=record.message;
 const li=node('li');li.append(node('strong','', 'Nouvelle version fictive · autorisée'),node('span','', 'Ancienne version conservée dans l’historique de démonstration.'));
 $('revision-history').append(li);
}
function decide(id,decision){
 const item=queue.find(x=>x.id===id);
 if(!item||item.state!=='À examiner')return;
 item.state=decision;
 if(decision==='Publication autorisée'&&item.kind==='Réponse')appendPublicReply(item);
 if(decision==='Publication autorisée'&&item.kind==='Révision')acceptRevision(item);
 // Aucune suppression automatique : même les signalements exigent une décision.
 announce('Décision fictive enregistrée pour '+id+' : '+decision+'. Aucun service réel n’a été contacté.');
 renderQueue();
}
function buildQueueItem(item){
 const card=node('article','queue-item');
 const top=node('div','queue-top');
 top.append(node('strong','queue-kind',item.kind+' · '+item.id+' · '+item.ref));
 top.append(node('span','queue-state'+(item.state!=='À examiner'?' closed':''),item.state));
 card.append(top,node('p','',item.message));
 if(item.state==='À examiner'){
  const actions=node('div','thread-actions');
  const choices=item.kind==='Signalement'?[
   ['Clore sans retrait','Aucune mesure après examen'],
   ['Masquage motivé (simulation)','Masquage motivé (simulation)']
  ]:[
   ['Autoriser (simulation)','Publication autorisée'],
   ['Ne pas publier','Non retenue après examen']
  ];
  for(const [label,decision] of choices){
   const b=node('button','action'+(decision==='Publication autorisée'?' primary':' subtle'),label);
   b.type='button';b.addEventListener('click',()=>decide(item.id,decision));actions.append(b);
  }
  const ask=node('button','action subtle','Demander une précision');
  ask.type='button';ask.addEventListener('click',()=>decide(item.id,'Précision demandée'));
  actions.append(ask);
  card.append(actions);
 }else card.append(node('p','decision','Décision fictive — aucune action envoyée à un service de production.'));
 return card;
}
function renderQueue(){
 const mount=$('moderation-queue');mount.replaceChildren();
 const pending=queue.filter(x=>x.state==='À examiner').length;
 const stats=$('moderation-summary');stats.replaceChildren(
  node('div','stat',pending+' élément'+(pending===1?'':'s')+' à examiner'),
  node('div','stat',(queue.length-pending)+' décision'+(queue.length-pending===1?'':'s')+' simulée'+(queue.length-pending===1?'':'s')),
  node('div','stat','Aucune publication réelle')
 );
 for(const item of queue)mount.append(buildQueueItem(item));
}
renderQueue();
})();