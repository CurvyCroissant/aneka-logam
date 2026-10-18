import { company } from './company';
import { getContactMethods } from '../lib/contact';
import { copy } from '../i18n/copy';
import { pagePath, type Locale } from '../i18n/routes';

export const contactMethods = getContactMethods(company.contact);
export const hasContactDetails = contactMethods.length > 0;

export function navigation(locale: Locale) {
  const t = copy(locale);
  return [
    { label: t.home, href: pagePath(locale, 'home') },
    { label: t.products, href: pagePath(locale, 'products') },
    ...(hasContactDetails ? [{ label: t.contact, href: pagePath(locale, 'contact') }] : []),
  ];
}

const address = company.address;
export const addressLines = [address.building, address.street, `${address.city}, ${address.province}`, address.country];
export const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLines.join(', '))}`;
