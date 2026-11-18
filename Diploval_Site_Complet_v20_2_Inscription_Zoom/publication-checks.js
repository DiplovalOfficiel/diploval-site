(function(root,factory){
 const rules=factory();
 root.DiplovalPublicationChecks=rules;
 if(typeof module==='object'&&module.exports)module.exports=rules;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const keys={
  publications:['id','visible','status','title','type','version','date_label','scope','scope_filter','type_filter','short_summary','summary','details','pdf','cover','social_image','featured','participation_enabled','participation_status','participation_question','participation_established','participation_uncertain','participation_not_presumed','participation_opens','participation_closes','participation_schedule','participation_followup','participation_results_pdf'],
  communiques:['id','visible','status','type','title','date','scope','summary','body','pdf','cover','social_image','signature','correction_note'],
  articles:['id','visible','status','title','date','category','intro','body','cover','social_image','pdf','sources','correction_note','publish_at','dossier_id']
 };
 const str=v=>String(v==null?'':v).trim();
 const slug=v=>str(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100).replace(/-$/,'');
 const itemId=a=>str(a.id)||slug(a.title);
 const published=(kind,a)=>{
  if(!a||a.visible===false)return false;
  if(kind==='articles')return str(a.status)==='Publié';
  return !['Brouillon','Archivé'].includes(str(a.status));
 };
 const pdfPath=v=>{
  const x=str(v);
  return !x||/^\/?assets\/(?:uploads|documents)\/[^?#]+\.pdf$/i.test(x);
 };
 const issues=(kind,item)=>{
  const a=item||{},fatal=[],warnings=[];
  const add=(level,msg)=>{(level==='error'?fatal:warnings).push(msg)};
  if(!str(a.title))add('error','Titre manquant.');
  if(!published(kind,a))return {errors:fatal,warnings};
  if(kind==='publications'){
   if(!str(a.pdf))add('error','PDF obligatoire pour une publication visible.');
   if(str(a.pdf)&&!pdfPath(a.pdf))add('error','Le document doit être un PDF local du site Diploval.');
   if(!str(a.summary))add('error','Résumé principal manquant.');
   if(!str(a.short_summary))add('warning','Résumé court conseillé pour les cartes.');
   if(!str(a.version))add('warning','Version du document non précisée.');
   if(a.participation_enabled){
    if(!str(a.participation_question))add('error','Question directrice obligatoire pour la consultation.');
    if(!str(a.version))add('error','Version obligatoire pour la consultation.');
    if(!str(a.participation_closes)&&!str(a.participation_schedule))add('error','Fixer une date de clôture ou expliquer le calendrier de consultation.');
    if(str(a.participation_opens)&&str(a.participation_closes)&&str(a.participation_opens).slice(0,10)>str(a.participation_closes).slice(0,10))add('error','Les dates de consultation sont inversées.');
   }
  }
  if(kind==='communiques'){
   if(!str(a.summary))add('error','Résumé du communiqué manquant.');
   if(!str(a.body))add('error','Texte du communiqué manquant.');
   if(!str(a.date))add('error','Date du communiqué manquante.');
   if(!str(a.type))add('warning','Préciser le type de communiqué.');
   if(str(a.pdf)&&!pdfPath(a.pdf))add('error','Le PDF officiel doit être un fichier local.');
  }
  if(kind==='articles'){
   if(!str(a.intro))add('error','Résumé de l’actualité manquant.');
   if(!str(a.body))add('error','Texte de l’actualité manquant.');
   if(!str(a.date))add('error','Date de publication manquante.');
   if(str(a.pdf)&&!pdfPath(a.pdf))add('error','Le PDF associé doit être un fichier local.');
   if(!str(a.cover))add('warning','Une image de présentation est recommandée pour le partage.');
   if(str(a.cover)&&!str(a.cover_alt))add('warning','Vérifier le texte alternatif de l’image (ou préciser qu’elle est décorative).');
  }
  if(!str(a.social_image))add('warning','Image de partage spécifique absente : le site utilisera son image de repli.');
  return {errors:fatal,warnings};
 };
 const changed=(kind,a,b)=>!b||keys[kind].some(k=>JSON.stringify(a[k]??null)!==JSON.stringify(b[k]??null));
 const catalog=(kind,records)=>{
  const all=records||[],seen=new Set(),out=[];
  for(const a of all){
   const id=itemId(a);
   const problems=issues(kind,a);
   if(id&&seen.has(id))problems.errors.push('Identifiant en double : '+id);
   seen.add(id);
   out.push({id,title:str(a.title)||'Sans titre',published:published(kind,a),...problems});
  }
  return out;
 };
 return {keys,itemId,published,pdfPath,issues,changed,catalog};
});
