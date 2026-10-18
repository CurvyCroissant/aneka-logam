import { copyText } from '../lib/clipboard';
import { setupScrollMemory } from './scroll-memory';
import { setupGalleries } from './galleries';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
setupGalleries(reducedMotion);
const restoration = setupScrollMemory();

const liveStatus = document.querySelector<HTMLElement>('[data-copy-status]');
for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-copy]')) {
  const hint = button.querySelector<HTMLElement>('[data-copy-hint]');
  const value = button.querySelector<HTMLElement>('.contact-value');
  const defaultHint = hint?.textContent ?? '';
  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  button.addEventListener('click', async () => {
    const text = button.dataset.copy ?? '';
    const copied = await copyText(text, navigator.clipboard);
    const message = (copied ? button.dataset.copySuccess : button.dataset.copyFailure) ?? '';
    clearTimeout(resetTimer);
    button.dataset.copyState = copied ? 'success' : 'error';
    if (hint) hint.textContent = message;
    if (liveStatus) liveStatus.textContent = `${message}: ${text}`;
    if (!copied && value) {
      const range = document.createRange();
      range.selectNodeContents(value);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    if (copied) {
      resetTimer = setTimeout(() => {
        delete button.dataset.copyState;
        if (hint) hint.textContent = defaultHint;
      }, 2500);
    }
  });
}

const sections = [...document.querySelectorAll<HTMLElement>('[data-section]')];
const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-section-link]')];
const languageLinks = [...document.querySelectorAll<HTMLAnchorElement>('[data-language-link]')];
const header = document.querySelector<HTMLElement>('.site-header');
let headerHeight = header?.offsetHeight ?? 0;
let framePending = false;
let currentSection = '';

function updateNavigation() {
  framePending = false;
  let active = sections[0];
  if (!active) return;
  // A non-sticky header on short landscape screens needs no scroll offset.
  const stickyHeight = header && getComputedStyle(header).position === 'sticky' ? headerHeight : 0;
  const boundary = stickyHeight + Math.min(100, window.innerHeight * 0.2);
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= boundary) active = section;
  }
  if (window.scrollY > 0 && Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2) {
    active = sections.at(-1) ?? active;
  }
  if (active.id === currentSection) return;
  currentSection = active.id;
  for (const link of links) {
    if (link.dataset.sectionLink === active.id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  for (const link of languageLinks) link.hash = `#${active.id}`;
}

function scheduleNavigation() {
  if (framePending) return;
  framePending = true;
  requestAnimationFrame(updateNavigation);
}

function updateHeader() {
  headerHeight = header?.offsetHeight ?? 0;
  const sticky = header && getComputedStyle(header).position === 'sticky';
  document.documentElement.style.setProperty('--header-height', `${sticky ? headerHeight : 0}px`);
  scheduleNavigation();
}

if (sections.length) {
  updateHeader();
  if ('ResizeObserver' in window && header) new ResizeObserver(updateHeader).observe(header);
  window.addEventListener('scroll', scheduleNavigation, { passive: true });
  window.addEventListener('resize', updateHeader, { passive: true });
  window.addEventListener('hashchange', scheduleNavigation);
  window.addEventListener('pageshow', scheduleNavigation);
}

function setupReveals(restored: boolean) {
  const elements = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  const animate = (element: HTMLElement) => {
    if (!element.animate) return;
    const frames = reducedMotion.matches
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }];
    element.animate(frames, {
      duration: reducedMotion.matches ? 160 : 720,
      delay: reducedMotion.matches ? 0 : Math.min(2, Number(element.dataset.revealOrder) || 0) * 100,
      easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'backwards',
    });
  };
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      if (entry.target instanceof HTMLElement) animate(entry.target);
    }
  }, { threshold: 0.01, rootMargin: '0px 0px -8px 0px' });
  for (const element of elements) {
    const bounds = element.getBoundingClientRect();
    // Restored content stays steady; first visits animate visible items as well.
    if (restored && bounds.top < innerHeight && bounds.bottom > 0) continue;
    observer.observe(element);
  }
}
restoration.catch(() => false).then((restored) => { updateHeader(); setupReveals(restored); });
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) document.getAnimations().forEach((animation) => animation.finish());
});
