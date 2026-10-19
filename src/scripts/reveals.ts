export function setupReveals(ready: Promise<unknown>) {
  if (!('IntersectionObserver' in window)) return;
  const elements = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  const pending = new Set(elements);
  let observer: IntersectionObserver | undefined;
  let started = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  function reveal(element: HTMLElement) {
    if (!pending.delete(element)) return;
    observer?.unobserve(element);
    element.classList.remove('reveal-pending');
    element.classList.add('is-revealing');
    // Never retain animation transforms over the component's own hover state.
    const finish = () => element.classList.remove('is-revealing');
    element.addEventListener('animationend', (event) => { if (event.target === element) finish(); }, { once: true });
    setTimeout(finish, 1400);
  }
  function release() {
    observer?.disconnect();
    for (const element of pending) element.classList.remove('reveal-pending');
    pending.clear();
  }
  function start() {
    if (started) return;
    started = true;
    clearTimeout(timeout);
    try {
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) if (entry.isIntersecting) reveal(entry.target as HTMLElement);
      }, { threshold: 0.05, rootMargin: '0px 0px -12px 0px' });
      for (const element of pending) {
        const bounds = element.getBoundingClientRect();
        // Reloads animate at the restored position too; no content is skipped.
        if (bounds.top < innerHeight - 12 && bounds.bottom > 0) reveal(element);
        else observer.observe(element);
      }
    } catch { release(); }
  }
  for (const element of elements) element.classList.add('reveal-pending');
  document.addEventListener('focusin', (event) => {
    if (event.target instanceof Element) {
      const element = event.target.closest<HTMLElement>('[data-reveal]');
      if (element) reveal(element);
    }
  });
  // A failed/slow restoration must never leave the document invisible.
  timeout = setTimeout(start, 1800);
  void ready.then(start, start);
}
