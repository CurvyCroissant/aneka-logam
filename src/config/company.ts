// Company facts supplied by the owner. Brand names and the phrase are not translated.
export const company = {
  name: 'Aneka Logam',
  displayName: 'ANEKA LOGAM',
  phrase: 'Spring, Steel, Carbon Steel Strip, Shim Plate, SUS, Wire Spring',
  description: {
    id: 'Aneka Logam menyediakan suku cadang mesin industri, termasuk Shim Plate dan Spring.',
    en: 'Aneka Logam supplies industrial machinery spare parts, including shim plates and springs.',
    zh: 'Aneka Logam 提供工业机械备件，包括调整垫片和弹簧。',
  },
  categories: [
    { key: 'shimPlate', id: 'shim-plate', name: 'Shim Plate', imageKind: 'shimPlate', summary: { id: 'Pelat shim untuk penyesuaian komponen mesin.', en: 'Shim plates for adjusting machine components.', zh: '用于调整机械零部件的调整垫片。' } },
    { key: 'spring', id: 'per', name: 'Per', imageKind: 'spring', summary: { id: 'Pegas untuk kebutuhan mekanis mesin.', en: 'Springs for mechanical machine applications.', zh: '用于机械应用的弹簧。' } },
    { key: 'wire', id: 'kawat', name: 'Kawat', imageKind: 'wire', summary: { id: 'Kawat untuk kebutuhan komponen mesin.', en: 'Wire for machine components.', zh: '用于机械零部件的金属丝。' } },
    { key: 'shaft', id: 'as', name: 'As', imageKind: 'shaft', summary: { id: 'As atau poros untuk komponen mesin.', en: 'Shafts for machine components.', zh: '用于机械零部件的轴。' } },
  ],
  // Confirmed product types only; add variants when the owner supplies their details.
  // Display names stay fixed; descriptions supply the direct translations.
  products: [
    { key: 'shimPlate', id: 'shim-plate', category: 'shim-plate', name: 'Shim Plate', summary: { id: 'Pelat shim.', en: 'Shim plate.', zh: '调整垫片。' } },
    { key: 'spring', id: 'per', category: 'per', name: 'Per', summary: { id: 'Pegas.', en: 'Spring.', zh: '弹簧。' } },
    { key: 'wire', id: 'kawat', category: 'kawat', name: 'Kawat', summary: { id: 'Kawat.', en: 'Wire.', zh: '金属丝。' } },
    { key: 'shaft', id: 'as', category: 'as', name: 'As', summary: { id: 'As / poros.', en: 'Shaft.', zh: '轴。' } },
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
