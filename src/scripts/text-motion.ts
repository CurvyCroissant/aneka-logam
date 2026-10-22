import { motionTiming } from '../lib/motion.ts';

let revision = 0;
const active = new Set<Animation>();
let settleActive: (() => void) | undefined;
let settleTimer: ReturnType<typeof setTimeout> | undefined;

export function cancelTextTransition() {
  revision++;
  for (const animation of active) animation.cancel();
  active.clear();
  clearTimeout(settleTimer);
  settleActive?.();
  settleActive = undefined;
}

// Keep the old text until its right edge has swept left. Only then replace it.
export function transitionTranslatedText(elements: Iterable<HTMLElement>, motion: MediaQueryList, commit: () => void, exit = true, settled: () => void = () => {}) {
  function inlineSize(element: HTMLElement, style = getComputedStyle(element)) {
    const width = parseFloat(style.inlineSize);
    return `${Number.isFinite(width) ? width : element.getBoundingClientRect().width}px`;
  }
  const targets = [...elements].filter((element) => {
    if (typeof element.animate !== 'function' || element.closest('.image-error, .contact-hint, .sr-only, [aria-hidden="true"]')) return false;
    const bounds = element.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < innerHeight && Number(getComputedStyle(element).opacity) > 0;
  });
  const starts = new Map(targets.map((element) => {
    const style = getComputedStyle(element);
    return [element, {
      clipPath: style.clipPath && style.clipPath !== 'none' ? style.clipPath : 'inset(0 0 0 0)',
      translate: style.translate && style.translate !== 'none' ? style.translate : '0 0',
      ...(element.dataset.i18nSize !== undefined ? { inlineSize: inlineSize(element, style) } : {}),
    }];
  }));
  cancelTextTransition();
  const ticket = revision;
  settleActive = settled;
  const timing = motionTiming('move', motion);
  const duration = motion.matches ? timing.duration : timing.duration / 2;
  function animate(element: HTMLElement, frames: Keyframe[], fill: FillMode = 'none') {
    try {
      const animation = element.animate(frames, { ...timing, duration, easing: motion.matches ? timing.easing : 'linear', fill });
      active.add(animation);
      void animation.finished.then(() => { if (fill !== 'forwards') { active.delete(animation); animation.cancel(); } }, () => active.delete(animation));
      return animation;
    } catch { return undefined; /* Translation stays available without animation support. */ }
  }
  function enter() {
    if (ticket !== revision) return;
    for (const animation of active) animation.cancel();
    active.clear();
    commit();
    // Measure new intrinsic label widths in one batch, before starting any writes.
    // Their flex parents then resize with the wipe; paragraphs retain fluid widths.
    const widths = new Map(targets.filter((element) => element.dataset.i18nSize !== undefined).map((element) => [element, inlineSize(element)]));
    const incoming = targets.map((element) => animate(element, motion.matches ? [{ opacity: 0.2 }, { opacity: 1 }] : [
      { clipPath: 'inset(0 100% 0 0)', translate: '-8px 0', ...(widths.has(element) ? { inlineSize: starts.get(element)!.inlineSize } : {}) },
      { clipPath: 'inset(0 0 0 0)', translate: '0 0', ...(widths.has(element) ? { inlineSize: widths.get(element) } : {}) },
    ], 'both')).filter((animation): animation is Animation => Boolean(animation));
    const finish = () => {
      if (ticket !== revision || !settleActive) return;
      clearTimeout(settleTimer);
      settleActive = undefined;
      settled();
    };
    if (!incoming.length) finish();
    else {
      settleTimer = setTimeout(finish, duration + 250);
      void Promise.all(incoming.map((animation) => animation.finished.catch(() => {}))).then(finish);
    }
  }
  if (!targets.length || motion.matches || !exit) { enter(); return; }
  const outgoing = targets.map((element) => animate(element, [
    starts.get(element)!, { clipPath: 'inset(0 100% 0 0)', translate: '-8px 0', ...(starts.get(element)!.inlineSize ? { inlineSize: starts.get(element)!.inlineSize } : {}) },
  ], 'forwards')).filter((animation): animation is Animation => Boolean(animation));
  if (!outgoing.length) { enter(); return; }
  let timer: ReturnType<typeof setTimeout>;
  const bounded = new Promise<void>((resolve) => { timer = setTimeout(resolve, duration + 250); });
  void Promise.race([Promise.all(outgoing.map((animation) => animation.finished.catch(() => {}))), bounded]).then(() => { clearTimeout(timer); enter(); });
}
