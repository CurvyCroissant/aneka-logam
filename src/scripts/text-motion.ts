const active = new WeakMap<HTMLElement, Animation>();

// Animate only changed, visible text. Images, focus, and page layout stay in place.
export function animateTranslatedText(elements: Iterable<HTMLElement>, reducedMotion: MediaQueryList) {
  const targets = [...elements].filter((element) => typeof element.animate === 'function' && !element.closest('.contact-hint, .sr-only, .skip-link, [aria-hidden="true"]'));
  if (!targets.length) return;
  const style = getComputedStyle(document.documentElement);
  const duration = parseFloat(style.getPropertyValue(reducedMotion.matches ? '--reduced-duration' : '--state-duration')) || (reducedMotion.matches ? 180 : 420);
  const easing = style.getPropertyValue('--ease').trim() || 'cubic-bezier(0.22, 1, 0.36, 1)';
  for (const element of targets) {
    const bounds = element.getBoundingClientRect();
    if (!bounds.width || !bounds.height || bounds.bottom <= 0 || bounds.top >= innerHeight) continue;
    const previous = active.get(element);
    const currentOpacity = Number(getComputedStyle(element).opacity);
    previous?.cancel();
    const targetOpacity = Number(getComputedStyle(element).opacity);
    if (targetOpacity === 0) continue;
    try {
      const animation = element.animate([{ opacity: previous ? currentOpacity : Math.min(0.18, targetOpacity) }, { opacity: targetOpacity }], { duration, easing });
      active.set(element, animation);
      const release = () => { if (active.get(element) === animation) active.delete(element); };
      void animation.finished.then(release, release);
    } catch { /* Text remains readable if animation is unavailable. */ }
  }
}
