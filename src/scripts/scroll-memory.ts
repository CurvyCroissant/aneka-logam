import { clampScroll, fragmentId, parseScrollSnapshot, readScrollSnapshot, saveScrollSnapshot, shouldRestoreScroll, type ScrollSnapshot } from '../lib/scroll-memory.ts';

export function setupScrollMemory(fontsReady: Promise<unknown>) {
  const root = document.documentElement;
  const currentUrl = () => `${location.pathname}${location.search}${location.hash}`;
  const key = () => `aneka-logam:scroll:${location.pathname}${location.search}`;
  let storage: Storage | undefined;
  try { storage = window.sessionStorage; } catch { /* History state also retains this visit. */ }
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const previous = parseScrollSnapshot(history.state?.alScroll) ?? readScrollSnapshot(storage, key());
  const saved = parseScrollSnapshot(window.__anekaBoot?.snapshot) ?? (shouldRestoreScroll(previous, currentUrl(), navigation?.type ?? '') ? previous : undefined);
  const details = [...document.querySelectorAll<HTMLDetailsElement>('[data-remember-details]')];
  const galleries = [...document.querySelectorAll<HTMLElement>('[data-gallery-track]')];
  let ready = false;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  function capture(): ScrollSnapshot {
    return {
      version: 1, url: currentUrl(), x: Math.max(0, scrollX), y: Math.max(0, scrollY),
      details: details.filter((element) => element.dataset.expanded === 'true' || (element.dataset.expanded !== 'false' && element.open)).map((element) => element.id),
      galleries: Object.fromEntries(galleries.map((track) => [track.id, Math.max(0, Math.round(track.scrollLeft / Math.max(1, track.clientWidth)))])),
    };
  }
  function save() {
    if (!ready) return;
    clearTimeout(saveTimer); saveTimer = undefined;
    const snapshot = capture();
    saveScrollSnapshot(storage, key(), snapshot);
    try { history.replaceState({ ...history.state, alScroll: snapshot }, '', currentUrl()); } catch { /* Restricted history. */ }
  }
  function scheduleSave() { if (ready && saveTimer === undefined) saveTimer = setTimeout(save, 400); }
  function setDetails(snapshot: ScrollSnapshot) {
    details.forEach((element) => { element.open = snapshot.details.includes(element.id); });
    for (const track of galleries) track.scrollLeft = (snapshot.galleries[track.id] ?? 0) * track.clientWidth;
  }
  function position(x: number, y: number) {
    window.scrollTo({ left: clampScroll(x, root.scrollWidth - innerWidth), top: clampScroll(y, root.scrollHeight - innerHeight), behavior: 'instant' });
  }
  function restore(snapshot: ScrollSnapshot) { setDetails(snapshot); position(snapshot.x, snapshot.y); }
  function push(url: string, snapshot = capture()) { history.pushState({ alScroll: { ...snapshot, url } }, '', url); }
  function fromHistory(value: unknown): ScrollSnapshot | undefined {
    const snapshot = parseScrollSnapshot(value) ?? readScrollSnapshot(storage, key());
    return snapshot?.url === currentUrl() ? snapshot : undefined;
  }
  window.addEventListener('scroll', scheduleSave, { passive: true });
  window.addEventListener('scrollend', save);
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
  details.forEach((element) => element.addEventListener('toggle', scheduleSave));
  galleries.forEach((track) => track.addEventListener('scroll', scheduleSave, { passive: true }));
  if (saved) { root.classList.add('is-restoring'); setDetails(saved); }
  let interrupted = false;
  const interrupt = () => { interrupted = true; };
  const interruptKey = (event: KeyboardEvent) => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) interrupt(); };
  window.addEventListener('wheel', interrupt, { passive: true });
  window.addEventListener('touchstart', interrupt, { passive: true });
  window.addEventListener('pointerdown', interrupt, { passive: true });
  window.addEventListener('keydown', interruptKey);
  const initialized = fontsReady.catch(() => {}).then(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    if (!interrupted) {
      if (saved) restore(saved);
      else if (location.hash) document.getElementById(fragmentId(location.hash))?.scrollIntoView({ behavior: 'instant' });
    }
    root.classList.remove('is-restoring');
    window.__anekaBoot?.finish();
    window.removeEventListener('wheel', interrupt);
    window.removeEventListener('touchstart', interrupt);
    window.removeEventListener('pointerdown', interrupt);
    window.removeEventListener('keydown', interruptKey);
    ready = true;
    save();
    return Boolean(saved && !interrupted);
  });
  return { ready: initialized, capture, save, restore, position, push, fromHistory };
}
