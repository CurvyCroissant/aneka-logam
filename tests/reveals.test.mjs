import assert from 'node:assert/strict';
import test from 'node:test';
import { setupReveals } from '../src/scripts/reveals.ts';

function environment(t, { support = true, broken = false, shell = false, heroTop = 120 } = {}) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  class Component extends EventTarget {
    constructor(top, reveal = '') { super(); this.top = top; this.left = 0; this.classes = new Set(); this.dataset = { reveal }; }
    classList = { add: (...names) => names.forEach((name) => this.classes.add(name)), remove: (...names) => names.forEach((name) => this.classes.delete(name)) };
    closest() { return this; }
    matches() { return this.keyboardFocus !== false; }
    getBoundingClientRect() { return { top: this.top, bottom: this.top + 120, left: this.left, right: this.left + 500 }; }
  }
  const visible = new Component(100), below = new Component(1200), edge = new Component(799);
  const root = new Component(0), header = new Component(0, 'header'), hero = new Component(heroTop, 'hero'), footer = new Component(1400, 'footer');
  let observer;
  class Observer {
    constructor(callback, options) { if (broken) throw new Error('Observer unavailable'); this.callback = callback; this.options = options; this.observed = new Set(); observer = this; }
    observe(element) { this.observed.add(element); }
    unobserve(element) { this.observed.delete(element); }
    disconnect() { this.observed.clear(); }
  }
  const document = Object.assign(new EventTarget(), { documentElement: root, querySelectorAll: () => shell ? [header, hero, visible, below, edge, footer] : [visible, below, edge] });
  const globals = { window: support ? { IntersectionObserver: Observer } : {}, document, Element: Component, innerHeight: 800, innerWidth: 1000, IntersectionObserver: Observer };
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => { if (previous) Object.defineProperty(globalThis, key, previous); else delete globalThis[key]; });
  }
  return { visible, below, edge, header, hero, footer, root, document, observer: () => observer };
}

const focus = (document, target) => { const event = new Event('focusin'); Object.defineProperty(event, 'target', { value: target }); document.dispatchEvent(event); };

test('initial and restored reveals start at the first visible pixel; offscreen components wait and never replay', async (t) => {
  const { visible, below, edge, observer } = environment(t);
  let ready;
  setupReveals(new Promise((resolve) => { ready = resolve; }));
  assert.ok(!visible.classes.has('reveal-pending'), 'Font skeletons remain available while waiting');
  ready(true); await Promise.resolve();
  assert.ok(visible.classes.has('is-revealing') && visible.classes.has('reveal-still'));
  assert.ok(edge.classes.has('is-revealing'), 'One visible pixel is sufficient; there is no delayed bottom inset');
  assert.equal(observer().options.rootMargin, '0px');
  assert.ok(observer().observed.has(below));
  observer().callback([{ target: below, isIntersecting: false }]);
  assert.ok(!below.classes.has('is-revealing'));
  observer().callback([{ target: below, isIntersecting: true }]);
  assert.ok(below.classes.has('is-revealing'));
  below.dispatchEvent(new Event('animationend'));
  observer().callback([{ target: below, isIntersecting: true }]);
  assert.ok(!below.classes.has('is-revealing'));
  t.mock.timers.tick(1000);
  assert.ok(visible.classes.has('is-revealing'));
  t.mock.timers.tick(1200);
  assert.ok(!visible.classes.has('is-revealing'));
});

test('Home and the header reveal independently, and the footer starts on its first viewport entry', async (t) => {
  const { header, hero, footer, observer } = environment(t, { shell: true });
  setupReveals(Promise.resolve()); await Promise.resolve();
  assert.ok(header.classes.has('is-revealing'));
  assert.ok(hero.classes.has('is-revealing'), 'Home does not wait for the header animation');
  assert.ok(!footer.classes.has('is-revealing'));
  footer.top = 799;
  observer().callback([{ target: footer, isIntersecting: true }]);
  assert.ok(footer.classes.has('is-revealing'), 'The footer must not wait until half of it is visible');
});

