import { copyText } from '../lib/clipboard';
import { setupScrollMemory } from './scroll-memory';
import { setupGalleries } from './galleries';
import { setupReveals } from './reveals';
import { setupImageViewer } from './image-viewer';
import { setupDetails } from './details';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const restoration = setupScrollMemory().catch(() => false);
setupReveals(restoration);
setupGalleries(reducedMotion);
setupImageViewer(reducedMotion);
setupDetails(reducedMotion);

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

void restoration.then(updateHeader);
