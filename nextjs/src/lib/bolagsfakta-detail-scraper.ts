import * as cheerio from 'cheerio'
import type { Page } from 'playwright'
import { prisma } from '@/lib/db'
import { buildBolagsfaktaDisplayFields } from '@/lib/bolagsfakta-display-fields'
import type { BolagsfaktaDebugLogger } from '@/lib/bolagsfakta-debug-logger'
import { logGoogleDiscoveryWebsiteSearchHint } from '@/lib/bolagsfakta-google-discovery'
import type { WebsiteDiscoveryResult } from '@/lib/website-discovery-types'
import { delay, launchStealthBrowser, navigateAndGetHtml, newStealthPage } from '@/lib/bolagsfakta-scraper'

export interface AnsvarigPerson {
  name: string
  role: string
  personUrl?: string
}

export interface BolagsfaktaParsedDetail {
  sourceUrl: string
  overview: Record<string, unknown>
  ansvariga: AnsvarigPerson[]
  ekonomi: Record<string, unknown>
  omForetaget: Record<string, unknown>
  flat: {
    orgNumberFormatted?: string
    phone?: string
    sniKodPrimary?: string
    sniBenamningPrimary?: string
    verkligHuvudman?: string
    koncernModerNamn?: string
    antalAnstalldaText?: string
  }
  fordon: unknown
  arbetsstallen: unknown
  /** Google + Ollama (webb/e-post/telefon) — skickas till klient för toasts. */
  websiteDiscovery?: WebsiteDiscoveryResult
}

function parsePersonName(raw: string): { firstName: string; lastName: string } {
  const cleaned = raw.replace(/\s*\(\d+\)\s*$/, '').replace(/\s*Kolla lön direkt\s*$/i, '').trim()
  if (cleaned.includes(',')) {
    const [a, b] = cleaned.split(',').map(s => s.trim())
    return { firstName: b || '—', lastName: a || '—' }
  }
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '—', lastName: '—' }
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- cheerio root/context typing
function extractTableKeyValues($: cheerio.CheerioAPI, $ctx: any): Record<string, string> {
  const out: Record<string, string> = {}
  $ctx.find('table').each((_i: number, table: any) => {
    const $t = $(table)
    $t.find('tr').each((_j: number, tr: any) => {
      const cells = $(tr).find('th, td').toArray().map(c => $(c).text().replace(/\s+/g, ' ').trim())
      if (cells.length >= 2) {
        const k = cells[0]
        const v = cells.slice(1).join(' ')
        if (k && v && k.length < 200) out[k] = v
      }
    })
  })
  return out
}

/** Bolagsfakta: roller som <p>, personer som <p><a> under "Insamlade uppgifter om ansvariga personer". */
function extractAnsvarigaFromInsamladeBlock(html: string): AnsvarigPerson[] {
  const $ = cheerio.load(html)
  const persons: AnsvarigPerson[] = []
  let role = 'Ansvarig'
  const seen = new Set<string>()

  const $h3 = $('h3')
    .filter((_, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim()
      return t.includes('Insamlade uppgifter om ansvariga') || t.includes('ansvariga personer')
    })
    .first()

  if (!$h3.length) return []

  const $col = $h3.closest('.col-md-6')
  const container = $col.length ? $col : $h3.parent()

  container.find('h4, p').each((_, el) => {
    const $el = $(el)
    const tag = el.tagName.toLowerCase()
    if (tag === 'h4') return

    if (tag === 'p') {
      const $a = $el.find('a[href*="bolagsfakta.se"]')
      if ($a.length) {
        const href = $a.first().attr('href') || ''
        if (!/[/]\d{8}-/.test(href)) return
        const name = $a
          .first()
          .text()
          .replace(/\s*\(\d+\)\s*$/, '')
          .replace(/\s*Kolla lön direkt\s*$/i, '')
          .trim()
        if (!name) return
        const key = `${name}|${role}`
        if (seen.has(key)) return
        seen.add(key)
        const fullHref = href.startsWith('http')
          ? href
          : `https://www.bolagsfakta.se${href.startsWith('/') ? '' : '/'}${href}`
        persons.push({ name, role, personUrl: fullHref })
      } else {
        const text = $el.text().replace(/\s+/g, ' ').trim()
        if (
          text &&
          text.length < 160 &&
          !/kolla lön/i.test(text) &&
          !$el.find('a').length
        ) {
          role = text
        }
      }
    }
  })

  return persons
}

