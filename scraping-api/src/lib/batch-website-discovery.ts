import { prisma } from "./db.js"
import { cursorCliJson, CursorCliError } from "./cursor-cli-client.js"
import { appendFile, mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const SCRAPING_API_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const BATCH_DISCOVERY_LOG = join(SCRAPING_API_ROOT, "logs", "batch-website-discovery.log")

export type BatchCompanyInput = {
  foretagId: string
  customerId: string
  namn: string
  orgNummer: string | null
  adress: string | null
  postadress: string | null
  gatuadress: string | null
  seatLocation: string | null
  bransch: string | null
}

export type BatchCompanyResult = {
  foretagId: string
  customerId: string
  website: string | null
  email: string | null
  phone: string | null
  confidence: "high" | "medium" | "low" | "none"
  notes: string
  error: string | null
}

export type BatchDiscoveryProgress = {
  pipelineId: string
  totalCompanies: number
  totalBatches: number
  completedBatches: number
  results: BatchCompanyResult[]
  startedAt: string
  updatedAt: string
}

const BLOCKED_HOSTS = [
  "hitta.se", "eniro.se", "allabolag.se", "bolagsfakta.se",
  "ratsit.se", "merinfo.se", "proff.se", "syna.se", "uc.se",
  "kreditrapporten.se", "foretagsfakta.se", "solidinfo.se",
  "biznode.se", "duns.se", "upplysning.se", "creditsafe.se",
  "largestcompanies.se", "kompass.com", "gulasidorna.se",
  "telefonkatalogen.se", "bokadirekt.se",
  "facebook.com", "linkedin.com", "instagram.com",
  "twitter.com", "x.com", "youtube.com", "tiktok.com",
  "yelp.com", "yelp.se", "trustpilot.com", "trustpilot.se",
  "google.com", "google.se", "wikipedia.org",
  "apple.com", "play.google.com",
]

function buildBatchPrompt(companies: BatchCompanyInput[]): string {
  const companiesBlock = companies
    .map((c, i) => {
      const lines: string[] = [`  Company ${i + 1} (id: ${c.foretagId}):`]
      lines.push(`    Name: ${c.namn}`)
      if (c.orgNummer) lines.push(`    Org.nr: ${c.orgNummer}`)
      if (c.adress) lines.push(`    Address: ${c.adress}`)
      if (c.gatuadress) lines.push(`    Street: ${c.gatuadress}`)
      if (c.postadress) lines.push(`    Postal: ${c.postadress}`)
      if (c.seatLocation) lines.push(`    City/Seat: ${c.seatLocation}`)
      if (c.bransch) lines.push(`    Industry: ${c.bransch}`)
      return lines.join("\n")
    })
    .join("\n\n")

  const blockedList = BLOCKED_HOSTS.join(", ")

  return `Task: Find the official website for each of the following ${companies.length} Swedish companies. For each company, search the web to find their real, official website (the site they operate for customers — product/service pages, contact info, or brand site).

Rules:
- NEVER return URLs from these directory/registry/social sites: ${blockedList}
- Only return the company's OWN official website domain
- If you cannot find a website with reasonable confidence, set website to "" and confidence to "none"
- Use the company name + city/address to distinguish companies with common names
- Prefer .se domains for Swedish companies but accept other TLDs if clearly official
- Verify the website actually belongs to the company (check that company name appears on the site)

Companies to look up:

${companiesBlock}

Reply with ONLY a JSON array (no markdown, no explanation), one object per company in the same order, exactly:
[
  {
    "id": "<foretagId>",
    "website": "https://example.se",
    "email": "",
    "phone": "",
    "confidence": "high",
    "notes": ""
  }
]

confidence must be one of: "high", "medium", "low", "none".
If no website is found, set website to "" and confidence to "none".
`
}

function sanitizeUrl(raw: string): string {
  const s = raw.trim()
  if (!s) return ""
  const m = s.match(/https?:\/\/[^\s›"'<>[\]()]+/i)
  if (!m) return ""
  const candidate = m[0].replace(/[›.,;)\]}]+$/g, "")
  try {
    const u = new URL(candidate)
    const h = u.hostname.replace(/^www\./i, "").toLowerCase()
    if (BLOCKED_HOSTS.some((b) => h === b || h.endsWith(`.${b}`))) return ""
    const path = u.pathname.length > 200 ? u.pathname.slice(0, 200) : u.pathname
    return `${u.origin}${path === "/" ? "" : path}`.slice(0, 500)
  } catch {
    return ""
  }
}

function normalizeConfidence(raw: string): "high" | "medium" | "low" | "none" {
  const c = raw?.toLowerCase().trim()
  if (c === "high" || c === "medium" || c === "low" || c === "none") return c
  return "low"
}

