import { clampScroll, fragmentId, parseScrollSnapshot, readScrollSnapshot, saveScrollSnapshot, shouldRestoreScroll, type ScrollSnapshot } from '../lib/scroll-memory.ts';
import { scrollToSection } from '../lib/section-scroll.ts';
import { carouselIndex, carouselPositions } from '../lib/carousel-position.ts';
import type { ProductCatalog } from './product-catalog.ts';

export function setupScrollMemory(fontsReady: Promise<unknown>, catalog?: ProductCatalog) {
  const root = document.documentElement;
  const currentUrl = () => `${location.pathname}${location.search}${location.hash}`;
  const key = () => `aneka-logam:scroll:${location.pathname}${location.search}`;
  let storage: Storage | undefined;
  try { storage = window.sessionStorage; } catch { /* History state also retains this visit. */ }
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const previous = parseScrollSnapshot(history.state?.alScroll) ?? readScrollSnapshot(storage, key());
  const saved = parseScrollSnapshot(window.__anekaBoot?.snapshot) ?? (shouldRestoreScroll(previous, currentUrl(), navigation?.type ?? '') ? previous : undefined);
  const details = [...document.querySelectorAll<HTMLDetailsElement>('[data-remember-details]')];
  const galleries = [...document.querySelectorAll<HTMLElement>('[data-gallery-track], [data-catalog-track]')];
  let ready = false;
  let departing: ScrollSnapshot | undefined;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  function capture(): ScrollSnapshot {
    return {
      version: 1, url: currentUrl(), x: Math.max(0, scrollX), y: Math.max(0, scrollY),
      details: details.filter((element) => element.dataset.expanded === 'true' || (element.dataset.expanded !== 'false' && element.open)).map((element) => element.id),
      galleries: Object.fromEntries(galleries.map((track) => [track.id, track.dataset.categoryTrack !== undefined ? carouselIndex(track) : Math.max(0, Math.round(track.scrollLeft / Math.max(1, track.clientWidth)))])),
      ...(catalog ? { category: catalog.current(), view: catalog.view(), ...(catalog.sort() === 'none' ? {} : { categorySort: catalog.sort() as 'ascending' | 'descending' }) } : {}),
    };
  }
  function save() {
    if (!ready) return;
    clearTimeout(saveTimer); saveTimer = undefined;
    const snapshot = departing ?? capture();
    saveScrollSnapshot(storage, key(), snapshot);
    try { history.replaceState({ ...history.state, alScroll: snapshot }, '', currentUrl()); } catch { /* Restricted history. */ }
  }
  function scheduleSave() { if (ready && saveTimer === undefined) saveTimer = setTimeout(save, 400); }
  function setDetails(snapshot: ScrollSnapshot) {
    if (catalog && snapshot.view) catalog.setView(snapshot.view);
    catalog?.setSort(snapshot.categorySort ?? 'none');
    catalog?.select(snapshot.category ?? 'all');
    details.forEach((element) => { element.open = snapshot.details.includes(element.id); });
    for (const track of galleries) {
      const index = snapshot.galleries[track.id] ?? 0;
      track.scrollLeft = track.dataset.categoryTrack !== undefined ? carouselPositions(track)[index] ?? 0 : index * track.clientWidth;
    }
  }
  function position(x: number, y: number) {
    window.scrollTo({ left: clampScroll(x, root.scrollWidth - innerWidth), top: clampScroll(y, root.scrollHeight - innerHeight), behavior: 'instant' });
  }
  function restore(snapshot: ScrollSnapshot) { setDetails(snapshot); position(snapshot.x, snapshot.y); }
  function selectCategory(id: string) {
    const category = catalog?.categoryForFragment(id);
    if (!category) return false;
    catalog!.select(category, true);
    position(0, 0);
    save();
    return true;
  }
  function navigateFragment() {
    const id = fragmentId(location.hash);
    const category = catalog?.categoryForFragment(id);
    if (category) { catalog!.select(category); position(0, 0); }
    else { const target = document.getElementById(id); if (target) scrollToSection(target); }
  }
  function push(url: string, snapshot = capture()) { history.pushState({ ...history.state, alEntry: (Number.isSafeInteger(history.state?.alEntry) ? history.state.alEntry : 0) + 1, alScroll: { ...snapshot, url } }, '', url); }
  function cleanUrl() {
    if (!location.hash) return;
    const url = `${location.pathname}${location.search}`;
    try { history.replaceState({ ...history.state, alScroll: { ...capture(), url } }, '', url); } catch { /* Native fallback remains usable. */ }
  }
  function fromHistory(value: unknown): ScrollSnapshot | undefined {
    const snapshot = parseScrollSnapshot(value) ?? readScrollSnapshot(storage, key());
    return snapshot?.url === currentUrl() ? snapshot : undefined;
  }
  window.addEventListener('scroll', scheduleSave, { passive: true });
  window.addEventListener('scrollend', save);
  // Snapshot before the browser can reset scroll/layout during refresh teardown.
  // Later hidden-page scroll/pagehide events must not replace it with zero.
  const freeze = () => { if (ready) { departing ??= capture(); save(); } };
  window.addEventListener('pageswap', freeze);
  window.addEventListener('pagehide', freeze);
  window.addEventListener('pageshow', () => { departing = undefined; });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') freeze();
    else departing = undefined;
  });
  document.addEventListener('aneka:catalog-change', save);
  details.forEach((element) => element.addEventListener('toggle', scheduleSave));
  galleries.forEach((track) => track.addEventListener('scroll', scheduleSave, { passive: true }));
  if (saved) { root.classList.add('is-restoring'); setDetails(saved); }
  let interrupted = false;
  const interrupt = () => { interrupted = true; };
  const interruptKey = (event: KeyboardEvent) => { if (!event.defaultPrevented && ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) interrupt(); };
  window.addEventListener('wheel', interrupt, { passive: true });
  window.addEventListener('touchstart', interrupt, { passive: true });
  window.addEventListener('pointerdown', interrupt, { passive: true });
  window.addEventListener('keydown', interruptKey);
  document.addEventListener('aneka:before-navigation', interrupt);
  const initialized = fontsReady.catch(() => {}).then(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    if (!interrupted) {
      if (saved) restore(saved);
      else if (location.hash) navigateFragment();
      else position(0, 0);
    }
    cleanUrl();
    root.classList.remove('is-restoring');
    window.__anekaBoot?.finish();
    window.removeEventListener('wheel', interrupt);
    window.removeEventListener('touchstart', interrupt);
    window.removeEventListener('pointerdown', interrupt);
    window.removeEventListener('keydown', interruptKey);
    document.removeEventListener('aneka:before-navigation', interrupt);
    ready = true;
    save();
    return Boolean(saved && !interrupted);
  });
  return { ready: initialized, capture, save, restore, position, push, cleanUrl, fromHistory, navigateFragment, selectCategory };
}
