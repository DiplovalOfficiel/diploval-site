(()=>{
  const CMS=window.CMS,N=window.DiplovalNews,F=window.DiplovalArticleFormat,h=window.h,createClass=window.createClass;if(!CMS||!N||!F||!h||!createClass)return;
  const Audit=createClass({render(){const v=this.props.value;return h('p',{className:'dv-editor-help'},v?new Date(v).toLocaleString('fr-FR',{timeZone:'Europe/Paris'}):'Renseignée automatiquement lors de l’enregistrement.');}});
  CMS.registerWidget('diploval-audit',Audit,Audit);
  let originalsPromise,lastPrepared;
  const originals=()=>originalsPromise||(originalsPromise=fetch('/content/articles.json',{cache:'no-store'}).then(r=>r.ok?r.json():{articles:[]}).then(d=>d.articles||[]));
  const fingerprint=a=>JSON.stringify(Object.keys(a).filter(k=>!['published_at','updated_at'].includes(k)).sort().reduce((result,k)=>{result[k]=a[k];return result;},{}));
  CMS.registerEventListener({name:'preSave',handler:async({entry})=>{
    let data=entry.get('data');
    if(data.has('dossiers'))return data.update('dossiers',items=>items.map(d=>d.get('id')?d:d.set('id',N.slug(d.get('title')))));
    if(!data.has('articles'))return data;
    const old=await originals(),now=new Date().toISOString();
    const prepared=data.update('articles',items=>items.map(item=>{
      let a=item.toJS();const previous=old.find(p=>N.id(p)===N.id(a));
      // Preserve the legacy published item on the first save; new invisible entries are drafts.
      const status=a.status||(previous?N.status(previous):'Brouillon');item=item.set('id',N.id(a)).set('status',status).set('category',N.category(a));
      if(!a.date)item=item.set('date',now);
      if(status==='Publié'&&a.visible!==false&&!a.published_at)item=item.set('published_at',previous&&N.isPublic(previous)?previous.published_at||previous.date||now:now);
      const normalized=x=>({...x,id:N.id(x),status:N.status(x),category:N.category(x)});
      if(!previous||fingerprint(normalized(previous))!==fingerprint(normalized(a)))item=item.set('updated_at',now);
      else if(previous.updated_at)item=item.set('updated_at',previous.updated_at);
      return item;
    }));
    lastPrepared=prepared.get('articles').toJS();return prepared;
  }});
  // Refresh the comparison snapshot after a successful save, rather than modifying every item’s dates.
  CMS.registerEventListener({name:'postSave',handler:({entry})=>{const values=entry.getIn(['data','articles']);if(values){originalsPromise=Promise.resolve(lastPrepared||values.toJS());lastPrepared=null;}}});
  const Preview=createClass({
    getInitialState(){return {index:0};},
    render(){
      const items=this.props.entry.getIn(['data','articles']);const list=items?items.toJS():[];if(!list.length)return h('p',{},'Ajouter une nouvelle actualité pour en afficher l’aperçu.');
      const i=Math.min(this.state.index,list.length-1),a=list[i];
      const sources=(a.sources||[]).filter(s=>F.safeURL(s.url));
      return h('div',{className:'dv-news-preview'},
        h('div',{className:'dv-preview-controls'},h('strong',{},'Prévisualiser une actualité'),h('select',{'aria-label':'Actualité à prévisualiser',value:i,onChange:e=>this.setState({index:Number(e.target.value)})},...list.map((item,j)=>h('option',{value:j,key:j},item.title||'Nouvelle actualité'))),h('p',{},'Statut : '+N.status(a)+(a.visible===false?' — visibilité désactivée':'')+'. Le bouton Publier de Decap enregistre la liste ; seules les actualités Publiées et visibles paraissent après déploiement.')),
        h('article',{},h('p',{},N.category(a)),h('h1',{},a.title||'Nouvelle actualité'),h('p',{},a.intro||''),a.cover?h('img',{src:String(this.props.getAsset(a.cover)),alt:a.cover_alt===undefined?a.title||'':a.cover_alt,style:{maxWidth:'100%'}}):null,h('div',{className:'article-prose',dangerouslySetInnerHTML:{__html:F.render(a.body)}}),a.correction_note?h('aside',{className:'article-correction'},h('strong',{},'Correction / mise à jour'),h('p',{},a.correction_note)):null,sources.length?h('section',{className:'article-sources'},h('h2',{},'Sources et références'),h('ol',{},...sources.map((s,j)=>h('li',{key:j},h('a',{href:F.safeURL(s.url),target:'_blank',rel:'noopener noreferrer'},s.label||s.url))))):null)
      );
    }
  });
  CMS.registerPreviewTemplate('articles',Preview);
})();
