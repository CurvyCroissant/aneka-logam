import assert from 'node:assert/strict';
import test from 'node:test';
import { setupCategoryCarousels } from '../src/scripts/category-carousel.ts';

function environment(t, reduced = false) {
  class Control extends EventTarget {
    dataset = {}; hidden = false; disabled = false; scrollLeft = 0;
    querySelector(selector) { return this.children?.[selector] ?? null; }
    querySelectorAll() { return this.cards ?? []; }
    scrollTo(options) { this.lastScroll = options; this.scrollLeft = options.left; this.dispatchEvent(new Event('scroll')); }
    focus(options) { this.focusOptions = options; }
  }
  const previous = new Control(), next = new Control(), counter = new Control();
  const controls = new Control(); controls.children = { '[data-category-step="-1"]': previous, '[data-category-step="1"]': next, '[data-category-counter]': counter };
  const track = new Control(); track.clientWidth = 600; track.scrollWidth = 1450;
  const cards = [0, 500, 1000].map((offsetLeft) => {
    const card = new Control(); card.offsetLeft = offsetLeft; card.children = { a: new Control() }; return card;
  });
  track.cards = cards;
  const carousel = new Control(); carousel.children = { '[data-category-track]': track, '[data-category-controls]': controls };
  const window = new EventTarget();
  for (const [name, value] of Object.entries({ window, document: { querySelectorAll: () => [carousel] }, requestAnimationFrame: (fn) => fn() })) {
    const saved = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => { if (saved) Object.defineProperty(globalThis, name, saved); else delete globalThis[name]; });
  }
  const motion = { matches: reduced };
  setupCategoryCarousels(motion);
  const key = (value) => { const event = new Event('keydown', { cancelable: true }); event.key = value; track.dispatchEvent(event); return event; };
  return { previous, next, counter, controls, track, cards, carousel, window, motion, key };
}

test('carousel buttons reach each card and clamp the last step to the available width', (t) => {
  const env = environment(t);
  assert.equal(env.previous.disabled, true);
  assert.equal(env.counter.textContent, '1 / 3');
  env.next.dispatchEvent(new Event('click'));
  assert.equal(env.track.scrollLeft, 500);
  assert.equal(env.track.lastScroll.behavior, 'smooth');
  assert.equal(env.counter.textContent, '2 / 3');
  env.next.dispatchEvent(new Event('click'));
  assert.equal(env.track.scrollLeft, 850);
  assert.equal(env.next.disabled, true);
  assert.equal(env.counter.textContent, '3 / 3');
  env.previous.dispatchEvent(new Event('click'));
  assert.equal(env.track.scrollLeft, 500);
  assert.equal(env.previous.disabled, false);
});

test('horizontal arrow keys move focus; vertical keys and gestures remain native page input', (t) => {
  const env = environment(t, true);
  assert.equal(env.key('ArrowRight').defaultPrevented, true);
  assert.equal(env.track.lastScroll.behavior, 'instant');
  assert.deepEqual(env.cards[1].querySelector('a').focusOptions, { preventScroll: true });
  for (const key of ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp']) assert.equal(env.key(key).defaultPrevented, false);
  for (const name of ['wheel', 'touchmove']) {
    const event = new Event(name, { cancelable: true }); env.track.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false);
  }
  assert.equal(env.track.scrollLeft, 500);
});

test('controls adapt to viewport width and enhancement does not bind duplicate actions', (t) => {
  const env = environment(t);
  setupCategoryCarousels(env.motion);
  env.next.dispatchEvent(new Event('click'));
  assert.equal(env.track.scrollLeft, 500, 'Repeated setup adds no second step handler');
  env.track.clientWidth = env.track.scrollWidth;
  env.window.dispatchEvent(new Event('resize'));
  assert.equal(env.controls.hidden, true);
  env.track.clientWidth = 600; env.track.scrollLeft = 0;
  env.window.dispatchEvent(new Event('resize'));
  assert.equal(env.controls.hidden, false);
  assert.equal(env.previous.disabled, true);
  assert.equal(env.next.disabled, false);
});
