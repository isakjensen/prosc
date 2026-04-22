import * as cheerio from 'cheerio'
import { chromium, type Browser, type Page } from 'playwright'
import { prisma } from '@/lib/db'
import { bolagsfaktaPipelineListLog } from '@/lib/bolagsfakta-pipeline-list-file-logger'
import {
  normalizeOrgNumber,
  orgNumberLookupVariants,
  shouldAutoRedlistByOrgNummer,
} from '@/lib/swedish-org-number'

export const BASE_URL = 'https://www.bolagsfakta.se'

export {
  normalizeOrgNumber,
  orgNumberLookupVariants,
  shouldAutoRedlistByOrgNummer,
} from '@/lib/swedish-org-number'

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** True om företagsnamnet innehåller någon av reglerna (redan lowercase) */
export function matchesRedlistNamePatterns(namn: string, rulesLower: string[]): boolean {
  if (!rulesLower.length) return false
  const n = namn.toLowerCase()
  return rulesLower.some((fragment) => fragment.length > 0 && n.includes(fragment))
}

export async function loadRedlistNameMatchRulesLower(): Promise<string[]> {
  const rows = await prisma.bolagsfaktaRedlistEntry.findMany({
    where: { nameContains: { not: null } },
    select: { nameContains: true },
  })
  const out: string[] = []
  for (const r of rows) {
    const s = r.nameContains?.trim().toLowerCase()
    if (s) out.push(s)
  }
  return out
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

/**
 * Branschlistor: SSR-svaret innehåller ofta alla träffar medan hydrerad DOM bara visar en del.
 * Vi läser båda och slår ihop unika företagslänkar.
 */
async function loadBranschListPageHtmlPair(page: Page, url: string): Promise<{
  ssrHtml: string
  domHtml: string
}> {
  const response = await page.goto(url, { waitUntil: 'load', timeout: 60000 })
  await delay(500)
  let ssrHtml = ''
  if (response) {
    try {
      ssrHtml = await response.text()
    } catch {
      ssrHtml = ''
    }
  }
  if (isCloudflareBlockHtml(ssrHtml)) ssrHtml = ''
  try {
    await page.click('button:has-text("Endast nödvändiga")', { timeout: 3000 })
    await delay(400)
  } catch { /* ingen dialog */ }
  let domHtml = await page.content()
  if (/[?&](sida|page)=\d+/i.test(url)) {
    await delay(2400)
    try {
      await page.evaluate(() => {
        window.scrollTo(0, Math.min(document.body.scrollHeight, 14000))
      })
    } catch {
      /* ignore */
    }
    await delay(800)
    domHtml = await page.content()
  }
  return { ssrHtml, domHtml }
}

function mergeForetagParsed(a: Foretag[], b: Foretag[]): Foretag[] {
  const map = new Map<string, Foretag>()
  for (const f of [...a, ...b]) {
    const u = absolutizeBolagsfaktaUrl(f.url)
    if (!u) continue
    const key = normalizeListUrlForDedup(u)
    if (!map.has(key)) map.set(key, { ...f, url: u })
  }
  return [...map.values()]
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

function detectBranschListPaginationParam(html: string): 'sida' | 'page' {
  if (/[?&]sida=\d+/i.test(html)) return 'sida'
  if (/[?&]page=\d+/i.test(html)) return 'page'
  return 'sida'
}

function buildBranschListPageUrl(basePageUrl: string, page: number, param: 'sida' | 'page'): string {
  if (page <= 1) return basePageUrl
  const joiner = basePageUrl.includes('?') ? '&' : '?'
  return `${basePageUrl}${joiner}${param}=${page}`
}

function normalizeListUrlForDedup(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ''
    return u.href
  } catch {
    return url
  }
}

function branschListingPathname(basePageUrl: string): string {
  try {
    return new URL(basePageUrl).pathname.replace(/\/+$/, '') || ''
  } catch {
    return ''
  }
}

function absolutizeListHref(href: string | undefined, baseUrl: string): string | null {
  if (!href?.trim()) return null
  try {
    return new URL(href.trim(), baseUrl).href
  } catch {
    return null
  }
}

function normListingPathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname.replace(/\/+$/, '') || '/')
  } catch {
    return pathname.replace(/\/+$/, '') || '/'
  }
}

