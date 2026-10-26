import assert from 'node:assert/strict';
import test from 'node:test';
import { setupScrollMemory } from '../src/scripts/scroll-memory.ts';
import { setupNavigation } from '../src/scripts/language.ts';
import { cancelTextTransition } from '../src/scripts/text-motion.ts';
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };

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
  t.after(cancelTextTransition);
  if (motion) Element.prototype.animate = function (frames, options) { let finish; const finished = motion === 'manual' ? new Promise((resolve) => { finish = resolve; }) : Promise.resolve(); const animation = { frames, options, cancelled: false, cancel() { this.cancelled = true; finish?.(); }, finish: () => finish?.(), finished }; this.animations.push(animation); return animation; };
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
  trigger.setAttribute('data-image-alt-zh', '弹簧照片'); trigger.setAttribute('data-image-alt-id', 'Foto pegas'); trigger.setAttribute('data-image-alt-en', 'Spring photograph');
  const id = new Element(); id.hreflang = 'id'; const en = new Element(); en.hreflang = 'en'; const zh = new Element(); zh.hreflang = 'zh-Hans';
  const contact = new Element(); contact.documentTop = 1800;
  const springs = new Element(); springs.documentTop = 3200;
  const home = new Element(); home.documentTop = 0;
  const main = new Element(); main.documentTop = 0;
  const header = new Element(); header.height = 88;
  const sectionLink = new Element(); sectionLink.hash = '#contact';
  const homeLink = new Element(); homeLink.dataset.pageLink = 'home'; homeLink.href = '/';
  const productsLink = new Element(); productsLink.dataset.pageLink = 'products'; productsLink.href = '/products/';
  const contactLink = new Element(); contactLink.dataset.pageLink = 'contact'; contactLink.href = '/#contact';
  const categoryLink = new Element(); categoryLink.dataset.categoryDestination = 'per'; categoryLink.href = '/products/#per';
  const selectors = { '[data-remember-details]': [detail], '[data-gallery-track], [data-catalog-track]': [gallery], '[data-i18n]': [heading, fixedHeading, offscreen], '[data-image-trigger]': [trigger], '[data-language-link]': [id, en, zh], 'a[href^="#"]': [sectionLink], '[data-page-link]': [homeLink, productsLink, contactLink], '[data-category-destination]': [categoryLink] };
  const document = Object.assign(new EventTarget(), { documentElement: root, querySelectorAll: (s) => selectors[s] ?? [], querySelector: (s) => s === '.site-header' ? header : null, getElementById: (s) => ({ contact, springs, home, main })[s] ?? null });
  const location = { pathname: page === 'products' ? '/products/' : '/', search: '', hash, get href() { return `https://test.invalid${this.pathname}${this.search}${this.hash}`; } };
  const updateUrl = (url) => { const value = new URL(url, 'https://test.invalid'); Object.assign(location, { pathname: value.pathname, search: value.search, hash: value.hash }); };
  const history = { state: saved ? { alScroll: saved } : null, scrollRestoration: 'manual', pushes: [], replaceState(state, unused, url) { this.state = state; updateUrl(url); }, pushState(state, unused, url) { this.pushes.push({ state, url }); this.replaceState(state, unused, url); } };
  const data = new Map();
  const storage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const window = Object.assign(new EventTarget(), { scrollX: 0, scrollY: 0, scrollCalls: [], scrollTo(options) { this.scrollCalls.push(options); this.scrollX = options.left; this.scrollY = options.top; }, __anekaBoot: { snapshot: navigation === 'navigate' ? undefined : saved, finish: () => root.classList.remove('is-restoring') } });
  Object.defineProperty(window, 'sessionStorage', { get() { if (blocked) throw new Error('Storage blocked'); return storage; } });
  const globals = { document, window, location, history, innerWidth: 1000, innerHeight: 700, performance: { getEntriesByType: () => [{ type: navigation }] }, requestAnimationFrame: (fn) => queueMicrotask(fn) };
  globals.getComputedStyle = (element) => ({ position: element === header && sticky ? 'sticky' : 'relative', opacity: String(element.opacity), lineHeight: '24px', whiteSpace: element.whitespace ?? 'normal', translate: 'none', clipPath: 'none', scale: '1', getPropertyValue: (name) => ({ '--state-duration': '650ms', '--move-duration': '850ms', '--ease': 'cubic-bezier(0.22, 0.61, 0.36, 1)' })[name] ?? '' });
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
  return { root, detail, gallery, heading, fixedHeading, offscreen, image, id, en, zh, contact, sectionLink, homeLink, productsLink, contactLink, categoryLink, location, history, window, click, updateUrl };
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
  setupNavigation(memory);
  const originalImage = env.image;
  const previous = env.history.state;
  assert.equal(env.click(env.en).defaultPrevented, true);
  assert.equal(env.location.pathname, '/en/');
  assert.equal(env.location.hash, '');
  assert.equal(env.root.lang, 'en');
  assert.equal(env.homeLink.href, '/en/');
  assert.equal(env.productsLink.href, '/en/products/');
  assert.equal(env.contactLink.href, '/en/#contact');
  assert.equal(env.categoryLink.href, '/en/products/#per');
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
  setupNavigation(memory);
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

