# Aneka Logam

A lightweight company profile with Home and filterable Products pages in Bahasa Indonesia and English. Includes a category carousel, section navigation, the store address, WhatsApp, and phone/email copy actions. Product names and the supplied English shop phrase stay unchanged across languages.

## Tech stack

Astro static generation, TypeScript, plain CSS, and a small vanilla JavaScript enhancement. Montserrat Bold is hosted locally. Source and CI use GitHub; hosting is configured for Cloudflare Workers Static Assets. No backend or database.

## Run

Use Node.js 24 LTS and npm:

```bash
npm ci
npm run dev
```

Open the localhost address printed in the terminal.

```bash
npm run verify   # Tests, type checks, build checks, and deployment dry run
npm run preview  # Preview the production build locally
```

Company details live in `src/config/company.ts`, photos in `src/config/media.ts`, and translations in `src/i18n/copy.ts`. Product galleries support multiple photos. Scroll position is remembered on refresh. Search indexing stays disabled until launch.
