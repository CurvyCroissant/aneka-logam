export function setupHeaderDropdowns() {
  const entries = [...document.querySelectorAll<HTMLElement>('[data-dropdown]')].flatMap((root) => {
    const toggle = root.querySelector<HTMLElement>('[data-dropdown-toggle]');
    const panel = root.querySelector<HTMLElement>('[data-dropdown-panel]');
    return toggle && panel ? [{ root, toggle, panel, hovered: false }] : [];
  });
  type Entry = (typeof entries)[number];
  let restoringFocus = false;
  let pointerType = 'mouse';
  function close(entry: Entry, restoreFocus = false) {
    delete entry.root.dataset.dropdownOpen;
    entry.toggle.setAttribute('aria-expanded', 'false');
    entry.panel.inert = true;
    entry.panel.setAttribute('aria-hidden', 'true');
    if (restoreFocus) {
      restoringFocus = true;
      entry.toggle.focus({ preventScroll: true });
      restoringFocus = false;
    }
  }
  function position(entry: Entry) {
    const bounds = entry.toggle.getBoundingClientRect();
    const below = innerHeight - bounds.bottom - 12, above = bounds.top - 12;
    const upwards = below < 160 && above > below;
    entry.root.dataset.dropdownSide = upwards ? 'up' : 'down';
    entry.panel.style.maxBlockSize = `${Math.max(48, upwards ? above : below)}px`;
    entry.panel.style.translate = '0 0';
    const panelBounds = entry.panel.getBoundingClientRect();
    const viewportWidth = document.documentElement?.clientWidth || innerWidth;
    const shift = Math.max(12 - panelBounds.left, Math.min(0, viewportWidth - 12 - panelBounds.right));
    entry.panel.style.translate = `${shift}px 0`;
  }
  function open(entry: Entry) {
    entries.filter((other) => other !== entry).forEach((other) => close(other));
    position(entry);
    entry.root.dataset.dropdownOpen = 'true';
    entry.toggle.setAttribute('aria-expanded', 'true');
    entry.panel.inert = false;
    entry.panel.setAttribute('aria-hidden', 'false');
  }
  function closeAll() {
    for (const entry of entries) {
      entry.hovered = false;
      close(entry);
    }
  }
  for (const entry of entries) {
    close(entry);
    position(entry);
    entry.toggle.addEventListener('click', (event) => {
      // Home remains one native page link; activating it never pins its panel.
      if (entry.toggle.matches('a[href]')) { close(entry); return; }
      // Hover already opened the language panel. The first mouse click must not
      // undo that state before the visitor can choose a language.
      if (event.detail !== 0 && entry.hovered && pointerType !== 'touch') open(entry);
      else if (entry.root.dataset.dropdownOpen) close(entry);
      else open(entry); // Native Enter/Space and touch disclosure.
    });
    entry.root.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'touch' && window.matchMedia('(any-hover: hover)').matches) {
        pointerType = event.pointerType;
        entry.hovered = true;
        open(entry);
      }
    });
    entry.root.addEventListener('pointerleave', (event) => {
      entry.hovered = false;
      // A lifted finger also fires pointerleave. Touch disclosures instead close
      // on selection/outside input; mouse departure always dismisses, even if focused.
      if (event.pointerType !== 'touch') close(entry, entry.panel.contains(document.activeElement));
    });
    entry.root.addEventListener('focusin', (event) => {
      if (!restoringFocus && event.target === entry.toggle && entry.toggle.matches(':focus-visible')) open(entry);
    });
    entry.root.addEventListener('focusout', (event) => {
      // During native Tab focus transfer, activeElement can briefly be <body>.
      // Use the next focus target instead of closing the panel in that interval.
      if (event.relatedTarget instanceof Element) {
        if (!entry.hovered && !entry.root.contains(event.relatedTarget)) close(entry);
        return;
      }
      setTimeout(() => {
        if (!entry.hovered && !entry.root.contains(document.activeElement)) close(entry);
      }, 0);
    });
    entry.root.addEventListener('keydown', (event) => {
      if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !entry.panel.contains(event.target as Node)) {
        event.preventDefault(); open(entry);
        const links = [...entry.panel.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)')];
        (event.key === 'ArrowDown' ? links[0] : links.at(-1))?.focus();
      }
    });
    entry.panel.addEventListener('click', (event) => {
      if (!(event.target instanceof Element) || !event.target.closest('a[href], button')) return;
      close(entry, Boolean(event.target.closest('[data-language-link], [data-product-filter-option]')));
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const entry = entries.find(({ root }) => root.dataset.dropdownOpen);
    if (entry) { event.preventDefault(); close(entry, true); }
  });
  document.addEventListener('pointerdown', (event) => {
    pointerType = event.pointerType;
    for (const entry of entries) if (!entry.root.contains(event.target as Node)) close(entry);
  });
  // Browsers do not always dispatch pointerleave on the trigger when the cursor
  // exits the window, a tab is hidden, or the window loses focus.
  document.addEventListener('pointerout', (event) => {
    if (event.pointerType !== 'touch' && event.relatedTarget === null) closeAll();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) closeAll(); });
  document.addEventListener('pointercancel', closeAll);
  document.addEventListener('aneka:before-navigation', closeAll);
  window.addEventListener('blur', closeAll);
  window.addEventListener('pagehide', closeAll);
  window.addEventListener('scroll', () => {
    for (const entry of entries) {
      if (!entry.root.dataset.dropdownOpen) continue;
      const bounds = entry.toggle.getBoundingClientRect();
      if (bounds.bottom <= 0 || bounds.top >= innerHeight) close(entry);
      else position(entry);
    }
  }, { passive: true });
  window.addEventListener('resize', () => { closeAll(); entries.forEach(position); }, { passive: true });
  // Clamp closed panels too: invisible absolute boxes can still widen the page.
  // Header resizing also covers font readiness and enlarged text without a window resize.
  try {
    const header = document.querySelector('.site-header');
    if (header && 'ResizeObserver' in window) new ResizeObserver(() => entries.forEach(position)).observe(header);
  } catch { /* Opening and window resizing still position panels without an observer. */ }
}
