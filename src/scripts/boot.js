// Blocking head script: take scroll ownership before a stale fragment can run.
(() => {
  const root = document.documentElement;
  root.classList.add('js', 'fonts-loading');
  // This listener must be registered in the blocking head script, before paint.
  // Native history and BFCache remain in charge of document navigation.
  window.addEventListener('pagereveal', (event) => {
    if (!event.viewTransition) return;
    const activation = window.navigation?.activation;
    const from = activation?.from?.index;
    const to = activation?.entry?.index;
    const back = activation?.navigationType === 'traverse' && Number.isInteger(from) && Number.isInteger(to) && to >= 0 && from > to;
    event.viewTransition.types?.add(back ? 'back' : 'forward');
  });
  const url = location.pathname + location.search + location.hash;
  const navigation = performance.getEntriesByType('navigation')[0];
  const valid = (saved) => saved?.version === 1 && saved.url === url && Number.isFinite(saved.x) && saved.x >= 0 && Number.isFinite(saved.y) && saved.y >= 0 && Array.isArray(saved.details) && saved.details.every((id) => typeof id === 'string') && (saved.category === undefined || typeof saved.category === 'string') && saved.galleries && typeof saved.galleries === 'object' && !Array.isArray(saved.galleries) && Object.values(saved.galleries).every((n) => Number.isInteger(n) && n >= 0);
  let saved = history.state?.alScroll;
  if (!valid(saved)) {
    try { saved = JSON.parse(sessionStorage.getItem(`aneka-logam:scroll:${location.pathname}${location.search}`) || 'null'); } catch { /* Privacy setting. */ }
  }
  const restoring = valid(saved) && ['reload', 'back_forward'].includes(navigation?.type);
  let timer;
  const boot = {
    snapshot: restoring ? saved : undefined, restoring: Boolean(restoring), completed: false,
    finish() {
      this.completed = true; clearTimeout(timer); root.classList.remove('is-restoring');
      // Keep the shell readable if a later enhancement fails before reveal setup.
      root.classList.add('reveals-ready');
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
    if (boot.completed) return;
    root.classList.remove('is-restoring', 'fonts-loading', 'js');
    root.classList.add('font-failed');
    if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
  }, 10000);
})();
