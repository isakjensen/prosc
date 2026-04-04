import * as cheerio from 'cheerio'
import { chromium, type Browser, type Page } from 'playwright'
import { prisma } from '@/lib/db'

export const BASE_URL = 'https://www.bolagsfakta.se'

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Normaliserar org.nr till 10 siffror (för deduplicering) */
export function normalizeOrgNumber(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  return digits.length === 10 ? digits : null
}

async function isPipelineCancelled(pipelineId: string): Promise<boolean> {
  const p = await prisma.bolagsfaktaPipeline.findUnique({
    where: { id: pipelineId },
    select: { status: true },
  })
  return p?.status === 'STOPPED'
}

export async function launchStealthBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  })
}

export type StealthPageGeolocation = {
  latitude: number
  longitude: number
  accuracy?: number
}

export async function newStealthPage(
  browser: Browser,
  opts?: { geolocation?: StealthPageGeolocation },
): Promise<Page> {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'sv-SE',
    timezoneId: 'Europe/Stockholm',
    ...(opts?.geolocation
      ? {
          geolocation: {
            latitude: opts.geolocation.latitude,
            longitude: opts.geolocation.longitude,
            accuracy: opts.geolocation.accuracy ?? 50,
          },
          permissions: ['geolocation'] as const,
        }
      : {}),
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'sv-SE,sv;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    },
  })

  const page = await context.newPage()

  // Dölj webdriver-flagga som Cloudflare kollar
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    // Dölj andra automation-tecken
    // @ts-expect-error - we intentionally delete a non-standard navigator property in some runtimes
    delete navigator.__proto__.webdriver
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] })
    Object.defineProperty(navigator, 'languages', { get: () => ['sv-SE', 'sv', 'en-US'] })
  })

  return page
}

export async function navigateAndGetHtml(page: Page, url: string): Promise<string> {
  // networkidle hänger ofta på bolagsfakta.se (analytics, websockets)
  await page.goto(url, { waitUntil: 'load', timeout: 60000 })
  await delay(500)
  // Stäng cookie-dialog om den dyker upp
  try {
    await page.click('button:has-text("Endast nödvändiga")', { timeout: 3000 })
    await delay(400)
  } catch { /* ingen dialog */ }
  return page.content()
}

function isCloudflareBlockHtml(html: string): boolean {
  return (
    html.includes('cf-error-details') ||
    html.includes('Attention Required') ||
    html.includes('Just a moment') ||
    html.includes('challenge-platform')
  )
}

/** SSR/HTML från bolagsfakta innehåller alla branschlänkar; `page.content()` efter Vue ger ofta bara ~hälften. */
async function fetchKommunBranschPageSsrHtml(kommunSlug: string): Promise<string | null> {
  const url = `${BASE_URL}/bransch/${encodeURIComponent(kommunSlug)}`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'sv-SE,sv;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(45000),
    })
    if (!res.ok) return null
    const html = await res.text()
    if (isCloudflareBlockHtml(html)) return null
    return html
  } catch {
    return null
  }
}

/** Första dokumentresponsen från goto = samma SSR som fetch; inte hydrerad DOM. */
async function fetchKommunBranschPageSsrHtmlViaPlaywright(kommunSlug: string): Promise<string | null> {
  const url = `${BASE_URL}/bransch/${encodeURIComponent(kommunSlug)}`
  const browser = await launchStealthBrowser()
  try {
    const page = await newStealthPage(browser)
    const response = await page.goto(url, { waitUntil: 'load', timeout: 60000 })
    if (!response) return null
    const html = await response.text()
    if (isCloudflareBlockHtml(html)) return null
    return html
  } catch {
    return null
  } finally {
    await browser.close()
  }
}

