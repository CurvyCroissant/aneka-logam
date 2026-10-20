import assert from 'node:assert/strict';
import test from 'node:test';
import { setupProductCatalog } from '../src/scripts/product-catalog.ts';

function environment(t, hash = '') {
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
  const controls = new Control(); controls.items = buttons; controls.hidden = true;
  const root = new Control(); root.children = { '[data-product-list]': list, '[data-product-filters]': controls };
  const document = Object.assign(new EventTarget(), { querySelector: () => root, querySelectorAll: () => [] });
  for (const [name, value] of Object.entries({ document, location: { hash } })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => { if (previous) Object.defineProperty(globalThis, name, previous); else delete globalThis[name]; });
  }
  const catalog = setupProductCatalog({ matches: false });
  return { catalog, cards, buttons, controls, document };
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
