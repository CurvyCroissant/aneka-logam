# Aneka Logam

An Astro starter for the Aneka Logam company profile website. The business sells industrial machinery spare parts, including shim plates and springs. This is a foundation with minimal styling; the final design is undecided.

## Stack

- Astro static generation and strict TypeScript checking.
- Plain CSS and system fonts; no browser JavaScript in the initial pages.
- GitHub for source control and checks.
- Cloudflare Workers Static Assets for hosting; no runtime backend or database.

No hosting account, repository, or domain is connected yet. The project does not deploy automatically until you connect it to Cloudflare. Contact values are intentionally empty.

## Run locally

Install Node.js 24 LTS and npm. The project requires Node.js 22.22.0 or newer; `.nvmrc` selects 24.

From this directory:

```bash
npm ci
npm run dev
```

Open the localhost address printed in the terminal. To check the production files:

```bash
npm run verify
npm run preview
```

`verify` checks Astro/TypeScript, builds the static site, and performs an offline Cloudflare deployment dry run. It does not publish. `preview` serves the build locally; Cloudflare-specific response headers apply on Cloudflare, not Astro preview.

## Files to change

| File | Purpose |
| --- | --- |
| `src/config/company.ts` | Confirmed company facts, products, and official contact values |
| `src/layouts/BaseLayout.astro` | Shared document metadata, header, and footer |
| `src/pages/index.astro` | Homepage content |
| `src/pages/404.astro` | Missing-page content |
| `src/styles/global.css` | Minimal responsive and accessibility defaults |
| `src/pages/robots.txt.ts` | Build-generated crawler instructions |
| `public/_headers` | Cloudflare security and cache headers; build adds prelaunch noindex |
| `astro.config.mjs` | Static output, optional canonical origin, and optional sitemap |
| `wrangler.jsonc` | Cloudflare project name, asset folder, and 404 routing |

The default content language is Indonesian. Add only verified company details. No address, legal entity type, founding date, stock claims, certifications, testimonials, customer logos, or contact numbers have been invented.

## Domain and search indexing

The starter works with no `.env` file and no registered domain. Indexing is disabled by default in the page metadata, Cloudflare headers, and `robots.txt`; a sitemap is not generated.

If needed, copy `.env.example` to `.env`:

```bash
# macOS / Linux / Git Bash
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

After registering the chosen domain, set these build-time values:

```dotenv
SITE_URL=https://YOUR-REGISTERED-DOMAIN
SITE_INDEXABLE=false
```

`SITE_URL` must be an HTTPS origin without a page path, credentials, query, or fragment. Configure the same values as build environment variables in Cloudflare; the ignored local `.env` is not uploaded to GitHub.

When the finished site and domain are ready, set `SITE_INDEXABLE=true` and rebuild. That enables indexing instructions and the sitemap. A valid `SITE_URL` is required. These settings are public metadata, not credentials. Search directives are not access control; keep private information out of this project.

## GitHub handoff

Create an empty GitHub repository named `aneka-logam` or `aneka-logam-website`. A private repository is suitable. If this folder is not yet a Git repository:

```bash
git init -b main
git add .
git commit -m "Set up Aneka Logam static website"
git remote add origin YOUR-GITHUB-REPOSITORY-URL
git push -u origin main
```

Replace the repository URL with the one GitHub supplies. Push the extracted folder contents at the repository root. Do not upload `node_modules`, `dist`, `.env`, or credentials.

The included GitHub Actions workflow verifies pushes to `main` and pull requests. It does not publish and requires no Cloudflare token. Dependabot is configured to propose monthly dependency updates.

## Cloudflare deployment

Use Cloudflare's Workers Git integration, rather than GitHub Pages or an additional GitHub deployment workflow:

1. Create a Cloudflare account controlled by the company.
2. In Workers & Pages, import the GitHub repository.
3. Keep the Worker name `aneka-logam`, matching `wrangler.jsonc`. If a different project name is needed, change both.
4. Select `main` as the production branch and the repository root as the project directory.
5. Use Node.js 24 and the settings below. Cloudflare installs the dependencies from the committed lockfile.

| Setting | Value |
| --- | --- |
| Build command | `npm run check && npm run build` |
| Deploy command | `npx wrangler deploy` |
| Static asset directory | `dist` (already set in `wrangler.jsonc`) |
| Build variable | `SITE_INDEXABLE=false` until launch |
| Build variable | `SITE_URL` once the actual domain is chosen |

6. Review the deployed `workers.dev` site.
7. Add the registered domain to Cloudflare DNS, preserving existing email records.
8. Add the custom domain to the Worker; Cloudflare provisions DNS and HTTPS.
9. Configure a redirect between `www` and the preferred primary hostname. The project intentionally contains no unregistered-domain redirect.
10. After the final launch review, enable indexing and deploy again. Once the custom domain is live, consider disabling the public `workers.dev` route so only the preferred address is used.

An entirely static Astro site does not need the Cloudflare Astro adapter or `output: 'server'`. Do not enable SPA fallback; the 404 page should remain a real missing-page response.

For an intentional manual deployment, first authenticate with Cloudflare, then use `npm run deploy`. This command does publish. Git integration is the recommended ongoing workflow.

## Contacts and future features

Fill the official contact values in `src/config/company.ts`; the contact section appears only when at least one value exists. Use a full international WhatsApp number with digits only (Indonesian country code `62`, replacing a domestic leading `0`). `mailto:` and `tel:` links open the visitor's chosen application.

No contact form, analytics, external fonts, cookies, embedded map, or third-party tracking script is installed. This describes the project code; the hosting provider can still process technical request information. Review data handling before adding forms, analytics, or other external services.

The Content Security Policy permits local scripts, styles, and images. If a future design uses an external service, deliberately review and update the policy instead of disabling it. Do not put confidential credentials in frontend code or environment values exposed to the browser.

## Before launch

See `docs/launch-checklist.md` for company information, domain ownership, Indonesian registration considerations, and release checks.

Official technical references:

- https://docs.astro.build/en/getting-started/
- https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/
- https://developers.cloudflare.com/workers/ci-cd/builds/
- https://developers.cloudflare.com/workers/static-assets/headers/
