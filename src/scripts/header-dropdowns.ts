export function setupHeaderDropdowns() {
  const entries = [...document.querySelectorAll<HTMLElement>('[data-dropdown]')].flatMap((root) => {
    const toggle = root.querySelector<HTMLButtonElement>('[data-dropdown-toggle]');
    const panel = root.querySelector<HTMLElement>('[data-dropdown-panel]');
    return toggle && panel ? [{ root, toggle, panel }] : [];
  });
  type Entry = (typeof entries)[number];
  function close(entry: Entry, restoreFocus = false) {
    delete entry.root.dataset.dropdownOpen;
    entry.toggle.setAttribute('aria-expanded', 'false');
    entry.panel.inert = true;
    entry.panel.setAttribute('aria-hidden', 'true');
    if (restoreFocus) entry.toggle.focus({ preventScroll: true });
  }
  function open(entry: Entry) {
    entries.filter((other) => other !== entry).forEach((other) => close(other));
    const bounds = entry.toggle.getBoundingClientRect();
    const below = innerHeight - bounds.bottom - 12, above = bounds.top - 12;
    const upwards = below < 160 && above > below;
    entry.root.dataset.dropdownSide = upwards ? 'up' : 'down';
    entry.panel.style.maxBlockSize = `${Math.max(48, upwards ? above : below)}px`;
    entry.root.dataset.dropdownOpen = 'true';
    entry.toggle.setAttribute('aria-expanded', 'true');
    entry.panel.inert = false;
    entry.panel.setAttribute('aria-hidden', 'false');
    entry.panel.style.translate = '0 0';
    const panelBounds = entry.panel.getBoundingClientRect();
    const shift = Math.max(12 - panelBounds.left, Math.min(0, innerWidth - 12 - panelBounds.right));
    entry.panel.style.translate = `${shift}px 0`;
  }
  for (const entry of entries) {
    close(entry);
    entry.toggle.addEventListener('click', () => entry.root.dataset.dropdownOpen ? close(entry) : open(entry));
    entry.root.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'touch' && window.matchMedia('(hover: hover)').matches) open(entry);
    });
    entry.root.addEventListener('pointerleave', () => { if (!entry.root.contains(document.activeElement)) close(entry); });
    entry.root.addEventListener('focusout', () => queueMicrotask(() => { if (!entry.root.contains(document.activeElement)) close(entry); }));
    entry.root.addEventListener('keydown', (event) => {
      if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !entry.panel.contains(event.target as Node)) {
        event.preventDefault(); open(entry);
        const links = [...entry.panel.querySelectorAll<HTMLAnchorElement>('a[href]')];
        (event.key === 'ArrowDown' ? links[0] : links.at(-1))?.focus();
      }
    });
    entry.panel.addEventListener('click', (event) => {
      if (!(event.target instanceof Element) || !event.target.closest('a[href]')) return;
      close(entry, Boolean(event.target.closest('[data-language-link]')));
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const entry = entries.find(({ root }) => root.dataset.dropdownOpen);
    if (entry) { event.preventDefault(); close(entry, true); }
  });
  document.addEventListener('pointerdown', (event) => {
    for (const entry of entries) if (!entry.root.contains(event.target as Node)) close(entry);
  });
  document.addEventListener('aneka:before-navigation', () => entries.forEach((entry) => close(entry)));
  window.addEventListener('resize', () => entries.forEach((entry) => close(entry)), { passive: true });
}
