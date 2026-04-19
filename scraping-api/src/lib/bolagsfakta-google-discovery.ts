import { appendFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { BolagsfaktaDisplayFields } from './bolagsfakta-display-fields.js'
import type { BolagsfaktaDebugLogger } from './bolagsfakta-debug-logger.js'
import { formatSwedishOrgNumber, locationFromPostadressAndSeat } from './bolagsfakta-overview.js'
import { cursorCliJson, CursorCliError } from './cursor-cli-client.js'
import type { Page } from 'playwright'
import type { CompanyEnrichmentFromAI, WebsiteDiscoveryResult } from './website-discovery-types.js'
import {
  delay,
  launchStealthBrowser,
  newStealthPage,
  type StealthPageGeolocation,
} from './bolagsfakta-scraper.js'

export type { CompanyEnrichmentFromAI, WebsiteDiscoveryResult } from './website-discovery-types.js'

const SCRAPING_API_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
/** Prompt + AI-svar under paketroten: `scraping-api/logs/` (gitignored). */
const DISCOVERY_PROMPT_LOG_FILE = join(SCRAPING_API_ROOT, "logs", "google-discovery-prompts.log")

/** Minimalt underlag för söksträng. */
export type DiscoveryFlatInput = {
  orgNumberFormatted?: string
  sniKodPrimary?: string
  sniBenamningPrimary?: string
}

const SWEDISH_CITY_COORDS: Record<string, { latitude: number; longitude: number }> = {
  stockholm: { latitude: 59.3293, longitude: 18.0686 },
  göteborg: { latitude: 57.7089, longitude: 11.9746 },
  goeteborg: { latitude: 57.7089, longitude: 11.9746 },
  malmö: { latitude: 55.605, longitude: 13.0038 },
  malmo: { latitude: 55.605, longitude: 13.0038 },
  uppsala: { latitude: 59.8586, longitude: 17.6389 },
  linköping: { latitude: 58.4108, longitude: 15.6214 },
  linkoeping: { latitude: 58.4108, longitude: 15.6214 },
  västerås: { latitude: 59.6162, longitude: 16.5528 },
  vasteras: { latitude: 59.6162, longitude: 16.5528 },
  örebro: { latitude: 59.2741, longitude: 15.2066 },
  orebro: { latitude: 59.2741, longitude: 15.2066 },
  norrköping: { latitude: 58.5877, longitude: 16.1924 },
  norrkoeping: { latitude: 58.5877, longitude: 16.1924 },
  helsingborg: { latitude: 56.0465, longitude: 12.6945 },
  jönköping: { latitude: 57.7815, longitude: 14.1562 },
  joenkoeping: { latitude: 57.7815, longitude: 14.1562 },
  lund: { latitude: 55.7047, longitude: 13.191 },
  umeå: { latitude: 63.8258, longitude: 20.263 },
  umea: { latitude: 63.8258, longitude: 20.263 },
  gävle: { latitude: 60.6749, longitude: 17.1413 },
  gavle: { latitude: 60.6749, longitude: 17.1413 },
  borås: { latitude: 57.721, longitude: 12.9401 },
  boras: { latitude: 57.721, longitude: 12.9401 },
  sundsvall: { latitude: 62.3908, longitude: 17.3069 },
  eskilstuna: { latitude: 59.3712, longitude: 16.509 },
  karlstad: { latitude: 59.3793, longitude: 13.5037 },
}

const DEFAULT_SE = { latitude: 59.3293, longitude: 18.0686 }

function normalizeCityKey(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+kommun$/i, "")
    .replace(/\s+/g, " ")
}

function geolocationForCityCountry(city: string | null, country: string | null): StealthPageGeolocation {
  const fallback: StealthPageGeolocation = { ...DEFAULT_SE, accuracy: 50 }
  if (country && !/sverige|sweden/i.test(country)) {
    return fallback
  }
  if (!city) {
    return fallback
  }
  const key = normalizeCityKey(city)
  const hit = SWEDISH_CITY_COORDS[key]
  if (hit) {
    return { latitude: hit.latitude, longitude: hit.longitude, accuracy: 40 }
  }
  return fallback
}