function parseAgentBatchResponse(
  parsed: unknown,
  inputCompanies: BatchCompanyInput[],
): BatchCompanyResult[] {
  const results: BatchCompanyResult[] = []
  const arr = Array.isArray(parsed) ? parsed : []
  const idMap = new Map(inputCompanies.map((c) => [c.foretagId, c]))

  for (const company of inputCompanies) {
    const match = arr.find(
      (item: Record<string, unknown>) =>
        typeof item === "object" && item !== null && (item as Record<string, unknown>).id === company.foretagId,
    ) as Record<string, unknown> | undefined

    if (!match) {
      results.push({
        foretagId: company.foretagId,
        customerId: company.customerId,
        website: null,
        email: null,
        phone: null,
        confidence: "none",
        notes: "Agent did not return result for this company",
        error: null,
      })
      continue
    }

    const rawWebsite = typeof match.website === "string" ? match.website : ""
    const website = sanitizeUrl(rawWebsite) || null
    const email = typeof match.email === "string" ? match.email.trim().slice(0, 200) : null
    const phone = typeof match.phone === "string" ? match.phone.trim().slice(0, 80) : null
    const confidence = normalizeConfidence(typeof match.confidence === "string" ? match.confidence : "low")
    const notes = typeof match.notes === "string" ? match.notes.slice(0, 500) : ""

    results.push({
      foretagId: company.foretagId,
      customerId: company.customerId,
      website: website || null,
      email: email || null,
      phone: phone || null,
      confidence: website ? confidence : "none",
      notes,
      error: null,
    })
  }

  return results
}

async function appendToLog(message: string): Promise<void> {
  try {
    await mkdir(dirname(BATCH_DISCOVERY_LOG), { recursive: true })
    const line = `[${new Date().toISOString()}] ${message}\n`
    await appendFile(BATCH_DISCOVERY_LOG, line, "utf8")
  } catch {
    /* ignore log errors */
  }
}

export async function discoverWebsitesForBatch(
  companies: BatchCompanyInput[],
  batchIndex: number,
  totalBatches: number,
): Promise<BatchCompanyResult[]> {
  if (companies.length === 0) return []

  const companyNames = companies.map((c) => c.namn).join(", ")
  await appendToLog(
    `batch ${batchIndex + 1}/${totalBatches} — ${companies.length} companies: ${companyNames}`,
  )

  const prompt = buildBatchPrompt(companies)

  await appendToLog(`prompt length: ${prompt.length} chars`)

  try {
    const { raw, parsed } = await cursorCliJson({
      prompt,
      timeoutMs: 300_000,
    })

    await appendToLog(`agent response (raw ${raw.length} chars): ${raw.slice(0, 500)}`)

    const results = parseAgentBatchResponse(parsed, companies)
    const found = results.filter((r) => r.website).length
    await appendToLog(
      `batch ${batchIndex + 1} done — found ${found}/${companies.length} websites`,
    )

    return results
  } catch (e) {
    const message = e instanceof CursorCliError ? e.message : String(e)
    await appendToLog(`batch ${batchIndex + 1} FAILED: ${message}`)

    return companies.map((c) => ({
      foretagId: c.foretagId,
      customerId: c.customerId,
      website: null,
      email: null,
      phone: null,
      confidence: "none" as const,
      notes: "",
      error: message,
    }))
  }
}

export async function persistBatchResults(results: BatchCompanyResult[]): Promise<void> {
  for (const r of results) {
    if (!r.website) continue

    try {
      await prisma.bolagsfaktaData.updateMany({
        where: { customerId: r.customerId },
        data: { discoveredWebsite: r.website },
      })

      const cust = await prisma.customer.findUnique({
        where: { id: r.customerId },
        select: { website: true },
      })
      if (cust && !cust.website?.trim()) {
        await prisma.customer.update({
          where: { id: r.customerId },
          data: { website: r.website },
        })
      }
    } catch (e) {
      console.error(
        `[batch-website-discovery] Failed to persist website for customer ${r.customerId}:`,
        e instanceof Error ? e.message : e,
      )
    }
  }
}

export async function loadCompaniesForDiscovery(
  pipelineId: string,
): Promise<BatchCompanyInput[]> {
  const foretag = await prisma.bolagsfaktaForetag.findMany({
    where: {
      pipelineId,
      isRedlisted: false,
      customerId: { not: null },
    },
    include: {
      customer: {
        select: {
          id: true,
          website: true,
          bolagsfaktaData: {
            select: {
              discoveredWebsite: true,
              firmaNamn: true,
              gatuadress: true,
              postadress: true,
              seatLocation: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  return foretag
    .filter((f) => {
      if (!f.customerId || !f.customer) return false
      const hasWebsite = f.customer.website?.trim() || f.customer.bolagsfaktaData?.discoveredWebsite?.trim()
      return !hasWebsite
    })
    .map((f) => ({
      foretagId: f.id,
      customerId: f.customerId!,
      namn: f.customer?.bolagsfaktaData?.firmaNamn || f.namn,
      orgNummer: f.orgNummer,
      adress: f.adress,
      postadress: f.customer?.bolagsfaktaData?.postadress || null,
      gatuadress: f.customer?.bolagsfaktaData?.gatuadress || null,
      seatLocation: f.customer?.bolagsfaktaData?.seatLocation || null,
      bransch: null,
    }))
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}
