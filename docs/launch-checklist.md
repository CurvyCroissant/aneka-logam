# Launch checklist

This project is a technical foundation, not a determination that the company has satisfied every legal requirement. Official guidance was reviewed on 18 October 2026. The company owner should confirm how it applies to the actual website and business.

## Company and content

- [ ] Confirm the full business identity, official contacts, address if published, and approved product descriptions.
- [ ] Approve the design and verify permission for photographs, logos, trademarks, and claims.
- [ ] Keep NIB documents, personal IDs, and account recovery information outside the repository.

## Indonesian requirements to resolve

- [ ] Confirm the company's existing business registration and relevant trading permissions with its administrator; website accounts do not replace business licensing.
- [ ] Resolve PSE Lingkup Privat applicability with Komdigi/OSS. The official criteria include websites offering goods/services, even though a particular site may have no checkout. Treat the industrial-parts catalogue and enquiry function as relevant to that assessment; do not assume static hosting is an exemption.
- [ ] If required, complete registration through OSS under the company and its NIB. Komdigi states that the PSE registration process is free.
- [ ] Before handling personal data, review purposes, legal basis, notices, security, retention, service providers, and any overseas transfers. Absence of a form does not mean hosting providers process no request information.
- [ ] Confirm the actual documents requested by the registrar for a `.co.id` domain. PANDI's reviewed policy lists business documentation and valid identification; individual registrar procedures may differ.

Official references:

- PSE criteria: https://pse.komdigi.go.id/panduan/kriteria-pendaftaran-pse-lingkup-privat
- PSE process, prerequisites, and fees: https://pse.komdigi.go.id/pertanyaan-umum
- PP 71/2019, including Article 21 on private electronic systems and overseas hosting: https://jdih.komdigi.go.id/produk_hukum/view/id/695/t/peraturan%2Bpemerintah%2Bnomor%2B71%2Btahun%2B2019
- Personal Data Protection Law 27/2022: https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022
- PANDI registration policy, version 10.0: https://pandi.id/public/files/2025/8/kebijakan-pendaftaran-nama-domain-versi-10-0-bilingual-new-1756441612.pdf
- Trademark search: https://dgip.go.id/

## Accounts, domain, and hosting

- [ ] Company controls GitHub, the domain registration, and Cloudflare; developers have appropriate collaborator access.
- [ ] Enable two-factor authentication and retain recovery details separately.
- [ ] Verify the domain's availability and naming rights, register it, and enable auto-renewal with a valid payment method.
- [ ] Set the actual `SITE_URL` in Cloudflare's build environment.
- [ ] Preserve any existing MX, SPF, DKIM, DMARC, and verification DNS records when moving DNS.
- [ ] Confirm HTTPS and redirect the secondary `www`/non-`www` hostname to the chosen primary hostname.

## Release verification

- [ ] Run `npm ci` and `npm run verify`.
- [ ] Check the actual mobile/desktop layouts, keyboard navigation, readable contrast, and every contact link.
- [ ] Check direct page URLs and a real missing-page request on the host.
- [ ] Check HTTPS, security headers, redirects, canonical URLs, and the optional sitemap.
- [ ] Keep `SITE_INDEXABLE=false` until launch approval, then change it to `true` and rebuild.
- [ ] Submit the sitemap to Google Search Console after launch if search visibility is wanted.
- [ ] Record who handles contact updates, dependency updates, domain renewal, and access changes.
