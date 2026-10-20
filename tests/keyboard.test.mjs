import assert from 'node:assert/strict';
import test from 'node:test';
import { setupKeyboard } from '../src/scripts/keyboard.ts';

function environment(t) {
  class Control {
    constructor(kind) { this.kind = kind; this.clicks = 0; }
    closest(selector) {
      if (selector.startsWith('input')) return this.kind === 'input' ? this : null;
      if (selector.startsWith('button')) return ['button', 'summary'].includes(this.kind) ? this : null;
      return selector === 'a[href]' && this.kind === 'link' ? this : null;
    }
    getAttribute() { return null; }
    click() { this.clicks++; }
  }
  const listeners = new Map();
  const listen = (name, fn) => listeners.set(name, fn);
  const document = { activeElement: null, addEventListener: listen };
  for (const [name, value] of Object.entries({ Element: Control, document, window: { addEventListener: listen } })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => { if (previous) Object.defineProperty(globalThis, name, previous); else delete globalThis[name]; });
  }
  setupKeyboard();
  const press = (name, target, properties = {}) => {
    const event = { key: ' ', target, repeat: false, preventDefault() { this.prevented = true; }, ...properties };
    listeners.get(name)(event); return event;
  };
  return { Control, document, press, listeners };
}

test('Space activates a focused link once on release, including when the key is held', (t) => {
  const { Control, document, press } = environment(t);
  const link = new Control('link'); document.activeElement = link;
  assert.equal(press('keydown', link).prevented, true);
  press('keydown', link, { repeat: true }); press('keydown', link, { repeat: true });
  assert.equal(link.clicks, 0);
  press('keyup', link);
  assert.equal(link.clicks, 1);
  press('keyup', link);
  assert.equal(link.clicks, 1);
});

test('background Space scrolling is blocked; native buttons, disclosures, text entry and Enter retain their behavior', (t) => {
  const { Control, press } = environment(t);
  assert.equal(press('keydown', new Control('background')).prevented, true);
  assert.equal(press('keydown', new Control('background'), { shiftKey: true }).prevented, true);
  for (const kind of ['button', 'summary', 'input']) assert.equal(press('keydown', new Control(kind)).prevented, undefined);
  assert.equal(press('keydown', new Control('link'), { key: 'Enter' }).prevented, undefined);
});

test('changing focus or leaving the page cancels an armed Space activation', (t) => {
  const { Control, document, press, listeners } = environment(t);
  const first = new Control('link'), second = new Control('link');
  document.activeElement = first; press('keydown', first);
  document.activeElement = second; press('keyup', second);
  assert.equal(first.clicks + second.clicks, 0);
  document.activeElement = first; press('keydown', first); listeners.get('blur')(); press('keyup', first);
  assert.equal(first.clicks, 0);
});
