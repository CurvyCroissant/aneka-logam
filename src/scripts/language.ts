import { catalog } from '../i18n/catalog.ts';
import { fragmentId } from '../lib/scroll-memory.ts';
import { animateTranslatedText } from './text-motion.ts';
import { scrollToSection } from '../lib/section-scroll.ts';
import type { Locale } from '../i18n/routes';
import type { setupScrollMemory } from './scroll-memory';

export const currentLocale = (): Locale => document.documentElement.lang === 'en' ? 'en' : 'id';

export function applyLocale(locale: Locale) {
  const values = catalog(locale);
  const changed = new Set<HTMLElement>();
  function updateText(element: HTMLElement, value: string | undefined) {
    if (value === undefined || element.textContent === value) return;
    element.textContent = value;
    changed.add(element);
  }
  document.documentElement.lang = locale;
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    updateText(element, values[element.dataset.i18n ?? '']);
  }
  for (const attribute of ['aria-label', 'content']) {
    for (const element of document.querySelectorAll(`[data-i18n-${attribute}]`)) {
      const value = values[element.getAttribute(`data-i18n-${attribute}`) ?? ''];
      if (value !== undefined) element.setAttribute(attribute, value);
    }
  }
  for (const action of document.querySelectorAll<HTMLElement>('[data-contact-kind]')) {
    const label = values[`contactActions.${action.dataset.contactKind}`] ?? '';
    const value = action.querySelector('.contact-value')?.textContent ?? '';
    action.setAttribute('aria-label', `${label}: ${value}`);
    action.dataset.copySuccess = values['copied'] ?? '';
    action.dataset.copyFailure = values['copyFailed'] ?? '';
    const hint = action.querySelector<HTMLElement>('[data-copy-hint]');
    if (hint) updateText(hint, values[action.dataset.copyState === 'success' ? 'copied' : action.dataset.copyState === 'error' ? 'copyFailed' : `contactActions.${action.dataset.contactKind}`]);
  }
  for (const trigger of document.querySelectorAll<HTMLElement>('[data-image-trigger]')) {
    const image = trigger.querySelector<HTMLImageElement>('img[data-image-content]');
    const alt = trigger.getAttribute(`data-image-alt-${locale}`) ?? values[trigger.dataset.imageLabelKey ?? ''] ?? image?.alt ?? '';
    if (image) image.alt = alt;
    trigger.setAttribute('aria-label', `${values['enlargeImage']}: ${alt}`);
  }
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-language-link]')) {
    if (link.hreflang === locale) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
  }
  document.title = values['homeTitle'] ?? document.title;
  document.querySelector('meta[property="og:locale"]')?.setAttribute('content', locale === 'en' ? 'en_US' : 'id_ID');
  document.querySelector('meta[property="og:locale:alternate"]')?.setAttribute('content', locale === 'en' ? 'id_ID' : 'en_US');
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) {
    const url = new URL(canonical.href); url.pathname = locale === 'en' ? '/en/' : '/';
    canonical.href = url.href;
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', url.href);
  }
  const status = document.querySelector('[data-copy-status]');
  if (status) status.textContent = '';
  return changed;
}

export function setupNavigation(memory: ReturnType<typeof setupScrollMemory>, reducedMotion: MediaQueryList) {
  if (document.documentElement.dataset.page !== 'home') return;
  const root = document.documentElement;
  function before() { document.dispatchEvent(new Event('aneka:before-navigation')); }
  function finish() {
    memory.save();
    document.dispatchEvent(new Event('aneka:location-change'));
    requestAnimationFrame(() => root.classList.remove('is-localizing'));
  }
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-language-link]')) {
    link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      event.preventDefault();
      const locale = link.hreflang === 'en' ? 'en' : 'id';
      if (locale === currentLocale()) return;
      before(); memory.save();
      const previous = memory.capture();
      root.classList.add('is-localizing');
      const changed = applyLocale(locale);
      memory.push(`${locale === 'en' ? '/en/' : '/'}${location.search}`, previous);
      memory.position(previous.x, previous.y);
      animateTranslatedText(changed, reducedMotion);
      finish();
    });
  }
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
    link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      const target = document.getElementById(fragmentId(link.hash));
      if (!target) return;
      event.preventDefault();
      before(); memory.save();
      memory.cleanUrl();
      target.focus({ preventScroll: true });
      scrollToSection(target, reducedMotion.matches ? 'instant' : 'smooth');
      document.dispatchEvent(new Event('aneka:location-change'));
    });
  }
  window.addEventListener('popstate', (event) => {
    before();
    root.classList.add('is-localizing');
    const locale = location.pathname === '/en/' ? 'en' : 'id';
    const changed = locale !== currentLocale() ? applyLocale(locale) : [];
    const saved = memory.fromHistory(event.state?.alScroll);
    if (saved) memory.restore(saved);
    else if (location.hash) { const target = document.getElementById(fragmentId(location.hash)); if (target) scrollToSection(target); }
    else memory.position(0, 0);
    memory.cleanUrl();
    animateTranslatedText(changed, reducedMotion);
    finish();
  });
}
