import assert from 'node:assert/strict';
import test from 'node:test';
import { setupReveals } from '../src/scripts/reveals.ts';

function environment(t, { support = true, broken = false, shell = false } = {}) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  class Component extends EventTarget {
    constructor(top, reveal = '') { super(); this.top = top; this.classes = new Set(); this.dataset = { reveal }; }
    classList = { add: (...names) => names.forEach((name) => this.classes.add(name)), remove: (...names) => names.forEach((name) => this.classes.delete(name)) };
    closest() { return this; }
    getBoundingClientRect() { return { top: this.top, bottom: this.top + 120 }; }
  }
  const visible = new Component(100), below = new Component(1200), edge = new Component(740);
  const root = new Component(0), header = new Component(0, 'header'), hero = new Component(120, 'hero'), footer = new Component(1400, 'footer');
  let observer;
  class Observer {
    constructor(callback) { if (broken) throw new Error('Observer unavailable'); this.callback = callback; this.observed = new Set(); observer = this; }
    observe(element) { this.observed.add(element); }
    unobserve(element) { this.observed.delete(element); }
    disconnect() { this.observed.clear(); }
  }
  const document = Object.assign(new EventTarget(), { documentElement: root, querySelectorAll: () => shell ? [header, hero, visible, below, edge, footer] : [visible, below, edge] });
  const globals = { window: support ? { IntersectionObserver: Observer } : {}, document, Element: Component, innerHeight: 800, IntersectionObserver: Observer };
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => { if (previous) Object.defineProperty(globalThis, key, previous); else delete globalThis[key]; });
  }
  return { visible, below, edge, header, hero, footer, root, document, observer: () => observer };
}

test('a refreshed/restored viewport reveals immediately; later components reveal once on first entry', async (t) => {
  const { visible, below, edge, observer } = environment(t);
  let ready;
  setupReveals(new Promise((resolve) => { ready = resolve; }));
  assert.ok(!visible.classes.has('reveal-pending'), 'Font skeletons must remain visible while waiting');
  ready(true); // This is the restored-page case previously skipped entirely.
  await Promise.resolve();
  assert.ok(visible.classes.has('is-revealing'));
  assert.ok(visible.classes.has('reveal-still'), 'Restored content uses the gentler entrance variant');
  assert.ok(!visible.classes.has('reveal-pending'));
  assert.ok(observer().observed.has(below));
  assert.ok(edge.classes.has('reveal-pending'), 'A component at the viewport edge must wait until it is further into view');
  observer().callback([{ target: edge, isIntersecting: false }]);
  assert.ok(!edge.classes.has('is-revealing'));
  observer().callback([{ target: below, isIntersecting: true }]);
  assert.ok(below.classes.has('is-revealing'));
  assert.ok(!observer().observed.has(below));
  below.dispatchEvent(new Event('animationend'));
  observer().callback([{ target: below, isIntersecting: true }]);
  assert.ok(!below.classes.has('is-revealing'), 'Scrolling back must not replay a completed reveal');
  t.mock.timers.tick(1000);
  assert.ok(visible.classes.has('is-revealing'), 'Do not cut off the slower reveal before it finishes');
  t.mock.timers.tick(1200);
  assert.ok(!visible.classes.has('is-revealing'), 'Animation state must release hover transforms');
});

test('slow or failed restoration never leaves visible content hidden', async (t) => {
  const { visible } = environment(t);
  setupReveals(new Promise(() => {}));
  t.mock.timers.tick(10000);
  assert.ok(!visible.classes.has('reveal-pending'));
  assert.ok(visible.classes.has('is-revealing'));
});

test('unsupported reveal observers leave the document visible', (t) => {
  const { visible, below } = environment(t, { support: false });
  setupReveals(Promise.resolve());
  assert.equal(visible.classes.size + below.classes.size, 0);
});