test('language wipes out old text right-to-left before replacing it and wipes new text in left-to-right', async (t) => {
  const env = environment(t, { motion: 'manual' });
  const memory = setupScrollMemory(Promise.resolve()); await memory.ready;
  setupNavigation(memory);
  env.click(env.en);
  const outgoing = env.heading.animations[0];
  assert.equal(env.heading.textContent, 'Pemilik', 'Keep the old text until its wipe completes');
  assert.equal(env.root.lang, 'id');
  assert.equal(outgoing.options.duration, 425);
  assert.equal(outgoing.frames[0].clipPath, 'inset(0 0 0 0)', 'Interpolate matching inset shapes instead of a discrete none value');
  assert.equal(outgoing.frames[1].clipPath, 'inset(0 100% 0 0)');
  assert.equal(env.fixedHeading.animations.length, 0);
  assert.equal(env.offscreen.animations.length, 0);
  assert.equal(env.image.animations.length, 0);
  env.window.scrollY = 1432.25;
  outgoing.finish(); await flush();
  assert.equal(env.heading.textContent, 'Owners');
  assert.equal(env.root.lang, 'en');
  assert.equal(env.window.scrollY, 1432.25, 'A scroll during the wipe must not be undone');
  assert.equal(outgoing.cancelled, true, 'Remove the completed outgoing mask so the new text stays visible');
  const incoming = env.heading.animations[1];
  assert.equal(incoming.frames[0].clipPath, 'inset(0 100% 0 0)');
  assert.equal(incoming.frames[1].clipPath, 'inset(0 0 0 0)');
  assert.equal(incoming.options.duration, outgoing.options.duration);
  assert.equal(incoming.options.easing, outgoing.options.easing);
  assert.equal(incoming.options.easing, 'linear');
  assert.equal(incoming.options.fill, 'both', 'Mask translated text during the pending animation phase');
  env.click(env.id);
  assert.equal(env.root.lang, 'en');
  assert.equal(env.heading.animations[2].options.duration, 425);
  env.heading.animations[2].finish(); await flush();
  assert.equal(env.root.lang, 'id');
  assert.ok(env.heading.animations[3].frames.every((frame) => frame.clipPath !== undefined && frame.translate !== undefined));
});

test('a rapid language reversal cancels stale replacement without adding a history entry', async (t) => {
  const env = environment(t, { motion: 'manual' });
  const memory = setupScrollMemory(Promise.resolve()); await memory.ready;
  setupNavigation(memory);
  env.click(env.en); env.click(env.id); await flush();
  assert.equal(env.heading.animations[0].cancelled, true);
  assert.equal(env.heading.textContent, 'Pemilik');
  assert.equal(env.location.pathname, '/');
  assert.equal(env.history.pushes.length, 0);
});