function buildSearchQuery(display: BolagsfaktaDisplayFields, flat: DiscoveryFlatInput): string {
  const name = display.firmaNamn?.trim() ?? ""
  const addr = display.gatuadress?.trim() ?? ""
  const orgRaw = flat.orgNumberFormatted?.trim() ?? ""
  const org = formatSwedishOrgNumber(orgRaw) ?? orgRaw
  const parts = [name, addr, org].filter(Boolean)
  return parts.join(" ").replace(/\s+/g, " ").trim()
}

function trimSerpText(raw: string, maxLen: number): string {
  const collapsed = raw.replace(/\s+/g, " ").trim()
  if (collapsed.length <= maxLen) return collapsed
  return `${collapsed.slice(0, maxLen)}… [truncated ${maxLen} chars]`
}

/**
 * Måste vara ren JS-sträng till `page.evaluate` — TS-kompilerade funktioner kan injicera t.ex. `__name`
 * som inte finns i webbläsaren (ReferenceError).
 */
const GOOGLE_ORGANIC_SERP_EXTRACTOR = `(() => {
  function skipGoogleOrInternal(u) {
    return /google\\.(com|se)\\/(search|url|aclk)|\\/\\/www\\.google\\./i.test(u);
  }
  const rso = document.querySelector("#rso");
  if (!rso) return "";
  const blocks = [];
  const seen = new Set();
  const cards = rso.querySelectorAll(
    "div.g, div[jscontroller][data-hveid], div[data-sokoban-container]",
  );
  cards.forEach((card) => {
    if (card.querySelector("[data-text-ad], [data-ad-slot], [aria-label='Annonser']")) return;
    const h3 = card.querySelector("h3");
    const a = card.querySelector("a[href^='http']") || card.querySelector("a[ping]");
    if (!h3 && !a) return;
    const title = (h3 && h3.textContent && h3.textContent.replace(/\\s+/g, " ").trim()) || "";
    let href = (a && a.href) || "";
    if (skipGoogleOrInternal(href)) href = "";
    const cite = card.querySelector("cite, .VuuXrf, .NJjxre");
    const citeT = (cite && cite.textContent && cite.textContent.replace(/\\s+/g, " ").trim()) || "";
    const snEl =
      card.querySelector(".VwiC3b") ||
      card.querySelector(".s") ||
      card.querySelector(".st") ||
      card.querySelector("span[style*='-webkit-line-clamp']");
    const snippet =
      (snEl && snEl.textContent && snEl.textContent.replace(/\\s+/g, " ").trim().slice(0, 600)) || "";
    const parts = [];
    if (title) parts.push("TITLE: " + title);
    if (href) parts.push("URL: " + href);
    if (citeT) parts.push("CITE: " + citeT);
    if (snippet) parts.push("SNIPPET: " + snippet);
    if (parts.length < 2) return;
    const key = title + "|" + href;
    if (seen.has(key)) return;
    seen.add(key);
    blocks.push(parts.join("\\n"));
  });
  if (blocks.length > 0) {
    return blocks.join("\\n\\n---\\n\\n");
  }
  const fallback = [];
  rso.querySelectorAll("a[href^='http']").forEach((node) => {
    const el = node;
    const h = el.querySelector("h3");
    if (!h) return;
    const u = el.href;
    if (skipGoogleOrInternal(u)) return;
    const line =
      "TITLE: " + (h.textContent && h.textContent.replace(/\\s+/g, " ").trim() || "") + "\\nURL: " + u;
    if (!seen.has(line)) {
      seen.add(line);
      fallback.push(line);
    }
  });
  return fallback.slice(0, 12).join("\\n\\n---\\n\\n");
})()`

async function extractOrganicSerpFromPage(page: Page): Promise<string> {
  const text = await page.evaluate(GOOGLE_ORGANIC_SERP_EXTRACTOR)
  return typeof text === "string" ? text : ""
}

