import { type Browser, type BrowserContext, type Page } from 'playwright'
import { launchStealthBrowser, newStealthPage, BASE_URL } from './bolagsfakta-scraper.js'

const POOL_SIZE = 10

type Slot = {
  browser: Browser
  context: BrowserContext
  busy: boolean
}

let slots: Slot[] = []
let initPromise: Promise<void> | null = null

async function buildSlot(browser: Browser): Promise<Slot> {
  const page = await newStealthPage(browser)
  const context = page.context()
  // Besök bolagsfakta.se en gång för att lösa Cloudflare-challenge och spara cookie
  try {
    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 45000 })
  } catch { /* ignore */ }
  await page.close()
  return { browser, context, busy: false }
}

async function init() {
  console.log(`[context-pool] Värmer upp ${POOL_SIZE} browser-contexts...`)
  const browsersNeeded = Math.ceil(POOL_SIZE / 4)
  const browsers = await Promise.all(
    Array.from({ length: browsersNeeded }, () => launchStealthBrowser())
  )
  slots = await Promise.all(
    Array.from({ length: POOL_SIZE }, (_, i) => buildSlot(browsers[i % browsers.length]))
  )
  console.log(`[context-pool] Klar — ${POOL_SIZE} contexts redo`)
}

function getAvailableSlot(): Slot | null {
  return slots.find(s => !s.busy) ?? null
}

export async function borrowContext(): Promise<{ page: Page; release: () => void }> {
  if (!initPromise) initPromise = init()
  await initPromise

  // Vänta på en ledig slot (polling med backoff)
  let slot: Slot | null = null
  let waited = 0
  while (!slot) {
    slot = getAvailableSlot()
    if (!slot) {
      await new Promise(r => setTimeout(r, 50))
      waited += 50
      if (waited > 30000) throw new Error('[context-pool] Timeout: ingen ledig context på 30s')
    }
  }

  slot.busy = true
  let page: Page

  try {
    page = await slot.context.newPage()
  } catch {
    // Context kraschad — bygg ny
    console.log('[context-pool] Context kraschad, skapar ny...')
    try { await slot.context.close() } catch { /* ignore */ }
    const newSlot = await buildSlot(slot.browser).catch(async () => {
      // Browser också kraschad — starta helt ny
      const browser = await launchStealthBrowser()
      return buildSlot(browser)
    })
    slot.browser = newSlot.browser
    slot.context = newSlot.context
    page = await slot.context.newPage()
  }

  const release = () => {
    page.close().catch(() => {})
    slot!.busy = false
  }

  return { page, release }
}
