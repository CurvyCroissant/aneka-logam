import assert from 'node:assert/strict';
import test from 'node:test';
import { fitImage, imageContentRect } from '../src/lib/image-geometry.ts';

test('portrait, landscape, and square images fit narrow, short, and wide screens with dismissal space', () => {
  for (const [vw, vh] of [[240, 320], [320, 568], [390, 844], [768, 1024], [1440, 900], [568, 240], [2560, 1080]]) {
    for (const [width, height] of [[2048, 2048], [4000, 1000], [1000, 4000], [64, 64]]) {
      const result = fitImage(width, height, vw, vh);
      assert.ok(result.left >= 8 && result.top >= 8);
      assert.ok(result.left + result.width <= vw - 8 && result.top + result.height <= vh - 8);
      assert.ok(Math.abs(result.width / result.height - width / height) < 0.0001);
      assert.ok(result.width <= width && result.height <= height);
    }
  }
});

test('contained thumbnails animate from the visible image rather than their empty letterboxing', () => {
  const box = { left: 20, top: 100, width: 400, height: 300 };
  assert.deepEqual(imageContentRect(box, 800, 400, 'contain'), { left: 20, top: 150, width: 400, height: 200 });
  assert.deepEqual(imageContentRect(box, 400, 800, 'contain'), { left: 145, top: 100, width: 150, height: 300 });
});

test('cropped thumbnails keep their source rectangle even with native DOMRect prototype getters', () => {
  const rectangle = Object.create({ left: 30, top: 240, width: 400, height: 250 });
  assert.deepEqual(imageContentRect(rectangle, 900, 900, 'cover'), { left: 30, top: 240, width: 400, height: 250 });
});
