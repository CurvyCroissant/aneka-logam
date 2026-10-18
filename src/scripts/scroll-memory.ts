import { clampScroll, readScrollSnapshot, saveScrollSnapshot, shouldRestoreScroll, type ScrollSnapshot } from '../lib/scroll-memory';

export async function setupScrollMemory(): Promise<boolean> {
  // Native restoration remains the fallback when storage or scripts are unavailable.
  if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
  let storage: Storage | undefined;
  try { storage = window.sessionStorage; } catch { /* Browser privacy setting. */ }
  const key = `aneka-logam:scroll:${location.pathname}${location.search}`;
  const currentUrl = () => `${location.pathname}${location.search}${location.hash}`;
  const saved = readScrollSnapshot(storage, key);
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const restore = shouldRestoreScroll(saved, currentUrl(), navigation?.type ?? 'navigate');
  const details = [...document.querySelectorAll<HTMLDetailsElement>('[data-remember-details]')];
  const galleries = [...document.querySelectorAll<HTMLElement>('[data-gallery-track]')];
  let ready = false;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  function save() {
    if (!ready) return;
    const snapshot: ScrollSnapshot = {
      version: 1, url: currentUrl(), x: Math.max(0, scrollX), y: Math.max(0, scrollY),
      details: details.filter((element) => element.open).map((element) => element.id),
      galleries: Object.fromEntries(galleries.map((track) => [track.id, Math.max(0, Math.round(track.scrollLeft / Math.max(1, track.clientWidth)))])),
    };
    saveScrollSnapshot(storage, key, snapshot);
  }
  function scheduleSave() {
    if (!ready || saveTimer !== undefined) return;
    saveTimer = setTimeout(() => { saveTimer = undefined; save(); }, 120);
  }
  window.addEventListener('scroll', scheduleSave, { passive: true });
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
  details.forEach((element) => element.addEventListener('toggle', scheduleSave));
  galleries.forEach((element) => element.addEventListener('scroll', scheduleSave, { passive: true }));
  // A bfcache return already has the correct DOM and scroll position.
  window.addEventListener('pageshow', (event) => { if (event.persisted) { ready = true; save(); } });

  if (!restore || !saved) { ready = true; return false; }
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const root = document.documentElement;
  root.classList.add('is-restoring');
  details.forEach((element) => { element.open = saved.details.includes(element.id); });
  let interrupted = false;
  const interrupt = () => { interrupted = true; };
  window.addEventListener('wheel', interrupt, { passive: true });
  window.addEventListener('touchstart', interrupt, { passive: true });
  window.addEventListener('pointerdown', interrupt, { passive: true });
  window.addEventListener('keydown', interrupt);
  let fontTimeout: ReturnType<typeof setTimeout> | undefined;
  let didRestore = false;
  try {
    const fontsReady = Promise.race([document.fonts.ready, new Promise<void>((resolve) => { fontTimeout = setTimeout(resolve, 1000); })]);
    const pageReady = document.readyState === 'complete' ? Promise.resolve() : new Promise<void>((resolve) => window.addEventListener('load', () => resolve(), { once: true }));
    await Promise.all([fontsReady, pageReady]);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (!interrupted && currentUrl() === saved.url) {
      for (const track of galleries) track.scrollLeft = (saved.galleries[track.id] ?? 0) * track.clientWidth;
      window.scrollTo({ left: clampScroll(saved.x, root.scrollWidth - innerWidth), top: clampScroll(saved.y, root.scrollHeight - innerHeight), behavior: 'instant' });
      didRestore = true;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  } finally {
    clearTimeout(fontTimeout);
    root.classList.remove('is-restoring');
    window.removeEventListener('wheel', interrupt);
    window.removeEventListener('touchstart', interrupt);
    window.removeEventListener('pointerdown', interrupt);
    window.removeEventListener('keydown', interrupt);
    if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
    ready = true;
    save();
  }
  return didRestore;
}