test('a restored page below Home keeps Home pending until it actually returns into view', async (t) => {
  const { header, hero, observer } = environment(t, { shell: true, heroTop: -1000 });
  header.top = -1200;
  setupReveals(Promise.resolve(true)); await Promise.resolve();
  assert.ok(header.classes.has('is-revealing'), 'The header is the sole visibility exception');
  assert.ok(hero.classes.has('reveal-pending'));
  header.dispatchEvent(new Event('animationend'));
  assert.ok(!hero.classes.has('is-revealing'));
  hero.top = 120;
  observer().callback([{ target: hero, isIntersecting: true }]);
  assert.ok(hero.classes.has('is-revealing'));
});

test('horizontal offscreen content also waits for viewport entry', async (t) => {
  const { visible, observer } = environment(t);
  visible.left = -700;
  setupReveals(Promise.resolve()); await Promise.resolve();
  assert.ok(visible.classes.has('reveal-pending'));
  observer().callback([{ target: visible, isIntersecting: true }]);
  assert.ok(visible.classes.has('is-revealing'));
});

test('keyboard focus immediately completes pending or running entrances', async (t) => {
  const { header, hero, footer, document } = environment(t, { shell: true });
  setupReveals(Promise.resolve()); await Promise.resolve();
  focus(document, hero);
  assert.ok(!hero.classes.has('is-revealing'));
  assert.ok(header.classes.has('is-revealing'), 'Focusing Home need not complete an unrelated reveal');
  focus(document, footer);
  assert.ok(!footer.classes.has('reveal-pending'));
  header.dispatchEvent(new Event('animationcancel'));
  assert.ok(!header.classes.has('is-revealing'));
});

test('early keyboard access remains visible after font/scroll initialization', async (t) => {
  const { header, hero, document } = environment(t, { shell: true });
  let ready;
  setupReveals(new Promise((resolve) => { ready = resolve; }));
  focus(document, header);
  assert.ok(header.classes.has('reveal-accessed'));
  ready(false); await Promise.resolve();
  assert.ok(!header.classes.has('reveal-pending') && !header.classes.has('is-revealing'));
  assert.ok(hero.classes.has('is-revealing'));
});

test('pointer focus does not snap a revealing control out from under a pending click', async (t) => {
  const { hero, document } = environment(t, { shell: true });
  setupReveals(Promise.resolve()); await Promise.resolve();
  hero.keyboardFocus = false;
  focus(document, hero);
  assert.ok(hero.classes.has('is-revealing'));
  hero.keyboardFocus = true;
  focus(document, hero);
  assert.ok(!hero.classes.has('is-revealing'));
});

test('slow or failed restoration has a bounded visible fallback', (t) => {
  const { visible } = environment(t);
  setupReveals(new Promise(() => {}));
  t.mock.timers.tick(10000);
  assert.ok(visible.classes.has('is-revealing'));
});

test('unsupported observers leave the document visible', (t) => {
  const { visible, below } = environment(t, { support: false });
  setupReveals(Promise.resolve());
  assert.equal(visible.classes.size + below.classes.size, 0);
});

test('an observer failure releases every hidden component', async (t) => {
  const { visible, below } = environment(t, { broken: true });
  setupReveals(Promise.reject(new Error('Storage disabled'))); await Promise.resolve();
  assert.ok(!visible.classes.has('reveal-pending') && !below.classes.has('reveal-pending'));
});

test('page and visible components release together when the incoming transition is ready', async (t) => {
  const { header, hero } = environment(t, { shell: true });
  let finishPage; let pageStarted = false;
  window.__anekaBoot = { whenEntering: () => new Promise((resolve) => { finishPage = resolve; }), startEntrance() { assert.ok(header.classes.has('is-revealing') && hero.classes.has('is-revealing')); pageStarted = true; } };
  setupReveals(Promise.resolve()); await Promise.resolve();
  assert.ok(hero.classes.has('reveal-pending'));
  assert.ok(!header.classes.has('is-revealing') && !hero.classes.has('is-revealing'), 'Do not consume reveal time in a frozen navigation snapshot');
  assert.equal(pageStarted, false);
  finishPage(); await Promise.resolve();
  assert.equal(pageStarted, true);
  assert.ok(header.classes.has('is-revealing') && hero.classes.has('is-revealing'));
});