test('a stalled language animation releases its masks and temporary label sizing within the fallback bound', async (t) => {
  const env = environment(t, { motion: 'manual' });
  env.heading.dataset.i18nSize = '';
  const memory = setupScrollMemory(Promise.resolve()); await memory.ready;
  setupNavigation(memory);
  env.click(env.en);
  t.mock.timers.tick(675); await flush();
  const incoming = env.heading.animations[1];
  assert.equal(env.heading.textContent, 'Owners');
  assert.ok(env.heading.classes.has('i18n-sizing'));
  t.mock.timers.tick(675); await flush();
  assert.ok(incoming.cancelled, 'A pending fill mask must never leave translated text invisible');
  assert.ok(!env.heading.classes.has('i18n-sizing'));
  assert.ok(!env.root.classes.has('is-localizing'));
});

test('OS motion preferences do not disable the designed language wipe', async (t) => {
  const env = environment(t, { motion: 'manual' });
  env.heading.dataset.i18nSize = '';
  let queries = 0;
  env.window.matchMedia = () => { queries++; return { matches: true }; };
  const memory = setupScrollMemory(Promise.resolve()); await memory.ready;
  setupNavigation(memory);
  env.click(env.en);
  assert.equal(env.heading.textContent, 'Pemilik');
  assert.equal(env.heading.animations[0].options.duration, 425);
  env.heading.animations[0].finish(); await flush();
  assert.equal(env.heading.textContent, 'Owners');
  assert.ok(env.heading.classes.has('i18n-sizing'));
  env.heading.animations[1].finish(); await flush();
  assert.ok(!env.heading.classes.has('i18n-sizing'));
  assert.equal(queries, 0);
});