function listingPathsEqual(pathname: string, listingPath: string): boolean {
  return normListingPathname(pathname) === normListingPathname(listingPath)
}

function findExplicitPaginationUrlInListHtml(
  html: string,
  resolveBaseUrl: string,
  listingPath: string,
  pageNum: number,
): string | null {
  const $ = cheerio.load(html)
  const seen = new Set<string>()
  const orderedHrefs: string[] = []

  const pushAnchors = (selector: string) => {
    $(selector).each((_, el) => {
      const raw = $(el).attr('href')
      const abs = absolutizeListHref(raw, resolveBaseUrl)
      if (!abs || seen.has(abs)) return
      seen.add(abs)
      orderedHrefs.push(abs)
    })
  }

  pushAnchors('.pagination a[href]')
  pushAnchors('[class*="pagination"] a[href]')
  pushAnchors('nav a[href]')
  pushAnchors('a[href]')

  const paramKeys = ['sida', 'page', 'p', 'pn', 'pag'] as const
  for (const abs of orderedHrefs) {
    let u: URL
    try {
      u = new URL(abs)
    } catch {
      continue
    }
    if (!listingPathsEqual(u.pathname, listingPath)) continue
    for (const key of paramKeys) {
      const raw = u.searchParams.get(key)
      if (raw == null) continue
      const n = parseInt(raw, 10)
      if (Number.isFinite(n) && n === pageNum) return u.href
    }
  }
  return null
}

function inferPaginationParamFromHref(href: string): 'sida' | 'page' | null {
  try {
    const u = new URL(href)
    if (u.searchParams.has('sida')) return 'sida'
    if (u.searchParams.has('page')) return 'page'
  } catch {
    /* skip */
  }
  return null
}

function extractNextBranschListUrl(html: string, currentUrl: string, listingPath: string): string | null {
  const $ = cheerio.load(html)
  const relHref =
    $('a[rel="next"]').attr('href') ||
    $('link[rel="next"]').attr('href')
  const fromRel = absolutizeListHref(relHref, currentUrl)
  if (fromRel) {
    try {
      const path = new URL(fromRel).pathname
      if (listingPathsEqual(path, listingPath)) return fromRel
    } catch {
      /* skip */
    }
  }

  let fromText: string | null = null
  $('a[href]').each((_, el) => {
    const $a = $(el)
    const t = $a.text().replace(/\s+/g, ' ').trim().toLowerCase()
    if (
      t !== 'nästa' &&
      t !== 'next' &&
      !/^›$|^»$|^→$/.test(t) &&
      !t.startsWith('nästa ')
    ) {
      return
    }
    const h = absolutizeListHref($a.attr('href'), currentUrl)
    if (!h || h === currentUrl) return
    try {
      if (listingPathsEqual(new URL(h).pathname, listingPath)) {
        fromText = h
        return false
      }
    } catch {
      /* skip */
    }
  })
  return fromText
}

/** True om HTML innehåller sidnummer-länkar (?sida= / &page=). Utan detta ger Bolagsfakta ofta tom SSR för ?sida=2 (SPA utan server-side sidor). */
function htmlSuggestsQueryPagination(html: string): boolean {
  return /[?&](?:sida|page)=\d+/i.test(html)
}

/**
 * Företagsprofil: ett path-segment /{orgSlug}-{slug}. orgSlug är siffror och/eller versaler (AB, enskild firma m.fl.).
 * Tidigare krävdes exakt 10 inledande siffror — då missades t.ex. 590303AUBY-… (16 poster på vissa branschlistor).
 */
function isBolagsfaktaCompanyProfilePath(pathname: string): boolean {
  const path = pathname.split('?')[0].replace(/\/+$/, '')
  if (!path || path === '/' || path.slice(1).includes('/')) return false
  const segment = path.slice(1)
  const dash = segment.indexOf('-')
  if (dash < 6) return false
  const head = segment.slice(0, dash)
  if (!/^[0-9A-Z]+$/.test(head)) return false
  return Boolean(segment.slice(dash + 1))
}

