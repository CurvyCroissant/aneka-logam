export function setupReveals(ready: Promise<unknown>) {
  const root = document.documentElement;
  const startPage = () => window.__anekaBoot?.startEntrance?.();
  if (!('IntersectionObserver' in window)) { root.classList.add('reveals-ready'); startPage(); return; }
  const elements = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  const pending = new Set(elements);
  const running = new Map<HTMLElement, () => void>();
  const header = elements.find((element) => element.dataset.reveal === 'header');
  let observer: IntersectionObserver | undefined;
  let started = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  function visible(element: HTMLElement) {
    const bounds = element.getBoundingClientRect();
    return bounds.top < innerHeight && bounds.bottom > 0 && bounds.left < innerWidth && bounds.right > 0;
  }
  function reveal(element: HTMLElement) {
    if (!pending.has(element)) return;
    pending.delete(element);
    observer?.unobserve(element);
    if (!pending.size) observer?.disconnect();
    element.classList.remove('reveal-pending');
    element.classList.add('is-revealing');
    let fallback: ReturnType<typeof setTimeout>;
    const finish = () => {
      if (!running.delete(element)) return;
      clearTimeout(fallback);
      element.classList.remove('is-revealing', 'reveal-still');
      element.removeEventListener('animationend', onEnd);
      element.removeEventListener('animationcancel', onEnd);
    };
    const onEnd = (event: Event) => { if (event.target === element) finish(); };
    running.set(element, finish);
    element.addEventListener('animationend', onEnd);
    element.addEventListener('animationcancel', onEnd);
    // Animation events may be suppressed in background tabs or older engines.
    fallback = setTimeout(finish, 2200);
  }
  function complete(element: HTMLElement) {
    if (!started) element.classList.add('reveal-accessed');
    pending.delete(element);
    observer?.unobserve(element);
    element.classList.remove('reveal-pending', 'reveal-still');
    running.get(element)?.();
  }
  function release() {
    observer?.disconnect();
    for (const element of pending) element.classList.remove('reveal-pending', 'reveal-still');
    pending.clear();
    for (const finish of running.values()) finish();
    root.classList.add('reveals-ready');
    startPage();
  }
  function start(restored: unknown = false) {
    if (started) return;
    started = true;
    clearTimeout(timeout);
    try {
      // Read layout once before changing classes; do not alternate reads/writes.
      const initiallyVisible = [...pending].filter((element) => element === header || visible(element));
      for (const element of pending) element.classList.add('reveal-pending');
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) if (entry.isIntersecting) reveal(entry.target as HTMLElement);
      }, { threshold: 0, rootMargin: '0px' });
      for (const element of initiallyVisible) {
        if (restored === true) element.classList.add('reveal-still');
        reveal(element);
      }
      for (const element of pending) observer.observe(element);
      root.classList.add('reveals-ready');
      startPage();
    } catch { release(); }
  }
  document.addEventListener('focusin', (event) => {
    if (!(event.target instanceof Element)) return;
    if (!event.target.matches(':focus-visible')) return;
    const element = event.target.closest<HTMLElement>('[data-reveal]');
    if (!element) return;
    // Keyboard focus must be visible immediately. Mouse-down must not snap an
    // animating button away from its pointer before mouse-up can activate it.
    complete(element);
  }, { capture: true });
  timeout = setTimeout(start, 10000);
  const afterRestoration = (restored: unknown = false) => {
    // After fonts/scroll are ready, release the page slide and component reveals
    // in the same style update. Native snapshots of the incoming view stay live.
    for (const element of pending) element.classList.add('reveal-pending');
    try {
      const motion = window.__anekaBoot?.whenEntering?.();
      if (motion) { void motion.then(() => start(restored), () => start(restored)); return; }
    } catch { /* Skipped transitions still reveal normally. */ }
    start(restored);
  };
  void ready.then(afterRestoration, afterRestoration);
}
