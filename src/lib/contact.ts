export interface ContactDetails {
  mobile?: string;
  email: string;
  telephone: string;
  whatsapp: string;
}

export interface ContactMethod {
  kind: 'whatsapp' | 'email' | 'telephone' | 'mobile';
  label: string;
  value: string;
  href: string;
}

// Invalid configured contacts fail the build instead of publishing broken links.
export function getContactMethods(details: ContactDetails): ContactMethod[] {
  const email = details.email.trim();
  const mobile = details.mobile?.trim() ?? '';
  const mobileNumber = mobile.replace(/[\s()-]/g, '');
  const telephone = details.telephone.trim();
  const phoneNumber = telephone.replace(/[\s()-]/g, '');
  const whatsapp = details.whatsapp.trim();

  if (email && !/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(email)) {
    throw new Error('Set a valid company email address in src/config/company.ts.');
  }
  if (telephone && !/^\+[1-9]\d{6,14}$/.test(phoneNumber)) {
    throw new Error('The company telephone must include + and an international country code.');
  }
  if (mobile && !/^\+[1-9]\d{6,14}$/.test(mobileNumber)) {
    throw new Error('The company mobile must include + and an international country code.');
  }
  if (whatsapp && !/^[1-9]\d{6,14}$/.test(whatsapp)) {
    throw new Error('The company WhatsApp must use international digits only, without + or a leading 0.');
  }

  return [
    ...(whatsapp ? [{
      kind: 'whatsapp' as const,
      label: 'WhatsApp',
      value: 'Chat melalui WhatsApp',
      href: `https://wa.me/${whatsapp}`,
    }] : []),
    ...(mobileNumber ? [{
      kind: 'mobile' as const,
      label: 'Seluler',
      value: mobile,
      href: `tel:${mobileNumber}`,
    }] : []),
    ...(phoneNumber ? [{
      kind: 'telephone' as const,
      label: 'Telepon',
      value: telephone,
      href: `tel:${phoneNumber}`,
    }] : []),
    ...(email ? [{
      kind: 'email' as const,
      label: 'Email',
      value: email,
      href: `mailto:${encodeURIComponent(email)}`,
    }] : []),
  ];
}
