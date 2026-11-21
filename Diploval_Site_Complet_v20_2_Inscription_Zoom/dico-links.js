(() => {
  'use strict';
  // Complète uniquement le texte HTML rendu. Ne modifie jamais le contenu d'un PDF.
  const host = document.querySelector('.seo-detail-body');
  if (!host || document.getElementById('dico-page') || host.querySelector('.dv-dico-definition')) return;
  const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const skip = 'a,button,label,script,style,textarea,code,pre,h1,h2,h3,h4,h5,h6,.article-sources,[contenteditable],.seo-detail-correction';
  fetch('/content/dictionnaire.json', {cache:'no-store'})
    .then(response => response.ok ? response.json() : Promise.reject(new Error('Dico indisponible')))
    .then(data => {
      const items = Array.isArray(data.entries) ? data.entries.filter(e =>
        e && e.status === 'Publié' && e.visible === true && e.slug && e.term) : [];
      const variants = [];
      const byText = new Map();
      for (const item of items) {
        for (const value of [item.term, ...(Array.isArray(item.aliases) ? item.aliases : [])]) {
          const text = String(value || '').trim();
          const key = text.toLocaleLowerCase('fr');
          if (text.length < 3 || byText.has(key)) continue;
          byText.set(key, item);
          variants.push(text);
        }
      }
      if (!variants.length) return;
      variants.sort((a,b) => b.length - a.length);
      const expression = new RegExp('(^|[^\\p{L}\\p{N}])(' + variants.map(escapeRegex).join('|') + ')(?![\\p{L}\\p{N}])', 'giu');
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      const seen = new Set();
      let linked = 0;
      for (const node of nodes) {
        if (linked >= 12 || !node.parentElement || node.parentElement.closest(skip)) continue;
        const content = node.textContent;
        if (!content || content.length < 3) continue;
        expression.lastIndex = 0;
        const fragment = document.createDocumentFragment();
        let offset = 0;
        let changed = false;
        let match;
        while ((match = expression.exec(content)) !== null && linked < 12) {
          const item = byText.get(match[2].toLocaleLowerCase('fr'));
          if (!item || seen.has(item.slug)) continue;
          const position = match.index + match[1].length;
          fragment.appendChild(document.createTextNode(content.slice(offset, position)));
          const link = document.createElement('a');
          link.className = 'dv-dico-autolink';
          link.href = '/dico/' + encodeURIComponent(item.slug) + '/';
          link.textContent = match[2];
          link.setAttribute('title', 'Le Dico Diploval : ' + item.definition);
          link.setAttribute('aria-label', match[2] + ' — consulter la définition dans le Dico Diploval');
          fragment.appendChild(link);
          offset = position + match[2].length;
          seen.add(item.slug);
          linked++;
          changed = true;
        }
        if (changed) {
          fragment.appendChild(document.createTextNode(content.slice(offset)));
          node.replaceWith(fragment);
        }
      }
    })
    .catch(() => { /* Le texte reste lisible même si le dictionnaire est indisponible. */ });
})();