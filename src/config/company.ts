// Only company facts supplied by the owner belong here.
// Empty contact values are intentionally omitted from the rendered website.
export const company = {
  name: 'Aneka Logam',
  language: 'id',
  description:
    'Aneka Logam menyediakan suku cadang mesin industri, termasuk shim plate dan pegas.',
  // Category descriptions explain the product type, not unconfirmed stock/specs.
  products: [
    {
      slug: 'shim-plate',
      name: 'Shim plate',
      summary: 'Pelat tipis untuk penyesuaian celah atau posisi antar komponen mesin.',
      enquiryDetails: [
        'Ketebalan, panjang, dan lebar yang dibutuhkan.',
        'Material atau nomor referensi, jika diketahui.',
        'Jumlah kebutuhan serta foto atau gambar komponen, jika ada.',
      ],
    },
    {
      slug: 'pegas',
      name: 'Pegas (spring)',
      summary: 'Komponen pegas untuk kebutuhan mekanis pada mesin industri.',
      enquiryDetails: [
        'Jenis, bentuk, dan ukuran pegas yang dibutuhkan.',
        'Nomor referensi atau foto komponen yang digunakan, jika ada.',
        'Jumlah kebutuhan dan informasi mesin atau penggunaannya.',
      ],
    },
  ],
  contact: {
    email: '',
    telephone: '', // Full international format with + and country code; spaces are allowed.
    whatsapp: '', // Full international number, digits only; use 62 instead of leading 0.
  },
} as const;
