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
  let entryNeedsGate = false;
  let entranceStarted = false;
  let activeTransition;
  let revealDone = Promise.resolve();
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
    entryNeedsGate = false;
    revealDone = Promise.resolve();
    returnAnimation?.cancel();
    returnAnimation = undefined;
    activeTransition?.skipTransition?.();
    activeTransition = undefined;
  }
  function playReturn() {
    const direction = pendingReturn;
    if (!direction || !window.__anekaBoot?.completed || (entryNeedsGate && !entranceStarted)) return;
    pendingReturn = undefined;
    if (typeof document.body?.animate !== 'function') return;
    const style = getComputedStyle(root);
    // CSS optimizers may turn 850ms into .85s; WAAPI always expects milliseconds.
    const timing = /^(\d*\.?\d+)(ms|s)$/.exec(style.getPropertyValue('--move-duration').trim());
    const duration = timing ? Number(timing[1]) * (timing[2] === 's' ? 1000 : 1) : 850;
    try {
      const animation = document.body.animate([
        { transform: direction === 'back' ? 'translate3d(-100%, 0, 0)' : 'translate3d(100%, 0, 0)' }, { transform: 'translate3d(0, 0, 0)' },
      ], { duration, easing: style.getPropertyValue('--ease').trim() || 'ease-out', fill: 'forwards' });
      returnAnimation = animation;
      pageEntering = Promise.resolve();
      void animation.finished.then(async () => {
        if (returnAnimation !== animation) return;
        document.dispatchEvent(new Event('aneka:page-settled'));
        // Keep the identity transform/layer until the initial child reveals
        // settle, so page entry does not dismantle their compositor parent.
        await revealDone;
        if (returnAnimation !== animation) return;
        returnAnimation = undefined;
        animation.cancel();
      }, () => {});
    } catch { /* A skipped animation must never block history or restoration. */ }
  }
  function startEntrance() {
    clearTimeout(timer);
    root.classList.remove('page-enter-pending');
    if (entranceStarted) return;
    entranceStarted = true;
    playReturn();
    // The static outgoing image and the real incoming DOM must share an exact
    // clock; otherwise their meeting edges can expose a gap for one frame.
    try {
      const animations = document.getAnimations?.() ?? [];
      const reveals = animations.filter((animation) => animation.effect?.target?.classList?.contains('is-revealing'));
      revealDone = Promise.all(reveals.map((animation) => animation.finished.catch(() => {})));
      const time = document.timeline?.currentTime;
      if (typeof time !== 'number') return;
      for (const animation of animations) {
        if (animation.animationName !== 'page-exit' && animation.animationName !== 'page-pop' && !animation.effect?.target?.classList?.contains('is-revealing')) continue;
        animation.play(); animation.startTime = time;
      }
      if (returnAnimation) returnAnimation.startTime = time;
    } catch { /* Native timelines still run if explicit synchronization is unavailable. */ }
  }
  function revealPage(event) {
    const returning = revealed;
    cancelReturn();
    if (returning) entranceStarted = false;
    // Only the outgoing document is captured. Keep the incoming page and its
    // component animations on their ordinary DOM/compositor layers.
    root.style.removeProperty('view-transition-name');
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
    activeTransition = transition;
    if (transition && returning) { root.classList.add('page-enter-pending'); clearTimeout(timer); timer = setTimeout(releaseStartup, 10000); }
    pageEntering = transition?.ready?.catch(() => {}) ?? Promise.resolve();
    // Browser swipe animations already provide the visual return; do not double it.
    if (previous?.browserTransition) { transition?.skipTransition?.(); root.classList.remove('page-enter-pending'); entranceStarted = true; return; }
    const fallback = () => {
      if (!traversal || ticket !== pageRevision) return;
      entryNeedsGate = false;
      pendingReturn = direction;
      playReturn();
    };
    if (transition) {
      transition.types?.add(direction);
      if (direction === 'forward') { pendingReturn = direction; entryNeedsGate = true; }
      void (transition.ready ?? Promise.resolve()).then(() => {
        if (returning && ticket === pageRevision) startEntrance();
      }, fallback);
      void transition.finished?.then(() => { if (activeTransition === transition) activeTransition = undefined; }, () => {});
    } else fallback();
  }
  window.navigation?.addEventListener?.('navigate', (event) => { browserTransition = Boolean(event.hasUAVisualTransition); });
  window.addEventListener('pagereveal', revealPage);
  window.addEventListener('pageswap', (event) => {
    cancelReturn();
    if (!event.viewTransition || browserTransition) return;
    root.style.viewTransitionName = 'root';
    // Clear the temporary capture name before a BFCache document can return.
    void event.viewTransition.finished?.then(() => root.style.removeProperty('view-transition-name'), () => {});
  });
  // Older browsers have pageshow but no pagereveal/cross-document transitions.
  if (!('onpagereveal' in window)) window.addEventListener('pageshow', revealPage);
  window.addEventListener('pagehide', () => { rememberEntry(); cancelReturn(); });
  window.addEventListener('resize', () => { cancelReturn(); root.classList.remove('page-enter-pending'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelReturn(); root.classList.remove('page-enter-pending'); } });
  function finishForInput() {
    if (!returnAnimation && !activeTransition) return;
    cancelReturn(); root.classList.remove('page-enter-pending');
    document.dispatchEvent(new Event('aneka:page-settled'));
  }
  // Finish after mouse-up/click, never during pointerdown: the pressed target
  // must not move away before its activation can be delivered.
  document.addEventListener('click', finishForInput, { capture: true });
  document.addEventListener('keydown', (event) => { if (['Tab', 'Enter', ' ', 'Escape'].includes(event.key)) finishForInput(); }, { capture: true });
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
    startEntrance,
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
  function releaseStartup() {
    root.classList.remove('page-enter-pending');
    if (boot.completed) return;
    root.classList.remove('is-restoring', 'fonts-loading', 'js');
    // A delayed/broken enhancement is not a font failure. Native font-display
    // already has a readable fallback and can recover without this bundle.
    if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
  }
  timer = setTimeout(releaseStartup, 10000);
})();
