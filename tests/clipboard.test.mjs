import assert from 'node:assert/strict';
import test from 'node:test';
import { copyText } from '../src/lib/clipboard.ts';

test('copy preserves the complete displayed number or email', async () => {
  const values = [];
  const clipboard = { writeText: async (value) => { values.push(value); } };
  for (const value of ['+62 21 6395 874', 'anekalogaminfo@gmail.com']) {
    assert.equal(await copyText(value, clipboard), true);
  }
  assert.deepEqual(values, ['+62 21 6395 874', 'anekalogaminfo@gmail.com']);
});

test('missing or denied clipboard access never reports a successful copy', async () => {
  assert.equal(await copyText('test'), false);
  assert.equal(await copyText('test', { writeText: async () => { throw new Error('NotAllowedError'); } }), false);
  assert.equal(await copyText('', { writeText: async () => { assert.fail('Do not copy empty values'); } }), false);
});
