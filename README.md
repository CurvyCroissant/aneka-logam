# Aneka Logam

The static company profile website for Aneka Logam, a supplier of industrial machinery spare parts including shim plates and springs. The site uses the supplied black/gold logo, the brand colour `#F5AA23`, and locally hosted Montserrat Bold for the company title.

## Stack

- Astro static generation and strict TypeScript checking.
- Plain CSS, system body fonts, and locally hosted Montserrat Bold; no browser JavaScript.
- GitHub for source control and checks.
- Cloudflare Workers Static Assets for hosting; no runtime backend or database.

Source repository: https://github.com/CurvyCroissant/aneka-logam. Cloudflare deployment and the custom domain are separate setup steps. The repository does not publish until you connect it to Cloudflare. The owner-supplied phone numbers, email, store address, and people to contact are configured.

## Information structure and languages

| Content | Bahasa Indonesia (default) | English |
| --- | --- | --- |
| Company overview | `/` | `/en/` |
| Product directory | `/produk/` | `/en/products/` |
| Shim Plate | `/produk/shim-plate/` | `/en/products/shim-plate/` |
| Spring | `/produk/pegas/` | `/en/products/springs/` |
| Contact | `/kontak/` | `/en/contact/` |

ID/EN links switch to the equivalent page, with no JavaScript or automatic browser-language redirect. Navigation and refresh preserve the selected language through the URL. Shared page views avoid maintaining duplicate layouts. Copy lives in `src/i18n/copy.ts`, with product descriptions in `src/config/company.ts`.

The store phrase stays exactly `Spring, Steel, Carbon Steel Strip, Shim Plate, SUS, Wire Spring` in both languages, with `lang="en"` for pronunciation. Product names, people, and the postal address remain proper names rather than automatic translations. The phrase does not add unconfirmed specifications or inventory claims to the catalogue.

Header, footer, breadcrumbs, keyboard skip navigation, phone links, and map directions are shared. Cloudflare serves the nearest localized `404.html`; the build places an English error document at `dist/en/404.html`. Error pages remain outside the sitemap.

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

`verify` runs the contact validation tests, Astro/TypeScript checks, the static build, generated-page/asset checks, and an offline Cloudflare deployment dry run. It does not publish. `preview` serves the build locally; Cloudflare-specific response headers apply on Cloudflare, not Astro preview.

`npm run check:build` checks the current `dist` directory without rebuilding. It validates internal links and fragments, unique page titles, metadata, heading/landmark structure, local resources, and compressed-size budgets. It also rejects an indexable launch without a contact page. These checks do not replace visual testing in real browsers.

## Files to change

| File | Purpose |
| --- | --- |
| `src/config/company.ts` | Confirmed company facts, products, and official contact values |
| `src/config/navigation.ts` | Shared navigation and validated contact methods |
| `src/components/SiteHeader.astro`, `SiteFooter.astro` | Responsive shared navigation |
| `src/layouts/BaseLayout.astro` | Shared document metadata, header, and footer |
| `src/components/pages/` | Shared page views parameterized by language |
| `src/i18n/` | Complete interface translations and equivalent URL helpers |
| `src/pages/index.astro`, `src/pages/en/` | Indonesian and English route wrappers |
| `src/pages/produk/` | Directory and statically generated product detail pages |
| `src/pages/[page].astro` | Conditional static contact page |
| `src/pages/404.astro` | Missing-page content |
| `src/styles/global.css` | Fluid branded layouts and accessibility defaults |
| `src/assets/aneka-logam-logo.jpg` | Unmodified supplied logo, optimized by Astro during build |
| `src/styles/font.css` | One self-hosted Montserrat Latin Bold face |
| `src/pages/robots.txt.ts` | Build-generated crawler instructions |
| `public/_headers` | Cloudflare security and cache headers; build adds prelaunch noindex |
| `astro.config.mjs` | Static output, optional canonical origin, and optional sitemap |
| `wrangler.jsonc` | Cloudflare project name, asset folder, and 404 routing |
| `scripts/check-build.mjs` | Static page checks and performance budgets |

