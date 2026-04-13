import { NextResponse } from "next/server"
import type { WebsiteDiscoveryResult } from "@/lib/website-discovery-types"

/** Visas när scraping-tjänsten saknas eller inte svarar (förutom 400/404/409 där vi behåller mer specifik text). */
export const SCRAPER_TROUBLE_MESSAGE =
  "Scrapern strular eller svarar inte. Kontrollera att scraping-tjänsten körs och försök igen."

export const SCRAPER_NOT_CONFIGURED_MESSAGE =
  "Scraper-API är inte konfigurerat. Sätt SCRAPING_API_URL och SCRAPING_API_KEY i miljön."

type ScrapingApiConfig = { baseUrl: string; apiKey: string }

function getConfig(): ScrapingApiConfig | null {
  const baseUrl = process.env.SCRAPING_API_URL?.trim()
  const apiKey = process.env.SCRAPING_API_KEY?.trim()
  if (!baseUrl || !apiKey) return null
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey }
}

export function isScrapingApiConfigured(): boolean {
  return getConfig() !== null
}

/** Svar när env saknas — använd i API-rutter som kräver scraper. */
export function scrapingApiNotConfiguredResponse(): NextResponse {
  return NextResponse.json({ error: SCRAPER_NOT_CONFIGURED_MESSAGE }, { status: 503 })
}

