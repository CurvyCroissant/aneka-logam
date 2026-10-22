import assert from 'node:assert/strict';
import test from 'node:test';
import { setupProductCatalog } from '../src/scripts/product-catalog.ts';

function environment(t, hash = '', { preference, blocked = false } = {}) {
  class Control extends EventTarget {
    dataset = {}; attrs = new Map(); hidden = false;
    setAttribute(key, value) { this.attrs.set(key, value); }
    querySelector(selector) { return this.children?.[selector] ?? null; }
    querySelectorAll() { return this.items ?? []; }
  }
  const categories = ['shim-plate', 'per', 'kawat', 'as'];
  const cards = categories.map((category) => { const card = new Control(); card.id = category; card.dataset.productCategory = category; return card; });
  const buttons = ['all', ...categories].map((category) => { const button = new Control(); button.dataset.productFilter = category; return button; });
  const list = new Control(); list.items = cards;
  let columns = 2, cardHeight = 200;
  list.getBoundingClientRect = () => ({ height: root.dataset.catalogView === 'details' ? 20 + cards.filter((card) => !card.hidden).length * 60 : Math.ceil(cards.filter((card) => !card.hidden).length / columns) * cardHeight });
  const viewport = new Control(); viewport.style = {};
  const controls = new Control(); controls.items = buttons; controls.hidden = true;
  const viewButtons = ['thumbnails', 'details'].map((view) => { const button = new Control(); button.dataset.catalogViewButton = view; return button; });
  const views = new Control(); views.items = viewButtons; views.hidden = true;
  const root = new Control(); root.children = { '[data-product-list]': list, '[data-product-filters]': controls, '[data-catalog-viewport]': viewport, '[data-catalog-views]': views };
  const document = Object.assign(new EventTarget(), { querySelector: () => root, querySelectorAll: () => [] });
  const window = new EventTarget();
  const stored = new Map([['aneka-logam:catalog-view', preference]]);
  Object.defineProperty(window, 'localStorage', { get() { if (blocked) throw new Error('Blocked'); return { getItem: (key) => stored.get(key), setItem: (key, value) => stored.set(key, value) }; } });
  for (const [name, value] of Object.entries({ document, window, location: { hash } })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => { if (previous) Object.defineProperty(globalThis, name, previous); else delete globalThis[name]; });
  }
  const catalog = setupProductCatalog({ matches: false });
  return { catalog, cards, buttons, controls, document, window, viewport, viewButtons, views, stored, reflow: (count, height = cardHeight) => { columns = count; cardHeight = height; } };
}

test('All Products is the default and category buttons remove unrelated cards from layout', (t) => {
  const env = environment(t);
  assert.equal(env.catalog.current(), 'all');
  assert.equal(env.controls.hidden, false);
  assert.ok(env.cards.every((card) => !card.hidden));
  env.buttons[2].dispatchEvent(new Event('click'));
  assert.equal(env.catalog.current(), 'per');
  assert.deepEqual(env.cards.map((card) => card.hidden), [true, false, true, true]);
  assert.deepEqual(env.buttons.map((button) => button.attrs.get('aria-pressed')), ['false', 'false', 'true', 'false', 'false']);
  env.buttons[0].dispatchEvent(new Event('click'));
  assert.ok(env.cards.every((card) => !card.hidden));
});

test('Home category entries select their filter, while invalid categories fall back to All', (t) => {
  const env = environment(t, '#kawat');
  assert.equal(env.catalog.current(), 'kawat');
  assert.equal(env.cards.filter((card) => !card.hidden)[0].id, 'kawat');
  assert.equal(env.catalog.categoryForFragment('springs'), 'per', 'Preserve earlier catalog links');
  env.catalog.select('unknown');
  assert.equal(env.catalog.current(), 'all');
  assert.ok(env.cards.every((card) => !card.hidden));
});

test('filter changes notify scroll memory once and retain card/image identity', (t) => {
  const env = environment(t);
  const original = env.cards[3]; let changes = 0;
  env.document.addEventListener('aneka:catalog-change', () => changes++);
  env.buttons[4].dispatchEvent(new Event('click'));
  env.buttons[4].dispatchEvent(new Event('click'));
  assert.equal(changes, 1);
  assert.equal(env.cards[3], original);
  assert.equal(original.hidden, false);
});

test('every filter reserves the All Products height without stretching or exposing hidden cards', (t) => {
  const env = environment(t, '#per');
  assert.equal(env.viewport.style.minBlockSize, '400px');
  for (const category of ['shim-plate', 'kawat', 'as', 'all']) {
    env.catalog.select(category);
    assert.equal(env.viewport.style.minBlockSize, '400px');
    assert.equal(env.cards.filter((card) => !card.hidden).length, category === 'all' ? 4 : 1);
  }
});

test('reserved height follows responsive and translated text reflow, retaining the selected filter', (t) => {
  const env = environment(t, '#per');
  env.reflow(1);
  env.window.dispatchEvent(new Event('resize'));
  assert.equal(env.viewport.style.minBlockSize, '800px');
  env.reflow(1, 250);
  env.document.dispatchEvent(new Event('aneka:content-change'));
  assert.equal(env.viewport.style.minBlockSize, '1000px');
  assert.equal(env.catalog.current(), 'per');
  assert.deepEqual(env.cards.map((card) => card.hidden), [true, false, true, true]);
  env.reflow(2, 250);
  env.window.dispatchEvent(new Event('resize'));
  assert.equal(env.viewport.style.minBlockSize, '500px', 'A former narrow layout must not leave oversized empty space');
});

test('view switching preserves filter and card identity and reserves the active All layout height', (t) => {
  const env = environment(t, '#per');
  const originals = [...env.cards];
  env.viewButtons[1].dispatchEvent(new Event('click'));
  assert.equal(env.catalog.view(), 'details');
  assert.equal(env.views.hidden, false);
  assert.equal(env.catalog.current(), 'per');
  assert.equal(env.viewport.style.minBlockSize, '260px');
  assert.deepEqual(env.viewButtons.map((button) => button.attrs.get('aria-pressed')), ['false', 'true']);
  assert.deepEqual(env.cards, originals, 'Do not clone galleries or create a second set of images');
  env.catalog.select('all');
  assert.equal(env.viewport.style.minBlockSize, '260px');
  env.viewButtons[0].dispatchEvent(new Event('click'));
  assert.equal(env.viewport.style.minBlockSize, '400px');
  assert.equal(env.stored.get('aneka-logam:catalog-view'), 'thumbnails');
});

test('a saved detail preference is restored; blocked preference storage keeps controls functional', (t) => {
  const env = environment(t, '', { preference: 'details' });
  assert.equal(env.catalog.view(), 'details');
  assert.equal(env.viewport.style.minBlockSize, '260px');
});

test('blocked preference storage falls back to thumbnails and still permits view changes', (t) => {
  const env = environment(t, '', { blocked: true });
  assert.equal(env.catalog.view(), 'thumbnails');
  env.viewButtons[1].dispatchEvent(new Event('click'));
  assert.equal(env.catalog.view(), 'details');
});
