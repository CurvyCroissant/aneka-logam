import { catalog } from '../i18n/catalog.ts';
import { fragmentId } from '../lib/scroll-memory.ts';
import { cancelTextTransition, transitionTranslatedText } from './text-motion.ts';
import { scrollToSection } from '../lib/section-scroll.ts';
import { pagePath, categoryPath, locales, localeInfo, localeFromTag, localeFromPath, type Locale, type MainPage, type Page } from '../i18n/routes.ts';
import type { setupScrollMemory } from './scroll-memory';

export const currentLocale = (): Locale => localeFromTag(document.documentElement.lang);

export function applyLocale(locale: Locale) {
  const values = catalog(locale);
  const changed = new Set<HTMLElement>();
  function updateText(element: HTMLElement, value: string | undefined) {
    if (value === undefined || element.textContent === value) return;
    element.textContent = value;
    changed.add(element);
  }
  document.documentElement.lang = localeInfo[locale].tag;
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
    if (localeFromTag(link.hreflang) === locale) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
  }
  const page: MainPage = document.documentElement.dataset.page === 'products' ? 'products' : 'home';
  document.title = values[page === 'products' ? 'productsTitle' : 'homeTitle'] ?? document.title;
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-page-link]')) {
    const destination = link.dataset.pageLink;
    if (destination === 'home' || destination === 'products' || destination === 'contact') link.href = pagePath(locale, destination);
  }
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-category-destination]')) link.href = categoryPath(locale, { id: link.dataset.categoryDestination ?? '' });
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-section-destination]')) link.href = `${page === 'home' ? '' : pagePath(locale, 'home')}#${link.dataset.sectionDestination}`;
  document.querySelector('meta[property="og:locale"]')?.setAttribute('content', localeInfo[locale].og);
  const alternatives = locales.filter((language) => language !== locale);
  document.querySelectorAll('meta[property="og:locale:alternate"]').forEach((meta, index) => { const language = alternatives[index]; if (language) meta.setAttribute('content', localeInfo[language].og); });
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) {
    const url = new URL(canonical.href); url.pathname = pagePath(locale, page);
    canonical.href = url.href;
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', url.href);
  }
  const status = document.querySelector('[data-copy-status]');
  if (status) status.textContent = '';
  document.dispatchEvent(new Event('aneka:content-change'));
  return changed;
}

function translationTargets(locale: Locale) {
  const values = catalog(locale);
  return [...document.querySelectorAll<HTMLElement>('[data-i18n]')].filter((element) => {
    const value = values[element.dataset.i18n ?? ''];
    return value !== undefined && element.textContent !== value;
  });
}

export function setupNavigation(memory: ReturnType<typeof setupScrollMemory>, reducedMotion: MediaQueryList) {
  if (!['home', 'products'].includes(document.documentElement.dataset.page ?? '')) return;
  const root = document.documentElement;
  const page: MainPage = root.dataset.page === 'products' ? 'products' : 'home';
  let requestedLocale = currentLocale();
  document.addEventListener('aneka:before-navigation', () => { cancelTextTransition(); requestedLocale = currentLocale(); });
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
      const locale = localeFromTag(link.hreflang);
      if (locale === requestedLocale) return;
      before(); requestedLocale = locale; memory.save();
      transitionTranslatedText(translationTargets(locale), reducedMotion, () => {
        // Capture at replacement time so a scroll during the outgoing wipe is respected.
        const previous = memory.capture();
        root.classList.add('is-localizing');
        if (locale !== currentLocale()) {
          applyLocale(locale);
          memory.push(`${pagePath(locale, page)}${location.search}`, previous);
        }
        memory.position(previous.x, previous.y);
        finish();
      });
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
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-page-link]')) {
    link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      const destination = link.dataset.pageLink as Page;
      const url = new URL(pagePath(currentLocale(), destination), location.href);
      if (url.pathname !== location.pathname || url.hash) return;
      const target = document.getElementById(page === 'home' ? 'home' : 'main');
      if (!target) return;
      event.preventDefault(); before(); memory.save(); memory.cleanUrl();
      if (page === 'products') memory.selectCategory('all');
      target.focus({ preventScroll: true });
      scrollToSection(target, reducedMotion.matches ? 'instant' : 'smooth');
      document.dispatchEvent(new Event('aneka:location-change'));
    });
  }
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-category-destination]')) {
    link.addEventListener('click', (event) => {
      if (page !== 'products' || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      event.preventDefault(); before(); memory.save(); memory.cleanUrl();
      if (memory.selectCategory(link.dataset.categoryDestination ?? 'all')) {
        document.getElementById('products')?.focus({ preventScroll: true });
        document.dispatchEvent(new Event('aneka:location-change'));
      }
    });
  }
  window.addEventListener('popstate', (event) => {
    before();
    root.classList.add('is-localizing');
    const locale = localeFromPath(location.pathname);
    requestedLocale = locale;
    transitionTranslatedText(translationTargets(locale), reducedMotion, () => {
      if (locale !== currentLocale()) applyLocale(locale);
      const saved = memory.fromHistory(event.state?.alScroll);
      if (saved) memory.restore(saved);
      else if (location.hash) memory.navigateFragment();
      else memory.position(0, 0);
      memory.cleanUrl();
      finish();
    }, false);
  });
}
