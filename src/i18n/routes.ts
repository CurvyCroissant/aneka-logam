export const locales = ['id', 'en', 'zh'] as const;
export type Locale = (typeof locales)[number];
export type LocalizedPaths = Record<Locale, string>;
export const sections = ['home', 'products', 'contact'] as const;
export type Page = (typeof sections)[number];
export type MainPage = Exclude<Page, 'contact'>;

export function pagePath(locale: Locale, page: Page): string {
  const root = locale === 'id' ? '/' : `/${locale}/`;
  return page === 'home' ? root : page === 'products' ? `${root}products/` : `${root}#contact`;
}

export function pagePaths(page: Page): LocalizedPaths {
  return Object.fromEntries(locales.map((locale) => [locale, pagePath(locale, page)])) as LocalizedPaths;
}

export function productPath(locale: Locale, product: { id: string }): string {
  return `${pagePath(locale, 'products')}#${product.id}`;
}

export function categoryPath(locale: Locale, category: { id: string }): string {
  return category.id === 'all' ? pagePath(locale, 'products') : `${pagePath(locale, 'products')}#${category.id}`;
}

export const localeInfo = {
  id: { tag: 'id', name: 'Bahasa Indonesia', og: 'id_ID' },
  en: { tag: 'en', name: 'English', og: 'en_US' },
  zh: { tag: 'zh-Hans', name: '中文（简体）', og: 'zh_CN' },
} as const;

export function localeFromTag(tag: string | null | undefined): Locale {
  return tag?.toLowerCase().startsWith('zh') ? 'zh' : tag?.toLowerCase().startsWith('en') ? 'en' : 'id';
}

export function localeFromPath(path: string): Locale {
  return /^\/zh(?:\/|$)/.test(path) ? 'zh' : /^\/en(?:\/|$)/.test(path) ? 'en' : 'id';
}