/** Remove minified JS/CSS-like noise from SERP text. */
export function stripNoiseFromSerpText(raw: string): string {
  let s = raw
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ")
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ")
  s = s.replace(/<[^>]{1,400}>/g, " ")
  for (let i = 0; i < 8; i++) {
    s = s.replace(/\(function\s*\([^)]*\)\s*\{[\s\S]{0,12000}?\}\)\s*\(\s*\)/g, " ")
  }
  s = s.replace(/\b[a-zA-Z0-9+/]{60,}={0,2}\b/g, " ")
  s = s.replace(/\b[\w.-]+\.(js|mjs|cjs|css|map|json)(\?[^ \t]*)?\b/gi, " ")
  s = s.replace(/\b[a-f0-9]{40,}\b/gi, " ")
  s = s.replace(/\/xjs\/[^ \t]+/g, " ")
  s = s.replace(/@media[^{]*\{[^}]*\}/gi, " ")

  const lines = s.split(/\r?\n/)
  const kept: string[] = []
  for (const line of lines) {
    const t = line.trim()
    if (t.length < 2) continue
    if (/^(function|const|let|var|window\.|document\.|import |export |=>|\)\s*;|#!)/.test(t)) continue
    if (/\b(google\.|document\.|getElementById|querySelector|RegExp\(|matchMedia|setInterval|setTimeout|addEventListener|\.call\(this)/i.test(t)) continue
    if ((t.match(/;/g) ?? []).length > 10 && t.length > 120) continue
    if (/^\s*[\{\}]\s*$/.test(t)) continue
    if (/^\s*[\w.-]+\s*\{[^}]{0,200}\}\s*$/.test(t) && /[:;]{2,}/.test(t)) continue
    if (/^\s*(\.|#)[\w-]+\s*\{/.test(t)) continue
    if (/^\s*@(?:media|import|keyframes|font-face)/i.test(t)) continue
    if (/^\s*--[\w-]+\s*:/.test(t)) continue
    if (/^\s*\/\*[\s\S]*\*\/\s*$/.test(t)) continue
    if (/^\s*\/\/.*$/.test(t) && t.length < 120) continue
    if (/\bwebpack\b|\bchunk\b|\bchunkhash\b/i.test(t) && t.length < 200) continue
    kept.push(t)
  }
  s = kept.join("\n")
  s = s.replace(/\{[^{}]{0,2000}\}/g, " ")
  s = s.replace(/[a-zA-Z-_.#]+\s*:\s*[^;\n]{1,400};/g, " ")
  if (s.length > 200_000) {
    s = s.slice(0, 200_000)
  }
  return s.replace(/\s+/g, " ").trim()
}

/** Business directories / registries — never use as the company website; omit from AI prompt. */
function isDirectoryListingHost(hostname: string): boolean {
  const h = hostname.replace(/^www\./i, "").toLowerCase()
  const blocked = [
    "hitta.se",
    "eniro.se",
    "allabolag.se",
    "bolagsfakta.se",
    "ratsit.se",
    "merinfo.se",
    "proff.se",
    "syna.se",
    "uc.se",
    "kreditrapporten.se",
  ]
  return blocked.some((b) => h === b || h.endsWith(`.${b}`))
}

const SERP_BLOCK_SEPARATOR = "\n\n---\n\n"

/**
 * Removes whole Google result blocks whose primary URL points at a directory/registry host.
 * Call before stripNoiseFromSerpText so "---" separators are still present.
 */
function filterDirectoryListingBlocksFromSerp(serp: string): string {
  const t = serp.trim()
  if (!t) return serp
  if (!t.includes(SERP_BLOCK_SEPARATOR)) {
    return filterDirectoryListingUrlsInUnstructuredSerp(t)
  }
  const blocks = t.split(SERP_BLOCK_SEPARATOR)
  const kept: string[] = []
  for (const block of blocks) {
    const m = block.match(/\bURL:\s*(https?:\/\/[^\s›"'<>[\]()]+)/i)
    if (!m) {
      kept.push(block)
      continue
    }
    try {
      const u = new URL(m[1].replace(/[›.,;)\]}]+$/, ""))
      if (isDirectoryListingHost(u.hostname)) continue
    } catch {
      kept.push(block)
      continue
    }
    kept.push(block)
  }
  return kept.join(SERP_BLOCK_SEPARATOR)
}

/** Fallback when SERP has no "---" blocks (e.g. innerText): strip blocked URLs and drop lines that become empty noise. */
function filterDirectoryListingUrlsInUnstructuredSerp(text: string): string {
  const withoutBadUrls = text.replace(/https?:\/\/[^\s›"'<>[\]()]+/gi, (raw) => {
    try {
      const u = new URL(raw.replace(/[›.,;)\]}]+$/, ""))
      return isDirectoryListingHost(u.hostname) ? "" : raw
    } catch {
      return raw
    }
  })
  const lines = withoutBadUrls.split(/\r?\n/)
  const kept: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (/^URL:\s*$/i.test(trimmed)) continue
    kept.push(line)
  }
  return kept.join("\n").trim()
}

function sanitizeWebsiteFromModel(raw: string): string {
  const s = raw.trim()
  if (!s) return ""
  const m = s.match(/https?:\/\/[^\s›"'<>[\]()]+/i)
  if (!m) return ""
  const candidate = m[0].replace(/[›.,;)\]}]+$/g, "")
  try {
    const u = new URL(candidate)
    if (isDirectoryListingHost(u.hostname)) return ""
    const path = u.pathname.length > 200 ? u.pathname.slice(0, 200) : u.pathname
    return `${u.origin}${path === "/" ? "" : path}`.slice(0, 500)
  } catch {
    return ""
  }
}

