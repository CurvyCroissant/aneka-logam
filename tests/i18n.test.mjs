import assert from 'node:assert/strict';
import test from 'node:test';
import { pagePaths, productPath, categoryPath, locales, localeInfo, localeFromTag, localeFromPath } from '../src/i18n/routes.ts';
import { copy } from '../src/i18n/copy.ts';
import { company } from '../src/config/company.ts';
import { getContactMethods } from '../src/lib/contact.ts';

test('default URLs remain Indonesian and English has its own static URLs', () => {
  assert.deepEqual(pagePaths('home'), { id: '/', en: '/en/', zh: '/zh/' });
  assert.deepEqual(pagePaths('products'), { id: '/products/', en: '/en/products/', zh: '/zh/products/' });
  assert.deepEqual(pagePaths('contact'), { id: '/#contact', en: '/en/#contact', zh: '/zh/#contact' });
  const spring = company.products.find(({category}) => category === 'per');
  assert.equal(productPath('id', spring), '/products/#per-demo-a');
  assert.equal(productPath('en', spring), '/en/products/#per-demo-a');
  for (const category of company.categories) {
    assert.equal(categoryPath('id', category), `/products/#${category.id}`);
    assert.equal(categoryPath('en', category), `/en/products/#${category.id}`);
    assert.equal(categoryPath('zh', category), `/zh/products/#${category.id}`);
  }
});

test('English UI copy is complete; only established shared terms remain unchanged', () => {
  const shared = new Set(['home', 'products', 'contact', 'homeTitle', 'productsTitle', 'contactLabels.whatsapp', 'contactLabels.email']);
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
  check(copy('id'), copy('zh'));
  assert.equal(localeInfo.zh.tag, 'zh-Hans');
  assert.equal(localeFromTag('zh-Hans'), 'zh');
  assert.equal(localeFromPath('/zh/products/'), 'zh');
});

test('the exact shop phrase and proper company details are language invariant', () => {
  assert.equal(company.phrase, 'Spring, Steel, Carbon Steel Strip, Shim Plate, SUS, Wire Spring');
  assert.deepEqual(company.owners.map(({ name }) => name), ['Budiyanto', 'Delinah']);
  const methods = getContactMethods(company.contact);
  assert.equal(methods.find(({kind}) => kind === 'whatsapp').href, 'https://wa.me/6281386303535');
  assert.equal(methods.find(({kind}) => kind === 'telephone').href, 'tel:+62216395874');
  assert.equal(decodeURIComponent(methods.find(({kind}) => kind === 'email').href), 'mailto:anekalogaminfo@gmail.com');
});

test('all supplied product names stay fixed and belong to a translated general category', () => {
  assert.deepEqual(company.categories.map(({ name }) => name), ['Shim Plate', 'Per', 'Kawat', 'As']);
  assert.equal(company.products.length, 12);
  assert.equal(new Set(company.products.map(({ id }) => id)).size, 12);
  assert.equal(new Set(company.products.map(({ key }) => key)).size, 12);
  for (const category of company.categories) {
    const items = company.products.filter((product) => product.category === category.id);
    assert.deepEqual(items.map(({ name }) => name), ['A', 'B', 'C'].map((suffix) => `${category.name} — Demo ${suffix}`));
    assert.ok(items.every((product) => product.demo && product.summary.en.includes('Demo item')));
    for (const product of items) for (const locale of locales) {
      assert.ok(product.summary[locale].startsWith(category.summary[locale]), 'Demo descriptions must still clarify the untranslated product name in every language');
    }
  }
  assert.equal(new Set(company.categories.map(({ id }) => id)).size, company.categories.length);
  for (const category of company.categories) {
    assert.ok(category.name);
    for (const locale of locales) assert.ok(category.summary[locale]);
    assert.notEqual(category.summary.id, category.summary.en);
    assert.ok(company.products.some((product) => product.category === category.id));
  }
  for (const product of company.products) {
    assert.equal(typeof product.name, 'string', 'Names must not be locale-dependent');
    assert.ok(company.categories.some((category) => category.id === product.category));
    for (const locale of locales) assert.ok(product.summary[locale]);
    assert.ok(product.summary.zh);
    assert.notEqual(product.summary.id, product.summary.en);
    assert.equal(product.enquiryDetails, undefined, 'The enquiry disclosure was removed');
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