function parseTrailingForetagCountBransch(parentText: string): number | null {
  const oneLine = parentText.replace(/\s+/g, ' ').trim()
  const m = oneLine.match(/\(([\d\s]+)\)\s*$/)
  if (!m) return null
  const n = parseInt(m[1].replace(/\s/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Parsar branscher från kommun-sidans HTML. Endast länkar till vald kommun (undviker annat på sidan).
 */
export function parseKommunBranschPageHtml(
  html: string,
  kommunSlug: string,
): Array<{
  branschNamn: string
  branschSlug: string
  branschKod: string
  foretagCount: number | null
}> {
  const $ = cheerio.load(html)
  const branscher: Array<{
    branschNamn: string
    branschSlug: string
    branschKod: string
    foretagCount: number | null
  }> = []

  const kommunPath = `/bransch/${kommunSlug}/`

  $('a[href*="/bransch/"]').each((_, el) => {
    const href = $(el).attr('href') || ''
    let normalized = href.split('#')[0] ?? ''
    try {
      if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
        const u = new URL(normalized)
        normalized = u.pathname + u.search
      }
    } catch { /* relativ länk */ }
    if (!normalized.includes(kommunPath)) return
    const match = normalized.match(/\/bransch\/[^/?#]+\/([^/?#]+)\/(\d+[A-Z]*)/)
    if (!match) return
    const branschSlug = decodeURIComponent(match[1])
    const branschKod = match[2]
    const text = $(el).text().trim()
    const branschNamn = text.replace(/^\d+[A-Z]?\s*[-–]\s*/, '').trim() || branschSlug
    const parentText = $(el).parent().text()
    const foretagCount = parseTrailingForetagCountBransch(parentText)
    branscher.push({ branschNamn, branschSlug, branschKod, foretagCount })
  })

  const byKod = new Map<string, (typeof branscher)[number]>()
  for (const b of branscher) {
    const prev = byKod.get(b.branschKod)
    if (!prev || (prev.foretagCount == null && b.foretagCount != null)) byKod.set(b.branschKod, b)
  }

  const unique = [...byKod.values()]
  unique.sort((a, b) => {
    const na = parseInt(String(a.branschKod).replace(/\D/g, ''), 10) || 0
    const nb = parseInt(String(b.branschKod).replace(/\D/g, ''), 10) || 0
    return na - nb
  })
  return unique
}

// Hämta alla branscher för en kommun och casha i DB
export async function fetchAndCacheBranscher(kommunSlug: string, kommunNamn: string) {
  let html =
    (await fetchKommunBranschPageSsrHtml(kommunSlug)) ??
    (await fetchKommunBranschPageSsrHtmlViaPlaywright(kommunSlug))

  if (!html) {
    throw new Error('Kunde inte hämta kommun-sida (tom svar eller blockad)')
  }

  const uniqueBranscher = parseKommunBranschPageHtml(html, kommunSlug)

  if (uniqueBranscher.length === 0) {
    throw new Error('Inga branscher hittades i HTML')
  }

  for (const b of uniqueBranscher) {
    await prisma.bolagsfaktaBransch.upsert({
      where: { kommunSlug_branschKod: { kommunSlug, branschKod: b.branschKod } },
      create: { kommunSlug, kommunNamn, ...b },
      update: {
        kommunNamn,
        branschNamn: b.branschNamn,
        branschSlug: b.branschSlug,
        foretagCount: b.foretagCount,
        cachedAt: new Date(),
      },
    })
  }

  return uniqueBranscher
}

interface Foretag {
  namn: string
  adress: string | null
  orgNummer: string | null
  bolagsform: string | null
  url: string | null
}

function absolutizeBolagsfaktaUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

function parseForetagFromHtml(html: string): Foretag[] {
  const $ = cheerio.load(html)
  const foretag: Foretag[] = []

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (!/bolagsfakta\.se\/\d{10}-/.test(href)) return

    const namn = $(el).find('h2.site-h3').text().trim()
    if (!namn) return

    const adress = $(el).find('.col-sm-6 > div.mt-0').first().text().trim() || null
    const orgNummerText = $(el).find('p.mt-1 span:not(.font-weight-bold)').first().text().trim()
    const orgNummer = orgNummerText || null
    const bolagsform = $(el).find('.col-sm-6.text-sm-right span').first().text().trim() || null

    foretag.push({ namn, adress, orgNummer, bolagsform, url: absolutizeBolagsfaktaUrl(href) })
  })

  return foretag
}

async function upsertForetagWithCustomer(pipelineId: string, f: Foretag) {
  const url = absolutizeBolagsfaktaUrl(f.url)
  if (url) {
    const dup = await prisma.bolagsfaktaForetag.findFirst({ where: { pipelineId, url } })
    if (dup) return
  }

  const org = normalizeOrgNumber(f.orgNummer)
  const redlistHit =
    url || org
      ? await prisma.bolagsfaktaRedlistEntry.findFirst({
          where: {
            OR: [
              ...(url ? [{ url }] : []),
              ...(org ? [{ orgNummerNormalized: org }] : []),
            ],
          },
        })
      : null

  let customer = org ? await prisma.customer.findUnique({ where: { orgNumber: org } }) : null
  if (!customer && !redlistHit) {
    customer = await prisma.customer.create({
      data: {
        name: f.namn,
        stage: "SCRAPED",
        orgNumber: org,
        address: f.adress,
      },
    })
  }

  await prisma.bolagsfaktaForetag.create({
    data: {
      pipelineId,
      customerId: customer?.id ?? null,
      isRedlisted: Boolean(redlistHit),
      namn: f.namn,
      adress: f.adress,
      orgNummer: f.orgNummer,
      bolagsform: f.bolagsform,
      url,
    },
  })
}

export async function scrapeBolagsfaktaPipeline(pipelineId: string) {
  const pipeline = await prisma.bolagsfaktaPipeline.findUnique({ where: { id: pipelineId } })
  if (!pipeline) throw new Error('Pipeline hittades inte')

  const { kommunSlug, branschSlug, branschKod } = pipeline
  const basePageUrl = `${BASE_URL}/bransch/${encodeURIComponent(kommunSlug)}/${encodeURIComponent(branschSlug)}/${branschKod}`

  const browser = await launchStealthBrowser()

  try {
    const page = await newStealthPage(browser)

    const firstHtml = await navigateAndGetHtml(page, basePageUrl)

    // Räkna antal sidor
    const $first = cheerio.load(firstHtml)
    let maxPage = 1
    $first('a[href*="?sida="]').each((_, el) => {
      const m = ($first(el).attr('href') || '').match(/\?sida=(\d+)/)
      if (m) maxPage = Math.max(maxPage, parseInt(m[1]))
    })

    console.log(`[bolagsfakta] Pipeline ${pipelineId}: ${maxPage} sidor`)

    const firstForetag = parseForetagFromHtml(firstHtml)
    for (const f of firstForetag) {
      await upsertForetagWithCustomer(pipelineId, f)
    }
    console.log(`[bolagsfakta] Sida 1/${maxPage}: ${firstForetag.length} företag`)

    for (let p = 2; p <= maxPage; p++) {
      if (await isPipelineCancelled(pipelineId)) {
        console.log(`[bolagsfakta] Pipeline ${pipelineId} stoppad på sida ${p}`)
        return
      }

      await delay(1000 + Math.random() * 1500)
      const html = await navigateAndGetHtml(page, `${basePageUrl}?sida=${p}`)
      const foretag = parseForetagFromHtml(html)

      for (const f of foretag) {
        await upsertForetagWithCustomer(pipelineId, f)
      }
      console.log(`[bolagsfakta] Sida ${p}/${maxPage}: ${foretag.length} företag`)
    }

    await prisma.bolagsfaktaPipeline.update({
      where: { id: pipelineId },
      data: { status: 'COMPLETED', lastScrapedAt: new Date() },
    })
    console.log(`[bolagsfakta] Pipeline ${pipelineId} klar`)
  } catch (err) {
    console.error(`[bolagsfakta] Fel:`, err)
    await prisma.bolagsfaktaPipeline.update({
      where: { id: pipelineId },
      data: { status: 'STOPPED' },
    })
    throw err
  } finally {
    await browser.close()
  }
}
