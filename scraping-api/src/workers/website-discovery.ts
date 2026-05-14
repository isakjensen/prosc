import { Worker } from "bullmq"
import { bullMqLongJobWorkerSettings, redisConnection, websiteDiscoveryQueue } from "../lib/queue.js"
import {
  loadCompaniesForDiscovery,
  chunkArray,
  discoverWebsitesForBatch,
  persistBatchResults,
  type BatchCompanyResult,
  type BatchDiscoveryProgress,
} from "../lib/batch-website-discovery.js"

const BATCH_SIZE = 10

const activePipelines = new Map<string, BatchDiscoveryProgress>()
const cancelledPipelines = new Set<string>()

export function getWebsiteDiscoveryProgress(pipelineId: string): BatchDiscoveryProgress | null {
  return activePipelines.get(pipelineId) ?? null
}

export async function stopWebsiteDiscovery(pipelineId?: string): Promise<{ stopped: number }> {
  if (pipelineId) {
    cancelledPipelines.add(pipelineId)
    activePipelines.delete(pipelineId)
  }

  const jobs = await websiteDiscoveryQueue.getJobs(["active", "waiting", "delayed", "prioritized"])
  let stopped = 0

  for (const job of jobs) {
    const jobPipelineId = (job.data as { pipelineId?: string })?.pipelineId
    if (pipelineId && jobPipelineId !== pipelineId) continue

    if (jobPipelineId) {
      cancelledPipelines.add(jobPipelineId)
      activePipelines.delete(jobPipelineId)
    }

    try {
      await job.remove()
      stopped++
    } catch {
      try {
        await job.moveToFailed(new Error("Stoppat av användaren"), "0", true)
        stopped++
      } catch {
        /* job may already be gone */
      }
    }
  }

  console.log(`[worker:website-discovery] Stopped ${stopped} jobs${pipelineId ? ` for pipeline ${pipelineId}` : ""}`)
  return { stopped }
}

export async function drainWebsiteDiscoveryQueue(): Promise<void> {
  try {
    await websiteDiscoveryQueue.obliterate({ force: true })
    console.log("[worker:website-discovery] Queue drained on startup")
  } catch (e) {
    console.warn("[worker:website-discovery] Could not drain queue:", e instanceof Error ? e.message : e)
  }
}

export function startWebsiteDiscoveryWorker() {
  const worker = new Worker(
    "website-discovery",
    async (job) => {
      const { pipelineId } = job.data as { pipelineId: string }

      if (cancelledPipelines.has(pipelineId)) {
        cancelledPipelines.delete(pipelineId)
        console.log(`[worker:website-discovery] Pipeline ${pipelineId} was cancelled, skipping`)
        return { pipelineId, cancelled: true }
      }

      console.log(`[worker:website-discovery] Starting batch discovery for pipeline ${pipelineId}`)

      const companies = await loadCompaniesForDiscovery(pipelineId)

      if (companies.length === 0) {
        console.log(`[worker:website-discovery] No companies need website discovery in pipeline ${pipelineId}`)
        return {
          pipelineId,
          totalCompanies: 0,
          totalBatches: 0,
          completedBatches: 0,
          results: [],
        }
      }

      const batches = chunkArray(companies, BATCH_SIZE)

      const progress: BatchDiscoveryProgress = {
        pipelineId,
        totalCompanies: companies.length,
        totalBatches: batches.length,
        completedBatches: 0,
        results: [],
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      activePipelines.set(pipelineId, progress)

      const allResults: BatchCompanyResult[] = []

      try {
        for (let i = 0; i < batches.length; i++) {
          if (cancelledPipelines.has(pipelineId)) {
            cancelledPipelines.delete(pipelineId)
            console.log(
              `[worker:website-discovery] Pipeline ${pipelineId} cancelled after batch ${i}/${batches.length}`,
            )
            return {
              pipelineId,
              cancelled: true,
              totalCompanies: companies.length,
              totalBatches: batches.length,
              completedBatches: i,
              foundWebsites: allResults.filter((r) => r.website).length,
              results: allResults,
            }
          }

          const batch = batches[i]

          console.log(
            `[worker:website-discovery] Processing batch ${i + 1}/${batches.length} (${batch.length} companies)`,
          )

          const batchResults = await discoverWebsitesForBatch(batch, i, batches.length)

          await persistBatchResults(batchResults)

          allResults.push(...batchResults)

          progress.completedBatches = i + 1
          progress.results = allResults
          progress.updatedAt = new Date().toISOString()
          activePipelines.set(pipelineId, progress)

          await job.updateProgress({
            completedBatches: i + 1,
            totalBatches: batches.length,
            totalCompanies: companies.length,
            foundWebsites: allResults.filter((r) => r.website).length,
          })

          const found = batchResults.filter((r) => r.website).length
          const errors = batchResults.filter((r) => r.error).length
          console.log(
            `[worker:website-discovery] Batch ${i + 1} complete: ${found} found, ${errors} errors`,
          )
        }
      } finally {
        activePipelines.delete(pipelineId)
        cancelledPipelines.delete(pipelineId)
      }

      const totalFound = allResults.filter((r) => r.website).length
      const totalErrors = allResults.filter((r) => r.error).length

      console.log(
        `[worker:website-discovery] Pipeline ${pipelineId} complete: ${totalFound}/${companies.length} websites found, ${totalErrors} errors`,
      )

      return {
        pipelineId,
        totalCompanies: companies.length,
        totalBatches: batches.length,
        completedBatches: batches.length,
        foundWebsites: totalFound,
        errors: totalErrors,
        results: allResults,
      }
    },
    {
      connection: redisConnection,
      concurrency: 1,
      ...bullMqLongJobWorkerSettings,
    },
  )

  worker.on("completed", (job) => {
    console.log(`[worker:website-discovery] Completed job ${job.id}`)
    const pipelineId = (job.data as { pipelineId?: string } | undefined)?.pipelineId
    if (pipelineId) {
      activePipelines.delete(pipelineId)
      cancelledPipelines.delete(pipelineId)
    }
  })

  worker.on("failed", (job, err) => {
    console.error(`[worker:website-discovery] Failed job ${job?.id}:`, err.message)
    const pipelineId = (job?.data as { pipelineId?: string } | undefined)?.pipelineId
    if (pipelineId) {
      activePipelines.delete(pipelineId)
      cancelledPipelines.delete(pipelineId)
    }
  })

  console.log("[worker:website-discovery] Worker started")
  return worker
}
