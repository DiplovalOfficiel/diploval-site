import {STATUSES,counters,groupExactTextSuggestions} from './model.mjs';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let records=[],selected=null,dirty=false,busy=false,loaded=false,account=null;
const endpoint='/.netlify/functions/contributions';
function message(text){$('message').textContent=text;}
function reset(){records=[];selected=null;dirty=false;loaded=false;account=null;$('dashboard').hidden=true;$('logout').hidden=true;$('login').hidden=false;$('records').textContent='';$('detail').textContent='';$('dossier').innerHTML='<option value="">Choisir une consultation</option>';for(const x of ['received','arguments','pending'])$(x).textContent='—';}
async function api(action,{method='GET',data,...query}={}){
  const r=await fetch(endpoint+'?'+new URLSearchParams({action,...query}),{method,credentials:'same-origin',cache:'no-store',headers:{'X-Diploval-Moderation':'1',...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});
  let result;try{result=await r.json();}catch{throw Error('Le service privé ne répond pas. Vérifiez le déploiement Netlify.');}
  if(!r.ok){if(r.status===401)reset();throw Error(result.error||'Opération impossible.');}return result;
}
function options(values,value){return values.map(x=>`<option${x===value?' selected':''}>${esc(x)}</option>`).join('');}
function date(s){const d=new Date(s);return Number.isNaN(d.valueOf())?s:d.toLocaleString('fr-FR',{timeZone:'Europe/Paris'});}
async function openDashboard(who){account=who;$('login').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;$('secret').value='';const result=await api('forms');$('dossier').innerHTML='<option value="">Choisir une consultation</option>'+result.forms.map(f=>`<option value="${esc(f.id)}">${esc(f.name)}</option>`).join('');if(result.forms.length===1){$('dossier').value=result.forms[0].id;await load();}else if(!result.forms.length)message('Aucun formulaire de consultation détecté dans Netlify.');}
function render(){
  const reviews=Object.fromEntries(records.map(r=>[r.id,r.review]));const totals=counters(records,reviews);
  $('received').textContent=loaded?totals.received:'—';$('arguments').textContent=loaded?totals.distinctArguments:'—';$('pending').textContent=loaded?totals.unclassifiedContributions:'—';
  const groups=groupExactTextSuggestions(records);$('suggestions').textContent=groups.length?`${groups.length} groupe(s) de textes identiques à examiner. Ce signalement ne change aucun statut et ne regroupe aucun argument automatiquement.`:'';
  const search=$('search').value.toLocaleLowerCase('fr'),status=$('status').value,state=$('netlify-state').value;
  const shown=records.filter(r=>(!status||r.review.status===status)&&(!state||r.netlifyState===state)&&JSON.stringify([r.data,r.review.internalNote,r.review.argumentIds,r.review.chapter,r.review.decisionReason]).toLocaleLowerCase('fr').includes(search));
  $('result-count').textContent=loaded?`· ${shown.length} affichée(s)` :'';
  $('records').innerHTML=shown.map(r=>`<button type="button" class="record${selected===r.id?' selected':''}" data-id="${esc(r.id)}"><small>${esc(date(r.receivedAt))} · ${esc(r.id)}</small><strong>${esc(r.data.dossier||r.formName)}</strong><span class="badge">${esc(r.review.status)}</span>${r.netlifyState==='spam'?'<span class="badge">Indésirable Netlify</span>':''}<p>${esc(String(r.data.contribution||'').slice(0,220))}</p>${r.review.argumentIds.length?`<small>Arguments : ${esc(r.review.argumentIds.join(' · '))}</small>`:''}</button>`).join('')||'<p>Aucune réponse dans cette sélection.</p>';
  for(const b of $('records').querySelectorAll('button'))b.addEventListener('click',()=>choose(b.dataset.id));
}
async function load({automatic=false}={}){
  if(busy||!$('dossier').value)return;
  if(dirty){if(automatic)return;message('Enregistrez votre décision ou cliquez sur « Annuler les modifications » avant d’actualiser.');return;}
  busy=true;loaded=false;$('refresh').disabled=true;$('dossier').disabled=true;message('Lecture des réponses Netlify et des décisions privées…');
  const form=$('dossier').value,next=[];
  try{for(const state of ['verified','spam'])for(let page=1;page<=100;page++){
    const result=await api('submissions',{form,page:String(page),state});next.push(...result.records);if(!result.hasMore)break;if(page===100)throw Error('Lecture trop volumineuse : les compteurs ne sont pas affichés pour éviter un total incomplet.');
  }
  records=[...new Map(next.map(r=>[r.id,r])).values()].sort((a,b)=>String(b.receivedAt).localeCompare(String(a.receivedAt)));loaded=true;render();
  $('sync').textContent='Dernière lecture : '+date(new Date().toISOString());message(records.length?'':'Aucune contribution reçue pour cette consultation.');
  if(selected&&records.some(r=>r.id===selected)){const record=records.find(r=>r.id===selected);record.review=(await api('review',{form:record.dossierKey,submission:record.id})).review;showDetail(record);}else{$('detail').textContent='Choisissez une réponse pour l’examiner.';selected=null;}
  }catch(e){message(e.message);loaded=false;render();}finally{busy=false;$('refresh').disabled=false;$('dossier').disabled=false;}
}
async function choose(id){if(busy)return;if(dirty){message('Enregistrez votre décision ou annulez les modifications avant de changer de réponse.');return;}busy=true;$('dossier').disabled=true;selected=id;render();const record=records.find(r=>r.id===id);$('detail').textContent='Lecture de la décision et de son historique…';try{record.review=(await api('review',{form:record.dossierKey,submission:record.id})).review;render();showDetail(record);}catch(e){message(e.message);}finally{busy=false;$('dossier').disabled=false;}}
function showDetail(r){
  if(!r)return;const v=r.review;
  const rawFields=[['contribution','Contribution originale'],['alternative','Alternative proposée'],['source','Source ou référence fournie'],['contribution_type','Type de contribution'],['partie_dossier','Partie du dossier'],['version','Version'],['email','E-mail de suivi — privé']];
  $('detail').innerHTML=`<h2>Contribution ${esc(r.id)}</h2><p class="help">Reçue le ${esc(date(r.receivedAt))}. Original Netlify en lecture seule.</p>${rawFields.filter(([key])=>r.data[key]).map(([key,label])=>`<div class="original"><strong>${esc(label)}</strong><div class="source-copy">${esc(r.data[key])}</div></div>`).join('')}
  <form id="decision-form" class="decision"><h2>Décision de Diploval</h2><label>État du traitement<select name="status">${options(STATUSES,v.status)}</select></label><p class="help">Recevable : peut être analysée. Retenue : apport retenu pour la suite du dossier. Ces décisions ne publient pas la réponse.</p>
  <label>Arguments distincts — un intitulé par ligne<textarea name="argumentIds" maxlength="20000" placeholder="Ex. : Maintenir un accès non numérique">${esc(v.argumentIds.join('\n'))}</textarea></label><p class="help">Réutilisez exactement le même intitulé dans cette consultation pour rattacher plusieurs réponses au même argument. Une réponse peut contenir plusieurs arguments. Laisser vide tant que l’analyse n’est pas faite.</p><details><summary>Arguments déjà classés dans cette consultation</summary><ul>${[...new Set(records.flatMap(x=>x.review.argumentIds))].map(a=>`<li>${esc(a)}</li>`).join('')||'<li>Aucun pour le moment.</li>'}</ul></details>
  <div class="two-col"><label>Source vérifiée<select name="sourceVerified">${options(['À vérifier','Oui','Non','Sans objet'],v.sourceVerified)}</select></label><label>Élément nouveau<select name="newElement">${options(['À vérifier','Oui','Non','Sans objet'],v.newElement)}</select></label></div>
  <label>Chapitre concerné<input name="chapter" value="${esc(v.chapter)}" maxlength="20000"></label><label>Modification du dossier envisagée<textarea name="proposedChange" maxlength="20000">${esc(v.proposedChange)}</textarea></label><label>Note interne<textarea name="internalNote" maxlength="20000">${esc(v.internalNote)}</textarea></label><label>Motif de décision interne<textarea name="decisionReason" maxlength="20000">${esc(v.decisionReason)}</textarea></label><p class="help">Le motif est obligatoire pour Non retenue, Doublon et Hors sujet.</p><button type="submit">Enregistrer la décision interne</button> <button type="button" id="cancel">Annuler les modifications</button><p id="save-state" role="status" aria-live="polite">Aucune modification en attente.</p></form>
  <details><summary>Historique des décisions · ${v.history.length}</summary>${[...v.history].reverse().map(event=>`<article><p><strong>${esc(event.actor)}</strong> · ${esc(date(event.at))}</p><pre>${esc(JSON.stringify(event.changes,null,2))}</pre></article>`).join('')||'<p>Cette réponse n’a pas encore été traitée.</p>'}</details>`;
  $('decision-form').addEventListener('input',()=>{dirty=true;$('save-state').textContent='Modifications non enregistrées.';});
  $('decision-form').addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget,submit=form.querySelector('[type=submit]');submit.disabled=true;$('cancel').disabled=true;busy=true;$('dossier').disabled=true;$('logout').disabled=true;
    const fields=new FormData(form),changes=Object.fromEntries(fields);changes.argumentIds=String(changes.argumentIds).split('\n').map(x=>x.trim()).filter(Boolean);
    try{const result=await api('review',{method:'PUT',form:r.dossierKey,submission:r.id,data:{expectedRevision:r.review.revision,changes}});r.review=result.review;dirty=false;render();showDetail(r);$('save-state').textContent='Décision enregistrée et confirmée dans le stockage privé. Aucune publication publique.';message('');}catch(error){if($('save-state'))$('save-state').textContent=error.message;message(error.message);submit.disabled=false;if($('cancel'))$('cancel').disabled=false;}finally{busy=false;$('dossier').disabled=false;$('logout').disabled=false;}
  });
  $('cancel').addEventListener('click',()=>{dirty=false;showDetail(r);message('Modifications locales annulées. La dernière décision enregistrée est affichée.');});
}
$('status').insertAdjacentHTML('beforeend',options(STATUSES,''));for(const x of ['status','search','netlify-state'])$(x).addEventListener(x==='search'?'input':'change',render);
let previousForm='';$('dossier').addEventListener('change',async()=>{if(dirty){$('dossier').value=previousForm;message('Enregistrez ou annulez la décision avant de changer de consultation.');return;}previousForm=$('dossier').value;selected=null;records=[];loaded=false;render();$('detail').textContent='Choisissez une réponse pour l’examiner.';await load();});
$('refresh').addEventListener('click',()=>load());
$('login-form').addEventListener('submit',async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;try{const who=await api('login',{method:'POST',data:{user:$('username').value.trim(),secret:$('secret').value.trim()}});message('');await openDashboard(who);previousForm=$('dossier').value;}catch(error){message(error.message);}finally{button.disabled=false;}});
$('logout').addEventListener('click',async()=>{if(dirty){message('Enregistrez ou annulez vos modifications avant de vous déconnecter.');return;}try{await api('logout',{method:'POST',data:{}});reset();message('Session fermée. Les données ne sont plus affichées.');}catch(e){message(e.message);}});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
setInterval(()=>{if(account&&!document.hidden&&!dirty)load({automatic:true});},60000);
try{const who=await api('session');await openDashboard(who);previousForm=$('dossier').value;}catch(e){reset();message(e.message);}