function buildCompanyContextForDiscovery(
  display: BolagsfaktaDisplayFields,
  flat: DiscoveryFlatInput,
): string {
  const rows: string[] = []
  const add = (k: string, v: string | null | undefined) => {
    const t = typeof v === "string" ? v.trim() : ""
    if (t) rows.push(`${k}: ${t}`)
  }
  add("Name", display.firmaNamn)
  const org = flat.orgNumberFormatted?.trim() ?? ""
  if (org) add("Org.nr", formatSwedishOrgNumber(org) ?? org)
  add("Street", display.gatuadress)
  add("Postal", display.postadress)
  add("Seat", display.seatLocation)
  add("Bolaget bildat", display.bolagetBildatText)
  add("Bolaget registrerat", display.bolagetRegistreratText)
  const primaryBransch = [flat.sniKodPrimary, flat.sniBenamningPrimary].filter(Boolean).join(" – ")
  if (primaryBransch.trim()) add("Primär bransch (SNI)", primaryBransch)
  return rows.length ? rows.join("\n") : "(no extra fields)"
}

function buildDedupedUrlListFromSerp(serp: string): string {
  const seen = new Set<string>()
  const lines: string[] = []
  // Match anywhere — stripNoiseFromSerpText collapses newlines so URL: may not be at line start.
  const re = /\bURL:\s*(https?:\/\/[^\s›"'<>[\]()]+)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(serp)) !== null) {
    const href = m[1].replace(/[›.,;)\]}]+$/, "")
    try {
      const u = new URL(href)
      if (isDirectoryListingHost(u.hostname)) continue
      const key = `${u.hostname.toLowerCase()}${u.pathname}`
      if (seen.has(key)) continue
      seen.add(key)
      lines.push(`${lines.length + 1}. ${u.href}`)
    } catch {
      /* skip */
    }
  }
  return lines.length ? lines.join("\n") : "(none)"
}

