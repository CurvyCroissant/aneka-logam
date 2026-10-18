import assert from 'node:assert/strict';
import test from 'node:test';
import { readScrollSnapshot, saveScrollSnapshot, shouldRestoreScroll, clampScroll } from '../src/lib/scroll-memory.ts';

const snapshot = { version: 1, url: '/#products', x: 0, y: 1234, details: ['details-spring'], galleries: { 'product-spring-track': 2 } };

test('refresh restores the last pixel position even when the URL retains a section hash', () => {
  assert.equal(shouldRestoreScroll(snapshot, '/#products', 'reload'), true);
  assert.equal(shouldRestoreScroll(snapshot, '/#products', 'back_forward'), true);
  assert.equal(shouldRestoreScroll(snapshot, '/#products', 'navigate'), false);
  assert.equal(shouldRestoreScroll(snapshot, '/#contact', 'reload'), false);
  assert.equal(shouldRestoreScroll(snapshot, '/en/#products', 'reload'), false);
});

test('stored state preserves expanded content and the selected gallery image', () => {
  const data = new Map();
  const storage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  assert.equal(saveScrollSnapshot(storage, 'page', snapshot), true);
  assert.deepEqual(readScrollSnapshot(storage, 'page'), snapshot);
});

test('blocked, missing, or corrupt storage falls back without breaking navigation', () => {
  const blocked = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('QuotaExceededError'); } };
  assert.equal(readScrollSnapshot(blocked, 'page'), undefined);
  assert.equal(saveScrollSnapshot(blocked, 'page', snapshot), false);
  assert.equal(readScrollSnapshot(undefined, 'page'), undefined);
  for (const value of ['invalid JSON', 'null', JSON.stringify({ ...snapshot, y: -1 }), JSON.stringify({ ...snapshot, details: [23] }), JSON.stringify({ ...snapshot, galleries: { photo: -1 } })]) {
    assert.equal(readScrollSnapshot({ getItem: () => value }, 'page'), undefined);
  }
});

test('restoration clamps to the available page after a viewport change', () => {
  assert.equal(clampScroll(1234, 800), 800);
  assert.equal(clampScroll(400, 800), 400);
  assert.equal(clampScroll(20, -10), 0);
});
