import assert from 'node:assert/strict';
import test from 'node:test';
import { getContactMethods } from '../src/lib/contact.ts';

const empty = { email: '', telephone: '', whatsapp: '' };

test('unconfigured contacts do not produce placeholder links', () => {
  assert.deepEqual(getContactMethods(empty), []);
  assert.deepEqual(getContactMethods({ email: ' ', telephone: '\t', whatsapp: ' ' }), []);
});

test('formatted international numbers remain readable and link to the correct applications', () => {
  const methods = getContactMethods({ ...empty, telephone: ' +1 (202) 555-0123 ', whatsapp: ' +62 813 8630 3535 ' });
  assert.equal(methods.find(({ kind }) => kind === 'telephone').href, 'tel:+12025550123');
  assert.equal(methods.find(({ kind }) => kind === 'telephone').value, '+1 (202) 555-0123');
  assert.equal(methods.find(({ kind }) => kind === 'whatsapp').href, 'https://wa.me/6281386303535');
  assert.equal(methods.find(({ kind }) => kind === 'whatsapp').value, '+62 813 8630 3535');
});

test('email addresses preserve plus-addressed recipients', () => {
  const [method] = getContactMethods({ ...empty, email: ' parts+enquiry@example.invalid ' });
  assert.equal(decodeURIComponent(method.href.slice('mailto:'.length)), 'parts+enquiry@example.invalid');
  assert.equal(method.value, 'parts+enquiry@example.invalid');
});

test('invalid configured international phone numbers fail the build', () => {
  for (const number of ['08123456789', '---', '+62abc1234567', '+123', '+0123456789']) {
    assert.throws(() => getContactMethods({ ...empty, telephone: number }), /telephone/);
    assert.throws(() => getContactMethods({ ...empty, whatsapp: number }), /WhatsApp/);
  }
});

test('email input cannot inject queries, fragments, or mail headers', () => {
  for (const email of ['not-an-email', 'parts@example.invalid?bcc=other', 'parts@example.invalid#x', 'parts@example.invalid\r\nBcc: other']) {
    assert.throws(() => getContactMethods({ ...empty, email }), /email/);
  }
});