function buildDiscoveryJsonPrompt(args: {
  companyContext: string
  searchQuery: string
  city: string | null
  country: string | null
  urlList: string
  trimmedSerp: string
}): string {
  return `Task: From the Google results below, pick the ONE URL that is this company's own official public website (the site they operate for customers: product/service, contact, or brand). If none of the remaining results fit, use an empty string for "website".

Directory, phonebook, and business-registry pages (hitta.se, allabolag.se, bolagsfakta.se, etc.) have already been removed from the list below. Prefer the real company domain (often matches company name or brand); avoid Facebook/LinkedIn unless it is clearly the only web presence.

Company (background):
${args.companyContext}

Search: ${args.searchQuery}
Approx. location: ${args.city ?? "?"}, ${args.country ?? "?"}

Candidate URLs (deduplicated, directories excluded):
${args.urlList}

Result details (TITLE / URL / CITE / SNIPPET — same filtering as above):
${args.trimmedSerp}

Also set email and phone only if they clearly appear for this company in the text above; otherwise "".
confidence: high, medium, or low. notes: one short English sentence or "".

Reply with ONLY one JSON object, no markdown, exactly:
{"website":"","email":"","phone":"","confidence":"low","notes":""}
`
}

function normalizeAICompanyJson(parsed: unknown): CompanyEnrichmentFromAI | null {
  if (!parsed || typeof parsed !== "object") return null
  const o = parsed as Record<string, unknown>
  const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : "")
  const conf = str("confidence")
  const confidence =
    conf === "high" || conf === "medium" || conf === "low" ? conf : "low"
  const rawWebsite = str("website")
  const website = sanitizeWebsiteFromModel(rawWebsite)
  let notes = str("notes")
  if (rawWebsite.trim() && !website) {
    notes = notes
      ? `${notes} (Directory or invalid URL removed from website field.)`
      : "Directory or invalid URL was not used as company website."
  }
  return {
    website,
    email: str("email").trim().slice(0, 200),
    phone: str("phone").trim().slice(0, 80),
    confidence,
    notes: notes.slice(0, 500),
  }
}

const emptyResult = (partial: Partial<WebsiteDiscoveryResult>): WebsiteDiscoveryResult => ({
  skipped: false,
  googleError: null,
  aiError: null,
  enrichment: null,
  ...partial,
})

/** Appendar hela Cursor CLI-promten till den fasta loggfilen under `logs/`. */
async function appendDiscoveryPromptToLogFile(
  logPath: string,
  args: { searchQuery: string; prompt: string },
  logger?: BolagsfaktaDebugLogger,
): Promise<void> {
  const iso = new Date().toISOString()
  const block = [
    "",
    "=".repeat(80),
    `[${iso}] google_discovery_prompt → agent -p`,
    `searchQuery: ${args.searchQuery}`,
    "=".repeat(80),
    args.prompt,
    "=".repeat(80),
    "",
  ].join("\n")

  try {
    await mkdir(dirname(logPath), { recursive: true })
    await appendFile(logPath, block, "utf8")
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.warn("[bolagsfakta-google-discovery] Kunde inte skriva prompt-logg:", message)
    await logger?.error("google_discovery_prompt_log_failed", { path: logPath, message })
  }
}

/** Appendar AI-svar (rå stdout, parsad JSON, normaliserad enrichment) till samma loggfil. */
async function appendDiscoveryAiResponseToLogFile(
  logPath: string,
  args: {
    searchQuery: string
    ok: boolean
    raw?: string
    parsed?: unknown
    enrichment?: CompanyEnrichmentFromAI | null
    aiError?: string | null
  },
  logger?: BolagsfaktaDebugLogger,
): Promise<void> {
  const iso = new Date().toISOString()
  const lines: string[] = [
    "",
    "=".repeat(80),
    `[${iso}] google_discovery_ai_response`,
    `searchQuery: ${args.searchQuery}`,
    `status: ${args.ok ? "ok" : "error"}`,
    "=".repeat(80),
  ]
  if (args.ok) {
    lines.push("--- raw stdout ---")
    lines.push(args.raw ?? "")
    lines.push("--- parsed JSON ---")
    lines.push(JSON.stringify(args.parsed ?? null, null, 2))
    lines.push("--- normalized enrichment (website/email/phone/confidence/notes) ---")
    lines.push(JSON.stringify(args.enrichment ?? null, null, 2))
  } else {
    lines.push(args.aiError ?? "(unknown error)")
  }
  lines.push("=".repeat(80), "")
  const block = lines.join("\n")

  try {
    await mkdir(dirname(logPath), { recursive: true })
    await appendFile(logPath, block, "utf8")
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.warn("[bolagsfakta-google-discovery] Kunde inte skriva AI-svarslogg:", message)
    await logger?.error("google_discovery_ai_response_log_failed", { path: logPath, message })
  }
}

