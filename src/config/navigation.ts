import { company } from './company';
import { getContactMethods } from '../lib/contact';
import { copy } from '../i18n/copy';
import { pagePath, type Locale } from '../i18n/routes';

export const contactMethods = getContactMethods(company.contact);
export const hasContactDetails = contactMethods.length > 0;

export function navigation(locale: Locale) {
  const t = copy('en');
  return [
    { id: 'home', label: t.home, href: `${pagePath(locale, 'home')}#home` },
    { id: 'products', label: t.products, href: pagePath(locale, 'products') },
    ...(hasContactDetails ? [{ id: 'contact', label: t.contact, href: pagePath(locale, 'contact') }] : []),
  ];
}

const address = company.address;
export const addressLines = [address.building, address.unit, address.street, `${address.district}, ${address.city}`, `${address.province} ${address.postalCode}`];
export const directionsUrl = address.mapsUrl;
