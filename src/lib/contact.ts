export interface ContactDetails {
  email: string;
  telephone: string;
  whatsapp: string;
}

export interface ContactMethod {
  kind: 'whatsapp' | 'email' | 'telephone';
  value: string;
  href: string;
}

// Invalid configured contacts fail the build instead of publishing broken links.
export function getContactMethods(details: ContactDetails): ContactMethod[] {
  const email = details.email.trim();
  const telephone = details.telephone.trim();
  const phoneNumber = telephone.replace(/[\s()-]/g, '');
  const whatsapp = details.whatsapp.trim();
  const whatsappNumber = whatsapp.replace(/[\s()-]/g, '');

  if (email && !/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email)) {
    throw new Error('Set a valid company email address in src/config/company.ts.');
  }
  if (telephone && !/^\+[1-9]\d{6,14}$/.test(phoneNumber)) {
    throw new Error('The company telephone must include + and an international country code.');
  }
  if (whatsapp && !/^\+[1-9]\d{6,14}$/.test(whatsappNumber)) {
    throw new Error('The company WhatsApp must include + and an international country code.');
  }

  return [
    ...(whatsapp ? [{
      kind: 'whatsapp' as const,
      value: whatsapp,
      href: `https://wa.me/${whatsappNumber.slice(1)}`,
    }] : []),
    ...(phoneNumber ? [{
      kind: 'telephone' as const,
      value: telephone,
      href: `tel:${phoneNumber}`,
    }] : []),
    ...(email ? [{
      kind: 'email' as const,
      value: email,
      href: `mailto:${encodeURIComponent(email)}`,
    }] : []),
  ];
}
