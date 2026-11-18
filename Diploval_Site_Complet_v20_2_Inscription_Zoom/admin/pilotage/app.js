(()=>{
'use strict';
const el=id=>document.getElementById(id),out=el('checks');
const get=async path=>{
 const r=await fetch(path,{cache:'no-store',credentials:'same-origin'});
 if(!r.ok)throw new Error('HTTP '+r.status);
 return r.json();
};
const show=(id,n)=>{const x=el(id);if(x)x.textContent=String(n);};
async function init(){
 try{
 const [pubs,articles,comms,agenda]=await Promise.all([
  get('/content/publications.json'),get('/content/articles.json'),get('/content/communiques.json'),get('/content/agenda.json')]);
 const p=pubs.publications||[],a=articles.articles||[],c=comms.communiques||[],e=agenda.events||[];
 const publicP=p.filter(x=>x.visible!==false&&x.pdf&&!['Brouillon','Archivé'].includes(x.status));
 const publicA=a.filter(x=>x.visible!==false&&x.status==='Publié');
 const publicC=c.filter(x=>x.visible!==false&&x.status!=='Brouillon');
 const cons=p.filter(x=>x.visible!==false&&x.participation_enabled&&x.participation_status==='Consultation ouverte');
 show('count-publications',publicP.length);show('count-articles',publicA.length);show('count-communiques',publicC.length);show('count-consultations',cons.length);
 const problems=[];
 const add=x=>problems.push(x);
 for(const item of p.filter(x=>x.visible!==false&&!['Brouillon','Archivé'].includes(x.status))){
  if(!item.pdf)add('Publication sans PDF : '+item.title);
  if(item.participation_enabled&&!item.participation_question)add('Consultation sans question directrice : '+item.title);
 }
 for(const item of publicA){if(item.pdf&&item.embed_pdf===false)add('Actualité avec lecteur intégré désactivé : '+item.title);if(!item.intro)add('Actualité sans résumé : '+item.title);}
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 for(const item of e.filter(x=>x.visible!==false&&x.date<today&&x.status==='a_venir'))add('Événement passé encore au statut « À venir » : '+item.title);
 const list=document.createElement('ul');list.className='issues';
 for(const t of problems.length?problems:['Aucune anomalie éditoriale simple détectée dans les catalogues.']){
  const li=document.createElement('li');li.textContent=t;if(!problems.length)li.className='ok';list.append(li);
 }
 out.replaceChildren(list);
 }catch(error){out.textContent='Impossible de lire les catalogues. Vérifier le déploiement et les fichiers JSON, puis réessayer.';console.warn('Pilotage Diploval',error);}
}
init();
})();