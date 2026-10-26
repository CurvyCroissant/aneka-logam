import assert from 'node:assert/strict';
import test from 'node:test';
import { setupProductCatalog } from '../src/scripts/product-catalog.ts';

function environment(t, hash = '', { preference, blocked = false, extraPer = false } = {}) {
  class Control extends EventTarget {
    dataset = {}; attrs = new Map(); hidden = false; classes = new Set(); scrollLeft = 0; clientWidth = 300; scrollWidth = 300;
    classList = { add: (name) => this.classes.add(name), toggle: (name, force) => force ? this.classes.add(name) : this.classes.delete(name) };
    setAttribute(key, value) { this.attrs.set(key, value); }
    removeAttribute(key) { this.attrs.delete(key); }
    querySelector(selector) { return this.children?.[selector] ?? null; }
    querySelectorAll(selector) { return this.selectors?.[selector] ?? this.items ?? []; }
    append(child) { this.order = (this.order ?? []).filter((item) => item !== child); this.order.push(child); }
  }
  const categories = ['shim-plate', 'per', 'kawat', 'as'];
  const names = ['Shim Plate', 'Per', 'Kawat', 'As'];
  const cards = categories.map((category) => { const card = new Control(); card.id = category; card.dataset.productCategory = category; return card; });
  if (extraPer) { const card = new Control(); card.id = 'per-test'; card.dataset.productCategory = 'per'; cards.push(card); }
  const tracks = categories.map((category, index) => {
    const track = new Control(); track.dataset.catalogTrack = category; track.items = cards.filter((card) => card.dataset.productCategory === category);
    track.children = { '.catalog-category-label': { textContent: names[index] } }; track.scrollWidth = track.items.length * 300; return track;
  });
  const headings = categories.map((category) => { const heading = new Control(); heading.dataset.catalogGroupHeading = category; return heading; });
  const buttons = ['all', ...categories].map((category) => { const button = new Control(); button.dataset.productFilter = category; button.children = { '[data-product-filter-name]': { textContent: ({ all: 'Semua Produk', 'shim-plate': 'Shim Plate', per: 'Per', kawat: 'Kawat', as: 'As' })[category] } }; return button; });
  const carouselControls = categories.map((category) => { const control = new Control(); control.dataset.catalogControls = category; return control; });
  const head = new Control(), sortHeader = new Control(), sortButton = new Control(), sortIcon = new Control(), sortFallback = new Control();
  const list = new Control();
  list.selectors = { '[data-product-category]': cards, '[data-catalog-track]': tracks, '[data-catalog-group-heading]': headings, '[data-catalog-controls]': carouselControls };
  list.children = { thead: head, '[data-category-sort-header]': sortHeader, '[data-category-sort]': sortButton, '[data-sort-icon]': sortIcon, '[data-sort-fallback]': sortFallback };
  list.order = categories.flatMap((category, index) => [headings[index], tracks[index], carouselControls[index]]);
  let cardHeight = 200, layoutReads = 0;
  list.getBoundingClientRect = () => { layoutReads++; return { height: root.dataset.catalogView === 'details' ? 20 + cards.filter((card) => !card.hidden).length * 60 : root.dataset.category === 'all' ? tracks.filter((track) => !track.hidden).length * (cardHeight + 30) : Math.ceil(cards.filter((card) => !card.hidden).length / 2) * cardHeight }; };
  const viewport = new Control(); viewport.style = {};
  const scroll = new Control(); scroll.scrollWidth = 768;
  const controls = new Control(); controls.items = buttons; controls.hidden = true;
  const mobileFilter = new Control(); mobileFilter.disabled = true;
  const mobileValue = new Control();
  const mobileOptions = ['all', ...categories].map((category) => { const button = new Control(); button.dataset.productFilterOption = category; return button; });
  const mobileControls = new Control(); mobileControls.hidden = true; mobileControls.items = mobileOptions;
  const viewButtons = ['thumbnails', 'details'].map((view) => { const button = new Control(); button.dataset.catalogViewButton = view; return button; });
  const views = new Control(); views.items = viewButtons; views.hidden = true;
  const root = new Control(); root.children = { '[data-product-list]': list, '[data-product-filters]': controls, '[data-catalog-viewport]': viewport, '[data-catalog-views]': views, '[data-catalog-scroll]': scroll, '[data-product-filter-toggle]': mobileFilter, '[data-product-filter-value]': mobileValue, '[data-product-mobile-filter]': mobileControls };
  const document = Object.assign(new EventTarget(), { documentElement: { lang: 'id' }, querySelector: () => root, querySelectorAll: () => [] });
  const window = new EventTarget();
  const stored = new Map([['aneka-logam:catalog-view', preference]]);
  Object.defineProperty(window, 'localStorage', { get() { if (blocked) throw new Error('Blocked'); return { getItem: (key) => stored.get(key), setItem: (key, value) => stored.set(key, value) }; } });
  for (const [name, value] of Object.entries({ document, window, location: { hash } })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => { if (previous) Object.defineProperty(globalThis, name, previous); else delete globalThis[name]; });
  }
  const catalog = setupProductCatalog();
  const order = () => list.order.filter((item) => item.dataset.catalogTrack).map((track) => track.dataset.catalogTrack);
  return { list, head, carouselControls, mobileValue, mobileOptions, layoutReads: () => layoutReads, catalog, cards, buttons, controls, document, window, viewport, viewButtons, views, stored, tracks, headings, sortHeader, sortButton, sortIcon, scroll, order, mobileFilter, mobileControls, reflow: (height) => { cardHeight = height; } };
}

