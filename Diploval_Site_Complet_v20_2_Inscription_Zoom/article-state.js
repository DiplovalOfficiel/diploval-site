(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.DiplovalNews=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const categories=["Lancement d’étude","Publication","Consultation citoyenne","Actualisation de dossier","Rectificatif","Vie institutionnelle","Rencontres & événements","Suivi des propositions"];
  const slug=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100).replace(/-$/,'');
  const id=a=>a.id||slug(a.title);
  const status=a=>a.status||((a.visible===false)?'Brouillon':'Publié');
  const isPublic=(a,now=new Date())=>a.visible!==false&&status(a)==='Publié'&&(!a.publish_at||(!Number.isNaN(Date.parse(a.publish_at))&&new Date(a.publish_at)<=now));
  function category(a){if(categories.includes(a.category))return a.category;return ({'Mise à jour':'Actualisation de dossier','Vie de Diploval':'Vie institutionnelle','Intervention':'Rencontres & événements','Partenariat':'Vie institutionnelle','Contribution':'Suivi des propositions','Terrain':'Actualisation de dossier'})[a.category]||'Publication';}
  return {categories,slug,id,status,isPublic,category};
});
