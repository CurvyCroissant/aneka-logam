import { copy } from './copy.ts';
import { company } from '../config/company.ts';
import type { Locale } from './routes';

const catalogs = new Map<Locale, Readonly<Record<string, string>>>();

export function catalog(locale: Locale): Readonly<Record<string, string>> {
  const cached = catalogs.get(locale);
  if (cached) return cached;
  const result: Record<string, string> = {};
  function flatten(object: object, prefix = '') {
    for (const [key, value] of Object.entries(object)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'string') result[path] = value;
      else if (value && typeof value === 'object') flatten(value, path);
    }
  }
  flatten(copy(locale));
  result['description'] = company.description[locale];
  for (const category of company.categories) result[`category.${category.key}.summary`] = category.summary[locale];
  for (const product of company.products) {
    result[`product.${product.key}.summary`] = product.summary[locale];
  }
  const values = Object.freeze(result);
  catalogs.set(locale, values);
  return values;
}
