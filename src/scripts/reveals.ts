export function setupReveals(ready: Promise<unknown>) {
  const root = document.documentElement;
  if (!('IntersectionObserver' in window)) { root.classList.add('reveals-ready'); return; }
  const elements = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  const pending = new Set(elements);
  const running = new Map<HTMLElement, () => void>();
  const header = elements.find((element) => element.dataset.reveal === 'header');
  const hero = elements.find((element) => element.dataset.reveal === 'hero');
  let headerFinished = !header;
  let heroWaiting = false;
  let observer: IntersectionObserver | undefined;
  let started = false;
  let released = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const inset = Math.min(180, Math.round(innerHeight * 0.18));

  function visible(element: HTMLElement) {
    const bounds = element.getBoundingClientRect();
    return bounds.top < innerHeight - inset && bounds.bottom > 0;
  }
  function finishHeader() {
    headerFinished = true;
    if (heroWaiting && hero && !released) {
      heroWaiting = false;
      if (visible(hero)) reveal(hero);
      else observer?.observe(hero);
    }
  }
  function reveal(element: HTMLElement) {
    if (!pending.has(element)) return;
    if (element === hero && !headerFinished) {
      heroWaiting = true;
      // The hero cannot overtake the full header entrance.
      if (header) reveal(header);
      return;
    }
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
      if (element === header) finishHeader();
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
    if (element === header && !headerFinished) finishHeader();
  }
  function release() {
    released = true;
    observer?.disconnect();
    for (const element of pending) element.classList.remove('reveal-pending', 'reveal-still');
    pending.clear();
    for (const finish of running.values()) finish();
    root.classList.add('reveals-ready');
  }
  function start(restored: unknown = false) {
    if (started) return;
    started = true;
    clearTimeout(timeout);
    try {
      // Read layout once before changing classes; do not alternate reads/writes.
      const initiallyVisible = [...pending].filter(visible);
      for (const element of pending) element.classList.add('reveal-pending');
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) if (entry.isIntersecting) reveal(entry.target as HTMLElement);
      }, { threshold: 0, rootMargin: `0px 0px -${inset}px 0px` });
      for (const element of initiallyVisible) {
        if (restored === true) element.classList.add('reveal-still');
        reveal(element);
      }
      for (const element of pending) observer.observe(element);
      root.classList.add('reveals-ready');
    } catch { release(); }
  }
  document.addEventListener('focusin', (event) => {
    if (!(event.target instanceof Element)) return;
    const element = event.target.closest<HTMLElement>('[data-reveal]');
    if (!element) return;
    // A focused control must be visible immediately, even during shell motion.
    if (element === hero && header) complete(header);
    complete(element);
  }, { capture: true });
  timeout = setTimeout(start, 10000);
  void ready.then(start, start);
}