function parseForetagFromHtml(html: string): Foretag[] {
  const $ = cheerio.load(html)
  const foretag: Foretag[] = []

  $('a[href]').each((_, el) => {
    const rawHref = $(el).attr('href') || ''
    const hrefAbs = absolutizeListHref(rawHref, BASE_URL) || absolutizeListHref(rawHref, `${BASE_URL}/`)
    if (!hrefAbs) return
    let pathname: string
    try {
      pathname = new URL(hrefAbs).pathname
    } catch {
      return
    }
    if (!isBolagsfaktaCompanyProfilePath(pathname)) return

    let namn = $(el).find('h2.site-h3').text().trim()
    if (!namn) {
      namn = $(el).find('h2, h3').first().text().trim()
    }
    if (!namn) return

    const adress = $(el).find('.col-sm-6 > div.mt-0').first().text().trim() || null
    const orgNummerText = $(el).find('p.mt-1 span:not(.font-weight-bold)').first().text().trim()
    const orgNummer = orgNummerText || null
    const bolagsform = $(el).find('.col-sm-6.text-sm-right span').first().text().trim() || null

    foretag.push({ namn, adress, orgNummer, bolagsform, url: hrefAbs })
  })

  return foretag
}

async function upsertForetagWithCustomer(
  pipelineId: string,
  f: Foretag,
  redlistNameRulesLower: string[],
) {
  const url = absolutizeBolagsfaktaUrl(f.url)
  if (url) {
    const dup = await prisma.bolagsfaktaForetag.findFirst({ where: { pipelineId, url } })
    if (dup) return
  }

  const org = normalizeOrgNumber(f.orgNummer)
  const orgVars = orgNumberLookupVariants(org)
  const redlistHit =
    url || orgVars.length
      ? await prisma.bolagsfaktaRedlistEntry.findFirst({
          where: {
            OR: [
              ...(url ? [{ url }] : []),
              ...(orgVars.length ? [{ orgNummerNormalized: { in: orgVars } }] : []),
            ],
          },
        })
      : null

  const namePatternRedlist = matchesRedlistNamePatterns(f.namn, redlistNameRulesLower)
  const orgFormatRedlist = shouldAutoRedlistByOrgNummer(f.orgNummer, org)
  const blockedByRedlist = Boolean(redlistHit) || namePatternRedlist || orgFormatRedlist

  let customer =
    orgVars.length > 0
      ? await prisma.customer.findFirst({ where: { orgNumber: { in: orgVars } } })
      : null
  if (!customer && !blockedByRedlist) {
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
      isRedlisted: blockedByRedlist,
      namn: f.namn,
      adress: f.adress,
      orgNummer: org ?? f.orgNummer,
      bolagsform: f.bolagsform,
      url,
    },
  })
}

function roughPath10DigitSlugHits(html: string): number {
  const m = html.match(/\/[0-9A-Z]{6,}-/g)
  return m ? m.length : 0
}

