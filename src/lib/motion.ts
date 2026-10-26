export function motionTiming(kind: 'state' | 'move') {
  const style = getComputedStyle(document.documentElement);
  const fallback = kind === 'state' ? 650 : 850;
  return {
    duration: parseFloat(style.getPropertyValue(`--${kind}-duration`)) || fallback,
    easing: style.getPropertyValue('--ease').trim() || 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  };
}
