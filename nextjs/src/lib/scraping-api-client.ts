import http from "node:http"
import https from "node:https"
import { NextResponse } from "next/server"
import type { WebsiteDiscoveryResult } from "@/lib/website-discovery-types"

/** Visas när scraping-tjänsten saknas eller inte svarar (förutom 400/404/409 där vi behåller mer specifik text). */
export const SCRAPER_TROUBLE_MESSAGE =
  "Scrapern strular eller svarar inte. Kontrollera att scraping-tjänsten körs och försök igen."

export const SCRAPER_NOT_CONFIGURED_MESSAGE =
  "Scraper-API är inte konfigurerat. Sätt SCRAPING_API_URL och SCRAPING_API_KEY i miljön."

type ScrapingApiConfig = { baseUrl: string; apiKey: string }

/**
 * Node (Undici) on Windows often resolves `localhost` to ::1 first while a server may only
 * accept IPv4 — connection then hangs until timeout (~10s) and `fetch` throws "fetch failed".
 * Force IPv4 loopback for local scraper URLs.
 */
function normalizeScrapingApiBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "")
  if (!trimmed) return trimmed
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
  try {
    const u = new URL(withProtocol)
    const h = u.hostname.toLowerCase()
    if (h === "localhost" || h === "::1") {
      u.hostname = "127.0.0.1"
    }
    const path = u.pathname.replace(/\/+$/, "") || ""
    const basePath = path === "/" ? "" : path
    return `${u.protocol}//${u.host}${basePath}`
  } catch {
    return trimmed.replace(/\/+$/, "")
  }
}

function getConfig(): ScrapingApiConfig | null {
  const baseUrlRaw = process.env.SCRAPING_API_URL?.trim()
  const apiKey = process.env.SCRAPING_API_KEY?.trim()
  if (!baseUrlRaw || !apiKey) return null
  return { baseUrl: normalizeScrapingApiBaseUrl(baseUrlRaw), apiKey }
}

function canUseNodeHttpClient(): boolean {
  return typeof window === "undefined" && typeof process !== "undefined" && Boolean(process.versions?.node)
}

async function readRequestBodyAsString(body: RequestInit["body"]): Promise<string | undefined> {
  if (body == null) return undefined
  if (typeof body === "string") return body
  if (body instanceof ArrayBuffer) return Buffer.from(body).toString()
  if (ArrayBuffer.isView(body)) {
    const v = body as ArrayBufferView
    return Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString()
  }
  if (body instanceof Blob) return await body.text()
  return await new Response(body as BodyInit).text()
}

function scrapingRequestWithNodeHttp(
  urlStr: string,
  method: string,
  headerObj: Record<string, string>,
  body: string | undefined,
): Promise<Response> {
  const u = new URL(urlStr)
  const isHttps = u.protocol === "https:"
  const lib = isHttps ? https : http
  const port = u.port ? Number(u.port) : isHttps ? 443 : 80
  const loopback =
    u.hostname === "127.0.0.1" || u.hostname === "localhost" || u.hostname === "::1"

  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: u.hostname,
        port,
        path: `${u.pathname}${u.search}`,
        method,
        headers: headerObj,
        ...(loopback ? { family: 4 } : {}),
      },
      (incoming) => {
        const chunks: Buffer[] = []
        incoming.on("data", (c: Buffer) => chunks.push(c))
        incoming.on("end", () => {
          const buf = Buffer.concat(chunks)
          const outHeaders = new Headers()
          for (const [key, val] of Object.entries(incoming.headers)) {
            if (val === undefined) continue
            if (Array.isArray(val)) for (const item of val) outHeaders.append(key, item)
            else outHeaders.append(key, val)
          }
          resolve(
            new Response(buf, {
              status: incoming.statusCode ?? 502,
              headers: outHeaders,
            }),
          )
        })
        incoming.on("error", reject)
      },
    )
    req.on("error", reject)
    if (body !== undefined && body.length > 0) req.write(body)
    req.end()
  })
}

async function scrapingApiFetchWithNodeHttp(url: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase()
  const headers = new Headers(init?.headers)
  const headerObj: Record<string, string> = {}
  headers.forEach((v, k) => {
    headerObj[k] = v
  })
  let bodyStr: string | undefined
  if (init?.body != null && method !== "GET" && method !== "HEAD") {
    bodyStr = await readRequestBodyAsString(init.body)
  }
  return scrapingRequestWithNodeHttp(url, method, headerObj, bodyStr)
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
  if (process.env.VERCEL) {
    const host = new URL(url).hostname
    if (host === "127.0.0.1" || host === "localhost" || host === "::1") {
      throw new Error(
        "SCRAPING_API_URL kan inte peka på localhost när Next.js körs på Vercel — använd en nåbar adress till scraping-api.",
      )
    }
  }
  const headers = new Headers(init?.headers)
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${cfg.apiKey}`)
  }
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  const merged: RequestInit = { ...init, headers }
  // Undici `fetch` on Windows can still fail toward loopback ("fetch failed"); Node http is reliable.
  if (canUseNodeHttpClient()) {
    return scrapingApiFetchWithNodeHttp(url, merged)
  }
  return fetch(url, merged)
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

type PollFailureKind = "job_failed" | "status_error" | "timeout"

async function pollJobUntilComplete(
  jobId: string,
  options: { timeoutMs: number; intervalMs: number },
): Promise<
  | { ok: true; returnvalue: JobStatusPayload["returnvalue"] }
  | { ok: false; error: string; status: number; kind: PollFailureKind }
> {
  const start = Date.now()
  while (Date.now() - start < options.timeoutMs) {
    const st = await getJobStatus(jobId)
    if (!st.ok) {
      return { ok: false, error: st.error, status: 502, kind: "status_error" }
    }
    const { state, failedReason, returnvalue } = st.data
    if (state === "completed") {
      return { ok: true, returnvalue }
    }
    if (state === "failed") {
      return {
        ok: false,
        error: failedReason ?? "Scraper-jobb misslyckades",
        status: 500,
        kind: "job_failed",
      }
    }
    await new Promise((r) => setTimeout(r, options.intervalMs))
  }
  return {
    ok: false,
    error: "Timeout: scraper-jobbet blev inte klart i tid",
    status: 504,
    kind: "timeout",
  }
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
    const userError =
      done.kind === "job_failed"
        ? `Scrapern misslyckades: ${done.error}`
        : done.kind === "timeout"
          ? "Scrapern hann inte klart i tid — försök igen."
          : SCRAPER_TROUBLE_MESSAGE
    return NextResponse.json(
      { error: userError, detail: done.error, sessionId: jobId },
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
 * Rensar "Körs" / detalj-Kö som fastnat i DB när Redis/workers startats om (scraping-api).
 * Ignorerar fel om scraper inte är konfigurerad eller tillfälligt nere.
 */
export async function reconcileBolagsfaktaStaleStatusViaApi(pipelineId?: string): Promise<void> {
  if (!getConfig()) return
  try {
    const res = await scrapingApiFetch("/api/pipelines/reconcile-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pipelineId ? { pipelineId } : {}),
    })
    if (!res.ok) {
      await res.text().catch(() => "")
    }
  } catch {
    /* scraper otillgänglig — sidan visas ändå med ev. gammal status */
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
