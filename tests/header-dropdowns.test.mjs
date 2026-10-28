import assert from 'node:assert/strict';
import test from 'node:test';
import { setupHeaderDropdowns } from '../src/scripts/header-dropdowns.ts';

function environment(t, { hover = true, height = 700, contentWidth = 320, catalog = false } = {}) {
  class Control extends EventTarget {
    dataset = {}; attrs = new Map(); style = {}; inert = false;
    querySelector(selector) { return this.children?.[selector] ?? null; }
    querySelectorAll() { return this.links ?? []; }
    setAttribute(key, value) { this.attrs.set(key, value); }
    getBoundingClientRect() { return this.bounds ?? { top: 60, bottom: 100, left: 20, right: 180 }; }
    contains(target) { for (let node = target; node; node = node.parent) if (node === this) return true; return false; }
    focus() { document.activeElement = this; }
    matches(selector) { return selector === 'a[href]' ? this.kind === 'link' : selector === ':focus-visible' && Boolean(this.keyboardFocus); }
    closest(selector) { return selector === 'a[href], button' && ['link', 'button'].includes(this.kind) ? this : selector === '[data-language-link], [data-product-filter-option]' && (this.language || this.filter) ? this : null; }
  }
  const entries = (catalog ? ['link', 'button', 'button'] : ['link', 'button']).map((kind, index) => {
    const root = new Control(), toggle = new Control(), panel = new Control();
    toggle.kind = kind; toggle.parent = root; panel.parent = root;
    root.children = { '[data-dropdown-toggle]': toggle, '[data-dropdown-panel]': panel };
    panel.links = [0, 1, 2].map(() => { const link = new Control(); link.kind = 'link'; link.parent = panel; link.kind = index === 2 ? 'button' : 'link'; link.language = index === 1; link.filter = index === 2; return link; });
    return { root, toggle, panel };
  });
  const outside = new Control();
  const document = Object.assign(new EventTarget(), { activeElement: outside, hidden: false, documentElement: { clientWidth: contentWidth }, querySelectorAll: () => entries.map(({ root }) => root) });
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

test('Home is one native page link: hover discloses sections, activation navigates without pinning', (t) => {
  const { entries: [home], fire } = environment(t);
  assert.equal(home.panel.inert, true);
  fire(home.root, 'pointerenter', { pointerType: 'mouse' });
  assert.equal(home.toggle.attrs.get('aria-expanded'), 'true');
  assert.equal(home.panel.inert, false);
  const click = fire(home.toggle, 'click', { detail: 1 });
  assert.equal(click.defaultPrevented, false, 'Do not consume native page navigation');
  assert.equal(home.panel.inert, true);
  fire(home.root, 'pointerenter', { pointerType: 'mouse' });
  home.toggle.focus();
  fire(home.root, 'pointerleave', { pointerType: 'mouse' });
  assert.equal(home.panel.inert, true, 'A focused trigger must not hold a departed mouse dropdown open');
});

test('hovering then clicking the language icon leaves its choices open for a single selection', (t) => {
  const { entries: [home, language], fire, document } = environment(t);
  fire(home.root, 'pointerenter', { pointerType: 'mouse' });
  fire(language.root, 'pointerenter', { pointerType: 'mouse' });
  assert.equal(home.panel.inert, true, 'Only one panel may be open');
  fire(language.toggle, 'click', { detail: 1 });
  assert.equal(language.panel.inert, false, 'The first click must not undo the preceding hover');
  fire(language.panel, 'click', { target: language.panel.links[1] });
  assert.equal(language.toggle.attrs.get('aria-expanded'), 'false');
  assert.equal(language.panel.inert, true);
  assert.equal(document.activeElement, language.toggle);
});

test('mouse departure closes the panel even when a dropdown item retains focus', (t) => {
  const { entries: [home], fire, document } = environment(t);
  fire(home.root, 'pointerenter', { pointerType: 'mouse' });
  home.panel.links[0].focus();
  fire(home.root, 'pointerleave', { pointerType: 'mouse' });
  assert.equal(home.panel.inert, true);
  assert.equal(document.activeElement, home.toggle, 'Do not leave focus inside an inert panel');
});

test('touch Home and language disclosures survive finger lift, selection and outside input', (t) => {
  const { entries: [home, language], fire, document, outside } = environment(t, { hover: false });
  fire(home.root, 'pointerenter', { pointerType: 'touch' });
  assert.equal(home.panel.inert, true);
  fire(document, 'pointerdown', { target: home.toggle, pointerType: 'touch' });
  const firstTap = fire(home.toggle, 'click', { detail: 1 });
  assert.ok(firstTap.defaultPrevented, 'First touch opens the sections without following the page link');
  fire(home.root, 'pointerleave', { pointerType: 'touch' });
  assert.equal(home.panel.inert, false);
  const secondTap = fire(home.toggle, 'click', { detail: 1 });
  assert.equal(secondTap.defaultPrevented, false, 'A second tap follows the Home link');
  assert.equal(home.panel.inert, true);
  fire(document, 'pointerdown', { target: language.toggle, pointerType: 'touch' });
  fire(language.toggle, 'click', { detail: 1 });
  fire(language.root, 'pointerleave', { pointerType: 'touch' });
  fire(document, 'pointerout', { pointerType: 'touch', relatedTarget: null });
  assert.equal(language.panel.inert, false);
  fire(language.toggle, 'click', { detail: 1 });
  assert.equal(language.panel.inert, true);
  fire(language.toggle, 'click', { detail: 1 });
  fire(document, 'pointerdown', { target: outside, pointerType: 'touch' });
  assert.equal(language.panel.inert, true);
});

test('keyboard focus and arrows expose Home sections; Escape and Tab departure dismiss without a trap', async (t) => {
  const { entries: [home], fire, document, outside } = environment(t);
  home.toggle.keyboardFocus = true;
  home.toggle.focus(); fire(home.root, 'focusin', { target: home.toggle });
  assert.equal(home.panel.inert, false);
  const key = fire(home.root, 'keydown', { key: 'ArrowDown', target: home.toggle });
  assert.equal(key.defaultPrevented, true);
  assert.equal(document.activeElement, home.panel.links[0]);
  fire(document, 'keydown', { key: 'Escape' });
  assert.equal(document.activeElement, home.toggle);
  assert.equal(home.panel.inert, true);
  fire(home.root, 'keydown', { key: 'ArrowUp', target: home.toggle });
  assert.equal(document.activeElement, home.panel.links.at(-1));
  outside.focus(); fire(home.root, 'focusout', { relatedTarget: outside }); await Promise.resolve();
  assert.equal(home.panel.inert, true);
});

test('a hovered panel stays open when focus changes, but window exit, blur, hide and navigation cannot leave it stuck', async (t) => {
  const { entries: [home], fire, document, window, outside } = environment(t);
  fire(home.root, 'pointerenter', { pointerType: 'mouse' });
  outside.focus(); fire(home.root, 'focusout', { relatedTarget: outside }); await Promise.resolve();
  assert.equal(home.panel.inert, false, 'Moving between trigger and panel does not depend on focus');
  fire(document, 'pointerout', { pointerType: 'mouse', relatedTarget: home.panel });
  assert.equal(home.panel.inert, false, 'Internal pointer movement must not dismiss');
  const exits = [
    () => fire(document, 'pointerout', { pointerType: 'mouse', relatedTarget: null }),
    () => fire(window, 'blur'),
    () => { document.hidden = true; fire(document, 'visibilitychange'); },
    () => fire(window, 'pagehide'),
    () => fire(document, 'pointercancel'),
    () => fire(window, 'resize'),
    () => fire(document, 'aneka:before-navigation'),
  ];
  for (const exit of exits) {
    fire(home.root, 'pointerenter', { pointerType: 'mouse' });
    exit();
    assert.equal(home.panel.inert, true);
    assert.equal(home.toggle.attrs.get('aria-expanded'), 'false');
    assert.equal(home.panel.attrs.get('aria-hidden'), 'true');
  }
});

test('short or narrow viewports keep the dropdown inside visible bounds', (t) => {
  const { entries: [, language], fire } = environment(t, { height: 120 });
  language.panel.bounds = { top: 100, bottom: 250, left: 200, right: 376 };
  fire(language.toggle, 'click', { detail: 0 });
  assert.equal(language.root.dataset.dropdownSide, 'up');
  assert.equal(language.panel.style.translate, '-68px 0');
  fire(language.toggle, 'click', { detail: 0 });
  language.panel.bounds = { top: 100, bottom: 250, left: -30, right: 146 };
  fire(language.toggle, 'click', { detail: 0 });
  assert.equal(language.panel.style.translate, '42px 0');
});

test('closed dropdowns are clamped after reflow and exclude the scrollbar gutter', (t) => {
  const { entries: [home], fire, window } = environment(t, { contentWidth: 305 });
  home.panel.bounds = { top: 100, bottom: 250, left: 80, right: 344 };
  fire(window, 'resize');
  assert.equal(home.panel.inert, true);
  assert.equal(home.panel.style.translate, '-51px 0', 'An invisible panel must not widen a narrow document');
});

test('Tab between dropdown items does not close during the transient body focus interval', (t) => {
  const { entries: [home], fire, outside } = environment(t);
  fire(home.root, 'keydown', { key: 'ArrowDown', target: home.toggle });
  outside.focus(); // Native focusout may run before the next element becomes active.
  fire(home.root, 'focusout', { relatedTarget: home.panel.links[1] });
  assert.equal(home.panel.inert, false);
  home.panel.links[1].focus();
  fire(home.root, 'focusout', { relatedTarget: home.panel.links[2] });
  assert.equal(home.panel.inert, false);
});


test('catalog filter choices reuse header disclosure behavior and return focus after one selection', (t) => {
  const { entries: [, , filter], fire, document, outside } = environment(t, { catalog: true });
  fire(filter.root, 'pointerenter', { pointerType: 'mouse' });
  fire(filter.toggle, 'click', { detail: 1 });
  assert.equal(filter.panel.inert, false);
  fire(filter.panel, 'click', { target: filter.panel.links[1] });
  assert.equal(filter.panel.inert, true);
  assert.equal(document.activeElement, filter.toggle);
  fire(filter.root, 'keydown', { key: 'ArrowDown', target: filter.toggle });
  assert.equal(document.activeElement, filter.panel.links[0]);
  outside.focus(); fire(filter.root, 'pointerleave', { pointerType: 'mouse' });
  assert.equal(filter.panel.inert, true);
});

test('open menus are re-clamped after direct page motion without losing disclosure state', (t) => {
  const { entries: [, language], fire, document } = environment(t);
  fire(language.root, 'pointerenter', { pointerType: 'mouse' });
  language.panel.bounds = { top: 100, bottom: 250, left: 200, right: 376 };
  fire(document, 'aneka:page-settled');
  assert.equal(language.panel.inert, false);
  assert.equal(language.toggle.attrs.get('aria-expanded'), 'true');
  assert.equal(language.panel.style.translate, '-68px 0');
});
