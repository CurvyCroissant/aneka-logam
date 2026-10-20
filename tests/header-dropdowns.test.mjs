import assert from 'node:assert/strict';
import test from 'node:test';
import { setupHeaderDropdowns } from '../src/scripts/header-dropdowns.ts';

function environment(t, { hover = true, height = 700 } = {}) {
  class Control extends EventTarget {
    dataset = {}; attrs = new Map(); style = {}; inert = false;
    querySelector(selector) { return this.children?.[selector] ?? null; }
    querySelectorAll() { return this.links ?? []; }
    setAttribute(key, value) { this.attrs.set(key, value); }
    getBoundingClientRect() { return this.bounds ?? { top: 60, bottom: 100, left: 20, right: 180 }; }
    contains(target) { for (let node = target; node; node = node.parent) if (node === this) return true; return false; }
    focus() { document.activeElement = this; }
    closest(selector) { return selector === 'a[href]' && this.kind === 'link' ? this : selector === '[data-language-link]' && this.language ? this : null; }
  }
  const entries = [0, 1, 2].map(() => {
    const root = new Control(), toggle = new Control(), panel = new Control();
    toggle.parent = root; panel.parent = root;
    root.children = { '[data-dropdown-toggle]': toggle, '[data-dropdown-panel]': panel };
    panel.links = [0, 1, 2].map(() => { const link = new Control(); link.kind = 'link'; link.parent = panel; return link; });
    return { root, toggle, panel };
  });
  const outside = new Control();
  const document = Object.assign(new EventTarget(), { activeElement: outside, querySelectorAll: () => entries.map(({ root }) => root) });
  const window = Object.assign(new EventTarget(), { matchMedia: () => ({ matches: hover }) });
  for (const [name, value] of Object.entries({ document, window, Element: Control, innerHeight: height, innerWidth: 320 })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => { if (previous) Object.defineProperty(globalThis, name, previous); else delete globalThis[name]; });
  }
  setupHeaderDropdowns();
  const fire = (target, name, props = {}) => { const event = new Event(name, { cancelable: true }); for (const [key, value] of Object.entries(props)) Object.defineProperty(event, key, { value }); target.dispatchEvent(event); return event; };
  return { entries, outside, document, window, fire };
}

test('hover and touch disclosure share accurate expanded/inert state and only open one panel', (t) => {
  const { entries, fire } = environment(t);
  const [home, products] = entries;
  assert.equal(home.panel.inert, true);
  fire(home.root, 'pointerenter', { pointerType: 'mouse' });
  assert.equal(home.toggle.attrs.get('aria-expanded'), 'true');
  assert.equal(home.panel.inert, false);
  fire(products.toggle, 'click');
  assert.equal(home.toggle.attrs.get('aria-expanded'), 'false');
  assert.equal(home.panel.inert, true);
  assert.equal(products.toggle.attrs.get('aria-expanded'), 'true');
  fire(products.toggle, 'click');
  assert.equal(products.panel.inert, true);
});

test('touch does not depend on hover; a tap opens the control and outside input closes it', (t) => {
  const { entries: [entry], fire, document, outside } = environment(t, { hover: false });
  fire(entry.root, 'pointerenter', { pointerType: 'touch' });
  assert.equal(entry.toggle.attrs.get('aria-expanded'), 'false');
  fire(entry.toggle, 'click');
  assert.equal(entry.panel.inert, false);
  fire(document, 'pointerdown', { target: outside });
  assert.equal(entry.panel.inert, true);
});

test('arrow-key entry and Escape preserve native tab order and restore focus to the disclosure', async (t) => {
  const { entries: [entry], fire, document, outside } = environment(t);
  const key = fire(entry.root, 'keydown', { key: 'ArrowDown', target: entry.toggle });
  assert.equal(key.defaultPrevented, true);
  assert.equal(document.activeElement, entry.panel.links[0]);
  fire(entry.root, 'pointerleave');
  assert.equal(entry.panel.inert, false, 'Keep the panel open while a link has keyboard focus');
  fire(document, 'keydown', { key: 'Escape' });
  assert.equal(document.activeElement, entry.toggle);
  assert.equal(entry.panel.inert, true);
  fire(entry.toggle, 'click');
  outside.focus(); fire(entry.root, 'focusout'); await Promise.resolve();
  assert.equal(entry.panel.inert, true, 'Tabbing out closes the disclosure without trapping focus');
});

test('language selection restores focus, and a short viewport opens the panel upwards', (t) => {
  const { entries: [entry], fire, document } = environment(t, { height: 120 });
  fire(entry.toggle, 'click');
  assert.equal(entry.root.dataset.dropdownSide, 'up');
  const link = entry.panel.links[0]; link.language = true;
  fire(entry.panel, 'click', { target: link });
  assert.equal(document.activeElement, entry.toggle);
  assert.equal(entry.toggle.attrs.get('aria-expanded'), 'false');
});

test('an edge-aligned or wrapped header keeps its dropdown inside the viewport', (t) => {
  const { entries: [entry], fire } = environment(t);
  entry.panel.bounds = { top: 100, bottom: 250, left: 200, right: 376 };
  fire(entry.toggle, 'click');
  assert.equal(entry.panel.style.translate, '-68px 0');
  fire(entry.toggle, 'click');
  entry.panel.bounds = { top: 100, bottom: 250, left: -30, right: 146 };
  fire(entry.toggle, 'click');
  assert.equal(entry.panel.style.translate, '42px 0');
});