export async function scrapingApiFetch(path: string, init?: RequestInit): Promise<Response> {
  const cfg = getConfig()
  if (!cfg) {
    throw new Error(SCRAPER_NOT_CONFIGURED_MESSAGE)
  }
  const url = `${cfg.baseUrl}${path.startsWith("/") ? path : `/${path}`}`
  const headers = new Headers(init?.headers)
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${cfg.apiKey}`)
  }
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  return fetch(url, { ...init, headers })
}

function mapUpstreamToClientError(status: number): number {
  if (status === 404 || status === 409 || status === 400) return status
  if (status === 503) return 503
  return 502
}

function scraperFailureResponse(
  upstreamStatus: number,
  body: Record<string, unknown>,
): NextResponse {
  const specific = typeof body.error === "string" ? body.error : null
  const clientStatus = mapUpstreamToClientError(upstreamStatus)

  if (clientStatus === 404 || clientStatus === 409 || clientStatus === 400) {
    return NextResponse.json(
      { error: specific ?? SCRAPER_TROUBLE_MESSAGE },
      { status: clientStatus },
    )
  }

  return NextResponse.json(
    {
      error: SCRAPER_TROUBLE_MESSAGE,
      detail: specific ?? undefined,
    },
    { status: clientStatus },
  )
}

type JobStatusPayload = {
  jobId: string
  state: string
  failedReason?: string
  returnvalue?: {
    websiteDiscovery?: WebsiteDiscoveryResult | null
    [key: string]: unknown
  }
}

async function getJobStatus(jobId: string): Promise<{ ok: true; data: JobStatusPayload } | { ok: false; error: string }> {
  try {
    const res = await scrapingApiFetch(`/api/jobs/${encodeURIComponent(String(jobId))}`)
    const data = (await res.json().catch(() => ({}))) as JobStatusPayload & { error?: string }
    if (!res.ok) {
      return { ok: false, error: data.error ?? `HTTP ${res.status}` }
    }
    return { ok: true, data: data as JobStatusPayload }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Kunde inte läsa jobbstatus" }
  }
}

async function pollJobUntilComplete(
  jobId: string,
  options: { timeoutMs: number; intervalMs: number },
): Promise<
  | { ok: true; returnvalue: JobStatusPayload["returnvalue"] }
  | { ok: false; error: string; status: number }
> {
  const start = Date.now()
  while (Date.now() - start < options.timeoutMs) {
    const st = await getJobStatus(jobId)
    if (!st.ok) {
      return { ok: false, error: st.error, status: 502 }
    }
    const { state, failedReason, returnvalue } = st.data
    if (state === "completed") {
      return { ok: true, returnvalue }
    }
    if (state === "failed") {
      return { ok: false, error: failedReason ?? "Scraper-jobb misslyckades", status: 500 }
    }
    await new Promise((r) => setTimeout(r, options.intervalMs))
  }
  return { ok: false, error: "Timeout: scraper-jobbet blev inte klart i tid", status: 504 }
}

/** POST /api/pipelines/:id/scrape */
export async function runPipelineScrapeViaApi(pipelineId: string): Promise<NextResponse> {
  if (!getConfig()) return scrapingApiNotConfiguredResponse()

  try {
    const res = await scrapingApiFetch(`/api/pipelines/${encodeURIComponent(pipelineId)}/scrape`, {
      method: "POST",
    })
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (res.ok && res.status >= 200 && res.status < 300) {
      return NextResponse.json({ ok: true, message: "Scraping startad", ...body })
    }
    return scraperFailureResponse(res.status, body)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: SCRAPER_TROUBLE_MESSAGE, detail: msg }, { status: 503 })
  }
}

async function runQueuedDetailJobThenRespond(
  res: Response,
  pollOptions: { timeoutMs: number; intervalMs: number },
): Promise<NextResponse> {
  const queued = (await res.json().catch(() => ({}))) as { jobId?: string; error?: string }

  if (!res.ok) {
    return scraperFailureResponse(res.status, queued as Record<string, unknown>)
  }

  if (res.status !== 202 || !queued.jobId) {
    return NextResponse.json(
      { error: SCRAPER_TROUBLE_MESSAGE, detail: queued.error ?? "Saknade jobb-id från scraper" },
      { status: 502 },
    )
  }

  const jobId = String(queued.jobId)
  const done = await pollJobUntilComplete(jobId, pollOptions)

  if (!done.ok) {
    return NextResponse.json(
      { error: SCRAPER_TROUBLE_MESSAGE, detail: done.error, sessionId: jobId },
      { status: done.status >= 500 ? 502 : done.status },
    )
  }

  const websiteDiscovery = done.returnvalue?.websiteDiscovery ?? null
  return NextResponse.json({
    ok: true,
    sessionId: jobId,
    websiteDiscovery,
  })
}

/** Pipeline-rad: fetch-detail */
export async function runFetchDetailViaApi(
  pipelineId: string,
  foretagId: string,
  customerId: string,
  bolagsfaktaUrl: string,
  pollOptions: { timeoutMs: number; intervalMs: number },
): Promise<NextResponse> {
  if (!getConfig()) return scrapingApiNotConfiguredResponse()

  try {
    const res = await scrapingApiFetch(
      `/api/pipelines/${encodeURIComponent(pipelineId)}/companies/${encodeURIComponent(foretagId)}/fetch-detail`,
      {
        method: "POST",
        body: JSON.stringify({ customerId, bolagsfaktaUrl }),
      },
    )
    return runQueuedDetailJobThenRespond(res, pollOptions)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: SCRAPER_TROUBLE_MESSAGE, detail: msg }, { status: 503 })
  }
}

/** Pipeline-rad: queue fetch-detail (return immediately) */
export async function queueFetchDetailViaApi(
  pipelineId: string,
  foretagId: string,
  customerId: string,
  bolagsfaktaUrl: string,
): Promise<NextResponse> {
  if (!getConfig()) return scrapingApiNotConfiguredResponse()

  try {
    const res = await scrapingApiFetch(
      `/api/pipelines/${encodeURIComponent(pipelineId)}/companies/${encodeURIComponent(foretagId)}/fetch-detail`,
      {
        method: "POST",
        body: JSON.stringify({ customerId, bolagsfaktaUrl }),
      },
    )

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (res.ok && res.status >= 200 && res.status < 300) {
      return NextResponse.json({ ok: true, ...body }, { status: res.status })
    }
    return scraperFailureResponse(res.status, body)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: SCRAPER_TROUBLE_MESSAGE, detail: msg }, { status: 503 })
  }
}

/** Kund-sida: uppdatera Bolagsfakta utan pipeline */
export async function runCustomerBolagsfaktaRefreshViaApi(
  customerId: string,
  pollOptions: { timeoutMs: number; intervalMs: number },
): Promise<NextResponse> {
  if (!getConfig()) return scrapingApiNotConfiguredResponse()

  try {
    const res = await scrapingApiFetch(
      `/api/customers/${encodeURIComponent(customerId)}/company-facts/refresh`,
      { method: "POST" },
    )
    return runQueuedDetailJobThenRespond(res, pollOptions)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: SCRAPER_TROUBLE_MESSAGE, detail: msg }, { status: 503 })
  }
}

/**
 * Synkar bransch-cache via scraper-API (skriver till samma DB). Anropas när Next behöver färsk data.
 */
export async function syncBranscherViaScrapingApi(
  kommunSlug: string,
  forceRefresh: boolean,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (!getConfig()) {
    return { ok: false, response: scrapingApiNotConfiguredResponse() }
  }

  try {
    const q = forceRefresh ? "?refresh=1" : ""
    const res = await scrapingApiFetch(
      `/api/municipalities/${encodeURIComponent(kommunSlug)}/industries${q}`,
    )
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
      return { ok: false, response: scraperFailureResponse(res.status, body) }
    }
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      ok: false,
      response: NextResponse.json({ error: SCRAPER_TROUBLE_MESSAGE, detail: msg }, { status: 503 }),
    }
  }
}
