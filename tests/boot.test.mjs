import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const code = readFileSync(new URL('../src/scripts/boot.js', import.meta.url), 'utf8');
const snapshot = { version: 1, url: '/#contact', x: 0, y: 1267, details: ['details-spring'], galleries: {} };

function boot({ type = 'reload', stored = snapshot, state, blocked = false, hash = '#contact', activeEntry, legacy = false, reduced = false } = {}) {
  const classes = new Set(), replaced = [], timers = new Map();
  const animations = [];
  const document = Object.assign(new EventTarget(), { documentElement: { dataset: {}, classList: { add: (...names) => names.forEach((n) => classes.add(n)), remove: (...names) => names.forEach((n) => classes.delete(n)) } }, body: { animate(frames, options) { let finish; const animation = { frames, options, cancelled: false, finished: new Promise((resolve) => { finish = resolve; }), cancel() { this.cancelled = true; finish(); } }; animations.push(animation); return animation; } } });
  const history = { scrollRestoration: 'auto', state, replaceState: (s, unused, url) => { replaced.push(url); history.state = s; } };
  const window = new EventTarget();
  if (!legacy) window.onpagereveal = null;
  window.matchMedia = () => ({ matches: reduced });
  const data = new Map(); if (activeEntry) data.set('aneka-logam:active-entry', JSON.stringify(activeEntry));
  vm.runInNewContext(code, { document, history, window, location: { pathname: '/', search: '', hash }, performance: { getEntriesByType: () => [{ type }] }, getComputedStyle: () => ({ getPropertyValue: (key) => key === '--move-duration' ? '850ms' : 'ease-out' }), sessionStorage: { getItem: (key) => { if (blocked) throw new Error('Blocked'); return key === 'aneka-logam:active-entry' ? data.get(key) ?? null : JSON.stringify(stored); }, setItem: (key, value) => { if (blocked) throw new Error('Blocked'); data.set(key, value); } }, setTimeout: (fn) => { timers.set(1, fn); return 1; }, clearTimeout: (id) => timers.delete(id) });
  return { classes, replaced, history, window, timers, document, animations };
}

test('saved reload removes the stale contact hash before parsing and takes one scroll owner', () => {
  const result = boot();
  assert.deepEqual(result.replaced, ['/']);
  assert.equal(result.history.scrollRestoration, 'manual');
  assert.ok(result.classes.has('is-restoring'));
  assert.equal(result.window.__anekaBoot.snapshot.y, 1267);
  result.window.__anekaBoot.finish();
  assert.ok(result.classes.has('reveals-ready'), 'Scroll/font completion must release shell masking even if reveal setup failed');
  assert.equal(result.history.scrollRestoration, 'manual', 'Do not hand control back to native restoration');
  result.window.__anekaBoot.startEntrance();
  assert.equal(result.timers.size, 0);
});

test('a fresh contact deep link is preserved, even when an older visit is saved', () => {
  const result = boot({ type: 'navigate' });
  assert.deepEqual(result.replaced, []);
  assert.ok(!result.classes.has('is-restoring'));
});

test('a second refresh before the page finishes initializing retains the normalized visit', () => {
  const first = boot();
  assert.equal(first.history.state.alScroll.url, '/');
  const second = boot({ state: first.history.state, hash: '' });
  assert.equal(second.window.__anekaBoot.snapshot.y, 1267);
  assert.ok(second.classes.has('is-restoring'));
});

test('history state restores a visit when session storage is blocked', () => {
  const result = boot({ state: { alScroll: snapshot }, blocked: true });
  assert.equal(result.window.__anekaBoot.snapshot.y, 1267);
});

test('a failed enhancement releases the page and fonts instead of leaving a blank screen', () => {
  const result = boot();
  result.timers.get(1)();
  assert.ok(!result.classes.has('is-restoring') && !result.classes.has('fonts-loading') && !result.classes.has('js'));
  assert.ok(!result.classes.has('font-failed'), 'An enhancement timeout must not override a successfully loaded brand font');
  assert.equal(result.history.scrollRestoration, 'auto');
});

test('late enhancement startup recovers after the readable startup timeout', () => {
  const result = boot();
  result.timers.get(1)();
  assert.ok(!result.classes.has('js'));
  result.window.__anekaBoot.finish();
  assert.ok(result.classes.has('js'), 'Restore enhanced image, dropdown and loading styles when startup eventually succeeds');
  assert.ok(result.classes.has('reveals-ready'));
  assert.ok(!result.classes.has('is-restoring'));
  assert.equal(result.history.scrollRestoration, 'manual', 'Late completion must reclaim scroll ownership from its temporary native fallback');
});

test('corrupt coordinates never hide the page or replace its deep link', () => {
  const result = boot({ stored: { ...snapshot, y: 'not a number' } });
  assert.ok(!result.classes.has('is-restoring'));
  assert.deepEqual(result.replaced, []);
});

test('native cross-document Back uses a stack pop; Forward and new visits use a right entrance', () => {
  const { window } = boot();
  for (const [navigationType, from, to, expected] of [['traverse', 3, 1, 'back'], ['traverse', 1, 3, 'forward'], ['push', 3, 1, 'forward'], ['reload', 2, 2, 'forward'], ['traverse', -1, 0, 'forward']]) {
    window.navigation = { activation: { navigationType, from: { index: from }, entry: { index: to } } };
    const event = new Event('pagereveal');
    event.viewTransition = { types: new Set() };
    window.dispatchEvent(event);
    assert.deepEqual([...event.viewTransition.types], [expected]);
  }
});

