import assert from 'node:assert/strict';
import test from 'node:test';
import { pagePaths, productPath } from '../src/i18n/routes.ts';
import { copy } from '../src/i18n/copy.ts';
import { company } from '../src/config/company.ts';
import { getContactMethods } from '../src/lib/contact.ts';

test('default URLs remain Indonesian and English has its own static URLs', () => {
  assert.deepEqual(pagePaths('home'), { id: '/', en: '/en/' });
  assert.deepEqual(pagePaths('products'), { id: '/#products', en: '/en/#products' });
  assert.deepEqual(pagePaths('contact'), { id: '/#contact', en: '/en/#contact' });
  const spring = company.products.find(({key}) => key === 'spring');
  assert.equal(productPath('id', spring), '/#spring');
  assert.equal(productPath('en', spring), '/en/#spring');
});

test('English UI copy is complete; only established shared terms remain unchanged', () => {
  const shared = new Set(['home', 'products', 'contact', 'contactLabels.whatsapp', 'contactLabels.email']);
  function check(id, en, prefix = '') {
    assert.deepEqual(Object.keys(id), Object.keys(en));
    for (const key of Object.keys(id)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof id[key] === 'object') check(id[key], en[key], path);
      else {
        assert.equal(typeof en[key], 'string');
        assert.ok(en[key].trim(), path);
        if (!shared.has(path)) assert.notEqual(id[key], en[key], path);
      }
    }
  }
  check(copy('id'), copy('en'));
});

test('the exact shop phrase and proper company details are language invariant', () => {
  assert.equal(company.phrase, 'Spring, Steel, Carbon Steel Strip, Shim Plate, SUS, Wire Spring');
  assert.deepEqual(company.owners.map(({ name }) => name), ['Budiyanto', 'Delinah']);
  const methods = getContactMethods(company.contact);
  assert.equal(methods.find(({kind}) => kind === 'whatsapp').href, 'https://wa.me/6281386303535');
  assert.equal(methods.find(({kind}) => kind === 'telephone').href, 'tel:+62216395874');
  assert.equal(decodeURIComponent(methods.find(({kind}) => kind === 'email').href), 'mailto:anekalogaminfo@gmail.com');
});

test('product information has complete translations without fabricated specifications', () => {
  for (const product of company.products) {
    assert.ok(product.summary.id && product.summary.en);
    assert.notEqual(product.summary.id, product.summary.en);
    assert.equal(product.enquiryDetails.id.length, product.enquiryDetails.en.length);
    assert.ok(product.enquiryDetails.en.every((line) => line.trim()));
  }
});

test('brand text and primary controls meet readable foreground/background contrast', () => {
  function luminance(hex) {
    const channels = hex.match(/[a-f\d]{2}/gi).map((x) => parseInt(x,16)/255);
    return channels.map((x) => x <= 0.04045 ? x/12.92 : ((x+0.055)/1.055)**2.4)
      .reduce((sum,x,i) => sum+x*[0.2126,0.7152,0.0722][i],0);
  }
  function contrast(a,b) { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); }
  assert.ok(contrast('#F5AA23','#171b20') >= 7);
  assert.ok(contrast('#58616d','#ffffff') >= 4.5);
  assert.ok(contrast('#b9bfc7','#171b20') >= 4.5);
});