/** Appendar en tydlig skip-block (t.ex. inga kandidat-URLer) till samma loggfil. */
async function appendDiscoverySkipToLogFile(
  logPath: string,
  args: {
    searchQuery: string
    reason: string
    googleError?: string | null
    urlList?: string
    trimmedSerp?: string
  },
  logger?: BolagsfaktaDebugLogger,
): Promise<void> {
  const iso = new Date().toISOString()
  const block = [
    "",
    "=".repeat(80),
    `[${iso}] google_discovery_skip`,
    `searchQuery: ${args.searchQuery}`,
    `reason: ${args.reason}`,
    `googleError: ${args.googleError ?? ""}`,
    "=".repeat(80),
    "Candidate URLs:",
    args.urlList ?? "(none)",
    "",
    "SERP text (trimmed):",
    args.trimmedSerp ?? "",
    "=".repeat(80),
    "",
  ].join("\n")

  try {
    await mkdir(dirname(logPath), { recursive: true })
    await appendFile(logPath, block, "utf8")
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.warn("[bolagsfakta-google-discovery] Kunde inte skriva skip-logg:", message)
    await logger?.error("google_discovery_skip_log_failed", { path: logPath, message })
  }
}

/**
 * Google-sök, brusfilter, sedan Cursor CLI med JSON-svar.
 * Kastar inte — returnerar status.
 */
