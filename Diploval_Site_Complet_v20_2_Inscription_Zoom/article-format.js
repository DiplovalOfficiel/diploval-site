/* Shared by the build and the editor. No raw HTML attributes pass through. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./vendor/marked.umd.js'));
  else root.DiplovalArticleFormat=factory(root.marked);
})(typeof globalThis!=='undefined'?globalThis:this,function(marked){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function safeURL(value){const s=String(value||'').trim();return !/[\u0000-\u0020<>"`]/.test(s)&&/^(?:https?:\/\/|mailto:|\/(?!\/)|#)/i.test(s)?s:'';}
  const allowed=new Set(['p','br','strong','b','em','i','u','s','del','h2','h3','h4','h5','h6','blockquote','ul','ol','li','pre','code','hr','small','sub','sup','span','a','table','thead','tbody','tr','th','td']);
  function attribute(tag,name){const m=tag.match(new RegExp('\\b'+name+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))','i'));const value=m?m[1]??m[2]??m[3]:'';return value.replace(/&(?:#(x[0-9a-f]+|[0-9]+)|amp|quot|apos|lt|gt);/gi,(entity,code)=>{if(code){const n=code[0].toLowerCase()==='x'?parseInt(code.slice(1),16):Number(code);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}return {'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'}[entity.toLowerCase()]||entity;});}
  function sanitizeHTML(html){
    return String(html||'').replace(/<!--[\s\S]*?-->|<[^>]*>|</g,tag=>{
      if(tag.startsWith('<!--'))return '';
      const match=tag.match(/^<\s*(\/?)\s*([a-z][a-z0-9]*)\b/i);if(!match)return esc(tag);
      let name=match[2].toLowerCase(),closing=!!match[1];
      if(name==='div')name='p';if(name==='h1')name='h2';
      if(name==='font'){
        if(closing)return '</span>';
        const size=attribute(tag,'size');return `<span class="${Number(size)<3?'article-small':Number(size)>3?'article-large':'article-normal'}">`;
      }
      if(!allowed.has(name))return esc(tag);
      if(closing)return ['br','hr'].includes(name)?'':`</${name}>`;
      if(name==='a'){const href=safeURL(attribute(tag,'href'));return href?`<a href="${esc(href)}" rel="noopener noreferrer">`:'<a>';}
      if(name==='span'){
        let cls=attribute(tag,'class');
        const style=attribute(tag,'style').toLowerCase();
        if(/font-size:\s*(?:small|x-small|0\.[0-9]+em)/.test(style))cls='article-small';
        if(/font-size:\s*(?:large|x-large|1\.[2-9][0-9]*em)/.test(style))cls='article-large';
        if(/text-decoration(?:-line)?:[^;]*underline/.test(style))cls='article-underline';
        return ['article-small','article-large','article-normal','article-underline'].includes(cls)?`<span class="${cls}">`:'<span>';
      }
      return `<${name}>`;
    });
  }
  const parser=new marked.Marked({gfm:true,breaks:true,renderer:{
    heading({tokens,depth}){const level=Math.max(2,depth);return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>\n`;},
    link({href,tokens}){const text=this.parser.parseInline(tokens),url=safeURL(href);return url?`<a href="${esc(url)}" rel="noopener noreferrer">${text}</a>`:text;},
    image({text}){return esc(text||'');}
  }});
  function render(value){return sanitizeHTML(parser.parse(String(value||'')));}
  function plain(value){return render(value).replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();}
  function excerpt(value,max=280){const text=plain(value);return text.length<=max?text:text.slice(0,max).replace(/\s+\S*$/,'')+'…';}
  return {render,sanitizeHTML,safeURL,esc,plain,excerpt};
});
