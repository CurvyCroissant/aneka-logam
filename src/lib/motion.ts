export function motionTiming(kind: 'state' | 'move', reducedMotion: MediaQueryList) {
  const style = getComputedStyle(document.documentElement);
  const fallback = reducedMotion.matches ? 180 : kind === 'state' ? 650 : 850;
  return {
    duration: parseFloat(style.getPropertyValue(reducedMotion.matches ? '--reduced-duration' : `--${kind}-duration`)) || fallback,
    easing: style.getPropertyValue('--ease').trim() || 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  };
}
