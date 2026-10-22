import { fragmentId } from '../lib/scroll-memory.ts';
import { motionTiming } from '../lib/motion.ts';
import { copy } from '../i18n/copy.ts';
import { localeFromTag } from '../i18n/routes.ts';

export type CatalogView = 'thumbnails' | 'details';
export type CatalogSort = 'none' | 'ascending' | 'descending';
export interface ProductCatalog {
  current(): string;
  view(): CatalogView;
  sort(): CatalogSort;
  setView(view: CatalogView, animate?: boolean): void;
  setSort(order: CatalogSort, animate?: boolean): void;
  select(category: string, animate?: boolean): void;
  categoryForFragment(fragment: string): string | undefined;
}

export function setupProductCatalog(motion: MediaQueryList): ProductCatalog | undefined {
  const catalog = document.querySelector<HTMLElement>('[data-product-catalog]');
  const list = catalog?.querySelector<HTMLElement>('[data-product-list]');
  const viewport = catalog?.querySelector<HTMLElement>('[data-catalog-viewport]');
  const scroll = catalog?.querySelector<HTMLElement>('[data-catalog-scroll]');
  const controls = catalog?.querySelector<HTMLElement>('[data-product-filters]');
  const views = catalog?.querySelector<HTMLElement>('[data-catalog-views]');
  if (!catalog || !list || !controls) return;
  const cards = [...list.querySelectorAll<HTMLElement>('[data-product-category]')];
  const tracks = [...list.querySelectorAll<HTMLElement>('[data-catalog-track]')];
  const headings = [...list.querySelectorAll<HTMLElement>('[data-catalog-group-heading]')];
  const buttons = [...controls.querySelectorAll<HTMLButtonElement>('[data-product-filter]')];
  const categories = new Set(buttons.map((button) => button.dataset.productFilter));
  const viewButtons = [...(views?.querySelectorAll<HTMLButtonElement>('[data-catalog-view-button]') ?? [])];
  const head = list.querySelector('thead');
  const sortHeader = list.querySelector<HTMLElement>('[data-category-sort-header]');
  const sortButton = list.querySelector<HTMLButtonElement>('[data-category-sort]');
  const sortFallback = list.querySelector<HTMLElement>('[data-sort-fallback]');
  const sortIcon = list.querySelector<HTMLElement>('[data-sort-icon]');
  const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
  let selected = 'all';
  let view: CatalogView = 'thumbnails';
  let order: CatalogSort = 'none';
  let animation: Animation | undefined;
  let reservedHeight = 0;

  function animateList() {
    animation?.cancel();
    if (typeof list!.animate !== 'function') return;
    try {
      animation = list!.animate(motion.matches ? [{ opacity: 0.3 }, { opacity: 1 }] : [{ opacity: 0.3, translate: '0 18px' }, { opacity: 1, translate: '0 0' }], motionTiming('move', motion));
    } catch { /* The chosen view/filter remains available without animation. */ }
  }
  function arrangeGroups() {
    const sorted = [...tracks];
    if (view === 'details' && order !== 'none') sorted.sort((a, b) => {
      const name = (track: HTMLElement) => track.querySelector('.catalog-category-label')?.textContent ?? track.dataset.catalogTrack ?? '';
      return collator.compare(name(a), name(b)) * (order === 'ascending' ? 1 : -1);
    });
    for (const track of sorted) {
      const heading = headings.find((heading) => heading.dataset.catalogGroupHeading === track.dataset.catalogTrack);
      if (heading) list!.append(heading);
      list!.append(track);
    }
  }
  function refreshInteractions() {
    const carousel = view === 'thumbnails' && selected === 'all';
    for (const track of tracks) {
      if (carousel && !track.hidden && track.scrollWidth > track.clientWidth + 1) track.setAttribute('tabindex', '0');
      else track.removeAttribute('tabindex');
    }
    if (scroll) {
      if (view === 'details' && scroll.scrollWidth > scroll.clientWidth + 1) scroll.setAttribute('tabindex', '0');
      else scroll.removeAttribute('tabindex');
    }
  }
  function updateSortControl() {
    sortHeader?.setAttribute('aria-sort', order);
    if (sortIcon) sortIcon.textContent = order === 'ascending' ? '▲' : order === 'descending' ? '▼' : '↕';
    if (sortButton) {
      const key = order === 'ascending' ? 'sortCategoryDescending' : 'sortCategoryAscending';
      sortButton.setAttribute('aria-label', copy(localeFromTag(document.documentElement.lang))[key]);
      sortButton.setAttribute('data-i18n-aria-label', key);
      sortButton.hidden = view !== 'details';
    }
    if (sortFallback) sortFallback.hidden = view === 'details';
  }
  function applyPresentation() {
    catalog!.dataset.catalogView = view;
    catalog!.dataset.category = selected;
    head?.classList.toggle('sr-only', view === 'thumbnails');
    for (const track of tracks) track.hidden = selected !== 'all' && track.dataset.catalogTrack !== selected;
    for (const heading of headings) heading.hidden = view !== 'thumbnails' || selected !== 'all';
    updateSortControl();
    arrangeGroups();
  }
  function sizeToAllProducts() {
    if (!viewport) return;
    // One synchronous measurement of the thumbnail All layout, with no cloned media.
    // Restore presentation and carousel positions before the browser can paint.
    const elements = [...cards, ...tracks, ...headings];
    const hidden = elements.map((element) => element.hidden);
    const positions = tracks.map((track) => track.scrollLeft);
    catalog!.dataset.catalogView = 'thumbnails';
    catalog!.dataset.category = 'all';
    head?.classList.add('sr-only');
    for (const element of elements) element.hidden = false;
    const height = Math.ceil(list!.getBoundingClientRect().height);
    elements.forEach((element, index) => { element.hidden = hidden[index]!; });
    catalog!.dataset.catalogView = view;
    catalog!.dataset.category = selected;
    head?.classList.toggle('sr-only', view === 'thumbnails');
    tracks.forEach((track, index) => { track.scrollLeft = positions[index]!; });
    if (height !== reservedHeight) {
      reservedHeight = height;
      viewport.style.minBlockSize = `${height}px`;
    }
    refreshInteractions();
  }
  function setView(next: CatalogView, animate = false) {
    const changed = next !== view;
    view = next === 'details' ? 'details' : 'thumbnails';
    applyPresentation();
    for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.catalogViewButton === view));
    sizeToAllProducts();
    try { window.localStorage?.setItem('aneka-logam:catalog-view', view); } catch { /* Private browsing can disable preference storage. */ }
    if (changed && animate) animateList();
  }
  function setSort(next: CatalogSort, animate = false) {
    order = next === 'ascending' || next === 'descending' ? next : 'none';
    updateSortControl();
    arrangeGroups();
    if (animate) animateList();
  }
  function categoryForFragment(fragment: string) {
    const legacy = ({ 'plates-strips': 'shim-plate', springs: 'per', spring: 'per' } as Record<string, string>)[fragment];
    const category = legacy ?? fragment;
    return categories.has(category) ? category : cards.find((card) => card.id === category)?.dataset.productCategory;
  }
  function select(category: string, animate = false) {
    const next = categories.has(category) ? category : 'all';
    const changed = next !== selected;
    selected = next;
    animation?.cancel();
    for (const card of cards) card.hidden = next !== 'all' && card.dataset.productCategory !== next;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.productFilter === next));
    for (const link of document.querySelectorAll<HTMLElement>('[data-category-destination]')) {
      if (link.dataset.categoryDestination === next) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    applyPresentation();
    refreshInteractions();
    if (animate && changed) animateList();
  }
  let preference: CatalogView = 'thumbnails';
  try { if (window.localStorage?.getItem('aneka-logam:catalog-view') === 'details') preference = 'details'; } catch { /* Use the default when storage is unavailable. */ }
  setView(preference);
  select(categoryForFragment(fragmentId(location.hash)) ?? 'all');
  controls.hidden = false;
  if (views) views.hidden = false;
  let observing = false;
  try {
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(sizeToAllProducts).observe(list);
      observing = true;
    }
  } catch { /* Resize events remain available if an observer cannot be created. */ }
  if (!observing) window.addEventListener('resize', sizeToAllProducts, { passive: true });
  document.addEventListener('aneka:content-change', () => { updateSortControl(); sizeToAllProducts(); });
  for (const button of viewButtons) button.addEventListener('click', () => {
    const next = button.dataset.catalogViewButton;
    if ((next !== 'thumbnails' && next !== 'details') || next === view) return;
    document.dispatchEvent(new Event('aneka:before-navigation'));
    setView(next, true);
    document.dispatchEvent(new Event('aneka:catalog-change'));
  });
  sortButton?.addEventListener('click', () => {
    document.dispatchEvent(new Event('aneka:before-navigation'));
    setSort(order === 'ascending' ? 'descending' : 'ascending', true);
    document.dispatchEvent(new Event('aneka:catalog-change'));
  });
  for (const button of buttons) button.addEventListener('click', () => {
    if (button.dataset.productFilter === selected) return;
    document.dispatchEvent(new Event('aneka:before-navigation'));
    select(button.dataset.productFilter ?? 'all', true);
    document.dispatchEvent(new Event('aneka:catalog-change'));
  });
  window.addEventListener('pagehide', () => animation?.cancel());
  return { current: () => selected, view: () => view, sort: () => order, setView, setSort, select, categoryForFragment };
}
