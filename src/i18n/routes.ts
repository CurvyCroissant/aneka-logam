export const locales = ['id', 'en'] as const;
export type Locale = (typeof locales)[number];
export type LocalizedPaths = Record<Locale, string>;
export const sections = ['home', 'products', 'contact'] as const;
export type Page = (typeof sections)[number];

export function pagePath(locale: Locale, page: Page): string {
  const root = locale === 'en' ? '/en/' : '/';
  return page === 'home' ? root : `${root}#${page}`;
}

export function pagePaths(page: Page): LocalizedPaths {
  return { id: pagePath('id', page), en: pagePath('en', page) };
}

export function productPath(locale: Locale, product: { id: string }): string {
  return `${pagePath(locale, 'home')}#${product.id}`;
}