export async function scrapeBolagsfaktaPipeline(pipelineId: string) {
  const pipeline = await prisma.bolagsfaktaPipeline.findUnique({ where: { id: pipelineId } })
  if (!pipeline) throw new Error('Pipeline hittades inte')

  const { kommunSlug, branschSlug, branschKod } = pipeline
  if (!kommunSlug || !branschSlug || !branschKod) {
    await prisma.bolagsfaktaPipeline.update({ where: { id: pipelineId }, data: { status: 'COMPLETED' } })
    return
  }
  const basePageUrl = `${BASE_URL}/bransch/${encodeURIComponent(kommunSlug)}/${encodeURIComponent(branschSlug)}/${branschKod}`

   const browser = await launchStealthBrowser()
  const redlistNameRulesLower = await loadRedlistNameMatchRulesLower()

  try {
    const page = await newStealthPage(browser)

    let { ssrHtml, domHtml } = await loadBranschListPageHtmlPair(page, basePageUrl)
    const pageParam = detectBranschListPaginationParam(`${ssrHtml}\n${domHtml}`)
    const listingPath = branschListingPathname(basePageUrl)
    const visited = new Set<string>([normalizeListUrlForDedup(basePageUrl)])

    await bolagsfaktaPipelineListLog(
      `SESSION START pipelineId=${pipelineId} basePageUrl=${basePageUrl} listingPath=${listingPath} pageParam=${pageParam} bolagsfaktaForetagCount_index=${pipeline.bolagsfaktaForetagCount ?? 'null'}`,
    )

    const MAX_LIST_PAGES = 150
    let currentUrl = basePageUrl
    let nextNumberedPage = 2
    let effectivePageParam: 'sida' | 'page' = pageParam

    for (let iter = 1; iter <= MAX_LIST_PAGES; iter++) {
      if (iter > 1 && (await isPipelineCancelled(pipelineId))) {
        console.log(`[bolagsfakta] Pipeline ${pipelineId} stoppad (iteration ${iter})`)
        await bolagsfaktaPipelineListLog(
          `SESSION STOPPED_BY_USER pipelineId=${pipelineId} iter=${iter} url=${currentUrl}`,
        )
        return
      }

      const fromSsr = parseForetagFromHtml(ssrHtml)
      const fromDom = parseForetagFromHtml(domHtml)
      const foretag = mergeForetagParsed(fromSsr, fromDom)

      const relSsr = extractNextBranschListUrl(ssrHtml, currentUrl, listingPath)
      const relDom = extractNextBranschListUrl(domHtml, currentUrl, listingPath)

      await bolagsfaktaPipelineListLog(
        `PAGE iter=${iter} url=${currentUrl} ` +
          `htmlLen ssr=${ssrHtml.length} dom=${domHtml.length} ` +
          `rough10digitPathHits ssr=${roughPath10DigitSlugHits(ssrHtml)} dom=${roughPath10DigitSlugHits(domHtml)} ` +
          `parsedRows ssr=${fromSsr.length} dom=${fromDom.length} merged=${foretag.length} ` +
          `relNextCandidate ssr=${relSsr ?? '-'} relNextCandidate dom=${relDom ?? '-'} ` +
          `visitedN=${visited.size}`,
      )

      if (foretag.length === 0) {
        if (iter === 1) {
          await bolagsfaktaPipelineListLog(
            `SESSION ERROR_EMPTY_FIRST_PAGE pipelineId=${pipelineId} ssrLen=${ssrHtml.length} domLen=${domHtml.length}`,
          )
          throw new Error('Inga företag på första sidan (tom lista eller ändrad HTML)')
        }
        console.log(`[bolagsfakta] Pipeline ${pipelineId}: tom sida vid ${currentUrl} — paginering klar`)
        await bolagsfaktaPipelineListLog(
          `PAGINATION_EMPTY_PAGE pipelineId=${pipelineId} iter=${iter} url=${currentUrl} — avbryter`,
        )
        break
      }

      const dbBefore = await prisma.bolagsfaktaForetag.count({ where: { pipelineId } })
      for (const f of foretag) {
        await upsertForetagWithCustomer(pipelineId, f, redlistNameRulesLower)
      }
      const dbAfter = await prisma.bolagsfaktaForetag.count({ where: { pipelineId } })
      console.log(`[bolagsfakta] Pipeline ${pipelineId} lista ${iter}: ${foretag.length} företag (${currentUrl})`)
      await bolagsfaktaPipelineListLog(
        `UPSERT iter=${iter} pipelineId=${pipelineId} parsedMerged=${foretag.length} dbRows ${dbBefore}->${dbAfter} netNew=${dbAfter - dbBefore} (dubbletter/redlist ger netNew < parsed)`,
      )

      let nextUrl: string | null = null
      let nextSource = 'none'

      if (relSsr && !visited.has(normalizeListUrlForDedup(relSsr))) {
        nextUrl = relSsr
        nextSource = 'rel-ssr'
      } else if (relDom && !visited.has(normalizeListUrlForDedup(relDom))) {
        nextUrl = relDom
        nextSource = 'rel-dom'
      }

      if (!nextUrl) {
        const allowBuiltNumbered =
          htmlSuggestsQueryPagination(ssrHtml) || htmlSuggestsQueryPagination(domHtml)
        while (nextNumberedPage <= MAX_LIST_PAGES) {
          const pageNum = nextNumberedPage
          nextNumberedPage += 1

          const discovered =
            findExplicitPaginationUrlInListHtml(domHtml, currentUrl, listingPath, pageNum) ||
            findExplicitPaginationUrlInListHtml(ssrHtml, currentUrl, listingPath, pageNum)

          const builtPrimary = buildBranschListPageUrl(basePageUrl, pageNum, effectivePageParam)
          const builtAlt = buildBranschListPageUrl(
            basePageUrl,
            pageNum,
            effectivePageParam === 'sida' ? 'page' : 'sida',
          )

          let cand: string | null = null
          let chosen = 'numbered-built'

          if (discovered && !visited.has(normalizeListUrlForDedup(discovered))) {
            cand = discovered
            chosen = 'numbered-discovered'
            const inferred = inferPaginationParamFromHref(discovered)
            if (inferred) effectivePageParam = inferred
          } else if (
            allowBuiltNumbered &&
            !visited.has(normalizeListUrlForDedup(builtPrimary))
          ) {
            cand = builtPrimary
            chosen = 'numbered-built'
          } else if (
            allowBuiltNumbered &&
            normalizeListUrlForDedup(builtAlt) !== normalizeListUrlForDedup(builtPrimary) &&
            !visited.has(normalizeListUrlForDedup(builtAlt))
          ) {
            cand = builtAlt
            chosen = 'numbered-alt'
            effectivePageParam = effectivePageParam === 'sida' ? 'page' : 'sida'
          }

          if (cand) {
            nextUrl = cand
            nextSource = chosen
            if (discovered && chosen === 'numbered-discovered') {
              await bolagsfaktaPipelineListLog(
                `PAGINATION_DISCOVERED_HREF pageNum=${pageNum} href=${discovered} builtWouldBe_sida=${buildBranschListPageUrl(basePageUrl, pageNum, 'sida')} builtWouldBe_page=${buildBranschListPageUrl(basePageUrl, pageNum, 'page')}`,
              )
            }
            break
          }
        }
      }

      await bolagsfaktaPipelineListLog(
        `PAGINATION_CHOICE iter=${iter} pipelineId=${pipelineId} source=${nextSource} effectivePageParam=${effectivePageParam} nextUrl=${nextUrl ?? '(none)'} nextNumberedPageCursor=${nextNumberedPage}`,
      )

      if (!nextUrl) {
        console.log(`[bolagsfakta] Pipeline ${pipelineId}: inga fler sidor (rel=next + ${pageParam}=…)`)
        await bolagsfaktaPipelineListLog(
          `PAGINATION_END pipelineId=${pipelineId} iter=${iter} reason=no_next_url pageParam=${pageParam} effectivePageParam=${effectivePageParam}`,
        )
        break
      }

      visited.add(normalizeListUrlForDedup(nextUrl))
      await delay(1000 + Math.random() * 1500)
      const nextPair = await loadBranschListPageHtmlPair(page, nextUrl)
      ssrHtml = nextPair.ssrHtml
      domHtml = nextPair.domHtml
      currentUrl = nextUrl
    }

    const saved = await prisma.bolagsfaktaForetag.count({ where: { pipelineId } })
    console.log(
      `[bolagsfakta] Pipeline ${pipelineId} klar: ${saved} rader i DB (Bolagsfakta-index: ${pipeline.bolagsfaktaForetagCount ?? '—'})`,
    )
    await bolagsfaktaPipelineListLog(
      `SESSION COMPLETE pipelineId=${pipelineId} dbRows=${saved} bolagsfaktaForetagCount_index=${pipeline.bolagsfaktaForetagCount ?? 'null'} deltaVsIndex=${pipeline.bolagsfaktaForetagCount != null ? saved - pipeline.bolagsfaktaForetagCount : 'n/a'}`,
    )

    await prisma.bolagsfaktaPipeline.update({
      where: { id: pipelineId },
      data: { status: 'COMPLETED', lastScrapedAt: new Date() },
    })
  } catch (err) {
    console.error(`[bolagsfakta] Fel:`, err)
    await bolagsfaktaPipelineListLog(
      `SESSION ERROR pipelineId=${pipelineId} message=${err instanceof Error ? err.message : String(err)}`,
    )
    await prisma.bolagsfaktaPipeline.update({
      where: { id: pipelineId },
      data: { status: 'STOPPED' },
    })
    throw err
  } finally {
    await browser.close()
  }
}
