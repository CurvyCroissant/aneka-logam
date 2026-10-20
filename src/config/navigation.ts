import { company } from './company';
import { getContactMethods } from '../lib/contact';

export const contactMethods = getContactMethods(company.contact);
export const hasContactDetails = contactMethods.length > 0;


const address = company.address;
export const addressLines = [address.building, address.unit, address.street, `${address.district}, ${address.city}`, `${address.province} ${address.postalCode}`];
export const directionsUrl = address.mapsUrl;
