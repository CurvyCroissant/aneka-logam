// Only company facts supplied by the owner belong here.
// Empty contact values are intentionally omitted from the rendered website.
export const company = {
  name: 'Aneka Logam',
  language: 'id',
  description:
    'Aneka Logam menyediakan suku cadang mesin industri, termasuk shim plate dan pegas.',
  products: ['Shim plate', 'Pegas (spring)'],
  contact: {
    email: '',
    telephone: '', // International format, e.g. country code followed by the number.
    whatsapp: '', // Full international number, digits only; use 62 instead of leading 0.
  },
} as const;
