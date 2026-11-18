(()=>{
'use strict';
const CMS=window.CMS;
const rules=window.DiplovalPublicationChecks;
const N=window.DiplovalNews;
const h=window.h,createClass=window.createClass;
if(!CMS||!rules)return;
const sources={
 publications:'content/publications.json',
 communiques:'content/communiques.json',
 articles:'content/articles.json'
};
const kinds=Object.keys(sources);
const label={publications:'Publications et PDF',communiques:'Communiqués officiels',articles:'Actualités Diploval'};
const snapshots={};
async function snapshot(kind){
 if(snapshots[kind])return snapshots[kind];
 const response=await fetch('/'+sources[kind],{cache:'no-store'});
 if(!response.ok)throw Error('Lecture de l’état actuel des publications impossible ('+response.status+'). Aucune mise en ligne sans contrôle.');
 const json=await response.json();
 if(!Array.isArray(json[kind]))throw Error('Catalogue '+label[kind]+' invalide. Enregistrement arrêté.');
 return snapshots[kind]=json[kind];
}
function normalize(kind,a){
 if(kind==='articles'){
  const x={...a};
  x.id=x.id||N?.id?.(x)||rules.itemId(x);
  x.status=x.status||N?.status?.(x)||'Brouillon';
  return x;
 }
 return a;
}
function display(kind,a){
 const result=rules.issues(kind,a);
 return {
  id:rules.itemId(a),
  title:a.title||'Sans titre',
  published:rules.published(kind,a),
  ...result
 };
}
CMS.registerEventListener({name:'preSave',handler:async({entry})=>{
 const data=entry.get('data');
 if(!data)return data;
 const kind=kinds.find(key=>data.has(key));
 if(!kind)return data;
 const newItems=data.get(kind);
 if(!newItems||typeof newItems.toJS!=='function')return data;
 const original=await snapshot(kind);
 const current=newItems.toJS().map(a=>normalize(kind,a));
 const seen=new Set();
 const problems=[],alerts=[],changes=[];
 for(const item of current){
  const id=rules.itemId(item);
  if(!id)problems.push('Une entrée sans titre ni identifiant ne peut pas être enregistrée.');
  if(seen.has(id))problems.push('Identifiant déjà utilisé : '+id+'. Chaque document doit garder une adresse unique.');
  seen.add(id);
  const before=original.find(a=>rules.itemId(a)===id);
  if(!rules.changed(kind,item,before))continue;
  if(!rules.published(kind,item))continue; // Les brouillons restent modifiables librement.
  const report=display(kind,item);
  for(const error of report.errors)problems.push('« '+report.title+' » : '+error);
  for(const warning of report.warnings)alerts.push('« '+report.title+' » : '+warning);
  changes.push({title:report.title,new:!before});
 }
 if(problems.length){
  throw Error('Publication non enregistrée :\n• '+problems.join('\n• ')+'\n\nCorrigez ces points ou conservez le contenu en brouillon.');
 }
 if(changes.length){
  const summary=changes.slice(0,8).map(x=>'• '+(x.new?'Nouvelle publication : ':'Modification publique : ')+x.title);
  const note=changes.length>8?'\n• … et '+(changes.length-8)+' autre(s).':'';
  const cautions=alerts.length?'\n\nÀ vérifier :\n'+alerts.slice(0,6).map(x=>'• '+x).join('\n'):'';
  const consent=window.confirm('DIPLOVAL — VALIDATION AVANT ENREGISTREMENT\n\n'+label[kind]+'\n'+summary.join('\n')+note+cautions+
  '\n\nVérifiez le contenu, les sources, la provenance des fichiers, les droits de diffusion, les visuels et l’aperçu PC/mobile. Le bouton « Enregistrer / Publier » déclenche un déploiement Netlify.\n\nConfirmez-vous la publication ou la modification de ces contenus publics ?');
  if(!consent)throw Error('Enregistrement annulé : validation de publication non confirmée.');
 }
 return data;
}});
CMS.registerEventListener({name:'postSave',handler:({entry})=>{
 const data=entry.get('data');
 if(!data)return;
 for(const kind of kinds){
  if(data.has(kind)){
   const items=data.get(kind);
   if(items&&typeof items.toJS==='function')snapshots[kind]=items.toJS();
   break;
  }
 }
}});
// L'aperçu d'un document n'est pas la publication : il prévient les erreurs de saisie.
if(h&&createClass){
 const Preview=createClass({
  getInitialState(){return {selected:0};},
  render(){
   const data=this.props.entry.get('data');
   const kind=kinds.find(key=>data&&data.has(key));
   if(!kind||kind==='articles')return h('p',{},'Aperçu de publication indisponible.');
   const list=data.get(kind)?.toJS()||[];
   if(!list.length)return h('p',{},'Ajoutez un document pour en voir la préparation.');
   const i=Math.min(this.state.selected,list.length-1),item=list[i],report=display(kind,item);
   const file=item.pdf||'';
   const img=item.cover||'';
   const fileAsset=file?this.props.getAsset(file):null;
   const asset=img?this.props.getAsset(img):null;
   const block=(title,items,kind)=>h('section',{},h('h3',{},title),h('ul',{},...items.map((text,i)=>h('li',{key:kind+i},text))));
   return h('div',{className:'dv-admin-preflight'},
    h('h2',{},'Préparation avant publication'),
    h('label',{},'Document à prévisualiser ',
     h('select',{value:i,onChange:e=>this.setState({selected:Number(e.target.value)})},
      ...list.map((x,j)=>h('option',{key:j,value:j},x.title||'Sans titre')))),
    h('p',{},report.published?'Affichage public prévu (sous réserve du déploiement)':'Brouillon ou contenu non visible'),
    h('h2',{},item.title||'Titre manquant'),
    h('p',{},item.summary||item.short_summary||'Résumé à compléter'),
    asset?h('img',{src:String(asset),alt:item.title||'',style:{maxWidth:'100%',height:'auto'}}):null,
    file?h('p',{},'PDF associé : '+file):h('p',{},'Aucun PDF associé'),
    report.errors.length?block('À corriger avant publication',report.errors,'error'):h('p',{},'Aucune erreur essentielle détectée dans ce document.'),
    report.warnings.length?block('Vérifications recommandées',report.warnings,'warn'):null,
    h('p',{},'Le PDF et les liens réels seront contrôlés après enregistrement et déploiement.')
   );
  }
 });
 CMS.registerPreviewTemplate('publications',Preview);
 CMS.registerPreviewTemplate('communiques',Preview);
}
})();
