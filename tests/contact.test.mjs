import assert from 'node:assert/strict';
import test from 'node:test';
import { getContactMethods } from '../src/lib/contact.ts';

const empty = { email: '', telephone: '', whatsapp: '' };

test('unconfigured contacts do not produce placeholder links', () => {
  assert.deepEqual(getContactMethods(empty), []);
  assert.deepEqual(getContactMethods({ email: ' ', telephone: '\t', whatsapp: ' ' }), []);
});

test('formatted international telephone numbers remain readable but dial correctly', () => {
  const [method] = getContactMethods({ ...empty, telephone: ' +1 (202) 555-0123 ' });
  assert.equal(method.href, 'tel:+12025550123');
  assert.equal(method.value, '+1 (202) 555-0123');
});

test('WhatsApp uses the full country code and omits unconfigured methods', () => {
  const methods = getContactMethods({ ...empty, whatsapp: ' 628001234567 ' });
  assert.equal(methods.length, 1);
  assert.equal(methods[0].href, 'https://wa.me/628001234567');
});

test('email addresses are encoded without losing a plus-addressed recipient', () => {
  const [method] = getContactMethods({ ...empty, email: ' parts+enquiry@example.invalid ' });
  assert.equal(decodeURIComponent(method.href.slice('mailto:'.length)), 'parts+enquiry@example.invalid');
  assert.equal(method.value, 'parts+enquiry@example.invalid');
});

test('invalid configured phone numbers fail instead of publishing unusable links', () => {
  for (const telephone of ['08123456789', '---', '+62abc1234567', '+123', '+0123456789']) {
    assert.throws(() => getContactMethods({ ...empty, telephone }), /telephone/);
  }
  for (const whatsapp of ['08123456789', '+628001234567', '62 8001234567', 'https://example.invalid']) {
    assert.throws(() => getContactMethods({ ...empty, whatsapp }), /WhatsApp/);
  }
});

test('email input cannot accidentally add a query, fragment, or mail header', () => {
  for (const email of ['not-an-email', 'parts@example.invalid?bcc=other', 'parts@example.invalid#x', 'parts@example.invalid\r\nBcc: other']) {
    assert.throws(() => getContactMethods({ ...empty, email }), /email/);
  }
});
