import type { FastifyInstance } from 'fastify'
import { fetchDetailQueue } from '../lib/queue.js'
import type { JobStatusResponse } from '../types/api.js'

export async function companyRoutes(app: FastifyInstance) {
  // Poll job status
  app.get<{ Params: { jobId: string } }>('/api/jobs/:jobId', async (request, reply) => {
    const { jobId } = request.params

    // Check both queues
    let job = await fetchDetailQueue.getJob(jobId)
    if (!job) {
      const { scrapePipelineQueue } = await import('../lib/queue.js')
      job = await scrapePipelineQueue.getJob(jobId)
    }

    if (!job) {
      return reply.status(404).send({ error: 'Jobb hittades inte' })
    }

    const state = await job.getState()
    const response: JobStatusResponse = {
      jobId: job.id!,
      state,
      progress: job.progress as number | object,
      failedReason: job.failedReason ?? undefined,
      returnvalue: job.returnvalue ?? undefined,
      finishedOn: job.finishedOn ?? undefined,
    }

    return response
  })
}