test('All Products defaults to category rows; filtering removes unrelated cards and row headings', (t) => {
  const env = environment(t);
  assert.equal(env.catalog.current(), 'all');
  assert.equal(env.controls.hidden, false);
  assert.ok(env.headings.every((heading) => !heading.hidden));
  env.buttons[2].dispatchEvent(new Event('click'));
  assert.equal(env.catalog.current(), 'per');
  assert.deepEqual(env.cards.map((card) => card.hidden), [true, false, true, true]);
  assert.deepEqual(env.tracks.map((track) => track.hidden), [true, false, true, true]);
  assert.ok(env.headings.every((heading) => heading.hidden), 'Filtered thumbnails have no repeated category title');
  assert.deepEqual(env.buttons.map((button) => button.attrs.get('aria-pressed')), ['false', 'false', 'true', 'false', 'false']);
  env.buttons[0].dispatchEvent(new Event('click'));
  assert.ok(env.cards.every((card) => !card.hidden));
});

test('Home category entries select their filter, while invalid categories fall back to All', (t) => {
  const env = environment(t, '#kawat');
  assert.equal(env.catalog.current(), 'kawat');
  assert.equal(env.catalog.categoryForFragment('springs'), 'per');
  env.catalog.select('unknown');
  assert.equal(env.catalog.current(), 'all');
});

test('filter changes notify scroll memory once and retain card/image identity', (t) => {
  const env = environment(t);
  const original = env.cards[3]; let changes = 0;
  env.document.addEventListener('aneka:catalog-change', () => changes++);
  env.buttons[4].dispatchEvent(new Event('click')); env.buttons[4].dispatchEvent(new Event('click'));
  assert.equal(changes, 1);
  assert.equal(env.cards[3], original);
});

test('views and filters size themselves without measuring or reserving the All Products layout', (t) => {
  const env = environment(t, '#per');
  for (const view of ['thumbnails', 'details']) {
    env.catalog.setView(view);
    for (const category of ['shim-plate', 'kawat', 'as', 'all']) {
      env.catalog.select(category);
      assert.equal(env.viewport.style.minBlockSize, undefined);
      assert.equal(env.layoutReads(), 0, 'Never temporarily unhide everything to reserve the largest view');
      assert.equal(env.cards.filter((card) => !card.hidden).length, category === 'all' ? 4 : 1);
      assert.equal(env.head.hidden, view !== 'details');
      assert.ok(env.carouselControls.every((control) => control.hidden === (view !== 'thumbnails' || category !== 'all')));
    }
  }
});

test('text/viewport reflow keeps filtering and carousel positions without a height lock', (t) => {
  const env = environment(t, '#per', { extraPer: true });
  env.tracks[1].scrollLeft = 300;
  env.reflow(250); env.window.dispatchEvent(new Event('resize'));
  assert.equal(env.viewport.style.minBlockSize, undefined);
  assert.equal(env.tracks[1].scrollLeft, 300);
  assert.equal(env.catalog.current(), 'per');
  env.catalog.setView('details');
  env.reflow(180); env.document.dispatchEvent(new Event('aneka:content-change'));
  assert.equal(env.viewport.style.minBlockSize, undefined);
  assert.equal(env.layoutReads(), 0);
  assert.deepEqual(env.cards.map((card) => card.hidden), [true, false, true, true, false]);
});

test('view switches preserve filter and identity; only overflowing visible scrollers enter Tab order', (t) => {
  const env = environment(t, '', { extraPer: true });
  assert.equal(env.tracks[1].attrs.get('tabindex'), '0');
  assert.equal(env.tracks[0].attrs.has('tabindex'), false);
  const originals = [...env.cards];
  env.catalog.select('per');
  assert.ok(env.tracks.every((track) => !track.attrs.has('tabindex')), 'Filtered thumbnails are an ordinary grid');
  env.viewButtons[1].dispatchEvent(new Event('click'));
  assert.equal(env.catalog.view(), 'details');
  assert.equal(env.catalog.current(), 'per');
  assert.equal(env.scroll.attrs.get('tabindex'), '0');
  assert.deepEqual(env.cards, originals);
  assert.equal(env.viewport.style.minBlockSize, undefined);
  assert.equal(env.stored.get('aneka-logam:catalog-view'), 'details');
});

