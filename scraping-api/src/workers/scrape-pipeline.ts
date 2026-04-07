import { Worker } from 'bullmq'
import { redisConnection } from '../lib/queue.js'
import { scrapeBolagsfaktaPipeline } from '../lib/bolagsfakta-scraper.js'
import { prisma } from '../lib/db.js'

export function startScrapePipelineWorker() {
  const worker = new Worker(
    'scrape-pipeline',
    async (job) => {
      const { pipelineId } = job.data as { pipelineId: string }
      console.log(`[worker:scrape-pipeline] Starting pipeline ${pipelineId}`)

      try {
        await scrapeBolagsfaktaPipeline(pipelineId)

        const pipeline = await prisma.bolagsfaktaPipeline.findUnique({
          where: { id: pipelineId },
          include: { _count: { select: { foretag: true } } },
        })

        return {
          pipelineId,
          status: pipeline?.status,
          foretagCount: pipeline?._count.foretag ?? 0,
        }
      } catch (err) {
        console.error(`[worker:scrape-pipeline] Failed pipeline ${pipelineId}:`, err)

        // Ensure pipeline is marked as STOPPED on error
        await prisma.bolagsfaktaPipeline.update({
          where: { id: pipelineId },
          data: { status: 'STOPPED' },
        }).catch(() => {})

        throw err
      }
    },
    {
      connection: redisConnection,
      concurrency: 1, // Only one pipeline scrape at a time (browser-heavy)
    },
  )

  worker.on('completed', (job) => {
    console.log(`[worker:scrape-pipeline] Completed job ${job.id}`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[worker:scrape-pipeline] Failed job ${job?.id}:`, err.message)
  })

  console.log('[worker:scrape-pipeline] Worker started')
  return worker
}
