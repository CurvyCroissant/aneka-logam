export async function waitForBrandFont(): Promise<void> {
  const root = document.documentElement;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const font = document.fonts.load('700 1em Montserrat', 'ANEKA LOGAM').then((faces) => {
      const available = faces.length > 0;
      // Startup may already have shown a readable fallback. Recover even when
      // this request completes after the bounded wait below.
      if (available) root.classList.remove('font-failed');
      return available;
    });
    const loaded = await Promise.race([
      font,
      new Promise<boolean>((resolve) => { timeout = setTimeout(() => resolve(false), 7000); }),
    ]);
    if (!loaded) root.classList.add('font-failed');
  } catch { root.classList.add('font-failed'); }
  finally { clearTimeout(timeout); root.classList.remove('fonts-loading'); }
}

export function setupImageLoading() {
  let observer: IntersectionObserver | undefined;
  try {
    if ('IntersectionObserver' in window) observer = new IntersectionObserver((entries) => {
      for (const entry of entries) entry.target.classList.toggle('image-in-view', entry.isIntersecting);
    }, { rootMargin: '100px' });
  } catch { /* Native lazy images and load/error handling remain available. */ }
  for (const trigger of document.querySelectorAll<HTMLElement>('[data-image-loader]')) {
    const image = trigger.querySelector<HTMLImageElement>('img');
    if (!image) continue;
    const error = trigger.querySelector<HTMLElement>('.image-error');
    let request = 0;
    const finish = (success: boolean) => {
      trigger.dataset.imageState = success ? 'ready' : 'error';
      if (error) error.hidden = success;
      trigger.setAttribute('aria-busy', 'false');
      observer?.unobserve(trigger);
    };
    const loaded = async () => {
      const ticket = ++request;
      try { await image.decode(); } catch { /* Fall back to the loaded image. */ }
      if (ticket === request) finish(image.naturalWidth > 0);
    };
    image.addEventListener('load', () => { void loaded(); });
    image.addEventListener('error', () => { request++; finish(image.naturalWidth > 0); });
    if (image.complete) { if (image.naturalWidth > 0) void loaded(); else finish(false); }
    else { trigger.setAttribute('aria-busy', 'true'); observer?.observe(trigger); }
  }
}
