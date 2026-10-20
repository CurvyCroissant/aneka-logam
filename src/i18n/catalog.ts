import { copy } from './copy.ts';
import { company } from '../config/company.ts';
import type { Locale } from './routes';

export function catalog(locale: Locale): Record<string, string> {
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
  return result;
}
