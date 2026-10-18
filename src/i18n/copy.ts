import type { Locale } from './routes';

const id = {
  home: 'Beranda',
  products: 'Produk',
  contact: 'Kontak',
  mainNavigation: 'Navigasi utama',
  languageNavigation: 'Pilih bahasa',
  skip: 'Lewati ke konten utama',
  homeTitle: 'Aneka Logam | Suku Cadang Mesin Industri',
  browse: 'Lihat produk',
  detailsHeading: 'Rincian untuk pertanyaan produk',
  rangeNote: 'Hubungi kami untuk memastikan ukuran, material, dan ketersediaan produk.',
  address: 'Alamat toko',
  directions: 'Petunjuk arah',
  people: 'Penanggung jawab',
  contactMethods: 'Hubungi kami',
  contactLabels: { whatsapp: 'WhatsApp', telephone: 'Telepon', email: 'Email' },
  contactActions: { whatsapp: 'Buka di WhatsApp', telephone: 'Salin No Telepon', email: 'Salin Email' },
  copied: 'Tersalin',
  copyFailed: 'Pilih dan salin secara manual',
  notFoundTitle: 'Halaman tidak ditemukan | Aneka Logam',
  notFound: 'Halaman tidak ditemukan',
  notFoundMessage: 'Halaman yang Anda cari tidak tersedia. Silakan kembali ke halaman utama.',
  backHome: 'Kembali ke beranda',
};

const en: typeof id = {
  home: 'Home',
  products: 'Products',
  contact: 'Contact',
  mainNavigation: 'Main navigation',
  languageNavigation: 'Choose language',
  skip: 'Skip to main content',
  homeTitle: 'Aneka Logam | Industrial Machinery Spare Parts',
  browse: 'Explore products',
  detailsHeading: 'Details for your enquiry',
  rangeNote: 'Contact us to confirm product sizes, materials, and availability.',
  address: 'Store address',
  directions: 'Get directions',
  people: 'People to contact',
  contactMethods: 'Get in touch',
  contactLabels: { whatsapp: 'WhatsApp', telephone: 'Telephone', email: 'Email' },
  contactActions: { whatsapp: 'Open in WhatsApp', telephone: 'Copy phone number', email: 'Copy email' },
  copied: 'Copied',
  copyFailed: 'Select and copy manually',
  notFoundTitle: 'Page not found | Aneka Logam',
  notFound: 'Page not found',
  notFoundMessage: 'The page you are looking for is unavailable. Please return to the homepage.',
  backHome: 'Return home',
};

export function copy(locale: Locale) {
  return locale === 'en' ? en : id;
}
