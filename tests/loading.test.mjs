import assert from 'node:assert/strict';
import test from 'node:test';
import { setupImageLoading } from '../src/scripts/loading.ts';

const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
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
