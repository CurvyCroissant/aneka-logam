import assert from 'node:assert/strict';
import test from 'node:test';
import { setupScrollMemory } from '../src/scripts/scroll-memory.ts';
import { setupNavigation } from '../src/scripts/language.ts';

const savedVisit = { version: 1, url: '/#contact', x: 0, y: 1267, details: ['spring'], galleries: { photos: 1 } };

function environment(t, { saved = savedVisit, hash = '', blocked = false, motion = false, sticky = true, page = 'home', navigation = 'reload', categoryMemory = false } = {}) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  class Element extends EventTarget {
    dataset = {}; attrs = new Map(); classes = new Set(); textContent = ''; open = false; animations = []; opacity = 1; top = 100;
    classList = { add: (...names) => names.forEach((n) => this.classes.add(n)), remove: (...names) => names.forEach((n) => this.classes.delete(n)) };
    setAttribute(key, value) { this.attrs.set(key, value); }
    getAttribute(key) { return this.attrs.get(key) ?? null; }
    removeAttribute(key) { this.attrs.delete(key); }
    querySelector(selector) { return this.children?.[selector] ?? null; }
    closest() { return null; }
    getBoundingClientRect() { const top = this.documentTop === undefined ? this.top : this.documentTop - window.scrollY; return { width: 200, height: this.height ?? 24, top, bottom: top + (this.height ?? 24) }; }
    focus(options) { this.focusOptions = options; }
    scrollIntoView() { this.anchorScrolls = (this.anchorScrolls ?? 0) + 1; }
  }
  if (motion) Element.prototype.animate = function (frames, options) { const animation = { frames, options, cancelled: false, cancel() { this.cancelled = true; }, finished: Promise.resolve() }; this.animations.push(animation); return animation; };
  const root = new Element(); Object.assign(root, { lang: 'id', scrollWidth: 1000, scrollHeight: 5000, dataset: { page } });
  const detail = new Element(); detail.id = 'spring';
  const gallery = new Element(); Object.assign(gallery, { id: 'photos', clientWidth: 320, scrollLeft: 0 });
  if (categoryMemory) {
    gallery.dataset.categoryTrack = '';
    gallery.scrollWidth = 1320;
    gallery.querySelectorAll = () => [0, 500, 1000].map((offsetLeft) => ({ offsetLeft }));
  }
  const heading = new Element(); heading.dataset.i18n = 'owners'; heading.textContent = 'Pemilik';
  const fixedHeading = new Element(); fixedHeading.dataset.i18n = 'contact'; fixedHeading.textContent = 'Contact';
  const offscreen = new Element(); offscreen.dataset.i18n = 'address'; offscreen.textContent = 'Alamat Toko'; offscreen.top = 2000;
  const image = new Element(); image.alt = 'Foto pegas'; image.src = '/photo.webp';
  const trigger = new Element(); trigger.children = { 'img[data-image-content]': image };
  trigger.setAttribute('data-image-alt-id', 'Foto pegas'); trigger.setAttribute('data-image-alt-en', 'Spring photograph');
  const id = new Element(); id.hreflang = 'id'; const en = new Element(); en.hreflang = 'en';
  const contact = new Element(); contact.documentTop = 1800;
  const springs = new Element(); springs.documentTop = 3200;
  const home = new Element(); home.documentTop = 0;
  const main = new Element(); main.documentTop = 0;
  const header = new Element(); header.height = 88;
  const sectionLink = new Element(); sectionLink.hash = '#contact';
  const homeLink = new Element(); homeLink.dataset.pageLink = 'home'; homeLink.href = '/';
  const productsLink = new Element(); productsLink.dataset.pageLink = 'products'; productsLink.href = '/products/';
  const contactLink = new Element(); contactLink.dataset.pageLink = 'contact'; contactLink.href = '/#contact';
  const categoryLink = new Element(); categoryLink.dataset.categoryDestination = 'springs'; categoryLink.href = '/products/#springs';
  const selectors = { '[data-remember-details]': [detail], '[data-gallery-track]': [gallery], '[data-i18n]': [heading, fixedHeading, offscreen], '[data-image-trigger]': [trigger], '[data-language-link]': [id, en], 'a[href^="#"]': [sectionLink], '[data-page-link]': [homeLink, productsLink, contactLink], '[data-category-destination]': [categoryLink] };
  const document = Object.assign(new EventTarget(), { documentElement: root, querySelectorAll: (s) => selectors[s] ?? [], querySelector: (s) => s === '.site-header' ? header : null, getElementById: (s) => ({ contact, springs, home, main })[s] ?? null });
  const location = { pathname: page === 'products' ? '/products/' : '/', search: '', hash, get href() { return `https://test.invalid${this.pathname}${this.search}${this.hash}`; } };
  const updateUrl = (url) => { const value = new URL(url, 'https://test.invalid'); Object.assign(location, { pathname: value.pathname, search: value.search, hash: value.hash }); };
  const history = { state: saved ? { alScroll: saved } : null, scrollRestoration: 'manual', pushes: [], replaceState(state, unused, url) { this.state = state; updateUrl(url); }, pushState(state, unused, url) { this.pushes.push({ state, url }); this.replaceState(state, unused, url); } };
  const data = new Map();
  const storage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const window = Object.assign(new EventTarget(), { scrollX: 0, scrollY: 0, scrollCalls: [], scrollTo(options) { this.scrollCalls.push(options); this.scrollX = options.left; this.scrollY = options.top; }, __anekaBoot: { snapshot: navigation === 'navigate' ? undefined : saved, finish: () => root.classList.remove('is-restoring') } });
  Object.defineProperty(window, 'sessionStorage', { get() { if (blocked) throw new Error('Storage blocked'); return storage; } });
  const globals = { document, window, location, history, innerWidth: 1000, innerHeight: 700, performance: { getEntriesByType: () => [{ type: navigation }] }, requestAnimationFrame: (fn) => queueMicrotask(fn) };
  globals.getComputedStyle = (element) => ({ position: element === header && sticky ? 'sticky' : 'relative', opacity: String(element.opacity), translate: 'none', scale: '1', getPropertyValue: (name) => ({ '--state-duration': '650ms', '--move-duration': '850ms', '--reduced-duration': '180ms', '--ease': 'cubic-bezier(0.22, 0.61, 0.36, 1)' })[name] ?? '' });
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
  return { root, detail, gallery, heading, fixedHeading, offscreen, image, id, en, contact, sectionLink, homeLink, productsLink, contactLink, categoryLink, location, history, window, click, updateUrl };
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
  assert.equal(env.homeLink.href, '/en/');
  assert.equal(env.productsLink.href, '/en/products/');
  assert.equal(env.contactLink.href, '/en/#contact');
  assert.equal(env.categoryLink.href, '/en/products/#springs');
  assert.equal(env.heading.textContent, 'Owners');
  assert.equal(document.title, 'Aneka Logam');
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
  assert.equal(env.window.scrollY, 1712, 'Contact starts immediately below the 88px sticky header');
  assert.equal(env.location.hash, '', 'Consume incoming deep links without retaining a fragment');
  setupNavigation(memory, { matches: false });
  assert.equal(env.click(env.sectionLink).defaultPrevented, true);
  assert.equal(env.window.scrollY, 1712, 'Repeated navigation must not accumulate extra spacing');
  assert.equal(env.window.scrollCalls.at(-1).behavior, 'smooth');
  assert.equal(env.location.hash, '', 'Section clicks must leave the URL clean');
  assert.equal(env.history.pushes.length, 0, 'Scrolling must not add browser-history entries');
  assert.deepEqual(env.contact.focusOptions, { preventScroll: true }, 'Keyboard focus follows the section without competing scrolls');
  env.window.scrollY = 1456.5;
  env.window.dispatchEvent(new Event('pagehide'));
  assert.equal(env.history.state.alScroll.y, 1456.5);
  assert.equal(env.history.state.alScroll.url, '/');
});

