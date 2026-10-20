import { motionTiming } from '../lib/motion.ts';

const active = new WeakMap<HTMLElement, Animation>();

// Animate only changed, visible text. Images, focus, and page layout stay in place.
export function animateTranslatedText(elements: Iterable<HTMLElement>, reducedMotion: MediaQueryList) {
  const targets = [...elements].filter((element) => typeof element.animate === 'function' && !element.closest('.contact-hint, .sr-only, [aria-hidden="true"]'));
  if (!targets.length) return;
  const timing = motionTiming('move', reducedMotion);
  for (const element of targets) {
    const bounds = element.getBoundingClientRect();
    if (!bounds.width || !bounds.height || bounds.bottom <= 0 || bounds.top >= innerHeight) continue;
    const previous = active.get(element);
    const current = getComputedStyle(element);
    const currentOpacity = Number(current.opacity);
    const currentTranslate = current.translate || 'none';
    const currentScale = current.scale || '1';
    previous?.cancel();
    const target = getComputedStyle(element);
    const targetOpacity = Number(target.opacity);
    if (targetOpacity === 0) continue;
    try {
      const start: Keyframe = { opacity: previous ? currentOpacity : Math.min(0.18, targetOpacity) };
      const end: Keyframe = { opacity: targetOpacity };
      if (!reducedMotion.matches) {
        Object.assign(start, { translate: previous ? currentTranslate : '0 14px', scale: previous ? currentScale : '0.985' });
        Object.assign(end, { translate: target.translate || 'none', scale: target.scale || '1' });
      }
      const animation = element.animate([start, end], timing);
      active.set(element, animation);
      const release = () => { if (active.get(element) === animation) active.delete(element); };
      void animation.finished.then(release, release);
    } catch { /* Text remains readable if animation is unavailable. */ }
  }
}