function extractAnsvarigaLegacy(html: string): AnsvarigPerson[] {
  const $ = cheerio.load(html)
  const persons: AnsvarigPerson[] = []
  let role = 'Ansvarig'
  const seen = new Set<string>()
  $('h2, h3, h4, h5, h6, a').each((_, el) => {
    const $el = $(el)
    const tag = el.tagName.toLowerCase()
    if (tag === 'a') {
      const href = $el.attr('href') || ''
      if (!href.includes('bolagsfakta.se')) return
      if (!/[/]\d{8}-/.test(href)) return
      const name = $el.text().replace(/\s*\(\d+\)\s*$/, '').replace(/\s*Kolla lön direkt\s*$/i, '').trim()
      if (!name) return
      const key = `${name}|${role}`
      if (seen.has(key)) return
      seen.add(key)
      persons.push({
        name,
        role,
        personUrl: href.startsWith('http') ? href : `https://www.bolagsfakta.se${href.startsWith('/') ? '' : '/'}${href}`,
      })
    } else {
      const t = $el.text().trim()
      if (t.length > 0 && t.length < 120) role = t
    }
  })
  return persons
}

export function extractAnsvariga(html: string): AnsvarigPerson[] {
  const structured = extractAnsvarigaFromInsamladeBlock(html)
  if (structured.length > 0) return structured
  return extractAnsvarigaLegacy(html)
}

function extractOverview($: cheerio.CheerioAPI): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  $('h2').each((_, el) => {
    const t = $(el).text().trim()
    if (t === 'Telefon') {
      const phone = $(el).next().text().trim()
      if (phone) out.telefon = phone
    }
    if (t === 'Adress') {
      out.adress = $(el).next().text().trim()
    }
    if (t === 'Organisationsnummer') {
      out.organisationsnummer = $(el).next().text().trim()
    }
  })
  $('h2').each((_, el) => {
    const t = $(el).text().trim()
    if (t.includes('Översikt senaste bokslut')) {
      out.översiktSenasteBokslutText = $(el).parent().text().slice(0, 8000)
    }
  })
  return out
}

function extractOmForetaget($: cheerio.CheerioAPI): Record<string, unknown> {
  const $h = $('h2').filter((_, el) => $(el).text().includes('Företagsuppgifter om')).first()
  if (!$h.length) return {}
  const $wrap = $h.closest('section').length ? $h.closest('section') : $h.parent().parent()
  const tables = extractTableKeyValues($, $wrap.length ? $wrap : $.root())
  return { företagsuppgifterTabell: tables }
}

async function collectTabHtml(
  page: Page,
  baseUrl: string,
  hash: string,
  logger?: BolagsfaktaDebugLogger,
): Promise<string> {
  const u = baseUrl.split('#')[0] + hash
  await logger?.info("tab_navigate", { hash, url: u })
  await page.goto(u, { waitUntil: 'load', timeout: 60000 })
  await delay(1200)
  const html = await page.content()
  await logger?.info("tab_html", { hash, htmlLength: html.length })
  return html
}

