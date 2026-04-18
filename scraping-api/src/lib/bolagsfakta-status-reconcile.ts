import { prisma } from './db.js'
import { fetchDetailQueue, scrapePipelineQueue } from './queue.js'

type ScrapeJobData = { pipelineId?: string }

/** Pipeline-id:n som faktiskt har ett listskrapnings-jobb i kön (väntar eller körs). */
export async function getActiveScrapePipelineIds(): Promise<Set<string>> {
  const ids = new Set<string>()
  const jobs = await scrapePipelineQueue.getJobs(
    ['waiting', 'active', 'delayed'],
    0,
    500,
    false,
  )
  for (const job of jobs) {
    const pid = (job.data as ScrapeJobData).pipelineId
    if (pid) ids.add(pid)
  }
  return ids
}

/**
 * Sätter pipeline till STOPPED om DB säger RUNNING men inget motsvarande Bull-jobb finns
 * (t.ex. efter omstart av scraping-api utan att skrapningen kört klart).
 */
export async function reconcileStalePipelineRunningStatus(pipelineId?: string): Promise<number> {
  const active = await getActiveScrapePipelineIds()
  const stuck = await prisma.bolagsfaktaPipeline.findMany({
    where: {
      status: 'RUNNING',
      ...(pipelineId ? { id: pipelineId } : {}),
    },
    select: { id: true },
  })

  let fixed = 0
  for (const p of stuck) {
    if (active.has(p.id)) continue
    await prisma.bolagsfaktaPipeline.update({
      where: { id: p.id },
      data: { status: 'STOPPED' },
    })
    fixed += 1
  }
  return fixed
}

/**
 * Rensar BolagsfaktaForetag som är QUEUED/RUNNING men jobbet inte längre är aktivt i kön
 * (eller Redis saknar jobbet helt).
 */
export async function reconcileStaleDetailJobRows(pipelineId?: string): Promise<number> {
  const rows = await prisma.bolagsfaktaForetag.findMany({
    where: {
      detailStatus: { in: ['QUEUED', 'RUNNING'] },
      ...(pipelineId ? { pipelineId } : {}),
    },
    select: {
      id: true,
      detailJobId: true,
    },
  })

  let fixed = 0
  const staleMessage =
    'Skrapning avbröts (ingen aktiv jobbkö — t.ex. omstart av scraping-api). Kör om detaljhämtning.'

  for (const row of rows) {
    if (!row.detailJobId) {
      await prisma.bolagsfaktaForetag.update({
        where: { id: row.id },
        data: {
          detailStatus: 'ERROR',
          detailFinishedAt: new Date(),
          detailError: staleMessage,
        },
      })
      fixed += 1
      continue
    }

    const job = await fetchDetailQueue.getJob(row.detailJobId)
    if (!job) {
      await prisma.bolagsfaktaForetag.update({
        where: { id: row.id },
        data: {
          detailStatus: 'ERROR',
          detailFinishedAt: new Date(),
          detailError: staleMessage,
        },
      })
      fixed += 1
      continue
    }

    const state = await job.getState()
    if (state === 'completed') {
      await prisma.bolagsfaktaForetag.update({
        where: { id: row.id },
        data: {
          detailStatus: 'SUCCESS',
          detailFinishedAt: new Date(),
          detailError: null,
        },
      })
      fixed += 1
      continue
    }
    if (state === 'failed') {
      const reason = job.failedReason || 'Okänt fel'
      await prisma.bolagsfaktaForetag.update({
        where: { id: row.id },
        data: {
          detailStatus: 'ERROR',
          detailFinishedAt: new Date(),
          detailError: reason,
        },
      })
      fixed += 1
      continue
    }

    const stillInQueue =
      state === 'waiting' ||
      state === 'active' ||
      state === 'delayed' ||
      state === 'prioritized' ||
      state === 'waiting-children'

    if (!stillInQueue) {
      await prisma.bolagsfaktaForetag.update({
        where: { id: row.id },
        data: {
          detailStatus: 'ERROR',
          detailFinishedAt: new Date(),
          detailError: staleMessage,
        },
      })
      fixed += 1
    }
  }

  return fixed
}

export async function reconcileAllBolagsfaktaStaleStatuses(pipelineId?: string): Promise<{
  pipelinesFixed: number
  detailRowsFixed: number
}> {
  const pipelinesFixed = await reconcileStalePipelineRunningStatus(pipelineId)
  const detailRowsFixed = await reconcileStaleDetailJobRows(pipelineId)
  return { pipelinesFixed, detailRowsFixed }
}
