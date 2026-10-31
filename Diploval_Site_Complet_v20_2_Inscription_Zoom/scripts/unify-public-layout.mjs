import fs from 'node:fs';
import path from 'node:path';

// One shell for static pages and all pages generated during a Netlify build.
// Keep page content, metadata, forms and page-specific scripts intact.
export function unifyPublicLayout(root){
  const template=name=>fs.readFileSync(path.join(root,'scripts/templates',name),'utf8').trim();
  const header=template('site-header.template'),footer=template('site-footer.template');
  const dialogs=template('site-dialogs.template').match(/<dialog\b[\s\S]*?<\/dialog>/g)||[];
  const files=[];
  function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.isDirectory()&&!['admin','scripts','node_modules','.git'].includes(entry.name))walk(path.join(dir,entry.name));
    else if(entry.isFile()&&entry.name.endsWith('.html'))files.push(path.join(dir,entry.name));
  }}
  walk(root);
  for(const file of files){
    let html=fs.readFileSync(file,'utf8');
    html=html.replace(/<body\b([^>]*)>/i,(_,attrs)=>{
      if(/\bclass=["']/.test(attrs))attrs=attrs.replace(/\bclass=(["'])(.*?)\1/i,(_,q,classes)=>`class=${q}${[...new Set([...classes.split(/\s+/),'institutional-site'])].join(' ')}${q}`);
      else attrs+=' class="institutional-site"';
      return `<body${attrs}>`;
    });
    html=html.replace(/<a\b[^>]*class=["'][^"']*\bskip-link\b[^"']*["'][^>]*>[\s\S]*?<\/a>\s*/gi,'');
    const headerPattern=/<header\b[^>]*class=["'][^"']*\bsite-header\b[^"']*["'][^>]*>[\s\S]*?<\/header>/i;
    html=headerPattern.test(html)?html.replace(headerPattern,()=>header):html.replace(/<body\b[^>]*>/i,m=>m+'\n'+header);
    const footerPattern=/<footer\b[^>]*class=["'](?:site-footer|footer)["'][^>]*>[\s\S]*?<\/footer>/i;
    html=footerPattern.test(html)?html.replace(footerPattern,()=>footer):html.replace(/<\/body>/i,footer+'\n</body>');
    html=html.replace(/<link\b[^>]*href=["']\/institutional\.css[^"']*["'][^>]*>\s*/gi,'');
    if(!/href=["']\/styles\.css\b/.test(html))html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/styles.css?v=32">\n</head>');
    html=html.replace(/(["'])\/styles\.css(?:\?[^"']*)?\1/g,'"/styles.css?v=32"');
    html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="/institutional.css?v=5">\n</head>');
    if(!/src=["']\/site\.js\b/.test(html))html=html.replace(/<\/body>/i,'<script src="/site.js?v=32" defer></script>\n</body>');
    html=html.replace(/(["'])\/site\.js(?:\?[^"']*)?\1/g,'"/site.js?v=32"');
    html=html.replace(/<main\b([^>]*)>/i,(m,attrs)=>/\bid=/.test(attrs)?m:`<main${attrs} id="main">`);
    const missing=dialogs.filter(dialog=>{const id=dialog.match(/\bid="([^"]+)"/)[1];return !html.includes(`id="${id}"`);});
    // Dialog markup must precede site.js because that script binds on evaluation.
    if(missing.length)html=html.replace(/<script\b[^>]*src="\/site\.js[^>]*>/i,m=>missing.join('\n')+'\n'+m);
    if(file!==path.join(root,'index.html'))html=html.replace(/href="#garanties"/g,'href="/#garanties"');
    fs.writeFileSync(file,html);
  }
  console.log(`Common public layout applied: ${files.length} HTML pages`);
}
