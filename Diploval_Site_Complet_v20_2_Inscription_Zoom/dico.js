(() => {
  'use strict';
  const input = document.getElementById('dico-search');
  if (!input) return;
  const groups = [...document.querySelectorAll('[data-dico-group]')];
  const entries = [...document.querySelectorAll('.dv-dico-entry')];
  const count = document.getElementById('dico-count');
  const empty = document.getElementById('dico-empty');
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim();
  function update() {
    const q = normalize(input.value);
    let visible = 0;
    for (const item of entries) {
      const ok = !q || normalize(item.dataset.dicoSearch).includes(q);
      item.hidden = !ok;
      if (ok) visible++;
    }
    for (const group of groups) group.hidden = !group.querySelector('.dv-dico-entry:not([hidden])');
    if (count) count.textContent = visible + ' définition' + (visible > 1 ? 's' : '') + ' disponible' + (visible > 1 ? 's' : '');
    if (empty) empty.hidden = visible !== 0;
  }
  input.addEventListener('input', update);
  update();
})();