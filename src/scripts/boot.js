// Blocking head script: take scroll ownership before a stale fragment can run.
(() => {
  const root = document.documentElement;
  root.classList.add('js', 'fonts-loading', 'page-enter-pending');
  // Register before the first render, including when a document returns from BFCache.
  const entryKey = 'aneka-logam:active-entry';
  let revealed = false;
  let browserTransition = false;
  let pendingReturn;
  let returnAnimation;
  let pageEntering = Promise.resolve();
  let pageRevision = 0;
  function previousEntry() {
    try {
      const entry = JSON.parse(sessionStorage.getItem(entryKey) || 'null');
      return Number.isSafeInteger(entry?.position) && entry.position >= 0 ? entry : undefined;
    } catch { return undefined; }
  }
  function currentEntry(previous = previousEntry()) {
    const saved = history.state?.alEntry;
    if (Number.isSafeInteger(saved) && saved >= 0) return saved;
    const position = (previous?.position ?? -1) + 1;
    try { history.replaceState({ ...history.state, alEntry: position }, '', location.pathname + location.search + location.hash); } catch { /* Native navigation remains available. */ }
    return position;
  }
  function rememberEntry() {
    try { sessionStorage.setItem(entryKey, JSON.stringify({ position: currentEntry(), browserTransition })); } catch { /* Storage can be disabled. */ }
  }
  function cancelReturn() {
    pageRevision++;
    pendingReturn = undefined;
    returnAnimation?.cancel();
    returnAnimation = undefined;
  }
  function playReturn() {
    const direction = pendingReturn;
    if (!direction || !window.__anekaBoot?.completed) return;
    pendingReturn = undefined;
    if (typeof document.body?.animate !== 'function') return;
    const style = getComputedStyle(root);
    try {
      const animation = document.body.animate([
        { translate: direction === 'back' ? '-100% 0' : '100% 0' }, { translate: '0 0' },
      ], { duration: parseFloat(style.getPropertyValue('--move-duration')) || 850, easing: style.getPropertyValue('--ease').trim() || 'ease-out' });
      returnAnimation = animation;
      pageEntering = Promise.resolve();
      void animation.finished.then(() => { if (returnAnimation === animation) returnAnimation = undefined; }, () => {});
    } catch { /* A skipped animation must never block history or restoration. */ }
  }
  function revealPage(event) {
    cancelReturn();
    const ticket = pageRevision;
    const previous = previousEntry();
    const position = currentEntry(previous);
    const activation = window.navigation?.activation;
    const from = activation?.from?.index;
    const to = activation?.entry?.index;
    const traversal = activation?.navigationType ? activation.navigationType === 'traverse' : event.persisted || revealed || performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
    const indexed = Number.isInteger(from) && Number.isInteger(to) && from >= 0 && to >= 0;
    const back = traversal && (indexed ? from > to : previous && previous.position > position);
    const direction = back ? 'back' : 'forward';
    root.dataset.pageDirection = direction;
    revealed = true;
    browserTransition = false;
    rememberEntry();
    const transition = event.viewTransition;
    pageEntering = transition?.ready?.catch(() => {}) ?? Promise.resolve();
    // Browser swipe animations already provide the visual return; do not double it.
    if (previous?.browserTransition) { transition?.skipTransition?.(); return; }
    const fallback = () => {
      if (!traversal || ticket !== pageRevision) return;
      pendingReturn = direction;
      playReturn();
    };
    if (transition) {
      transition.types?.add(direction);
      void transition.ready?.catch(fallback);
    } else fallback();
  }
  window.navigation?.addEventListener?.('navigate', (event) => { browserTransition = Boolean(event.hasUAVisualTransition); });
  window.addEventListener('pagereveal', revealPage);
  // Older browsers have pageshow but no pagereveal/cross-document transitions.
  if (!('onpagereveal' in window)) window.addEventListener('pageshow', revealPage);
  window.addEventListener('pagehide', () => { rememberEntry(); cancelReturn(); });
  document.addEventListener('aneka:before-navigation', cancelReturn);
  const url = location.pathname + location.search + location.hash;
  const navigation = performance.getEntriesByType('navigation')[0];
  const valid = (saved) => saved?.version === 1 && saved.url === url && Number.isFinite(saved.x) && saved.x >= 0 && Number.isFinite(saved.y) && saved.y >= 0 && Array.isArray(saved.details) && saved.details.every((id) => typeof id === 'string') && (saved.category === undefined || typeof saved.category === 'string') && (saved.view === undefined || saved.view === 'thumbnails' || saved.view === 'details') && (saved.categorySort === undefined || saved.categorySort === 'ascending' || saved.categorySort === 'descending') && (saved.productSort === undefined || saved.productSort === 'ascending' || saved.productSort === 'descending') && !(saved.productSort !== undefined && saved.categorySort !== undefined) && saved.galleries && typeof saved.galleries === 'object' && !Array.isArray(saved.galleries) && Object.values(saved.galleries).every((n) => Number.isInteger(n) && n >= 0);
  let saved = history.state?.alScroll;
  if (!valid(saved)) {
    try { saved = JSON.parse(sessionStorage.getItem(`aneka-logam:scroll:${location.pathname}${location.search}`) || 'null'); } catch { /* Privacy setting. */ }
  }
  const restoring = valid(saved) && ['reload', 'back_forward'].includes(navigation?.type);
  let timer;
  const boot = {
    snapshot: restoring ? saved : undefined, restoring: Boolean(restoring), completed: false,
    whenEntering() { return pageEntering; },
    startEntrance() { clearTimeout(timer); root.classList.remove('page-enter-pending'); },
    finish() {
      this.completed = true; root.classList.remove('is-restoring');
      try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch { /* Restricted history. */ }
      // Keep the shell readable if a later enhancement fails before reveal setup.
      root.classList.add('js', 'reveals-ready');
      playReturn();
    },
  };
  window.__anekaBoot = boot;
  try {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (restoring) {
      root.classList.add('is-restoring');
      // A saved visit is defined by its pixels, not its old section title.
      if (location.hash) {
        const cleanUrl = location.pathname + location.search;
        boot.snapshot = { ...saved, url: cleanUrl };
        history.replaceState({ ...history.state, alScroll: boot.snapshot }, '', cleanUrl);
      }
    }
  } catch { boot.snapshot = undefined; boot.restoring = false; root.classList.remove('is-restoring'); }
  timer = setTimeout(() => {
    root.classList.remove('page-enter-pending');
    if (boot.completed) return;
    root.classList.remove('is-restoring', 'fonts-loading', 'js');
    // A delayed/broken enhancement is not a font failure. Native font-display
    // already has a readable fallback and can recover without this bundle.
    if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
  }, 10000);
})();