test('catalog language changes stay on the catalog and retain exact scroll pixels', async (t) => {
  const saved = { ...savedVisit, url: '/products/', y: 2867.5 };
  const env = environment(t, { page: 'products', saved });
  const memory = setupScrollMemory(Promise.resolve()); await memory.ready;
  setupNavigation(memory);
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

test('catalog selection survives refresh, language changes and Back together with exact pixels', async (t) => {
  const saved = { ...savedVisit, url: '/products/', category: 'as', y: 420.5 };
  const env = environment(t, { page: 'products', saved });
  let selection = 'all';
  const catalog = { sortColumn: () => 'category', sort: () => 'none', setSort: () => {}, view: () => 'thumbnails', setView: () => {}, current: () => selection, select: (value) => { selection = value; }, categoryForFragment: () => undefined };
  const memory = setupScrollMemory(Promise.resolve(), catalog); await memory.ready;
  setupNavigation(memory);
  assert.equal(selection, 'as');
  assert.equal(env.window.scrollY, 420.5);
  const previous = env.history.state;
  env.click(env.en);
  assert.equal(env.location.pathname, '/en/products/');
  assert.equal(env.history.state.alScroll.category, 'as');
  assert.equal(env.window.scrollY, 420.5);
  catalog.select('all'); env.window.scrollY = 900; memory.save();
  env.updateUrl('/products/'); env.history.state = previous;
  const event = new Event('popstate'); event.state = previous; env.window.dispatchEvent(event);
  assert.equal(selection, 'as');
  assert.equal(env.window.scrollY, 420.5);
  assert.equal(env.root.lang, 'id');
});

test('category entry takes priority over an older saved catalog visit and consumes its fragment', async (t) => {
  const env = environment(t, { page: 'products', navigation: 'navigate', hash: '#per', saved: { ...savedVisit, url: '/products/', y: 600 } });
  let selection = 'all';
  const catalog = { sortColumn: () => 'category', sort: () => 'none', setSort: () => {}, view: () => 'thumbnails', setView: () => {}, current: () => selection, select: (value) => { selection = value; }, categoryForFragment: (id) => id === 'per' ? 'per' : undefined };
  const memory = setupScrollMemory(Promise.resolve(), catalog); await memory.ready;
  assert.equal(selection, 'per');
  assert.equal(env.window.scrollY, 0, 'Category entries start with the filter controls in view');
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
  setupNavigation(memory);
  env.click(env.sectionLink);
  assert.equal(env.window.scrollY, 1800);
  assert.equal(env.window.scrollCalls.at(-1).behavior, 'smooth');
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
  setupNavigation(memory);
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

for (const page of ['home', 'products']) test(`Mandarin switches in place on ${page}, keeps pixels/images, and supports a third-language history round trip`, async (t) => {
  const env = environment(t, { page, saved: { ...savedVisit, url: page === 'home' ? '/' : '/products/', y: 420.5 } });
  const memory = setupScrollMemory(Promise.resolve()); await memory.ready;
  setupNavigation(memory);
  env.click(env.zh);
  assert.equal(env.root.lang, 'zh-Hans');
  assert.equal(env.location.pathname, page === 'home' ? '/zh/' : '/zh/products/');
  assert.equal(env.heading.textContent, '店主');
  assert.equal(env.image.alt, '弹簧照片');
  assert.equal(env.image.src, '/photo.webp');
  assert.equal(env.window.scrollY, 420.5);
  assert.equal(env.productsLink.href, '/zh/products/');
  assert.equal(env.categoryLink.href, '/zh/products/#per');
  const previous = env.history.state;
  env.click(env.en);
  env.updateUrl(page === 'home' ? '/zh/' : '/zh/products/'); env.history.state = previous;
  const back = new Event('popstate'); back.state = previous; env.window.dispatchEvent(back);
  assert.equal(env.root.lang, 'zh-Hans');
  assert.equal(env.heading.textContent, '店主');
  assert.equal(env.window.scrollY, 420.5);
});

test('catalog category links filter in place; the Products page link returns to All Products', async (t) => {
  const env = environment(t, { page: 'products', saved: { ...savedVisit, url: '/products/' } });
  let category = 'all';
  const catalog = { sortColumn: () => 'category', sort: () => 'none', setSort: () => {}, view: () => 'thumbnails', setView: () => {}, current: () => category, select: (value) => { category = value; }, categoryForFragment: (id) => ['all', 'per'].includes(id) ? id : undefined };
  const memory = setupScrollMemory(Promise.resolve(), catalog); await memory.ready;
  setupNavigation(memory);
  assert.equal(env.click(env.categoryLink).defaultPrevented, true);
  assert.equal(category, 'per');
  assert.equal(env.window.scrollY, 0);
  assert.equal(env.location.hash, '');
  assert.equal(env.history.state.alScroll.category, 'per');
  env.click(env.productsLink);
  assert.equal(category, 'all');
});

test('text-sized controls resize horizontally during the incoming language wipe', async (t) => {
  const env = environment(t, { motion: 'manual' });
  env.heading.dataset.i18nSize = '';
  env.heading.getBoundingClientRect = () => ({ width: env.heading.textContent.length * 10, height: 24, top: 100, bottom: 124 });
  const memory = setupScrollMemory(Promise.resolve()); await memory.ready;
  setupNavigation(memory);
  env.click(env.en);
  const outgoing = env.heading.animations[0];
  assert.equal(outgoing.frames[0].inlineSize, '70px');
  outgoing.finish(); await flush();
  const incoming = env.heading.animations[1];
  assert.equal(incoming.frames[0].inlineSize, '70px');
  assert.equal(incoming.frames[1].inlineSize, '60px');
  assert.ok(incoming.frames.every((frame) => frame.whiteSpace === 'nowrap'), 'Never wrap a one-line label while its narrower width grows');
  assert.equal(incoming.options.duration, 425);
  assert.ok(env.heading.classes.has('i18n-sizing'), 'CSS also protects one-line labels while width is animated');
  assert.equal(incoming.frames[0].clipPath, 'inset(0 100% 0 0)');
  assert.ok(env.root.classes.has('is-localizing'), 'Keep scroll anchoring paused throughout the live resize');
  incoming.finish(); await flush();
  assert.ok(incoming.cancelled, 'Release the width constraint when the wipe finishes');
  assert.ok(!env.heading.classes.has('i18n-sizing'), 'Release temporary whitespace on completion');
  assert.ok(!env.root.classes.has('is-localizing'));
});

test('catalog view is restored before scroll positioning and survives language history', async (t) => {
  const saved = { ...savedVisit, url: '/products/', category: 'per', view: 'details', y: 420.25 };
  const env = environment(t, { page: 'products', saved });
  let category = 'all', view = 'thumbnails';
  const catalog = { sortColumn: () => 'category', sort: () => 'none', setSort: () => {}, current: () => category, view: () => view, select: (next) => { category = next; }, setView: (next) => { view = next; }, categoryForFragment: () => undefined };
  const memory = setupScrollMemory(Promise.resolve(), catalog); await memory.ready;
  assert.equal(view, 'details');
  assert.equal(category, 'per');
  assert.equal(env.window.scrollY, 420.25);
  setupNavigation(memory);
  const previous = env.history.state;
  env.click(env.en);
  assert.equal(env.history.state.alScroll.view, 'details');
  view = 'thumbnails'; memory.save();
  env.updateUrl('/products/'); env.history.state = previous;
  env.window.dispatchEvent(Object.assign(new Event('popstate'), { state: previous }));
  assert.equal(view, 'details');
  assert.equal(env.window.scrollY, 420.25);
});


test('refresh teardown cannot overwrite the final bottom position after pageswap or hidden-page resets', async (t) => {
  const env = environment(t);
  const memory = setupScrollMemory(Promise.resolve()); await memory.ready;
  env.window.scrollY = 4300;
  env.window.dispatchEvent(new Event('pageswap'));
  env.window.scrollY = 0;
  env.window.dispatchEvent(new Event('scrollend'));
  env.window.dispatchEvent(new Event('pagehide'));
  assert.equal(env.history.state.alScroll.y, 4300);
  env.window.dispatchEvent(new Event('pageshow'));
  env.window.scrollY = 200; memory.save();
  assert.equal(env.history.state.alScroll.y, 200, 'A BFCache return resumes normal saving');
});

test('tab hiding freezes a stable visit; visible scrolling resumes after returning', async (t) => {
  const env = environment(t);
  const memory = setupScrollMemory(Promise.resolve()); await memory.ready;
  env.window.scrollY = 4299.5;
  document.visibilityState = 'hidden'; document.dispatchEvent(new Event('visibilitychange'));
  env.window.scrollY = 0; env.window.dispatchEvent(new Event('pagehide'));
  assert.equal(env.history.state.alScroll.y, 4299.5);
  document.visibilityState = 'visible'; document.dispatchEvent(new Event('visibilitychange'));
  memory.save(); assert.equal(env.history.state.alScroll.y, 0);
});

test('category sort order returns with the saved catalog view and pixels', async (t) => {
  const saved = { ...savedVisit, url: '/products/', category: 'all', view: 'details', categorySort: 'ascending', y: 420.25 };
  const env = environment(t, { page: 'products', saved });
  let order = 'none';
  const catalog = { current: () => 'all', view: () => 'details', sortColumn: () => 'category', sort: () => order, setSort: (next) => { order = next; }, setView: () => {}, select: () => {} };
  const memory = setupScrollMemory(Promise.resolve(), catalog); await memory.ready;
  assert.equal(order, 'ascending'); assert.equal(env.window.scrollY, 420.25);
  memory.save(); assert.equal(env.history.state.alScroll.categorySort, 'ascending');
});


test('a longer incoming label keeps a single line while its width grows', async (t) => {
  const env = environment(t, { motion: 'manual' });
  env.heading.dataset.i18nSize = '';
  env.heading.getBoundingClientRect = () => ({ width: env.heading.textContent.length * 10, height: 24, top: 100, bottom: 124 });
  const memory = setupScrollMemory(Promise.resolve()); await memory.ready;
  setupNavigation(memory);
  env.click(env.en); env.heading.animations[0].finish(); await flush();
  env.heading.animations[1].finish(); await flush();
  env.click(env.id); env.heading.animations[2].finish(); await flush();
  const incoming = env.heading.animations[3];
  assert.equal(incoming.frames[0].inlineSize, '60px'); assert.equal(incoming.frames[1].inlineSize, '70px');
  assert.ok(incoming.frames.every((frame) => frame.whiteSpace === 'nowrap'));
  assert.equal(incoming.options.duration, 425);
});

test('a label that needs multiple lines at enlarged text is left fluid during translation', async (t) => {
  const env = environment(t, { motion: 'manual' });
  env.heading.dataset.i18nSize = '';
  env.heading.getBoundingClientRect = () => ({ width: 100, height: 48, top: 100, bottom: 148 });
  const memory = setupScrollMemory(Promise.resolve()); await memory.ready;
  setupNavigation(memory);
  env.click(env.en); env.heading.animations[0].finish(); await flush();
  const incoming = env.heading.animations[1];
  assert.ok(incoming.frames.every((frame) => frame.inlineSize === undefined && frame.whiteSpace === undefined));
  assert.equal(incoming.frames[0].clipPath, 'inset(0 100% 0 0)', 'Preserve the wipe when normal wrapping is required');
});


test('a rapid reversal preserves the no-wrap constraint at a partially resized width', async (t) => {
  const env = environment(t, { motion: 'manual' });
  env.heading.dataset.i18nSize = '';
  const memory = setupScrollMemory(Promise.resolve()); await memory.ready;
  setupNavigation(memory);
  env.click(env.en); env.heading.animations[0].finish(); await flush();
  env.heading.whitespace = 'nowrap';
  env.heading.getBoundingClientRect = () => ({ width: 50, height: 24, top: 100, bottom: 124 });
  env.click(env.id);
  const outgoing = env.heading.animations[2];
  assert.ok(outgoing.frames.every((frame) => frame.whiteSpace === 'nowrap'));
  assert.ok(outgoing.frames.every((frame) => frame.inlineSize === '50px'));
  cancelTextTransition(); assert.ok(!env.heading.classes.has('i18n-sizing'), 'Release temporary whitespace on cancellation');
});

test('Product name sorting survives reload and language history with exact page pixels', async (t) => {
  const saved = { ...savedVisit, url: '/products/', category: 'all', view: 'details', productSort: 'descending', y: 420.25 };
  const env = environment(t, { page: 'products', saved });
  let order = 'none', column = 'category';
  const catalog = { current: () => 'all', view: () => 'details', sort: () => order, sortColumn: () => column, setSort: (next, animate, name) => { order = next; column = name; }, setView: () => {}, select: () => {} };
  const memory = setupScrollMemory(Promise.resolve(), catalog); await memory.ready;
  assert.equal(order, 'descending'); assert.equal(column, 'product');
  assert.equal(env.window.scrollY, 420.25);
  setupNavigation(memory); env.click(env.en);
  assert.equal(env.history.state.alScroll.productSort, 'descending');
  assert.equal(env.history.state.alScroll.categorySort, undefined);
  env.updateUrl('/products/');
  const back = new Event('popstate'); back.state = { alScroll: saved }; env.window.dispatchEvent(back);
  assert.equal(order, 'descending'); assert.equal(column, 'product');
  assert.equal(env.window.scrollY, 420.25);
});