The default language is Indonesian. Company details were supplied by the owner. No legal entity type, founding date, opening hours, stock claims, certifications, testimonials, or phone-to-person assignments have been invented.

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

When the finished site, official contacts, and domain are ready, set `SITE_INDEXABLE=true` and rebuild using `npm run build:checked`. That enables indexing instructions and the sitemap. A valid `SITE_URL` is required, and the verification step also requires a generated contact page. These settings are public metadata, not credentials. Search directives are not access control; keep private information out of this project.

## GitHub development

Clone the existing repository:

```bash
git clone https://github.com/CurvyCroissant/aneka-logam.git
cd aneka-logam
npm ci
npm run dev
```

Keep changes in source control. Do not upload `node_modules`, `dist`, `.env`, or credentials.

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
| Build command | `npm run build:checked` |
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

Official contact values are in `src/config/company.ts`. Mobile and store telephone numbers remain separate, along with the email, address, and the two people to contact. A valid contact generates both contact pages and enquiry links. Empty values produce no placeholders or dead buttons; invalid configured values fail the build. The mobile number is a telephone link; WhatsApp remains optional until its account is confirmed by the owner.

Use a full international WhatsApp number with digits only (Indonesian country code `62`, replacing a domestic leading `0`). Telephone numbers need the international `+` prefix; formatting spaces, brackets, and hyphens are accepted. `mailto:` and `tel:` links open the visitor's chosen application.

## Performance and accessibility

- Pages and language switching require no browser JavaScript or third-party asset requests. Map directions are an ordinary external link, not an embedded map.
- Native navigation, fluid type, intrinsic/wrapping grids, system body fonts, and visible keyboard focus keep the foundation small and usable. Gold text is used on dark backgrounds, with dark text on gold buttons for contrast.
- Build budgets are 12 KiB gzip for CSS, 20 KiB gzip for JavaScript, and 12 KiB gzip per HTML page, plus 40 KiB for fonts and 160 KiB for optimized logo variants. These are ceilings, not claimed load times or Lighthouse scores. Review the image budget when real product photography is added.
- Use Astro's image tools when real photography is supplied. Give images dimensions and useful alt text; lazy-load below-the-fold images and avoid lazy-loading the main visible image.
- Responsiveness is a continuing requirement: use fluid layouts rather than fixed device widths. Before launch and after layout changes, visually check narrow widths (including 320 CSS pixels), intermediate widths around every breakpoint, tablets, wide desktops, portrait/landscape, 200% text enlargement, and 400% browser zoom. Never hide overflow or disable zoom to conceal a layout issue. Test iOS Safari and desktop browsers when supported browser tooling is available; report any unverified visual checks.

Navigation/content references (structure only; no affiliation or product specification claims):

- https://id.misumi-ec.com/
- https://www.rs-online.id/product-support/
- https://www.w3.org/WAI/tutorials/menus/
- https://www.w3.org/WAI/WCAG22/Understanding/reflow.html

No contact form, analytics, externally fetched fonts, cookies, embedded map, or third-party tracking script is installed. Montserrat is bundled locally using Fontsource; the SIL Open Font License is included at `public/fonts/montserrat-OFL.txt`. This describes the project code; the hosting provider can still process technical request information. Review data handling before adding forms, analytics, or other external services.

The Content Security Policy permits local scripts, styles, and images. If a future design uses an external service, deliberately review and update the policy instead of disabling it. Do not put confidential credentials in frontend code or environment values exposed to the browser.

## Before launch

See `docs/launch-checklist.md` for company information, domain ownership, Indonesian registration considerations, and release checks.

Official technical references:

- https://docs.astro.build/en/getting-started/
- https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/
- https://developers.cloudflare.com/workers/ci-cd/builds/
- https://developers.cloudflare.com/workers/static-assets/headers/