export async function scrapeBolagsfaktaCompanyPage(
  fullUrl: string,
  logger?: BolagsfaktaDebugLogger,
): Promise<BolagsfaktaParsedDetail> {
  const base = fullUrl.split('#')[0]
  await logger?.info("scrape_start", { baseUrl: base, inputUrl: fullUrl })

  const browser = logger
    ? await logger.time("launch_browser", () => launchStealthBrowser())
    : await launchStealthBrowser()
  let overviewHtml: string
  let ansvarigaHtml: string
  let ekonomiHtml: string
  let omHtml: string

  try {
    const page = logger
      ? await logger.time("new_page", () => newStealthPage(browser))
      : await newStealthPage(browser)

    overviewHtml = logger
      ? await logger.time("navigate_overview", () => navigateAndGetHtml(page, base), {
          step: "overview",
        })
      : await navigateAndGetHtml(page, base)
    await logger?.info("overview_html", { htmlLength: overviewHtml.length })

    ansvarigaHtml = logger
      ? await logger.time("tab_ansvariga", () => collectTabHtml(page, base, "#ansvariga", logger))
      : await collectTabHtml(page, base, "#ansvariga")
    ekonomiHtml = logger
      ? await logger.time("tab_ekonomi", () => collectTabHtml(page, base, "#ekonomi", logger))
      : await collectTabHtml(page, base, "#ekonomi")
    omHtml = logger
      ? await logger.time("tab_om_foretaget", () => collectTabHtml(page, base, "#om-foretaget", logger))
      : await collectTabHtml(page, base, "#om-foretaget")
  } finally {
    await browser.close()
    await logger?.info("browser_closed", {})
  }

  await logger?.info("parse_start", {
    overviewHtmlLength: overviewHtml.length,
    ansvarigaHtmlLength: ansvarigaHtml.length,
    ekonomiHtmlLength: ekonomiHtml.length,
    omHtmlLength: omHtml.length,
  })

  const $overview = cheerio.load(overviewHtml)
  const overview = extractOverview($overview)
  const ansvariga = extractAnsvariga(ansvarigaHtml)
  const $eko = cheerio.load(ekonomiHtml)
  const ekonomi: Record<string, unknown> = {
    rubriker: $eko('h2, h3').toArray().map(el => $eko(el).text().trim()).slice(0, 50),
    tabeller: extractTableKeyValues($eko, $eko.root()),
  }
  const $om = cheerio.load(omHtml)
  const omForetaget = extractOmForetaget($om)
  const omTables = extractTableKeyValues($om, $om.root())
  Object.assign(omForetaget, { allaTabeller: omTables })

  const flat: BolagsfaktaParsedDetail['flat'] = {}
  const org = (overview.organisationsnummer as string | undefined) || omTables['Organisationsnummer']
  if (org) flat.orgNumberFormatted = org.replace(/\s/g, '')
  flat.phone = (overview.telefon as string | undefined) || omTables['Telefonnummer']
  const sniKeys = Object.keys(omTables).filter(k => /SNI|sni/i.test(k) || /^\d{4,5}\s*[-–]/.test(omTables[k]))
  if (sniKeys.length) {
    const first = omTables[sniKeys[0]]
    flat.sniBenamningPrimary = first
    const m = first.match(/^(\d{4,5})\s*[-–]\s*/)
    if (m) flat.sniKodPrimary = m[1]
  }
  const vhText = $overview('body').text()
  const vhMatch = vhText.match(/verklig huvudman[^\n.]+[.:]?\s*([^\n.]+)/i)
  if (vhMatch) flat.verkligHuvudman = vhMatch[1].trim().slice(0, 500)
  const km = overviewHtml.match(/Koncernmoderbolag[^>]*>([^<]+)</i) || overviewHtml.match(/Koncernmoderbolag[\s\S]{0,200}?>([^<]+)</i)
  if (km) flat.koncernModerNamn = km[1].replace(/\s+/g, ' ').trim()
  flat.antalAnstalldaText = omTables['Antal anställda'] || omTables['Antal anställda:']

  const fordon = {
    rubriker: $overview('h2').toArray().map(el => $overview(el).text()).filter(t => /fordon/i.test(t)),
  }
  const arbetsstallen = { tabeller: omTables }

  await logger?.info("parse_done", {
    overviewKeys: Object.keys(overview),
    ansvarigaCount: ansvariga.length,
    ekonomiRubriker: (ekonomi.rubriker as string[])?.length ?? 0,
    omForetagetKeys: Object.keys(omForetaget),
    flat,
  })

  const display = buildBolagsfaktaDisplayFields({ overview, omForetaget })
  const websiteDiscovery = await logGoogleDiscoveryWebsiteSearchHint(display, flat, logger)

  return {
    sourceUrl: base,
    overview,
    ansvariga,
    ekonomi,
    omForetaget,
    flat,
    fordon,
    arbetsstallen,
    websiteDiscovery,
  }
}

