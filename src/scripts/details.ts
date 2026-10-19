export function setupDetails(reducedMotion: MediaQueryList) {
  for (const details of document.querySelectorAll<HTMLDetailsElement>('.product-details')) {
    const summary = details.querySelector('summary');
    if (!summary) continue;
    let expanded = details.open;
    let animation: Animation | undefined;

    function finish() {
      details.open = expanded;
      animation?.cancel();
      animation = undefined;
      details.classList.remove('details-animating');
      delete details.dataset.expanded;
      summary?.removeAttribute('aria-expanded');
    }
    summary.addEventListener('click', (event) => {
      if (reducedMotion.matches || !details.animate) return;
      event.preventDefault();
      const from = details.getBoundingClientRect().height;
      expanded = !expanded;
      animation?.cancel();
      details.open = true;
      details.dataset.expanded = String(expanded);
      summary.setAttribute('aria-expanded', String(expanded));
      const border = parseFloat(getComputedStyle(details).borderTopWidth) || 0;
      const to = expanded ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height + border;
      details.classList.add('details-animating');
      animation = details.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      animation.onfinish = finish;
    });
    details.addEventListener('toggle', () => { if (!animation) expanded = details.open; });
    window.addEventListener('resize', () => { if (animation) finish(); }, { passive: true });
    reducedMotion.addEventListener('change', () => { if (reducedMotion.matches && animation) finish(); });
  }
}
