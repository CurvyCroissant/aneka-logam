import type { ImageMetadata } from 'astro';
import type { Locale } from '../i18n/routes';
import type { company } from './company';

export interface SitePhoto {
  src: ImageMetadata;
  alt: Record<Locale, string>;
}

type ProductKey = (typeof company.products)[number]['key'];
// Import photographs from src/assets and add { src, alt: { id, en } } entries.
// Each product supports one or more photos; empty arrays use an illustrated placeholder.
export const productPhotos: Record<ProductKey, SitePhoto[]> = {
  shimPlate: [],
  steel: [],
  carbonSteelStrip: [],
  sus: [],
  spring: [],
  wireSpring: [],
};
export const storefrontPhotos: SitePhoto[] = [];