test('Category sorting toggles A–Z/Z–A with correct state and preserves group/card identity', (t) => {
  const env = environment(t, '', { extraPer: true });
  env.catalog.setView('details');
  const tracks = [...env.tracks], cards = [...env.cards];
  env.sortButton.dispatchEvent(new Event('click'));
  assert.deepEqual(env.order(), ['as', 'kawat', 'per', 'shim-plate']);
  assert.equal(env.sortHeader.attrs.get('aria-sort'), 'ascending');
  assert.equal(env.sortButton.attrs.get('aria-label'), 'Urutkan Kategori Z–A');
  assert.equal(env.sortIcon.textContent, '▲');
  env.sortButton.dispatchEvent(new Event('click'));
  assert.deepEqual(env.order(), ['shim-plate', 'per', 'kawat', 'as']);
  assert.equal(env.sortHeader.attrs.get('aria-sort'), 'descending');
  assert.deepEqual(env.tracks, tracks); assert.deepEqual(env.cards, cards);
  env.catalog.setView('thumbnails');
  assert.deepEqual(env.order(), ['shim-plate', 'per', 'kawat', 'as'], 'Thumbnails retain the supplied category order');
  assert.equal(env.sortButton.hidden, true);
  env.catalog.setView('details');
  env.document.documentElement.lang = 'zh-Hans';
  env.document.dispatchEvent(new Event('aneka:content-change'));
  assert.equal(env.sortButton.attrs.get('aria-label'), '按分类名称升序排列（A–Z）');
});

test('saved detail preferences and blocked storage keep catalog controls functional', (t) => {
  const env = environment(t, '', { preference: 'details' });
  assert.equal(env.catalog.view(), 'details');
  assert.equal(env.viewport.style.minBlockSize, undefined);
});

test('blocked preference storage falls back to thumbnails and still permits view changes', (t) => {
  const env = environment(t, '', { blocked: true });
  env.viewButtons[1].dispatchEvent(new Event('click'));
  assert.equal(env.catalog.view(), 'details');
});


test('mobile disclosure choices stay synchronized with desktop filters, views and translations', (t) => {
  const env = environment(t, '#per');
  assert.equal(env.mobileValue.textContent, 'Per');
  assert.equal(env.mobileValue.dataset.i18n, undefined);
  assert.equal(env.mobileFilter.disabled, false); assert.equal(env.mobileControls.hidden, false);
  let changes = 0; env.document.addEventListener('aneka:catalog-change', () => changes++);
  env.mobileOptions[3].dispatchEvent(new Event('click'));
  assert.equal(env.catalog.current(), 'kawat');
  assert.equal(env.buttons[3].attrs.get('aria-pressed'), 'true');
  assert.equal(env.mobileOptions[3].attrs.get('aria-pressed'), 'true');
  assert.equal(env.mobileValue.textContent, 'Kawat');
  assert.deepEqual(env.cards.map((card) => card.hidden), [true, true, false, true]);
  assert.equal(changes, 1);
  env.mobileOptions[3].dispatchEvent(new Event('click')); assert.equal(changes, 1);
  env.catalog.setView('details'); assert.equal(env.mobileValue.textContent, 'Kawat');
  env.buttons[0].dispatchEvent(new Event('click')); assert.equal(env.mobileValue.textContent, 'Semua Produk');
  assert.equal(env.mobileValue.dataset.i18n, 'allProducts');
  env.document.documentElement.lang = 'en'; env.document.dispatchEvent(new Event('aneka:content-change'));
  assert.equal(env.mobileValue.textContent, 'All Products');
  env.catalog.select('as'); assert.equal(env.mobileValue.textContent, 'As');
  assert.equal(env.mobileValue.dataset.i18n, undefined);
});

test('carousel offsets survive the browser clamping hidden tracks during filtering or view switches', (t) => {
  const env = environment(t, '', { extraPer: true });
  env.tracks[1].scrollLeft = 180;
  env.catalog.select('kawat'); env.tracks[1].scrollLeft = 0;
  env.catalog.select('all'); assert.equal(env.tracks[1].scrollLeft, 180);
  env.catalog.setView('details'); env.tracks[1].scrollLeft = 0;
  env.catalog.setView('thumbnails'); assert.equal(env.tracks[1].scrollLeft, 180);
});
