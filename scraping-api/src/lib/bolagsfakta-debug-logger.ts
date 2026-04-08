import { mkdir, appendFile } from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

export type BolagsfaktaDebugLevel = "info" | "warn" | "error" | "timing"

export interface BolagsfaktaDebugPayload {
  [key: string]: unknown
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOG_DIR = path.join(__dirname, "..", "..", "logs")
const LOG_FILE = path.join(LOG_DIR, "fetch-debug.log")

let dirEnsured = false

async function ensureLogDir() {
  if (dirEnsured) return
  await mkdir(LOG_DIR, { recursive: true })
  dirEnsured = true
}

function formatLine(
  level: BolagsfaktaDebugLevel,
  phase: string,
  payload: BolagsfaktaDebugPayload,
): string {
  const ts = new Date().toISOString()
  const body = JSON.stringify({ ts, level, phase, ...payload })
  return body + "\n"
}

export class BolagsfaktaDebugLogger {
  readonly sessionId: string
  private readonly context: BolagsfaktaDebugPayload

  constructor(context: BolagsfaktaDebugPayload = {}) {
    this.sessionId = `bf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    this.context = { sessionId: this.sessionId, ...context }
  }

  async log(level: BolagsfaktaDebugLevel, phase: string, payload: BolagsfaktaDebugPayload = {}) {
    const line = formatLine(level, phase, { ...this.context, ...payload })
    console.log(`[bolagsfakta-debug] ${line.trimEnd()}`)
    try {
      await ensureLogDir()
      await appendFile(LOG_FILE, line, "utf8")
    } catch (err) {
      console.warn("[bolagsfakta-debug] Kunde inte skriva till loggfil:", err)
    }
  }

  async info(phase: string, payload?: BolagsfaktaDebugPayload) {
    await this.log("info", phase, payload)
  }

  async warn(phase: string, payload?: BolagsfaktaDebugPayload) {
    await this.log("warn", phase, payload)
  }

  async error(phase: string, payload?: BolagsfaktaDebugPayload) {
    await this.log("error", phase, payload)
  }

  async time<T>(phase: string, fn: () => Promise<T>, extra?: BolagsfaktaDebugPayload): Promise<T> {
    const t0 = Date.now()
    await this.log("timing", `${phase}_start`, extra ?? {})
    try {
      const result = await fn()
      await this.log("timing", `${phase}_done`, {
        ...extra,
        durationMs: Date.now() - t0,
        ok: true,
      })
      return result
    } catch (e) {
      await this.log("error", `${phase}_failed`, {
        ...extra,
        durationMs: Date.now() - t0,
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      })
      throw e
    }
  }
}