test('language motion moves changed visible text, tolerates rapid toggles, and respects reduced motion', async (t) => {
  const env = environment(t, { motion: true });
  const memory = setupScrollMemory(Promise.resolve()); await memory.ready;
  const preference = { matches: false };
  setupNavigation(memory, preference);
  env.click(env.en);
  assert.equal(env.heading.animations.length, 1);
  assert.equal(env.heading.animations[0].options.duration, 850);
  assert.equal(env.heading.animations[0].frames[0].translate, '0 14px');
  assert.equal(env.heading.animations[0].frames[0].scale, '0.985');
  assert.equal(env.fixedHeading.animations.length, 0, 'Matching English titles must stay still');
  assert.equal(env.offscreen.animations.length, 0, 'Do not animate invisible text');
  assert.equal(env.image.animations.length, 0, 'Do not animate or replace images during translation');
  preference.matches = true;
  env.click(env.id);
  assert.equal(env.heading.animations[0].cancelled, true, 'Rapid toggles replace the prior text movement');
  assert.equal(env.heading.animations[1].options.duration, 180);
  assert.ok(env.heading.animations[1].frames.every((frame) => frame.translate === undefined && frame.scale === undefined), 'Reduced motion removes spatial movement');
  assert.equal(env.window.scrollY, 1267);
  assert.equal(env.root.lang, 'id');
});

