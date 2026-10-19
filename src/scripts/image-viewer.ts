import { fitImage, imageContentRect, type ImageRect } from '../lib/image-geometry';

export function setupImageViewer(reducedMotion: MediaQueryList) {
  const dialog = document.querySelector<HTMLDialogElement>('#image-viewer');
  const stage = dialog?.querySelector<HTMLElement>('[data-image-stage]');
  const scrim = dialog?.querySelector<HTMLElement>('[data-image-scrim]');
  if (!dialog || !stage || !scrim || !dialog.showModal) return;
  const supportsAnimation = typeof stage.animate === 'function';
  const root = document.documentElement;
  let source: HTMLElement | undefined;
  let sourceImage: Element | undefined;
  let width = 1, height = 1, scrollLeft = 0, scrollTop = 0;
  let closing = false;
  let pointerOutside = false;
  let imageAnimation: Animation | undefined;
  let scrimAnimation: Animation | undefined;

  function position(rect: ImageRect) {
    return { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` };
  }
  function sourceRect(): ImageRect {
    if (!sourceImage) return { left: 0, top: 0, width: 1, height: 1 };
    return imageContentRect(sourceImage.getBoundingClientRect(), width, height, getComputedStyle(sourceImage).objectFit);
  }
  function fittedRect(): ImageRect {
    const box = dialog!.getBoundingClientRect();
    return fitImage(width, height, box.width, box.height);
  }
  function cancelAnimations() { imageAnimation?.cancel(); scrimAnimation?.cancel(); }
  function cleanup() {
    if (!source) return;
    cancelAnimations();
    sourceImage?.classList.remove('image-source-hidden');
    root.classList.remove('image-viewer-open');
    stage!.replaceChildren();
    stage!.removeAttribute('style');
    scrim!.removeAttribute('style');
    window.scrollTo({ left: scrollLeft, top: scrollTop, behavior: 'instant' });
    source.classList.add('focus-returned');
    source.focus({ preventScroll: true });
    source = undefined;
    sourceImage = undefined;
    closing = false;
  }
  async function close() {
    if (!dialog!.open || closing) return;
    closing = true;
    const from = stage!.getBoundingClientRect();
    const opacity = getComputedStyle(scrim!).opacity;
    const imageOpacity = getComputedStyle(stage!).opacity;
    cancelAnimations();
    const to = sourceRect();
    Object.assign(stage!.style, position(reducedMotion.matches ? from : to));
    scrim!.style.opacity = '0';
    if (supportsAnimation) {
      const duration = reducedMotion.matches ? 180 : 460;
      imageAnimation = stage!.animate(reducedMotion.matches ? [{ opacity: imageOpacity }, { opacity: 0 }] : [position(from), position(to)], { duration, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'both' });
      scrimAnimation = scrim!.animate([{ opacity }, { opacity: 0 }], { duration, fill: 'both' });
      await imageAnimation.finished.catch(() => {});
    }
    if (dialog!.open) { source?.classList.add('focus-returned'); dialog!.close(); }
  }

  for (const trigger of document.querySelectorAll<HTMLElement>('[data-image-trigger]')) {
    trigger.addEventListener('blur', () => trigger.classList.remove('focus-returned'));
    trigger.addEventListener('keydown', () => trigger.classList.remove('focus-returned'));
    trigger.addEventListener('click', (event) => {
      // Retain normal modified-click behavior for the image's fallback URL.
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || dialog.open) return;
      const original = trigger.querySelector('[data-image-content]');
      if (!original) return;
      event.preventDefault();
      source = trigger;
      sourceImage = original;
      width = Number(trigger.dataset.imageWidth) || 1;
      height = Number(trigger.dataset.imageHeight) || 1;
      scrollLeft = window.scrollX;
      scrollTop = window.scrollY;
      const from = sourceRect();
      const clone = original.cloneNode(true) as Element;
      clone.removeAttribute('class');
      clone.removeAttribute('id');
      clone.removeAttribute('data-image-content');
      clone.setAttribute('aria-hidden', 'true');
      if (clone instanceof HTMLImageElement && original instanceof HTMLImageElement) {
        clone.removeAttribute('srcset');
        clone.removeAttribute('sizes');
        clone.src = original.currentSrc || original.src;
        clone.loading = 'eager';
        clone.draggable = false;
        // Show the cached thumbnail immediately, then swap in the full image.
        const full = new Image();
        full.onload = () => { if (source === trigger && dialog.open) clone.src = full.src; };
        full.src = (trigger as HTMLAnchorElement).href;
      }
      stage.replaceChildren(clone);
      stage.setAttribute('aria-label', original.getAttribute('alt') || trigger.getAttribute('aria-label') || '');
      root.classList.add('image-viewer-open');
      dialog.showModal();
      const to = fittedRect();
      Object.assign(stage.style, position(to));
      original.classList.add('image-source-hidden');
      stage.focus({ preventScroll: true });
      if (supportsAnimation) {
        const duration = reducedMotion.matches ? 180 : 560;
        imageAnimation = stage.animate(reducedMotion.matches ? [{ opacity: 0 }, { opacity: 1 }] : [position(from), position(to)], { duration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
        scrimAnimation = scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration });
      }
    });
  }
  dialog.addEventListener('pointerdown', (event) => { pointerOutside = event.target instanceof Node && !stage.contains(event.target); });
  dialog.addEventListener('click', (event) => { if (pointerOutside && event.target instanceof Node && !stage.contains(event.target)) void close(); });
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); void close(); });
  dialog.addEventListener('close', cleanup);
  function resize() {
    if (!dialog!.open || closing) return;
    cancelAnimations();
    Object.assign(stage!.style, position(fittedRect()));
  }
  window.addEventListener('resize', resize, { passive: true });
  window.visualViewport?.addEventListener('resize', resize, { passive: true });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) resize(); });
  window.addEventListener('pagehide', () => { if (dialog.open) { dialog.close(); cleanup(); } });
  document.addEventListener('aneka:before-navigation', () => { if (dialog.open) { dialog.close(); cleanup(); } });
}
