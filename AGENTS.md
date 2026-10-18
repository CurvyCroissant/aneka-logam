# Project guidance

- This repository is the frontend-only Aneka Logam company profile website.
- Keep Astro static output, plain CSS, and Cloudflare Workers Static Assets.
- The final visual design has not been selected. Keep base changes minimal until the owner provides a design brief.
- Company facts and contact values are centralized in `src/config/company.ts`. Do not invent unprovided company information.
- The owner has not selected a domain. Never treat a suggested name as purchased or verified as available.
- Search indexing is disabled by default. Enable it only as part of the agreed launch, after the real domain is configured.
- Keep dependencies and the npm lockfile in sync. Run `npm run verify` after source or configuration changes; this does not publish.
- Use Cloudflare Git integration for deployment; the GitHub workflow only validates the project.
- Do not add a runtime backend, CMS, analytics, contact-form service, or external font dependency without a corresponding feature request.
- Keep business documents, IDs, credentials, and `.env` out of commits.
- Recheck the official legal sources before giving compliance advice. A static frontend is not automatically exempt from PSE or data-protection requirements.
