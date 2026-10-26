import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeferredFeature, setupDeferredFeatures } from '../src/scripts/deferred-features.ts';

const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

function environment(t, viewer = async () => {}, support = true) {
  class Control {
    constructor(kind, href) { this.kind = kind; this.href = href; this.isConnected = true; this.clicks = 0; }
    closest(selector) {
      if (selector === '[data-image-trigger]') return this.kind === 'image' ? this : null;
      if (selector === '[data-category-carousel]') return this.kind === 'carousel' ? this : null;
      return null;
    }
    querySelector() { return this.kind === 'gallery' ? {} : null; }
    getAttribute(key) { return key === 'href' ? this.href : null; }
    click() { this.clicks++; }
  }
  const listeners = new Map(), navigations = [], calls = { viewer: 0, carousel: 0, galleries: 0 };
  const carousel = new Control('carousel'), gallery = new Control('gallery'), status = {};
  let observer;
  class Observer {
    constructor(callback) { this.callback = callback; this.observed = new Set(); observer = this; }
    observe(element) { this.observed.add(element); }
    unobserve(element) { this.observed.delete(element); }
  }
  const document = { documentElement: { lang: 'id' }, addEventListener: (name, fn) => listeners.set(name, fn), querySelectorAll: (selector) => selector === '[data-category-carousel]' ? [carousel] : selector === '[data-gallery]' ? [gallery] : [], querySelector: () => status };
  const window = { location: { assign: (url) => navigations.push(url) } }; if (support) window.IntersectionObserver = Observer;
  for (const [name, value] of Object.entries({ Element: Control, IntersectionObserver: Observer, document, window })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => { if (previous) Object.defineProperty(globalThis, name, previous); else delete globalThis[name]; });
  }
  setupDeferredFeatures({
    viewer: async () => { calls.viewer++; await viewer(); },
    carousel: async () => { calls.carousel++; },
    galleries: async () => { calls.galleries++; },
  });
  const click = (trigger) => {
    const event = { button: 0, target: trigger, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
    listeners.get('click')(event); return event;
  };
  return { Control, observer: () => observer, calls, carousel, gallery, listeners, navigations, status, click };
}

test('concurrent requests share initialization; failed loads can be retried', async () => {
  let attempts = 0;
  const feature = createDeferredFeature(async () => { if (++attempts === 1) throw new Error('Offline'); });
  const first = feature.load();
  assert.equal(first, feature.load());
  await assert.rejects(first);
  assert.equal(feature.ready, false);
  await feature.load(); await feature.load();
  assert.equal(attempts, 2);
  assert.equal(feature.ready, true);
});

test('off-screen feature code stays unloaded until its component approaches the viewport', async (t) => {
  const env = environment(t); await flush();
  assert.deepEqual(env.calls, { viewer: 0, carousel: 0, galleries: 0 });
  env.observer().callback([{ target: env.carousel, isIntersecting: false }]); await flush();
  assert.equal(env.calls.carousel, 0);
  env.observer().callback([{ target: env.carousel, isIntersecting: true }]); await flush();
  assert.equal(env.calls.carousel, 1);
  assert.equal(env.calls.viewer, 0);
});

test('a first image activation waits for its feature and replays only the latest click', async (t) => {
  let ready;
  const env = environment(t, () => new Promise((resolve) => { ready = resolve; }));
  const first = new env.Control('image'), second = new env.Control('image');
  const event = env.click(first); env.click(second); await flush();
  assert.ok(event.prevented && event.stopped);
  assert.equal(env.calls.viewer, 1);
  assert.equal(first.clicks + second.clicks, 0);
  ready(); await flush();
  assert.equal(first.clicks, 0); assert.equal(second.clicks, 1);
});

test('navigation cancels a pending viewer; unavailable observers preserve immediate native feature setup', async (t) => {
  let ready;
  const env = environment(t, () => new Promise((resolve) => { ready = resolve; }), false);
  const trigger = new env.Control('image'); env.click(trigger); await flush();
  assert.equal(env.calls.carousel, 1); assert.equal(env.calls.galleries, 1);
  env.listeners.get('aneka:before-navigation')(); ready(); await flush();
  assert.equal(trigger.clicks, 0);
});

test('a failed viewer chunk preserves the full-image link fallback and allows a later retry', async (t) => {
  let offline = true;
  const env = environment(t, async () => { if (offline) throw new Error('Offline'); });
  const trigger = new env.Control('image', '/photo.webp');
  env.click(trigger); await flush();
  assert.deepEqual(env.navigations, ['/photo.webp']);
  offline = false; env.click(trigger); await flush();
  assert.equal(trigger.clicks, 1);
  assert.equal(env.calls.viewer, 2);
});
