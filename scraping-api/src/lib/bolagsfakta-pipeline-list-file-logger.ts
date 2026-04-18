import { appendFile, mkdir } from "node:fs/promises"
import path from "node:path"

const LOG_DIR = "logs"
const LOG_FILE = "bolagsfakta-pipeline-list-scrape.log"

function logPath(): string {
  return path.join(process.cwd(), LOG_DIR, LOG_FILE)
}

/**
 * Appendrad till logs/bolagsfakta-pipeline-list-scrape.log (under scraping-api roten).
 * Fel vid skrivning swallow:as så listskrapning inte påverkas.
 */
export async function bolagsfaktaPipelineListLog(line: string): Promise<void> {
  try {
    const dir = path.join(process.cwd(), LOG_DIR)
    await mkdir(dir, { recursive: true })
    const ts = new Date().toISOString()
    await appendFile(logPath(), `[${ts}] ${line}\n`, "utf8")
  } catch (err) {
    console.error("[bolagsfakta-pipeline-list-log] kunde inte skriva loggfil:", err)
  }
}