test('catalog language changes stay on the catalog and retain exact scroll pixels', async (t) => {
  const saved = { ...savedVisit, url: '/products/', y: 2867.5 };
  const env = environment(t, { page: 'products', saved });
  const memory = setupScrollMemory(Promise.resolve()); await memory.ready;
  setupNavigation(memory, { matches: false });
  env.click(env.en);
  assert.equal(env.location.pathname, '/en/products/');
  assert.equal(env.window.scrollY, 2867.5);
  assert.equal(document.title, 'Products | Aneka Logam');
  assert.equal(env.productsLink.href, '/en/products/');
  assert.equal(env.click(env.productsLink).defaultPrevented, true);
  assert.equal(env.window.scrollY, 0, 'The current-page Products link returns to the start');
  assert.equal(env.click(env.homeLink).defaultPrevented, false, 'Cross-page links retain native current-tab navigation');
});

test('View All starts at the catalog top even with an older saved catalog visit', async (t) => {
  const env = environment(t, { page: 'products', navigation: 'navigate', saved: { ...savedVisit, url: '/products/', y: 2867.5 } });
  env.window.scrollY = 1000;
  const memory = setupScrollMemory(Promise.resolve());
  assert.equal(await memory.ready, false);
  assert.equal(env.window.scrollY, 0);
});

test('category entry takes priority over an older saved catalog visit and consumes its fragment', async (t) => {
  const env = environment(t, { page: 'products', navigation: 'navigate', hash: '#springs', saved: { ...savedVisit, url: '/products/', y: 600 } });
  const memory = setupScrollMemory(Promise.resolve()); await memory.ready;
  assert.equal(env.window.scrollY, 3112, 'Category begins immediately below the sticky header');
  assert.equal(env.location.pathname, '/products/');
  assert.equal(env.location.hash, '');
});

test('refresh retains the selected category using card snap positions rather than viewport width', async (t) => {
  const env = environment(t, { saved: { ...savedVisit, url: '/', galleries: { photos: 1 } }, categoryMemory: true });
  const memory = setupScrollMemory(Promise.resolve()); await memory.ready;
  assert.equal(env.gallery.scrollLeft, 500);
  assert.equal(memory.capture().galleries.photos, 1);
  env.gallery.scrollLeft = 1000;
  memory.save();
  assert.equal(env.history.state.alScroll.galleries.photos, 2);
});

test('section scrolling on short landscape screens has no offset for a non-sticky header', async (t) => {
  const env = environment(t, { sticky: false });
  const memory = setupScrollMemory(Promise.resolve()); await memory.ready;
  setupNavigation(memory, { matches: true });
  env.click(env.sectionLink);
  assert.equal(env.window.scrollY, 1800);
  assert.equal(env.window.scrollCalls.at(-1).behavior, 'instant');
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

test('Space does not cancel scroll restoration now that background Space scrolling is disabled', async (t) => {
  const env = environment(t);
  let fontReady;
  const memory = setupScrollMemory(new Promise((resolve) => { fontReady = resolve; }));
  const key = new Event('keydown'); key.key = ' '; env.window.dispatchEvent(key);
  fontReady();
  assert.equal(await memory.ready, true);
  assert.equal(env.window.scrollY, 1267);
});

test('keyboard-initiated section navigation during startup takes priority over an older saved visit', async (t) => {
  const env = environment(t);
  let fontReady;
  const memory = setupScrollMemory(new Promise((resolve) => { fontReady = resolve; }));
  setupNavigation(memory, { matches: true });
  env.click(env.sectionLink);
  assert.equal(env.window.scrollY, 1712);
  fontReady();
  assert.equal(await memory.ready, false);
  assert.equal(env.window.scrollY, 1712);
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
