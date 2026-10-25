import assert from 'node:assert/strict';
import test from 'node:test';
import { setupImageLoading, waitForBrandFont } from '../src/scripts/loading.ts';

const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function fontEnvironment(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const classes = new Set(['fonts-loading', 'font-failed']);
  let resolveFont;
  const loaded = new Promise((resolve) => { resolveFont = resolve; });
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    documentElement: { classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) } },
    fonts: { load: () => loaded },
  } });
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'document', previous); else delete globalThis.document; });
  return { classes, resolveFont };
}

test('a successful font load clears a previous startup fallback', async (t) => {
  const env = fontEnvironment(t);
  const ready = waitForBrandFont();
  env.resolveFont([{}]);
  await ready;
  assert.ok(!env.classes.has('font-failed'));
  assert.ok(!env.classes.has('fonts-loading'));
});

test('a slow font first becomes readable, then recovers its brand styling when it arrives', async (t) => {
  const env = fontEnvironment(t);
  const ready = waitForBrandFont();
  t.mock.timers.tick(7000); await ready;
  assert.ok(env.classes.has('font-failed'));
  assert.ok(!env.classes.has('fonts-loading'), 'Do not leave a skeleton indefinitely');
  env.resolveFont([{}]); await flush();
  assert.ok(!env.classes.has('font-failed'), 'A late font must not leave the Products title permanently unformatted');
});

function environment(t, { complete = true, width = 560, decode = async () => {} } = {}) {
  const image = Object.assign(new EventTarget(), { complete, naturalWidth: width, decode });
  const error = { hidden: true };
  const loader = { dataset: { imageState: 'loading' }, setAttribute() {}, querySelector: (selector) => selector === 'img' ? image : error };
  for (const [key, value] of Object.entries({ window: {}, document: { querySelectorAll: () => [loader] } })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => { if (previous) Object.defineProperty(globalThis, key, previous); else delete globalThis[key]; });
  }
  setupImageLoading();
  return { image, error, loader };
}

test('a cached, successfully loaded image never displays the loading-error label', async (t) => {
  const env = environment(t, { decode: async () => { throw new Error('Decode not available'); } });
  await flush();
  assert.equal(env.loader.dataset.imageState, 'ready');
  assert.equal(env.error.hidden, true);
});

test('a real failure displays the error, and a later successful source removes it', async (t) => {
  const env = environment(t, { complete: false, width: 0 });
  env.image.dispatchEvent(new Event('error'));
  assert.equal(env.loader.dataset.imageState, 'error');
  assert.equal(env.error.hidden, false);
  env.image.naturalWidth = 560;
  env.image.dispatchEvent(new Event('load')); await flush();
  assert.equal(env.loader.dataset.imageState, 'ready');
  assert.equal(env.error.hidden, true);
});

test('an older decoding request cannot overwrite a more recent failure', async (t) => {
  let decoded;
  const env = environment(t, { decode: () => new Promise((resolve) => { decoded = resolve; }) });
  env.image.naturalWidth = 0;
  env.image.dispatchEvent(new Event('error'));
  decoded(); await flush();
  assert.equal(env.loader.dataset.imageState, 'error');
  assert.equal(env.error.hidden, false);
});
