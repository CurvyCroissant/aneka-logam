import { company } from './company';
import { getContactMethods } from '../lib/contact';

export const contactMethods = getContactMethods(company.contact);
export const hasContactDetails = contactMethods.length > 0;

export const navigation = [
  { label: 'Beranda', href: '/' },
  { label: 'Produk', href: '/produk/' },
  ...(hasContactDetails ? [{ label: 'Kontak', href: '/kontak/' }] : []),
];
