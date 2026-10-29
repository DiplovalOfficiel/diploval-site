/* Open a collapsed reference when followed through an existing anchor. */
(() => {
  const revealTarget = () => {
    if (!location.hash) return;
    let target;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return; }
    if (!target) return;
    for (let parent = target.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS') parent.open = true;
    }
  };
  window.addEventListener('hashchange', revealTarget);
  revealTarget();
})();
