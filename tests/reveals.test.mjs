import assert from 'node:assert/strict';
import test from 'node:test';
import { setupReveals } from '../src/scripts/reveals.ts';

function environment(t, { support = true, broken = false } = {}) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  class Component extends EventTarget {
    constructor(top) { super(); this.top = top; this.classes = new Set(); }
    classList = { add: (name) => this.classes.add(name), remove: (name) => this.classes.delete(name) };
    getBoundingClientRect() { return { top: this.top, bottom: this.top + 120 }; }
  }
  const visible = new Component(100), below = new Component(1200), edge = new Component(740);
  let observer;
  class Observer {
    constructor(callback) { if (broken) throw new Error('Observer unavailable'); this.callback = callback; this.observed = new Set(); observer = this; }
    observe(element) { this.observed.add(element); }
    unobserve(element) { this.observed.delete(element); }
    disconnect() { this.observed.clear(); }
  }
  const globals = { window: support ? { IntersectionObserver: Observer } : {}, document: { querySelectorAll: () => [visible, below, edge], addEventListener: () => {} }, innerHeight: 800, IntersectionObserver: Observer };
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => { if (previous) Object.defineProperty(globalThis, key, previous); else delete globalThis[key]; });
  }
  return { visible, below, edge, observer: () => observer };
}

test('a refreshed/restored viewport reveals immediately; later components reveal once on first entry', async (t) => {
  const { visible, below, edge, observer } = environment(t);
  let ready;
  setupReveals(new Promise((resolve) => { ready = resolve; }));
  assert.ok(!visible.classes.has('reveal-pending'), 'Font skeletons must remain visible while waiting');
  ready(true); // This is the restored-page case previously skipped entirely.
  await Promise.resolve();
  assert.ok(visible.classes.has('is-revealing'));
  assert.ok(visible.classes.has('reveal-still'), 'Restored content fades without moving vertically');
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