test('observer failure releases every hidden component', async (t) => {
  const { visible, below } = environment(t, { broken: true });
  setupReveals(Promise.reject(new Error('Storage disabled')));
  await Promise.resolve();
  assert.ok(!visible.classes.has('reveal-pending') && !below.classes.has('reveal-pending'));
});

test('the whole hero waits for the header to finish, and the footer reveals once when visible', async (t) => {
  const { header, hero, footer, observer, root } = environment(t, { shell: true });
  setupReveals(Promise.resolve());
  await Promise.resolve();
  assert.ok(root.classes.has('reveals-ready'));
  assert.ok(header.classes.has('is-revealing'));
  assert.ok(hero.classes.has('reveal-pending'));
  assert.ok(!hero.classes.has('is-revealing'));
  observer().callback([{ target: hero, isIntersecting: true }]);
  assert.ok(!hero.classes.has('is-revealing'), 'An observer callback cannot bypass the header sequence');
  header.dispatchEvent(new Event('animationend'));
  assert.ok(!header.classes.has('is-revealing'));
  assert.ok(hero.classes.has('is-revealing'));
  hero.dispatchEvent(new Event('animationend'));
  observer().callback([{ target: footer, isIntersecting: true }]);
  assert.ok(footer.classes.has('is-revealing'));
  footer.dispatchEvent(new Event('animationend'));
  assert.ok(!footer.classes.has('is-revealing'));
});

test('animation cancellation/failure releases the hero, and focus finishes an entrance immediately', async (t) => {
  const { header, hero, footer, document } = environment(t, { shell: true });
  setupReveals(Promise.resolve());
  await Promise.resolve();
  header.dispatchEvent(new Event('animationcancel'));
  assert.ok(hero.classes.has('is-revealing'));
  // Supply the focused element as focusin's target, as in the real DOM.
  const focus = new Event('focusin'); Object.defineProperty(focus, 'target', { value: hero });
  document.dispatchEvent(focus);
  assert.ok(!hero.classes.has('is-revealing'));
  const footerFocus = new Event('focusin'); Object.defineProperty(footerFocus, 'target', { value: footer });
  document.dispatchEvent(footerFocus);
  assert.ok(!footer.classes.has('reveal-pending'), 'Offscreen controls must not remain invisible when tabbed to');
});

test('missing header animation events still release the hero through the bounded fallback', async (t) => {
  const { header, hero } = environment(t, { shell: true });
  setupReveals(Promise.resolve()); await Promise.resolve();
  t.mock.timers.tick(2200);
  assert.ok(!header.classes.has('is-revealing'));
  assert.ok(hero.classes.has('is-revealing'));
  t.mock.timers.tick(2200);
  assert.ok(!hero.classes.has('is-revealing'));
});

test('a hero scrolled away during the header entrance waits for a later visible entry', async (t) => {
  const { header, hero, observer } = environment(t, { shell: true });
  setupReveals(Promise.resolve()); await Promise.resolve();
  hero.top = -1000;
  header.dispatchEvent(new Event('animationend'));
  assert.ok(hero.classes.has('reveal-pending'));
  assert.ok(observer().observed.has(hero));
  hero.top = 120;
  observer().callback([{ target: hero, isIntersecting: true }]);
  assert.ok(hero.classes.has('is-revealing'));
});

test('keyboard access before font/scroll initialization keeps the header visible and does not replay it', async (t) => {
  const { header, hero, document } = environment(t, { shell: true });
  let ready;
  setupReveals(new Promise((resolve) => { ready = resolve; }));
  const focus = new Event('focusin'); Object.defineProperty(focus, 'target', { value: header });
  document.dispatchEvent(focus);
  assert.ok(header.classes.has('reveal-accessed'));
  ready(false); await Promise.resolve();
  assert.ok(!header.classes.has('reveal-pending') && !header.classes.has('is-revealing'));
  assert.ok(hero.classes.has('is-revealing'));
});