test('direction is refreshed on BFCache returns and degrades safely without new browser APIs', () => {
  const { window } = boot();
  const reveal = () => { const event = new Event('pagereveal'); event.viewTransition = { types: new Set() }; window.dispatchEvent(event); return [...event.viewTransition.types]; };
  assert.deepEqual(reveal(), ['forward']);
  window.navigation = { activation: { navigationType: 'traverse', from: { index: 2 }, entry: { index: 1 } } };
  assert.deepEqual(reveal(), ['back']);
  window.navigation.activation = { navigationType: 'traverse', from: { index: 1 }, entry: { index: 2 } };
  assert.deepEqual(reveal(), ['forward']);
  window.dispatchEvent(Object.assign(new Event('pagereveal'), { viewTransition: {} }));
  window.dispatchEvent(new Event('pagereveal'));
});

test('history returns without a native view transition animate after scroll/font restoration', () => {
  const env = boot({ type: 'back_forward', state: { alScroll: snapshot, alEntry: 1 }, activeEntry: { position: 2 } });
  env.window.dispatchEvent(new Event('pagereveal'));
  assert.equal(env.document.documentElement.dataset.pageDirection, 'back');
  assert.equal(env.animations.length, 0, 'Restore the real view before animating it');
  env.window.__anekaBoot.finish();
  assert.equal(env.animations.length, 1);
  assert.equal(env.animations[0].frames[0].translate, '-100% 0');
  assert.equal(env.animations[0].options.duration, 850);
});

test('legacy pageshow returns use history entry positions to distinguish Back and Forward', () => {
  for (const [position, previous, direction] of [[1, 2, 'back'], [3, 2, 'forward']]) {
    const env = boot({ legacy: true, type: 'back_forward', state: { alEntry: position }, activeEntry: { position: previous } });
    env.window.__anekaBoot.finish();
    env.window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
    assert.equal(env.document.documentElement.dataset.pageDirection, direction);
    assert.equal(env.animations.length, 1);
    assert.equal(env.animations[0].frames[0].translate, direction === 'back' ? '-100% 0' : '100% 0');
    env.window.dispatchEvent(new Event('pagehide'));
    assert.ok(env.animations[0].cancelled, 'Never retain a page transform in BFCache');
  }
});

test('a rejected native transition uses the fallback, while stale rejections cannot restart it', async () => {
  const env = boot({ type: 'back_forward', state: { alEntry: 1 }, activeEntry: { position: 2 } });
  env.window.__anekaBoot.finish();
  let reject;
  const transition = { types: new Set(), ready: new Promise((resolve, fail) => { reject = fail; }) };
  env.window.dispatchEvent(Object.assign(new Event('pagereveal'), { viewTransition: transition }));
  assert.equal(env.animations.length, 0);
  reject(new Error('Browser skipped the transition')); await Promise.resolve(); await Promise.resolve();
  assert.equal(env.animations.length, 1);
  const stale = { ready: new Promise((resolve, fail) => { reject = fail; }) };
  env.window.dispatchEvent(Object.assign(new Event('pagereveal'), { viewTransition: stale }));
  env.document.dispatchEvent(new Event('aneka:before-navigation'));
  reject(new Error('Cancelled return')); await Promise.resolve(); await Promise.resolve();
  assert.equal(env.animations.length, 1);
});

test('browser swipe visuals do not receive a duplicate spatial fallback', () => {
  const env = boot({ activeEntry: { position: 2, browserTransition: true }, type: 'back_forward', state: { alEntry: 1 } });
  env.window.__anekaBoot.finish();
  env.window.dispatchEvent(new Event('pagereveal'));
  assert.equal(env.animations.length, 0);
});

test('OS motion preferences do not disable the designed history animation', () => {
  const env = boot({ reduced: true, activeEntry: { position: 2 }, type: 'back_forward', state: { alEntry: 1 } });
  env.window.__anekaBoot.finish();
  env.window.dispatchEvent(new Event('pagereveal'));
  assert.equal(env.animations.length, 1);
  assert.equal(env.animations[0].options.duration, 850);
});
test('incoming page motion releases at ready, without waiting for the transition to finish', async () => {
  const env = boot();
  let ready;
  const transition = { ready: new Promise((resolve) => { ready = resolve; }), finished: new Promise(() => {}) };
  env.window.dispatchEvent(Object.assign(new Event('pagereveal'), { viewTransition: transition }));
  let entering = false;
  const waiting = env.window.__anekaBoot.whenEntering().then(() => { entering = true; });
  await Promise.resolve(); assert.equal(entering, false);
  ready(); await waiting; assert.equal(entering, true);
  assert.ok(env.classes.has('page-enter-pending'));
  env.window.__anekaBoot.finish();
  env.window.__anekaBoot.startEntrance();
  assert.ok(!env.classes.has('page-enter-pending'));
  assert.equal(env.timers.size, 0);
});

test('a late enhancement failure cannot leave native page animations paused forever', () => {
  const env = boot();
  env.window.__anekaBoot.finish();
  assert.ok(env.classes.has('page-enter-pending'));
  env.timers.get(1)();
  assert.ok(!env.classes.has('page-enter-pending'));
});
