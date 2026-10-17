(function(){
  'use strict';
  const CMS=window.CMS,format=window.DiplovalArticleFormat,h=window.h,createClass=window.createClass;
  if(!CMS||!format||!h||!createClass){console.error('Éditeur Diploval indisponible.');return;}
  const Control=createClass({
    componentDidMount(){this.lastValue=this.props.value||'';this.editor.innerHTML=format.render(this.lastValue);},
    componentDidUpdate(){const value=this.props.value||'';if(value!==this.lastValue&&!this.editor.contains(document.activeElement)){this.lastValue=value;this.editor.innerHTML=format.render(value);}},
    remember(){const selection=window.getSelection();if(selection.rangeCount&&this.editor.contains(selection.anchorNode))this.range=selection.getRangeAt(0).cloneRange();},
    restore(){this.editor.focus();if(this.range&&this.editor.contains(this.range.commonAncestorContainer)){const selection=window.getSelection();selection.removeAllRanges();selection.addRange(this.range);}},
    emit(){this.lastValue=format.sanitizeHTML(this.editor.innerHTML);this.props.onChange(this.lastValue);this.remember();},
    command(cmd,value){this.restore();document.execCommand(cmd,false,value||null);this.emit();},
    link(){const url=format.safeURL(this.url.value);if(!url){this.message.textContent='Saisissez un lien complet commençant par https://.';return;}this.restore();const selection=window.getSelection();if(selection.isCollapsed)document.execCommand('insertHTML',false,'<a href="'+format.esc(url)+'">'+format.esc(url)+'</a>');else document.execCommand('createLink',false,url);this.emit();this.message.textContent='Lien inséré.';},
    paste(e){e.preventDefault();this.restore();const text=e.clipboardData.getData('text/plain');document.execCommand('insertHTML',false,format.render(text));this.emit();},
    render(){
      const button=(label,title,cmd,value)=>h('button',{type:'button',title,'aria-label':title,onMouseDown:e=>{e.preventDefault();this.remember();},onClick:()=>this.command(cmd,value)},label);
      return h('div',{className:'dv-editor'},
        h('div',{className:'dv-toolbar',role:'toolbar','aria-label':'Mise en forme de l’actualité'},
          button('G','Gras','bold'),button('I','Italique','italic'),button('S̲','Souligner','underline'),
          h('select',{'aria-label':'Style du paragraphe',defaultValue:'p',onMouseDown:()=>this.remember(),onChange:e=>this.command('formatBlock',e.target.value)},...['p','h2','h3','h4','blockquote'].map((v,i)=>h('option',{key:v,value:v},['Paragraphe','Grand titre','Sous-titre','Petit titre','Citation'][i]))),
          h('select',{'aria-label':'Taille du texte',defaultValue:'3',onMouseDown:()=>this.remember(),onChange:e=>this.command('fontSize',e.target.value)},h('option',{value:'2'},'Petit'),h('option',{value:'3'},'Normal'),h('option',{value:'4'},'Grand')),
          button('• Liste','Liste à puces','insertUnorderedList'),button('1. Liste','Liste numérotée','insertOrderedList'),button('↶','Annuler la dernière modification','undo'),button('↷','Rétablir la dernière modification','redo'),button('Effacer le style','Retirer la mise en forme de la sélection','removeFormat')),
        h('div',{className:'dv-link-row'},h('input',{ref:el=>this.url=el,type:'url',placeholder:'https://…','aria-label':'Adresse du lien à insérer',onFocus:()=>this.remember()}),h('button',{type:'button',onClick:this.link},'Insérer un lien')),
        h('div',{ref:el=>this.editor=el,id:this.props.forID,className:'dv-editable article-prose',contentEditable:true,role:'textbox','aria-multiline':'true','aria-label':'Contenu de l’actualité',suppressContentEditableWarning:true,onInput:this.emit,onMouseUp:this.remember,onKeyUp:this.remember,onPaste:this.paste,onDrop:e=>e.preventDefault(),onBlur:this.remember}),
        h('p',{className:'dv-editor-help'},'Sélectionnez du texte pour le mettre en forme. Les titres structurent l’article ; les tailles modifient uniquement le texte sélectionné. Vos anciens textes et marques **gras** sont repris automatiquement.'),
        h('p',{ref:el=>this.message=el,role:'status','aria-live':'polite',className:'dv-editor-help'})
      );
    }
  });
  const Preview=createClass({render(){return h('div',{className:'article-prose',dangerouslySetInnerHTML:{__html:format.render(this.props.value||'')}});}});
  CMS.registerWidget('diploval-richtext',Control,Preview);
  CMS.registerPreviewStyle('/article.css?v=1');
  CMS.registerPreviewStyle('/admin/article-editor.css?v=1');
})();
