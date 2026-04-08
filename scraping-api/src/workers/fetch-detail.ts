import { Worker } from 'bullmq'
import { redisConnection } from '../lib/queue.js'
import { scrapeBolagsfaktaCompanyPage, persistBolagsfaktaDetail } from '../lib/bolagsfakta-detail-scraper.js'
import { BolagsfaktaDebugLogger } from '../lib/bolagsfakta-debug-logger.js'

export function startFetchDetailWorker() {
  const worker = new Worker(
    'fetch-detail',
    async (job) => {
      const { foretagId, customerId, bolagsfaktaUrl } = job.data as {
        pipelineId: string
        foretagId: string
        customerId: string
        bolagsfaktaUrl: string
      }

      console.log(`[worker:fetch-detail] Fetching detail for ${foretagId} (${bolagsfaktaUrl})`)

      const logger = new BolagsfaktaDebugLogger({
        jobId: job.id,
        foretagId,
        customerId,
      })

      const parsed = await scrapeBolagsfaktaCompanyPage(bolagsfaktaUrl, logger)
      await persistBolagsfaktaDetail(customerId, parsed, logger)

      return {
        foretagId,
        customerId,
        firmaNamn: parsed.flat.orgNumberFormatted,
        discoveredWebsite: parsed.websiteDiscovery?.enrichment?.website || null,
        websiteDiscovery: parsed.websiteDiscovery,
      }
    },
    {
      connection: redisConnection,
      concurrency: 1, // One detail scrape at a time (browser + Cursor CLI)
    },
  )

  worker.on('completed', (job) => {
    console.log(`[worker:fetch-detail] Completed job ${job.id}`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[worker:fetch-detail] Failed job ${job?.id}:`, err.message)
  })

  console.log('[worker:fetch-detail] Worker started')
  return worker
}