export async function logGoogleDiscoveryWebsiteSearchHint(
  display: BolagsfaktaDisplayFields,
  flat: DiscoveryFlatInput,
  logger?: BolagsfaktaDebugLogger,
): Promise<WebsiteDiscoveryResult> {
  try {
    const searchQuery = buildSearchQuery(display, flat)
    if (!searchQuery || searchQuery.length < 6) {
      await logger?.info("google_discovery_skip", { reason: "tom eller för kort sökfråga" })
      await appendDiscoverySkipToLogFile(
        DISCOVERY_PROMPT_LOG_FILE,
        { searchQuery, reason: "tom eller för kort sökfråga" },
        logger,
      )
      return {
        skipped: true,
        skipReason: "För lite data för Google-sök (saknar firmanamn/adress/orgnr eller för kort sträng).",
        googleError: null,
        aiError: null,
        enrichment: null,
      }
    }

    const { city, country } = locationFromPostadressAndSeat(display.postadress, display.seatLocation)
    const geo = geolocationForCityCountry(city, country)

    await logger?.info("google_discovery_start", {
      searchQuery,
      city,
      country,
      geolocation: geo,
    })

    let trimmedSerp = ""
    let serpForUrlList = ""
    let googleError: string | null = null
    const searchUrl = `https://www.google.com/search?hl=sv&gl=se&num=12&q=${encodeURIComponent(searchQuery)}`

    const browser = await launchStealthBrowser()
    try {
      const page = await newStealthPage(browser, { geolocation: geo })
      await page.goto(searchUrl, { waitUntil: "load", timeout: 45000 })
      await page.waitForSelector("#rso", { timeout: 20_000 }).catch(() => {})
      await delay(1500)

      try {
        await page.click('button:has-text("Accept all")', { timeout: 2500 })
        await delay(400)
      } catch {
        try {
          await page.click('button:has-text("Godkänn alla")', { timeout: 2000 })
          await delay(400)
        } catch {
          /* ingen cookie-dialog */
        }
      }

      const extracted = await extractOrganicSerpFromPage(page)
      let serpRaw = extracted
      if (serpRaw.length < 80) {
        serpRaw =
          (await page.evaluate(
            `(() => {
  const el = document.querySelector("#rso") || document.querySelector("#center_col");
  return el instanceof HTMLElement ? el.innerText : (el && el.textContent) || "";
})()`,
          )) ?? ""
      }

      serpRaw = filterDirectoryListingBlocksFromSerp(serpRaw)
      serpForUrlList = serpRaw

      trimmedSerp = stripNoiseFromSerpText(serpRaw)
      trimmedSerp = trimSerpText(trimmedSerp, 12_000)

      if (trimmedSerp.length < 40) {
        googleError = "No organic results extracted from Google (empty SERP text)."
        trimmedSerp = "(No organic results extracted from Google.)"
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      googleError = message
      await logger?.error("google_discovery_browser_failed", { message })
      console.error("[bolagsfakta-google-discovery] Webbläsare/Google misslyckades:", message)
      trimmedSerp = `(Could not fetch Google results: ${message})`
    } finally {
      await browser.close()
    }

    const companyContext = buildCompanyContextForDiscovery(display, flat)
    const urlList = buildDedupedUrlListFromSerp(serpForUrlList || trimmedSerp)

    if (urlList === "(none)") {
      await logger?.info("google_discovery_skip", {
        reason: "inga kandidat-URLer efter filtrering eller tom SERP",
        searchQuery,
        googleError,
      })
      await appendDiscoverySkipToLogFile(
        DISCOVERY_PROMPT_LOG_FILE,
        {
          searchQuery,
          reason: "inga kandidat-URLer efter filtrering eller tom SERP",
          googleError,
          urlList,
          trimmedSerp,
        },
        logger,
      )
      return {
        skipped: true,
        skipReason:
          "Inga kandidat-URLer hittades i Google-resultaten (efter filtrering) — hoppar över AI-anrop.",
        googleError,
        aiError: null,
        enrichment: null,
      }
    }

    const prompt = buildDiscoveryJsonPrompt({
      companyContext,
      searchQuery,
      city,
      country,
      urlList,
      trimmedSerp,
    })

    let aiError: string | null = null
    let enrichment: CompanyEnrichmentFromAI | null = null

    console.log("\n========== BOLAGSFAKTA → GOOGLE DISCOVERY (prompt → Cursor CLI) ==========\n")
    console.log(prompt)
    console.log("\n========== END PROMPT ==========\n")

    await appendDiscoveryPromptToLogFile(DISCOVERY_PROMPT_LOG_FILE, { searchQuery, prompt }, logger)

    await logger?.info("google_discovery_ai_request", {
      serpLength: trimmedSerp.length,
      promptLength: prompt.length,
    })

    try {
      const { raw, parsed } = await cursorCliJson({
        prompt,
        timeoutMs: 180_000,
      })
      enrichment = normalizeAICompanyJson(parsed)

      console.log("\n========== CURSOR CLI JSON (raw stdout) ==========\n")
      console.log(raw)
      console.log("\n========== CURSOR CLI PARSED ==========\n")
      console.log(JSON.stringify(enrichment ?? parsed, null, 2))
      console.log("\n========== END CURSOR CLI ==========\n")

      await appendDiscoveryAiResponseToLogFile(
        DISCOVERY_PROMPT_LOG_FILE,
        {
          searchQuery,
          ok: true,
          raw,
          parsed,
          enrichment,
        },
        logger,
      )

      await logger?.info("google_discovery_ai_ok", {
        enrichment: enrichment ?? parsed,
      })
    } catch (cursorErr) {
      aiError = cursorErr instanceof Error ? cursorErr.message : String(cursorErr)
      console.error("[bolagsfakta-google-discovery] Cursor CLI failed:", aiError)
      await appendDiscoveryAiResponseToLogFile(
        DISCOVERY_PROMPT_LOG_FILE,
        { searchQuery, ok: false, aiError },
        logger,
      )
      await logger?.error("google_discovery_ai_failed", { message: aiError })
    }

    await logger?.info("google_discovery_logged", {
      searchQuery,
      serpLength: trimmedSerp.length,
      promptLength: prompt.length,
    })

    return emptyResult({ googleError, aiError, enrichment })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error("[bolagsfakta-google-discovery] Oväntat fel:", message)
    await logger?.error("google_discovery_failed", { message })
    return emptyResult({ aiError: message, enrichment: null })
  }
}
