import type { ImageMetadata } from 'astro';
import type { Locale } from '../i18n/routes';
import type { company } from './company';
import storefront from '../assets/storefront.jpg';

export interface SitePhoto {
  src: ImageMetadata;
  alt: Record<Locale, string>;
}

type ProductKey = (typeof company.products)[number]['key'];
// Import photographs from src/assets and add { src, alt: { id, en, zh } } entries.
// Each product supports one or more photos; empty arrays use an illustrated placeholder.
export const productPhotos: Record<ProductKey, SitePhoto[]> = {
  shimPlate: [],
  spring: [],
  wire: [],
  shaft: [],
};
export const storefrontPhotos: SitePhoto[] = [{
  src: storefront,
  alt: {
    id: 'Tampak depan toko Aneka Logam di Pertokoan Glodok Metro, dengan papan nama di atas pintu toko.',
    en: 'Aneka Logam storefront at Pertokoan Glodok Metro, with the shop sign above the entrance.',
    zh: 'Aneka Logam 位于 Pertokoan Glodok Metro 的门店外观，店招位于入口上方。',
  },
}];
