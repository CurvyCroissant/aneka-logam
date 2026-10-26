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

export function setupProductCatalog(): ProductCatalog | undefined {
  const catalog = document.querySelector<HTMLElement>('[data-product-catalog]');
  const list = catalog?.querySelector<HTMLElement>('[data-product-list]');
  const scroll = catalog?.querySelector<HTMLElement>('[data-catalog-scroll]');
  const controls = catalog?.querySelector<HTMLElement>('[data-product-filters]');
  const views = catalog?.querySelector<HTMLElement>('[data-catalog-views]');
  const mobileControls = catalog?.querySelector<HTMLElement>('[data-product-mobile-filter]');
  const mobileFilter = catalog?.querySelector<HTMLButtonElement>('[data-product-filter-toggle]');
  const mobileValue = catalog?.querySelector<HTMLElement>('[data-product-filter-value]');
  const mobileOptions = [...(mobileControls?.querySelectorAll<HTMLButtonElement>('[data-product-filter-option]') ?? [])];
  if (!catalog || !list || !controls) return;
  const cards = [...list.querySelectorAll<HTMLElement>('[data-product-category]')];
  const tracks = [...list.querySelectorAll<HTMLElement>('[data-catalog-track]')];
  const headings = [...list.querySelectorAll<HTMLElement>('[data-catalog-group-heading]')];
  const carouselControls = [...list.querySelectorAll<HTMLElement>('[data-catalog-controls]')];
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
  let arranged = [...tracks];
  const carouselOffsets = new Map<HTMLElement, number>();

  function rememberCarousels() {
    if (view === 'thumbnails' && selected === 'all') for (const track of tracks) carouselOffsets.set(track, track.scrollLeft);
  }
  function restoreCarousels() {
    if (view === 'thumbnails' && selected === 'all') for (const track of tracks) track.scrollLeft = carouselOffsets.get(track) ?? track.scrollLeft;
  }

  function animateList() {
    animation?.cancel();
    if (typeof list!.animate !== 'function') return;
    try {
      animation = list!.animate([{ opacity: 0.3, translate: '0 18px' }, { opacity: 1, translate: '0 0' }], motionTiming('move'));
    } catch { /* The chosen view/filter remains available without animation. */ }
  }
  function arrangeGroups() {
    const sorted = [...tracks];
    if (view === 'details' && order !== 'none') sorted.sort((a, b) => {
      const name = (track: HTMLElement) => track.querySelector('.catalog-category-label')?.textContent ?? track.dataset.catalogTrack ?? '';
      return collator.compare(name(a), name(b)) * (order === 'ascending' ? 1 : -1);
    });
    if (sorted.every((track, index) => track === arranged[index])) return;
    arranged = sorted;
    for (const track of sorted) {
      const heading = headings.find((heading) => heading.dataset.catalogGroupHeading === track.dataset.catalogTrack);
      if (heading) list!.append(heading);
      list!.append(track);
      const controls = carouselControls.find((element) => element.dataset.catalogControls === track.dataset.catalogTrack);
      if (controls) list!.append(controls);
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
    if (head) head.hidden = view === 'thumbnails';
    for (const track of tracks) track.hidden = selected !== 'all' && track.dataset.catalogTrack !== selected;
    for (const heading of headings) heading.hidden = view !== 'thumbnails' || selected !== 'all';
    for (const controls of carouselControls) controls.hidden = view !== 'thumbnails' || selected !== 'all';
    updateSortControl();
    arrangeGroups();
  }
  function setView(next: CatalogView, animate = false) {
    const changed = next !== view;
    rememberCarousels();
    view = next === 'details' ? 'details' : 'thumbnails';
    applyPresentation();
    restoreCarousels();
    for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.catalogViewButton === view));
    refreshInteractions();
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
  function updateMobileSelection() {
    for (const button of mobileOptions) button.setAttribute('aria-pressed', String(button.dataset.productFilterOption === selected));
    if (!mobileValue) return;
    if (selected === 'all') {
      mobileValue.dataset.i18n = 'allProducts';
      mobileValue.textContent = copy(localeFromTag(document.documentElement.lang)).allProducts;
    } else {
      delete mobileValue.dataset.i18n;
      mobileValue.textContent = buttons.find((button) => button.dataset.productFilter === selected)?.querySelector('[data-product-filter-name]')?.textContent ?? selected;
    }
  }
  function select(category: string, animate = false) {
    const next = categories.has(category) ? category : 'all';
    const changed = next !== selected;
    rememberCarousels();
    selected = next;
    animation?.cancel();
    for (const card of cards) card.hidden = next !== 'all' && card.dataset.productCategory !== next;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.productFilter === next));
    updateMobileSelection();
    for (const link of document.querySelectorAll<HTMLElement>('[data-category-destination]')) {
      if (link.dataset.categoryDestination === next) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    applyPresentation();
    restoreCarousels();
    refreshInteractions();
    if (animate && changed) animateList();
  }
  let preference: CatalogView = 'thumbnails';
  try { if (window.localStorage?.getItem('aneka-logam:catalog-view') === 'details') preference = 'details'; } catch { /* Use the default when storage is unavailable. */ }
  setView(preference);
  select(categoryForFragment(fragmentId(location.hash)) ?? 'all');
  controls.hidden = false;
  if (mobileFilter) mobileFilter.disabled = false;
  if (mobileControls) mobileControls.hidden = false;
  if (views) views.hidden = false;
  let observing = false;
  try {
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(refreshInteractions).observe(list);
      observing = true;
    }
  } catch { /* Resize events remain available if an observer cannot be created. */ }
  if (!observing) window.addEventListener('resize', refreshInteractions, { passive: true });
  document.addEventListener('aneka:content-change', () => { updateSortControl(); updateMobileSelection(); refreshInteractions(); });
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
  for (const button of [...buttons, ...mobileOptions]) button.addEventListener('click', () => {
    const category = button.dataset.productFilter ?? button.dataset.productFilterOption ?? 'all';
    if (category === selected) return;
    document.dispatchEvent(new Event('aneka:before-navigation'));
    select(category, true);
    document.dispatchEvent(new Event('aneka:catalog-change'));
  });
  window.addEventListener('pagehide', () => animation?.cancel());
  return { current: () => selected, view: () => view, sort: () => order, setView, setSort, select, categoryForFragment };
}
