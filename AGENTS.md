# Project guidance

- This repository is the frontend-only Aneka Logam company profile website.
- Keep Astro static output, plain CSS, and Cloudflare Workers Static Assets.
- The current design uses the supplied logo, charcoal surfaces, #F5AA23, and locally hosted Montserrat Bold for the company title. Preserve the brand identity while iterating on the design.
- Responsiveness is a continuing requirement at narrow, intermediate, tablet, landscape, and wide desktop dimensions, including enlarged text. Prefer intrinsic grids, wrapping, and fluid type. Never disable zoom or hide overflow to conceal a layout problem. Verify real browser layouts when supported tooling is available and report verification limits.
- Bahasa Indonesia is the default at root URLs; English lives under /en/. Language switches must retain the equivalent page, and navigation must remain in that language without browser JavaScript. Keep translations complete in src/i18n/copy.ts.
- Keep the store phrase exactly in English in both languages: Spring, Steel, Carbon Steel Strip, Shim Plate, SUS, Wire Spring. Proper company/product names, people, and postal addresses are not automatically translated.
- Company facts and contact values are centralized in `src/config/company.ts`. Do not invent unprovided company information.
- Product pages describe categories, not confirmed stock, materials, tolerances, or certifications. Retain that distinction when adding content.
- `/kontak/` and contact calls to action are generated only when a valid official contact exists. Do not publish placeholder contacts.
- The owner supplied two phone numbers, one email, the store address, and Budiyanto/Delinah as people to contact. Do not assign a number to a person or assume WhatsApp availability without confirmation.
- The owner has not selected a domain. Never treat a suggested name as purchased or verified as available.
- Search indexing is disabled by default. Enable it only as part of the agreed launch, after the real domain is configured.
- Keep dependencies and the npm lockfile in sync. Run `npm run verify` after source or configuration changes; this does not publish.
- `npm run verify` includes tests, generated-link/metadata checks, performance budgets, and a Cloudflare dry run. Keep the small navigation usable without JavaScript and verify real browser layouts when browser tooling is available.
- Use Cloudflare Git integration for deployment; the GitHub workflow only validates the project.
- Do not add a runtime backend, CMS, analytics, contact-form service, or external font dependency without a corresponding feature request.
- Keep business documents, IDs, credentials, and `.env` out of commits.
- Recheck the official legal sources before giving compliance advice. A static frontend is not automatically exempt from PSE or data-protection requirements.
