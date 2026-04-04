# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

---

## Stack

- **Next.js 16** (App Router) – server components by default, `'use client'` explicit
- **React 19** – new APIs may differ from training data
- **Prisma 5** + **MySQL** – ORM och databas
- **TailwindCSS 4** – utility classes, `panel-surface`, `hero-chip`, `page-kicker` är projektspecifika klasser
- **Playwright 1.59** – används för web scraping server-side
- **Cheerio 1.2** – HTML-parsing av scrapad data
- **next-auth v5 beta** – autentisering via `auth()` från `@/lib/auth`

---

## Projektstruktur

```
nextjs/
├── prisma/
│   └── schema.prisma          # Databasschemat
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # Autentiserade sidor (layout kräver session)
│   │   │   ├── pipelines/     # Bolagsfakta Pipeline UI
│   │   │   └── ...            # kunder, kontakter, offerter, avtal, fakturor, projekt m.m.
│   │   ├── api/
│   │   │   ├── pipelines/     # CRUD + scrape/stop för BolagsfaktaPipeline
│   │   │   └── kommuner/[slug]/branscher/  # Hämta & casha branscher per kommun
│   │   └── login/
│   ├── components/
│   │   ├── layout/            # sidebar.tsx, dashboard-layout.tsx
│   │   └── ui/                # Badge, Button, Input, Modal m.m.
│   └── lib/
│       ├── bolagsfakta-scraper.ts  # Playwright-baserad scraper (stealth)
│       ├── kommuner.ts             # Hårdkodad lista med 290 svenska kommuner
│       ├── db.ts                   # Prisma-klient
│       ├── auth.ts                 # next-auth
│       └── utils.ts                # formatDate m.m.
```

---

## Bolagsfakta Pipeline

Systemet heter **Bolagsfakta Pipeline** (döpt om från "Pipeline"). Det scrapat företagsdata från [bolagsfakta.se](https://www.bolagsfakta.se/branscher).

### Flöde

1. Användaren väljer **kommun** (från hårdkodad lista i `kommuner.ts`)
2. Systemet hämtar **branscher** för kommunen via `/api/kommuner/[slug]/branscher`
   - Cachas i DB (`BolagsfaktaBransch`) i 7 dagar
3. Användaren väljer **bransch** och skapar pipeline
4. Scraping startas → hämtar alla företag sida för sida (`?sida=N`)
5. Företagen sparas som `BolagsfaktaForetag` i DB

### URL-struktur på bolagsfakta.se

- Kommunsida: `https://www.bolagsfakta.se/bransch/{kommunSlug}`
- Branschsida: `https://www.bolagsfakta.se/bransch/{kommunSlug}/{branschSlug}/{branschKod}`
- Paginering: `?sida=2`, `?sida=3` osv.
- Slugs är URL-enkodade på sajten men lagras **avkodade** i DB. Använd alltid `encodeURIComponent(slug)` när du bygger URLs.

### Databas­modeller (Prisma)

```prisma
BolagsfaktaBransch   – cache av branscher per kommun (unique: kommunSlug + branschKod)
BolagsfaktaPipeline  – en pipeline (namn, kommunSlug, branschSlug, branschKod, status)
BolagsfaktaForetag   – ett scrapad företag (namn, adress, orgNummer, bolagsform, url)
```

### Scraper – viktigt om Cloudflare

Bolagsfakta skyddas av Cloudflare. En vanlig `fetch()` eller naiv Playwright-session blockeras (403 / "Sorry, you have been blocked").

**Krav för att kringgå Cloudflare:**
- `--disable-blink-features=AutomationControlled` i launch args
- `addInitScript` som sätter `navigator.webdriver = undefined`
- Realistisk `userAgent`, `viewport`, `locale` och `Sec-Fetch-*`-headers i browser context
- `waitUntil: 'networkidle'` vid navigering (inte `domcontentloaded`)

Se `src/lib/bolagsfakta-scraper.ts` för referensimplementering (`launchStealthBrowser` + `newStealthPage`).

---

## Databas­hantering

- **Migreringar**: `npm run db:migrate` (kräver shadow DB – fungerar ej alltid med delad MySQL)
- **Schema push**: `npm run db:push` – pushar schema direkt utan migrations-historik
- Vid data-loss varnas du – använd `--accept-data-loss` med gott omdöme

---

## API-konventioner

- Alla routes är i `src/app/api/`
- Params är alltid `Promise<{ id: string }>` – måste awaitas: `const { id } = await params`
- Returnera alltid `NextResponse.json()`

---

## UI-konventioner

- Sidebarlänk för pipelines: `/pipelines` → label "Bolagsfakta Pipeline"
- Server components hämtar data direkt med `prisma.*`
- Client components markeras med `'use client'` och använder `fetch` mot API-routes
- Toast-notiser via `sonner`
