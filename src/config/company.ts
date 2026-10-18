// Company facts supplied by the owner. Brand names and the phrase are not translated.
export const company = {
  name: 'Aneka Logam',
  displayName: 'ANEKA LOGAM',
  phrase: 'Spring, Steel, Carbon Steel Strip, Shim Plate, SUS, Wire Spring',
  description: {
    id: 'Aneka Logam menyediakan suku cadang mesin industri, termasuk Shim Plate dan Spring.',
    en: 'Aneka Logam supplies industrial machinery spare parts, including shim plates and springs.',
  },
  products: [
    {
      key: 'shimPlate',
      id: 'shim-plate',
      name: 'Shim Plate',
      summary: {
        id: 'Pelat tipis untuk penyesuaian celah atau posisi antar komponen mesin.',
        en: 'Thin plates used to adjust gaps or the position of machine components.',
      },
      enquiryDetails: {
        id: [
          'Ketebalan, panjang, dan lebar yang dibutuhkan.',
          'Material atau nomor referensi, jika diketahui.',
          'Jumlah kebutuhan serta foto atau gambar komponen, jika ada.',
        ],
        en: [
          'Required thickness, length, and width.',
          'Material or reference number, if known.',
          'Required quantity and a component photo or drawing, if available.',
        ],
      },
    },
    {
      key: 'spring',
      id: 'spring',
      name: 'Spring',
      summary: {
        id: 'Komponen pegas untuk kebutuhan mekanis pada mesin industri.',
        en: 'Spring components for mechanical applications in industrial machinery.',
      },
      enquiryDetails: {
        id: [
          'Jenis, bentuk, dan ukuran pegas yang dibutuhkan.',
          'Nomor referensi atau foto komponen yang digunakan, jika ada.',
          'Jumlah kebutuhan dan informasi mesin atau penggunaannya.',
        ],
        en: [
          'Required spring type, shape, and dimensions.',
          'Reference number or a photo of the existing component, if available.',
          'Required quantity and details of the machine or application.',
        ],
      },
    },
  ],
  contact: {
    whatsapp: '+62 813 8630 3535',
    telephone: '+62 21 6395 874',
    email: 'anekalogaminfo@gmail.com',
  },
  address: {
    building: 'Gedung Metro Glodok No. 35',
    street: 'Jl. Blustru / Hayam Wuruk',
    city: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    country: 'Indonesia',
  },
  people: ['Budiyanto', 'Delinah'],
} as const;
