import assert from 'node:assert/strict';
import test from 'node:test';
import { setupScrollMemory } from '../src/scripts/scroll-memory.ts';
import { setupNavigation } from '../src/scripts/language.ts';

const savedVisit = { version: 1, url: '/#contact', x: 0, y: 1267, details: ['spring'], galleries: { photos: 1 } };

function environment(t, { saved = savedVisit, hash = '', blocked = false } = {}) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  class Element extends EventTarget {
    dataset = {}; attrs = new Map(); classes = new Set(); textContent = ''; open = false;
    classList = { add: (...names) => names.forEach((n) => this.classes.add(n)), remove: (...names) => names.forEach((n) => this.classes.delete(n)) };
    setAttribute(key, value) { this.attrs.set(key, value); }
    getAttribute(key) { return this.attrs.get(key) ?? null; }
    removeAttribute(key) { this.attrs.delete(key); }
    querySelector(selector) { return this.children?.[selector] ?? null; }
    focus() {}
    scrollIntoView() { this.anchorScrolls = (this.anchorScrolls ?? 0) + 1; }
  }
  const root = new Element(); Object.assign(root, { lang: 'id', scrollWidth: 1000, scrollHeight: 5000, dataset: { page: 'home' } });
  const detail = new Element(); detail.id = 'spring';
  const gallery = new Element(); Object.assign(gallery, { id: 'photos', clientWidth: 320, scrollLeft: 0 });
  const heading = new Element(); heading.dataset.i18n = 'owners'; heading.textContent = 'Pemilik';
  const image = new Element(); image.alt = 'Foto pegas'; image.src = '/photo.webp';
  const trigger = new Element(); trigger.children = { 'img[data-image-content]': image };
  trigger.setAttribute('data-image-alt-id', 'Foto pegas'); trigger.setAttribute('data-image-alt-en', 'Spring photograph');
  const id = new Element(); id.hreflang = 'id'; const en = new Element(); en.hreflang = 'en';
  const contact = new Element(); const sectionLink = new Element(); sectionLink.hash = '#contact';
  const selectors = { '[data-remember-details]': [detail], '[data-gallery-track]': [gallery], '[data-i18n]': [heading], '[data-image-trigger]': [trigger], '[data-language-link]': [id, en], 'a[href^="#"]': [sectionLink] };
  const document = Object.assign(new EventTarget(), { documentElement: root, querySelectorAll: (s) => selectors[s] ?? [], querySelector: () => null, getElementById: (s) => s === 'contact' ? contact : null });
  const location = { pathname: '/', search: '', hash };
  const updateUrl = (url) => { const value = new URL(url, 'https://test.invalid'); Object.assign(location, { pathname: value.pathname, search: value.search, hash: value.hash }); };
  const history = { state: saved ? { alScroll: saved } : null, scrollRestoration: 'manual', pushes: [], replaceState(state, unused, url) { this.state = state; updateUrl(url); }, pushState(state, unused, url) { this.pushes.push({ state, url }); this.replaceState(state, unused, url); } };
  const data = new Map();
  const storage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const window = Object.assign(new EventTarget(), { scrollX: 0, scrollY: 0, scrollTo({ left, top }) { this.scrollX = left; this.scrollY = top; }, __anekaBoot: { snapshot: saved, finish: () => root.classList.remove('is-restoring') } });
  Object.defineProperty(window, 'sessionStorage', { get() { if (blocked) throw new Error('Storage blocked'); return storage; } });
  const globals = { document, window, location, history, innerWidth: 1000, innerHeight: 700, performance: { getEntriesByType: () => [{ type: 'reload' }] }, requestAnimationFrame: (fn) => queueMicrotask(fn) };
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => { if (previous) Object.defineProperty(globalThis, key, previous); else delete globalThis[key]; });
  }
  for (const key of ['scrollX', 'scrollY']) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, get: () => window[key] });
    t.after(() => { if (previous) Object.defineProperty(globalThis, key, previous); else delete globalThis[key]; });
  }
  const click = (target, modified = false) => { const event = new Event('click', { cancelable: true }); Object.assign(event, { button: 0, ctrlKey: modified }); target.dispatchEvent(event); return event; };
  return { root, detail, gallery, heading, image, id, en, contact, sectionLink, location, history, window, click, updateUrl };
}

