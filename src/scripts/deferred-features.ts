import { copy } from '../i18n/copy.ts';

export function createDeferredFeature(initialize: () => Promise<void>) {
  let ready = false;
  let pending: Promise<void> | undefined;
  return {
    get ready() { return ready; },
    load() {
      if (ready) return Promise.resolve();
      pending ??= Promise.resolve().then(initialize).then(() => { ready = true; }, (error: unknown) => { pending = undefined; throw error; });
      return pending;
    },
  };
}

const initializers = {
  viewer: async (motion: MediaQueryList) => { (await import('./image-viewer')).setupImageViewer(motion); },
  details: async (motion: MediaQueryList) => { (await import('./details')).setupDetails(motion); },
  galleries: async (motion: MediaQueryList) => { (await import('./galleries')).setupGalleries(motion); },
};

export function setupDeferredFeatures(motion: MediaQueryList, initialize = initializers) {
  const viewer = createDeferredFeature(() => initialize.viewer(motion));
  const details = createDeferredFeature(() => initialize.details(motion));
  const galleries = createDeferredFeature(() => initialize.galleries(motion));
  let activation = 0;
  const warm = (feature: ReturnType<typeof createDeferredFeature>) => { void feature.load().catch(() => {}); };
  const watched = new Map<Element, ReturnType<typeof createDeferredFeature>>();
  document.querySelectorAll('.product-details').forEach((element) => watched.set(element, details));
  document.querySelectorAll('[data-gallery]').forEach((element) => { if (element.querySelector('[data-gallery-controls]')) watched.set(element, galleries); });
  try {
    if (!('IntersectionObserver' in window)) throw new Error('No observer');
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const feature = watched.get(entry.target);
        observer.unobserve(entry.target);
        if (feature) warm(feature);
      }
    }, { rootMargin: '200px' });
    for (const element of watched.keys()) observer.observe(element);
  } catch { new Set(watched.values()).forEach(warm); }

  function intent(event: Event) {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('[data-image-trigger]')) warm(viewer);
    if (event.target.closest('.product-details')) warm(details);
    if (event.target.closest('[data-gallery-controls], [data-gallery-track]')) warm(galleries);
  }
  document.addEventListener('pointerover', intent, { passive: true });
  document.addEventListener('pointerdown', intent, { passive: true });
  document.addEventListener('focusin', intent);
  document.addEventListener('aneka:before-navigation', () => { activation++; });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') activation++; });
  document.addEventListener('click', (event) => {
    if (viewer.ready || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || !(event.target instanceof Element)) return;
    const trigger = event.target.closest<HTMLElement>('[data-image-trigger]');
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const ticket = ++activation;
    void viewer.load().then(() => {
      if (ticket === activation && trigger.isConnected) trigger.click();
    }).catch(() => {
      if (ticket !== activation || !trigger.isConnected) return;
      const href = trigger.getAttribute('href');
      // Image links retain their native full-image fallback when a chunk is unavailable.
      if (href) window.location.assign(href);
      else {
        const status = document.querySelector('[data-copy-status]');
        if (status) status.textContent = copy(document.documentElement.lang === 'en' ? 'en' : 'id').previewFailed;
      }
    });
  }, { capture: true });
}
