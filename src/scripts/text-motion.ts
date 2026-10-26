import { motionTiming } from '../lib/motion.ts';

let revision = 0;
const active = new Set<Animation>();
const sizing = new Set<HTMLElement>();
let settleActive: (() => void) | undefined;
let settleTimer: ReturnType<typeof setTimeout> | undefined;

function clearSizing() {
  for (const element of sizing) element.classList.remove('i18n-sizing');
  sizing.clear();
}
function constrainLabel(element: HTMLElement) {
  sizing.add(element);
  element.classList.add('i18n-sizing');
}

export function cancelTextTransition() {
  revision++;
  for (const animation of active) animation.cancel();
  active.clear();
  clearSizing();
  clearTimeout(settleTimer);
  settleActive?.();
  settleActive = undefined;
}

// Keep the old text until its right edge has swept left. Only then replace it.
export function transitionTranslatedText(elements: Iterable<HTMLElement>, commit: () => void, exit = true, settled: () => void = () => {}) {
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
      ...(element.dataset.i18nSize !== undefined ? { inlineSize: inlineSize(element, style), whiteSpace: style.whiteSpace || 'normal' } : {}),
    }];
  }));
  cancelTextTransition();
  const ticket = revision;
  settleActive = settled;
  const timing = motionTiming('move');
  const duration = timing.duration / 2;
  function animate(element: HTMLElement, frames: Keyframe[], fill: FillMode = 'none') {
    try {
      const animation = element.animate(frames, { ...timing, duration, easing: 'linear', fill });
      active.add(animation);
      const release = () => {
        active.delete(animation);
        if (fill !== 'forwards' && ticket === revision) { sizing.delete(element); element.classList.remove('i18n-sizing'); }
      };
      void animation.finished.then(() => { if (fill !== 'forwards') { animation.cancel(); release(); } }, release);
      return animation;
    } catch {
      sizing.delete(element); element.classList.remove('i18n-sizing');
      return undefined; // Translation stays available without animation support.
    }
  }
  function enter() {
    if (ticket !== revision) return;
    for (const animation of active) animation.cancel();
    active.clear();
    clearSizing();
    commit();
    // Measure new intrinsic label widths in one batch, before starting any writes.
    // Their flex parents then resize with the wipe; paragraphs retain fluid widths.
    const widths = new Map<HTMLElement, string>();
    for (const element of targets) {
      if (element.dataset.i18nSize === undefined) continue;
      const style = getComputedStyle(element);
      const lineHeight = parseFloat(style.lineHeight);
      // Only constrain labels whose final layout genuinely fits on one line.
      // Prevent the longer translation wrapping inside the old, smaller width.
      if (!Number.isFinite(lineHeight) || element.getBoundingClientRect().height <= lineHeight + 1) widths.set(element, inlineSize(element, style));
    }
    for (const element of widths.keys()) constrainLabel(element);
    const incoming = targets.map((element) => animate(element, [
      { clipPath: 'inset(0 100% 0 0)', translate: '-8px 0', ...(widths.has(element) ? { inlineSize: starts.get(element)!.inlineSize, whiteSpace: 'nowrap' } : {}) },
      { clipPath: 'inset(0 0 0 0)', translate: '0 0', ...(widths.has(element) ? { inlineSize: widths.get(element), whiteSpace: 'nowrap' } : {}) },
    ], 'both')).filter((animation): animation is Animation => Boolean(animation));
    const finish = () => {
      if (ticket !== revision || !settleActive) return;
      clearTimeout(settleTimer);
      for (const animation of incoming) { active.delete(animation); animation.cancel(); }
      clearSizing();
      settleActive = undefined;
      settled();
    };
    if (!incoming.length) finish();
    else {
      settleTimer = setTimeout(finish, duration + 250);
      void Promise.all(incoming.map((animation) => animation.finished.catch(() => {}))).then(finish);
    }
  }
  if (!targets.length || !exit) { enter(); return; }
  for (const element of targets) if (starts.get(element)!.whiteSpace === 'nowrap') constrainLabel(element);
  const outgoing = targets.map((element) => animate(element, [
    starts.get(element)!, { clipPath: 'inset(0 100% 0 0)', translate: '-8px 0', ...(starts.get(element)!.inlineSize ? { inlineSize: starts.get(element)!.inlineSize, whiteSpace: starts.get(element)!.whiteSpace } : {}) },
  ], 'forwards')).filter((animation): animation is Animation => Boolean(animation));
  if (!outgoing.length) { enter(); return; }
  let timer: ReturnType<typeof setTimeout>;
  const bounded = new Promise<void>((resolve) => { timer = setTimeout(resolve, duration + 250); });
  void Promise.race([Promise.all(outgoing.map((animation) => animation.finished.catch(() => {}))), bounded]).then(() => { clearTimeout(timer); enter(); });
}
