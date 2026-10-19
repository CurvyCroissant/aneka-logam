import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const code = readFileSync(new URL('../src/scripts/boot.js', import.meta.url), 'utf8');
const snapshot = { version: 1, url: '/#contact', x: 0, y: 1267, details: ['details-spring'], galleries: {} };

function boot({ type = 'reload', stored = snapshot, state, blocked = false, hash = '#contact' } = {}) {
  const classes = new Set(), replaced = [], timers = new Map();
  const document = { documentElement: { classList: { add: (...names) => names.forEach((n) => classes.add(n)), remove: (...names) => names.forEach((n) => classes.delete(n)) } } };
  const history = { scrollRestoration: 'auto', state, replaceState: (s, unused, url) => { replaced.push(url); history.state = s; } };
  const window = {};
  vm.runInNewContext(code, { document, history, window, location: { pathname: '/', search: '', hash }, performance: { getEntriesByType: () => [{ type }] }, sessionStorage: { getItem: () => { if (blocked) throw new Error('Blocked'); return JSON.stringify(stored); } }, setTimeout: (fn) => { timers.set(1, fn); return 1; }, clearTimeout: (id) => timers.delete(id) });
  return { classes, replaced, history, window, timers };
}

test('saved reload removes the stale contact hash before parsing and takes one scroll owner', () => {
  const result = boot();
  assert.deepEqual(result.replaced, ['/']);
  assert.equal(result.history.scrollRestoration, 'manual');
  assert.ok(result.classes.has('is-restoring'));
  assert.equal(result.window.__anekaBoot.snapshot.y, 1267);
  result.window.__anekaBoot.finish();
  assert.equal(result.history.scrollRestoration, 'manual', 'Do not hand control back to native restoration');
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
  assert.ok(result.classes.has('font-failed'));
  assert.equal(result.history.scrollRestoration, 'auto');
});

test('corrupt coordinates never hide the page or replace its deep link', () => {
  const result = boot({ stored: { ...snapshot, y: 'not a number' } });
  assert.ok(!result.classes.has('is-restoring'));
  assert.deepEqual(result.replaced, []);
});
