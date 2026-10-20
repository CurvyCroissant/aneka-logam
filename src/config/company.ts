// Company facts supplied by the owner. Brand names and the phrase are not translated.
export const company = {
  name: 'Aneka Logam',
  displayName: 'ANEKA LOGAM',
  phrase: 'Spring, Steel, Carbon Steel Strip, Shim Plate, SUS, Wire Spring',
  description: {
    id: 'Aneka Logam menyediakan suku cadang mesin industri, termasuk Shim Plate dan Spring.',
    en: 'Aneka Logam supplies industrial machinery spare parts, including shim plates and springs.',
  },
  categories: [
    {
      key: 'plates', id: 'plates-strips', name: 'Plat & Strip', imageKind: 'shimPlate',
      summary: {
        id: 'Pelat dan strip logam untuk kebutuhan komponen mesin.',
        en: 'Metal plates and strips for machine components.',
      },
    },
    {
      key: 'springs', id: 'springs', name: 'Spring / Pegas', imageKind: 'spring',
      summary: {
        id: 'Pegas dan pegas kawat untuk kebutuhan mekanis mesin.',
        en: 'Springs and wire springs for mechanical machine applications.',
      },
    },
  ],
  // Only product types supplied in the owner's phrase; sizes and stock are unconfirmed.
  // Display names stay fixed. Descriptions provide the direct language clarification.
  products: [
    { key: 'shimPlate', id: 'shim-plate', category: 'plates-strips', name: 'Shim Plate', summary: { id: 'Pelat shim untuk penyesuaian.', en: 'Shim plate for adjustment.' } },
    { key: 'steel', id: 'steel', category: 'plates-strips', name: 'Steel', summary: { id: 'Baja.', en: 'Steel.' } },
    { key: 'carbonSteelStrip', id: 'carbon-steel-strip', category: 'plates-strips', name: 'Carbon Steel Strip', summary: { id: 'Strip baja karbon.', en: 'Carbon steel strip.' } },
    { key: 'sus', id: 'sus', category: 'plates-strips', name: 'SUS', summary: { id: 'Baja tahan karat (SUS).', en: 'Stainless steel (SUS).' } },
    { key: 'spring', id: 'spring', category: 'springs', name: 'Spring', summary: { id: 'Pegas.', en: 'Spring.' } },
    { key: 'wireSpring', id: 'wire-spring', category: 'springs', name: 'Wire Spring', summary: { id: 'Pegas kawat.', en: 'Wire spring.' } },
  ],
  contact: {
    whatsapp: '+62 813 8630 3535',
    telephone: '+62 21 6395 874',
    email: 'anekalogaminfo@gmail.com',
  },
  address: {
    mapsUrl: 'https://maps.app.goo.gl/E5ESBkS3XxmUQYEx9',
    building: 'Pertokoan Glodok Metro',
    unit: 'Lantai Dasar No. 71',
    street: 'Jl. Blustru, RT.01/RW.06',
    district: 'Kec. Taman Sari',
    city: 'Kota Jakarta Barat',
    province: 'DKI Jakarta',
    postalCode: '11180',
    country: 'Indonesia',
  },
  owners: [{ name: 'Budiyanto', icon: 'male' }, { name: 'Delinah', icon: 'female' }],
} as const;
