import { execFile } from "child_process"
import { access } from "node:fs/promises"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

export class CursorCliError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CursorCliError"
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function resolveAgentCliCommand(): Promise<string> {
  const fromEnv = process.env.AGENT_CLI_PATH?.trim()
  if (fromEnv) return fromEnv

  // On Windows, the CLI is often a .cmd shim; try common names.
  if (process.platform === "win32") {
    // Cursor Agent default install path.
    const localAppData = process.env.LOCALAPPDATA?.trim()
    if (localAppData) {
      const defaultCmd = `${localAppData}\\cursor-agent\\agent.cmd`
      if (await fileExists(defaultCmd)) return defaultCmd
    }

    const candidates = ["agent.cmd", "agent.exe", "agent"]
    for (const c of candidates) {
      // If any candidate is explicitly resolvable as a file path, prefer it.
      if (c.includes("\\") || c.includes("/") || c.includes(":")) {
        if (await fileExists(c)) return c
      }
      // Otherwise, let execFile try PATH resolution later.
    }
    return "agent"
  }

  return "agent"
}

/**
 * Kör agent CLI med en prompt (-p) och returnerar JSON-parsad output.
 * Ersätter Ollama för AI-analys.
 */
export async function cursorCliJson(args: {
  prompt: string
  timeoutMs?: number
}): Promise<{ raw: string; parsed: unknown }> {
  const timeout = args.timeoutMs ?? 120_000
  const cmd = await resolveAgentCliCommand()
  const shell =
    process.platform === "win32" && cmd.trim().toLowerCase().endsWith(".cmd")

  try {
    const { stdout, stderr } = await execFileAsync(
      cmd,
      ["--yolo", "--output-format", "json", "-p", args.prompt],
      {
        timeout,
        maxBuffer: 2 * 1024 * 1024,
        shell,
      },
    )

    if (stderr) {
      console.warn("[cursor-cli] stderr:", stderr.slice(0, 500))
    }

    const envelopeRaw = stdout.trim()
    if (!envelopeRaw) {
      throw new CursorCliError("agent returnerade tomt svar")
    }

    let envelope: unknown
    try {
      envelope = JSON.parse(envelopeRaw) as unknown
    } catch {
      throw new CursorCliError(`agent returnerade ogiltig JSON envelope: ${envelopeRaw.slice(0, 400)}`)
    }

    // agent --output-format json wraps the model output in { result: "..." }
    const envObj = (envelope && typeof envelope === "object"
      ? (envelope as Record<string, unknown>)
      : null)
    const resultText = typeof envObj?.result === "string" ? (envObj.result as string) : null

    if (!resultText) {
      return { raw: envelopeRaw, parsed: envelope }
    }

    let raw = resultText.trim()
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      throw new CursorCliError(`agent returnerade ogiltig JSON: ${raw.slice(0, 400)}`)
    }

    return { raw, parsed }
  } catch (e) {
    if (e instanceof CursorCliError) throw e

    const err = e as Error & { code?: string; killed?: boolean }
    if (err.killed || err.code === 'ETIMEDOUT') {
      throw new CursorCliError(`Cursor CLI timeout efter ${timeout} ms`)
    }
    if (err.code === "ENOENT") {
      throw new CursorCliError(
        `agent hittades inte (ENOENT). Lägg till agent i PATH eller sätt AGENT_CLI_PATH till full sökväg till agent/agent.cmd. Originalfel: ${err.message}`,
      )
    }
    throw new CursorCliError(`Cursor CLI misslyckades: ${err.message}`)
  }
}
