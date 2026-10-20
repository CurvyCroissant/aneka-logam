import { motionTiming } from '../lib/motion.ts';

const active = new WeakMap<HTMLElement, Animation>();

// Animate only changed, visible text. Images, focus, and page layout stay in place.
export function animateTranslatedText(elements: Iterable<HTMLElement>, reducedMotion: MediaQueryList) {
  const targets = [...elements].filter((element) => typeof element.animate === 'function' && !element.closest('.contact-hint, .sr-only, [aria-hidden="true"]'));
  if (!targets.length) return;
  const timing = motionTiming('state', reducedMotion);
  for (const element of targets) {
    const bounds = element.getBoundingClientRect();
    if (!bounds.width || !bounds.height || bounds.bottom <= 0 || bounds.top >= innerHeight) continue;
    const previous = active.get(element);
    const currentOpacity = Number(getComputedStyle(element).opacity);
    previous?.cancel();
    const targetOpacity = Number(getComputedStyle(element).opacity);
    if (targetOpacity === 0) continue;
    try {
      const animation = element.animate([{ opacity: previous ? currentOpacity : Math.min(0.18, targetOpacity) }, { opacity: targetOpacity }], timing);
      active.set(element, animation);
      const release = () => { if (active.get(element) === animation) active.delete(element); };
      void animation.finished.then(release, release);
    } catch { /* Text remains readable if animation is unavailable. */ }
  }
}
