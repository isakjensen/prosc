import { type Browser } from 'playwright'
import { launchStealthBrowser } from './bolagsfakta-scraper.js'

const POOL_SIZE = 3

let pool: Browser[] = []
let initializing = false
let initPromise: Promise<void> | null = null

async function initPool() {
  if (pool.length >= POOL_SIZE) return
  pool = await Promise.all(Array.from({ length: POOL_SIZE }, () => launchStealthBrowser()))
  console.log(`[browser-pool] Startade ${POOL_SIZE} delade browsers`)
}

export async function getSharedBrowser(): Promise<Browser> {
  if (pool.length === 0 && !initializing) {
    initializing = true
    initPromise = initPool()
  }
  if (initPromise) await initPromise

  // Round-robin — välj browser med minst öppna contexts
  let best = pool[0]
  for (const b of pool) {
    try {
      const ctxs = b.contexts()
      const bestCtxs = best.contexts()
      if (ctxs.length < bestCtxs.length) best = b
    } catch { /* browser stängd */ }
  }

  // Starta om kraschad browser
  try {
    if (!best.isConnected()) {
      const idx = pool.indexOf(best)
      best = await launchStealthBrowser()
      pool[idx] = best
      console.log('[browser-pool] Startade om kraschad browser')
    }
  } catch {
    best = await launchStealthBrowser()
    pool.push(best)
  }

  return best
}
