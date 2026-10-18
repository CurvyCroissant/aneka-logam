# Project guidance

- This is the frontend-only Aneka Logam company profile: Astro static output, TypeScript, plain CSS, small vanilla JS enhancements, and Cloudflare Workers Static Assets. GitHub CI verifies; Cloudflare Git integration deploys.
- Use one main page per language, with native section links: Indonesian `/`, English `/en/`. Keep header navigation usable without JavaScript. Preserve the current section when switching languages where enhancement is available.
- Preserve the supplied logo, Montserrat Bold company title, and #F5AA23 branding. Self-host fonts; no external asset requests.
- Keep content concise and give each section a distinct purpose. Location details belong only in the address. The footer contains contact actions and copyright, without navigation or a repeated brand pitch.
- Keep the phrase exactly in English, once in the hero of each language: Spring, Steel, Carbon Steel Strip, Shim Plate, SUS, Wire Spring. Proper product names, people, and addresses are not automatically translated. Keep both dictionaries complete in src/i18n/copy.ts.
- Company facts and official contact values belong in src/config/company.ts. The owner confirmed WhatsApp +62 813 8630 3535, telephone +62 21 6395 874, and anekalogaminfo@gmail.com. Do not assign numbers to individual people.
- Product information describes categories, not confirmed stock, material specifications, tolerances, or certifications. Do not invent company facts.
- Responsiveness is a continuing requirement at narrow, intermediate, tablet, landscape, and wide desktop dimensions, including enlarged text. Use intrinsic grids, wrapping, fluid type, visible keyboard focus, and touch targets. Never disable zoom or conceal layout problems with overflow masking.
- Use restrained entrance/interaction motion, honor reduced-motion preferences, and leave content visible if scripts fail. Hover hints must also work with keyboard focus and touch. Copy actions must report failure honestly and permit manual copying.
- Keep dependencies and lockfile in sync. Run npm run verify after source/configuration changes. It checks behavior, generated links/metadata, performance budgets, and a Cloudflare dry run; it does not publish. Test real browser layouts when supported tooling is available and report any verification limits.
- The owner has not selected a domain. Never treat a suggested name as purchased or available. Keep indexing disabled until the agreed launch and real domain configuration.
- Do not add a backend, CMS, analytics, forms service, tracking, or external font dependency without a feature request. Keep credentials, business IDs, and .env out of commits.
- Recheck official legal sources before compliance advice. Static hosting is not automatically exempt from PSE or data-protection requirements.
