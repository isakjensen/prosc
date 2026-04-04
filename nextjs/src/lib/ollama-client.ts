/**
 * Lokal Ollama HTTP API (standardport 11434).
 * @see https://github.com/ollama/ollama/blob/main/docs/api.md
 */

const DEFAULT_BASE = "http://127.0.0.1:11434"

export function getOllamaBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, "")
}

export function getOllamaModel(): string {
  return process.env.OLLAMA_MODEL ?? "llama3.2:3b"
}

export type OllamaChatResponse = {
  message?: { role: string; content: string }
  done?: boolean
}

export async function ollamaChatJson(args: {
  model: string
  userPrompt: string
  /** JSON Schema för strukturerat svar (Ollama 0.5+). */
  format?: Record<string, unknown> | "json"
  timeoutMs?: number
}): Promise<{ raw: string; parsed: unknown }> {
  const base = getOllamaBaseUrl()
  const url = `${base}/api/chat`
  const body: Record<string, unknown> = {
    model: args.model,
    messages: [{ role: "user", content: args.userPrompt }],
    stream: false,
  }
  if (args.format !== undefined) {
    body.format = args.format
  }

  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), args.timeoutMs ?? 180_000)

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      throw new Error(`Ollama HTTP ${res.status}: ${errText.slice(0, 500)}`)
    }
    const data = (await res.json()) as OllamaChatResponse
    let raw = data.message?.content?.trim() ?? ""
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
    if (!raw) throw new Error("Ollama returned empty message.content")
    let parsed: unknown
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      throw new Error(`Ollama response is not valid JSON: ${raw.slice(0, 400)}`)
    }
    return { raw, parsed }
  } finally {
    clearTimeout(t)
  }
}
