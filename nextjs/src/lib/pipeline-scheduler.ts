/**
 * In-process scheduler that checks every 30s for PENDING schedule entries
 * whose scheduledAt <= now, acquires a DB-level lock to avoid double-running
 * across multiple Next.js worker processes, and fires them sequentially.
 *
 * Start once by calling startPipelineScheduler() from instrumentation.ts.
 */

import { PrismaClient } from '@prisma/client'

// Use a plain PrismaClient here (no audit extension) to avoid circular imports
// and to keep scheduler operations out of the audit log.
const schedulerDb = new PrismaClient()

const LOCK_ID = 'singleton'
const LOCK_DURATION_MS = 60_000
const POLL_INTERVAL_MS = 30_000

async function tryAcquireLock(): Promise<boolean> {
  const now = new Date()
  const lockedUntil = new Date(now.getTime() + LOCK_DURATION_MS)

  try {
    // Upsert: only update if row doesn't exist OR current lock has expired
    await schedulerDb.$executeRaw`
      INSERT INTO bolagsfakta_pipeline_scheduler_lock (id, lockedAt, lockedUntil)
      VALUES (${LOCK_ID}, ${now}, ${lockedUntil})
      ON DUPLICATE KEY UPDATE
        lockedAt = IF(lockedUntil < ${now}, ${now}, lockedAt),
        lockedUntil = IF(lockedUntil < ${now}, ${lockedUntil}, lockedUntil)
    `

    // Check if we actually own the lock (lockedAt must be within a few ms of now)
    const lock = await schedulerDb.bolagsfaktaPipelineSchedulerLock.findUnique({
      where: { id: LOCK_ID },
    })
    if (!lock) return false

    // We own it if lockedUntil is roughly our expected value (within 2s tolerance)
    const diff = Math.abs(lock.lockedUntil.getTime() - lockedUntil.getTime())
    return diff < 2000
  } catch {
    return false
  }
}

async function runScheduledEntries() {
  const now = new Date()

  const pending = await schedulerDb.bolagsfaktaPipelineSchedule.findMany({
    where: { status: 'PENDING', scheduledAt: { lte: now } },
    orderBy: [{ scheduledAt: 'asc' }, { runOrder: 'asc' }],
    include: { pipeline: { select: { id: true, namn: true, status: true } } },
  })

  if (pending.length === 0) return

  console.log(`[scheduler] ${pending.length} schemalagda pipeline(s) att köra`)

  for (const entry of pending) {
    // Mark this entry as RUNNING before firing
    await schedulerDb.bolagsfaktaPipelineSchedule.update({
      where: { id: entry.id },
      data: { status: 'RUNNING' },
    })

    try {
      const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:3000'
      const url = `${baseUrl}/api/pipelines/${entry.pipelineId}/scrape`

      const apiKey = process.env.INTERNAL_API_KEY ?? ''
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.error(`[scheduler] Pipeline ${entry.pipelineId} misslyckades (${res.status}): ${body}`)
        await schedulerDb.bolagsfaktaPipelineSchedule.update({
          where: { id: entry.id },
          data: { status: 'FAILED' },
        })
        continue
      }

      // Wait for the pipeline to finish before starting the next one (sequential)
      await waitForPipelineIdle(entry.pipelineId)

      await schedulerDb.bolagsfaktaPipelineSchedule.update({
        where: { id: entry.id },
        data: { status: 'COMPLETED' },
      })

      console.log(`[scheduler] Pipeline ${entry.pipeline.namn} (${entry.pipelineId}) klar`)
    } catch (err) {
      console.error(`[scheduler] Fel vid körning av pipeline ${entry.pipelineId}:`, err)
      await schedulerDb.bolagsfaktaPipelineSchedule.update({
        where: { id: entry.id },
        data: { status: 'FAILED' },
      }).catch(() => {})
    }
  }
}

async function waitForPipelineIdle(pipelineId: string, timeoutMs = 3_600_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const pipeline = await schedulerDb.bolagsfaktaPipeline.findUnique({
      where: { id: pipelineId },
      select: { status: true },
    })
    if (!pipeline || pipeline.status !== 'RUNNING') return
    await new Promise((r) => setTimeout(r, 5_000))
  }
}

let started = false

export function startPipelineScheduler() {
  // Only start once per process
  if (started) return
  started = true

  const tick = async () => {
    try {
      const hasLock = await tryAcquireLock()
      if (!hasLock) return
      await runScheduledEntries()
    } catch (err) {
      console.error('[scheduler] Oväntat fel:', err)
    }
  }

  // Run immediately on boot, then on interval
  void tick()
  setInterval(tick, POLL_INTERVAL_MS)
}
