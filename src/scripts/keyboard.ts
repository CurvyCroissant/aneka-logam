export function setupKeyboard() {
  let armed: HTMLAnchorElement | undefined;
  const isSpace = (event: KeyboardEvent) => event.key === ' ' || event.code === 'Space';
  const editable = (target: Element) => target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]');
  const clear = () => { armed = undefined; };

  document.addEventListener('keydown', (event) => {
    if (!isSpace(event) || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target : undefined;
    if (target && editable(target)) return;
    // Buttons and disclosure summaries already activate with Space natively.
    if (target?.closest('button:not(:disabled), summary')) return;
    event.preventDefault();
    if (!event.repeat) armed = target?.closest<HTMLAnchorElement>('a[href]') ?? undefined;
  });
  document.addEventListener('keyup', (event) => {
    if (!isSpace(event)) return;
    const link = armed;
    clear();
    if (!link || document.activeElement !== link || event.ctrlKey || event.metaKey || event.altKey || link.getAttribute('aria-disabled') === 'true') return;
    event.preventDefault();
    link.click();
  });
  window.addEventListener('blur', clear);
  document.addEventListener('aneka:before-navigation', clear);
}
