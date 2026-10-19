export async function waitForBrandFont(): Promise<void> {
  const root = document.documentElement;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const loaded = await Promise.race([
      document.fonts.load('700 1em Montserrat', 'ANEKA LOGAM').then((faces) => faces.length > 0),
      new Promise<boolean>((resolve) => { timeout = setTimeout(() => resolve(false), 7000); }),
    ]);
    if (!loaded) root.classList.add('font-failed');
  } catch { root.classList.add('font-failed'); }
  finally { clearTimeout(timeout); root.classList.remove('fonts-loading'); }
}

export function setupImageLoading() {
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const entry of entries) entry.target.classList.toggle('image-in-view', entry.isIntersecting);
  }, { rootMargin: '100px' }) : undefined;
  for (const trigger of document.querySelectorAll<HTMLElement>('[data-image-loader]')) {
    const image = trigger.querySelector<HTMLImageElement>('img');
    if (!image) continue;
    let settled = false;
    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      trigger.dataset.imageState = success ? 'ready' : 'error';
      trigger.setAttribute('aria-busy', 'false');
      observer?.unobserve(trigger);
    };
    const loaded = async () => {
      try { await image.decode(); } catch { /* Fall back to the loaded image. */ }
      finish(image.naturalWidth > 0);
    };
    image.addEventListener('load', () => { void loaded(); }, { once: true });
    image.addEventListener('error', () => finish(false), { once: true });
    if (image.complete) { if (image.naturalWidth > 0) void loaded(); else finish(false); }
    else { trigger.setAttribute('aria-busy', 'true'); observer?.observe(trigger); }
  }
}