test('reload waits for the font, restores exact pixels and expanded content, and never scrolls to an old heading', async (t) => {
  const env = environment(t);
  let fontReady;
  const memory = setupScrollMemory(new Promise((resolve) => { fontReady = resolve; }));
  assert.equal(env.detail.open, true);
  assert.equal(env.gallery.scrollLeft, 320);
  assert.ok(env.root.classes.has('is-restoring'));
  fontReady();
  assert.equal(await memory.ready, true);
  assert.equal(env.window.scrollY, 1267);
  assert.equal(env.contact.anchorScrolls, undefined);
  assert.ok(!env.root.classes.has('is-restoring'));
  assert.equal(env.history.scrollRestoration, 'manual');
  assert.equal(env.history.state.alScroll.url, '/');
  env.window.scrollY = 1432.5;
  env.window.dispatchEvent(new Event('pagehide'));
  assert.equal(env.history.state.alScroll.y, 1432.5, 'Capture the last fractional pixel even before a throttled save');
});

test('language changes preserve pixels, image identity, open details, and gallery selection; Back restores the old visit', async (t) => {
  const env = environment(t);
  const memory = setupScrollMemory(Promise.resolve()); await memory.ready;
  setupNavigation(memory, { matches: false });
  const originalImage = env.image;
  const previous = env.history.state;
  assert.equal(env.click(env.en).defaultPrevented, true);
  assert.equal(env.location.pathname, '/en/');
  assert.equal(env.location.hash, '');
  assert.equal(env.root.lang, 'en');
  assert.equal(env.heading.textContent, 'Owners');
  assert.equal(env.image.alt, 'Spring photograph');
  assert.equal(env.image, originalImage);
  assert.equal(env.image.src, '/photo.webp');
  assert.equal(env.window.scrollY, 1267);
  assert.equal(env.detail.open, true);
  assert.equal(env.gallery.scrollLeft, 320);
  assert.equal(env.contact.anchorScrolls, undefined);
  env.window.scrollY = 1500; env.detail.open = false; env.gallery.scrollLeft = 0; memory.save();
  env.updateUrl('/'); env.history.state = previous;
  const back = new Event('popstate'); back.state = previous; env.window.dispatchEvent(back);
  assert.equal(env.root.lang, 'id');
  assert.equal(env.heading.textContent, 'Pemilik');
  assert.equal(env.window.scrollY, 1267);
  assert.equal(env.detail.open, true);
  assert.equal(env.gallery.scrollLeft, 320);
  assert.equal(env.click(env.en, true).defaultPrevented, false, 'Preserve normal modified-link behavior');
});

test('fresh deep links and section navigation still scroll to the requested heading', async (t) => {
  const env = environment(t, { saved: null, hash: '#contact' });
  const memory = setupScrollMemory(Promise.resolve()); await memory.ready;
  assert.equal(env.contact.anchorScrolls, 1);
  setupNavigation(memory, { matches: false });
  assert.equal(env.click(env.sectionLink).defaultPrevented, true);
  assert.equal(env.contact.anchorScrolls, 2);
});

test('scroll input during startup takes priority over the saved position', async (t) => {
  const env = environment(t);
  let fontReady;
  const memory = setupScrollMemory(new Promise((resolve) => { fontReady = resolve; }));
  env.window.dispatchEvent(new Event('wheel')); env.window.scrollY = 900;
  fontReady();
  assert.equal(await memory.ready, false);
  assert.equal(env.window.scrollY, 900);
});

test('blocked session storage uses history; malformed fragments cannot leave the page hidden', async (t) => {
  const env = environment(t, { blocked: true, hash: '#%ZZ' });
  env.window.__anekaBoot.snapshot = undefined; env.history.state = null;
  const memory = setupScrollMemory(Promise.resolve());
  await memory.ready;
  assert.ok(!env.root.classes.has('is-restoring'));
  env.window.scrollY = 999; memory.save();
  assert.equal(env.history.state.alScroll.y, 999);
});
