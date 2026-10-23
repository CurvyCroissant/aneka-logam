import type { ImageMetadata } from 'astro';
import type { Locale } from '../i18n/routes';
import { company } from './company';
import logo from '../assets/logo-no-bg.png';
import storefront from '../assets/storefront.jpg';

export interface SitePhoto {
  src: ImageMetadata;
  alt: Record<Locale, string>;
}

type ProductKey = (typeof company.products)[number]['key'];
// Import photographs from src/assets and add { src, alt: { id, en, zh } } entries.
// Each product supports one or more photos; empty arrays use an illustrated placeholder.
// All twelve preview items reuse the supplied logo; generated image variants are cached.
export const productPhotos = Object.fromEntries(company.products.map((product) => [product.key, [{
  src: logo,
  alt: {
    id: `Gambar sementara ${product.name}: logo Aneka Logam.`,
    en: `Temporary image for ${product.name}: Aneka Logam logo.`,
    zh: `${product.name} 的临时图片：Aneka Logam 品牌标志。`,
  },
}]])) as Record<ProductKey, SitePhoto[]>;
export const storefrontPhotos: SitePhoto[] = [{
  src: storefront,
  alt: {
    id: 'Tampak depan toko Aneka Logam di Pertokoan Glodok Metro, dengan papan nama di atas pintu toko.',
    en: 'Aneka Logam storefront at Pertokoan Glodok Metro, with the shop sign above the entrance.',
    zh: 'Aneka Logam 位于 Pertokoan Glodok Metro 的门店外观，店招位于入口上方。',
  },
}];
