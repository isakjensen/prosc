import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export class CursorCliError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CursorCliError'
  }
}

/**
 * Kör Cursor CLI med en prompt och returnerar JSON-parsad output.
 * Ersätter Ollama för AI-analys.
 */
export async function cursorCliJson(args: {
  prompt: string
  timeoutMs?: number
}): Promise<{ raw: string; parsed: unknown }> {
  const timeout = args.timeoutMs ?? 120_000

  try {
    const { stdout, stderr } = await execFileAsync(
      'cursor',
      ['-p', args.prompt],
      {
        timeout,
        maxBuffer: 2 * 1024 * 1024,
      },
    )

    if (stderr) {
      console.warn('[cursor-cli] stderr:', stderr.slice(0, 500))
    }

    let raw = stdout.trim()
    if (!raw) {
      throw new CursorCliError('Cursor CLI returnerade tomt svar')
    }

    // Strip markdown code fences if present
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      throw new CursorCliError(`Cursor CLI returnerade ogiltig JSON: ${raw.slice(0, 400)}`)
    }

    return { raw, parsed }
  } catch (e) {
    if (e instanceof CursorCliError) throw e

    const err = e as Error & { code?: string; killed?: boolean }
    if (err.killed || err.code === 'ETIMEDOUT') {
      throw new CursorCliError(`Cursor CLI timeout efter ${timeout} ms`)
    }
    throw new CursorCliError(`Cursor CLI misslyckades: ${err.message}`)
  }
}
