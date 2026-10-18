export const locales = ['id', 'en'] as const;
export type Locale = (typeof locales)[number];
export type LocalizedPaths = Record<Locale, string>;
export type Page = 'home' | 'products' | 'contact';

const routes = {
  id: { home: '/', products: '/produk/', contact: '/kontak/' },
  en: { home: '/en/', products: '/en/products/', contact: '/en/contact/' },
} satisfies Record<Locale, Record<Page, string>>;

export function pagePath(locale: Locale, page: Page): string {
  return routes[locale][page];
}

export function pagePaths(page: Page): LocalizedPaths {
  return { id: pagePath('id', page), en: pagePath('en', page) };
}

export function productPath(locale: Locale, product: { slugs: Record<Locale, string> }): string {
  return `${pagePath(locale, 'products')}${product.slugs[locale]}/`;
}

export function productPaths(product: { slugs: Record<Locale, string> }): LocalizedPaths {
  return { id: productPath('id', product), en: productPath('en', product) };
}