export async function persistBolagsfaktaDetail(
  customerId: string,
  parsed: BolagsfaktaParsedDetail,
  logger?: BolagsfaktaDebugLogger,
) {
  const { flat } = parsed
  const display = buildBolagsfaktaDisplayFields(parsed)
  await logger?.info("persist_start", {
    customerId,
    firmaNamn: display.firmaNamn,
  })

  const dataBlock = {
    sourceUrl: parsed.sourceUrl,
    orgNumberFormatted: flat.orgNumberFormatted ?? null,
    phone: flat.phone ?? null,
    sniKodPrimary: flat.sniKodPrimary ?? null,
    sniBenamningPrimary: flat.sniBenamningPrimary ?? null,
    verkligHuvudman: flat.verkligHuvudman ?? null,
    koncernModerNamn: flat.koncernModerNamn ?? null,
    antalAnstalldaText: flat.antalAnstalldaText ?? null,
    firmaNamn: display.firmaNamn,
    bolagsformDetail: display.bolagsformDetail,
    registreringsStatus: display.registreringsStatus,
    gatuadress: display.gatuadress,
    postadress: display.postadress,
    seatLocation: display.seatLocation,
    bolagetBildatText: display.bolagetBildatText,
    bolagetRegistreratText: display.bolagetRegistreratText,
    momsregnr: display.momsregnr,
    verksamhetsbeskrivning: null,
    omsattningSenaste: display.omsattningSenaste,
    aretsResultatSenaste: display.aretsResultatSenaste,
    ebitdaSenaste: display.ebitdaSenaste,
    utdelningSenaste: display.utdelningSenaste,
    overviewJson: parsed.overview as object,
    ansvarigaJson: parsed.ansvariga as object,
    ekonomiJson: parsed.ekonomi as object,
    omForetagetJson: parsed.omForetaget as object,
    fordonJson: parsed.fordon as object,
    arbetsstallenJson: parsed.arbetsstallen as object,
    discoveredWebsite: parsed.websiteDiscovery?.enrichment?.website?.trim() || null,
  }

  await prisma.bolagsfaktaData.upsert({
    where: { customerId },
    create: {
      customerId,
      ...dataBlock,
    },
    update: {
      ...dataBlock,
      scrapedAt: new Date(),
    },
  })

  const customerUpdate: { phone?: string; industry?: string } = {}
  if (flat.phone) customerUpdate.phone = flat.phone
  if (flat.sniBenamningPrimary) customerUpdate.industry = flat.sniBenamningPrimary
  if (Object.keys(customerUpdate).length) {
    await prisma.customer.update({
      where: { id: customerId },
      data: customerUpdate,
    })
  }

  let contactsCreated = 0
  for (const p of parsed.ansvariga) {
    const { firstName, lastName } = parsePersonName(p.name)
    if (firstName === '—' && lastName === '—') continue
    const existing = await prisma.contact.findFirst({
      where: {
        customerId,
        firstName,
        lastName,
        role: p.role,
      },
    })
    if (existing) continue
    await prisma.contact.create({
      data: {
        customerId,
        firstName: firstName || '—',
        lastName: lastName || '—',
        role: p.role,
        title: p.role,
      },
    })
    contactsCreated += 1
  }
  await logger?.info("persist_done", { customerId, contactsCreated })
}
