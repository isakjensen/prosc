import { Worker } from 'bullmq'
import { bullMqLongJobWorkerSettings, redisConnection } from '../lib/queue.js'
import { scrapeBolagsfaktaCompanyPage, persistBolagsfaktaDetail } from '../lib/bolagsfakta-detail-scraper.js'
import { BolagsfaktaDebugLogger } from '../lib/bolagsfakta-debug-logger.js'
import { prisma } from '../lib/db.js'

export function startFetchDetailWorker() {
  const worker = new Worker(
    'fetch-detail',
    async (job) => {
      const { pipelineId, foretagId, customerId, bolagsfaktaUrl } = job.data as {
        pipelineId: string
        foretagId: string
        customerId: string
        bolagsfaktaUrl: string
      }

      console.log(`[worker:fetch-detail] Fetching detail for ${foretagId} (${bolagsfaktaUrl})`)

      await prisma.bolagsfaktaForetag
        .update({
          where: { id: foretagId },
          data: {
            detailStatus: 'RUNNING',
            detailStartedAt: new Date(),
            detailError: null,
          },
        })
        .catch(() => {})

      const logger = new BolagsfaktaDebugLogger({
        jobId: job.id,
        foretagId,
        customerId,
      })

      const parsed = await scrapeBolagsfaktaCompanyPage(bolagsfaktaUrl, logger)
      await persistBolagsfaktaDetail(customerId, parsed, logger)

      return {
        pipelineId,
        foretagId,
        customerId,
        firmaNamn: parsed.flat.orgNumberFormatted,
        discoveredWebsite: parsed.websiteDiscovery?.enrichment?.website || null,
        websiteDiscovery: parsed.websiteDiscovery,
      }
    },
    {
      connection: redisConnection,
      concurrency: 3, // Three detail scrapes at a time
      ...bullMqLongJobWorkerSettings,
    },
  )

  worker.on('completed', (job) => {
    console.log(`[worker:fetch-detail] Completed job ${job.id}`)
    const foretagId = (job.data as { foretagId?: string } | undefined)?.foretagId
    if (foretagId) {
      void prisma.bolagsfaktaForetag
        .update({
          where: { id: foretagId },
          data: {
            detailStatus: 'SUCCESS',
            detailFinishedAt: new Date(),
            detailError: null,
          },
        })
        .catch(() => {})
    }
  })

  worker.on('failed', (job, err) => {
    console.error(`[worker:fetch-detail] Failed job ${job?.id}:`, err.message)
    const foretagId = (job?.data as { foretagId?: string } | undefined)?.foretagId
    if (foretagId) {
      void prisma.bolagsfaktaForetag
        .update({
          where: { id: foretagId },
          data: {
            detailStatus: 'ERROR',
            detailFinishedAt: new Date(),
            detailError: err.message,
          },
        })
        .catch(() => {})
    }
  })

  console.log('[worker:fetch-detail] Worker started')
  return worker
}
