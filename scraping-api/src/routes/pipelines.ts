import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/db.js'
import { scrapePipelineQueue, fetchDetailQueue } from '../lib/queue.js'
import type { CreatePipelineBody, FetchDetailBody } from '../types/api.js'

export async function pipelineRoutes(app: FastifyInstance) {
  // Lista alla pipelines
  app.get('/api/pipelines', async () => {
    const pipelines = await prisma.bolagsfaktaPipeline.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { foretag: true } },
      },
    })
    return { pipelines }
  })

  // Skapa pipeline
  app.post<{ Body: CreatePipelineBody }>('/api/pipelines', async (request, reply) => {
    const { namn, kommunSlug, kommunNamn, branschSlug, branschNamn, branschKod, bolagsfaktaForetagCount } = request.body

    if (!namn || !kommunSlug || !kommunNamn || !branschSlug || !branschNamn || !branschKod) {
      return reply.status(400).send({ error: 'Alla fält krävs: namn, kommunSlug, kommunNamn, branschSlug, branschNamn, branschKod' })
    }

    const pipeline = await prisma.bolagsfaktaPipeline.create({
      data: {
        namn,
        kommunSlug,
        kommunNamn,
        branschSlug,
        branschNamn,
        branschKod,
        bolagsfaktaForetagCount: bolagsfaktaForetagCount ?? null,
      },
    })
    return reply.status(201).send({ pipeline })
  })

  // Hämta pipeline med företag
  app.get<{ Params: { id: string } }>('/api/pipelines/:id', async (request, reply) => {
    const { id } = request.params
    const pipeline = await prisma.bolagsfaktaPipeline.findUnique({
      where: { id },
      include: {
        foretag: {
          orderBy: { createdAt: 'asc' },
          include: { customer: { select: { id: true, name: true, stage: true } } },
        },
        _count: { select: { foretag: true } },
      },
    })
    if (!pipeline) {
      return reply.status(404).send({ error: 'Pipeline hittades inte' })
    }
    return { pipeline }
  })

  // Ta bort pipeline
  app.delete<{ Params: { id: string } }>('/api/pipelines/:id', async (request, reply) => {
    const { id } = request.params
    try {
      await prisma.bolagsfaktaPipeline.delete({ where: { id } })
      return { deleted: true }
    } catch {
      return reply.status(404).send({ error: 'Pipeline hittades inte' })
    }
  })

  // Starta scraping (köar BullMQ-jobb)
  app.post<{ Params: { id: string } }>('/api/pipelines/:id/scrape', async (request, reply) => {
    const { id } = request.params
    const pipeline = await prisma.bolagsfaktaPipeline.findUnique({ where: { id } })
    if (!pipeline) {
      return reply.status(404).send({ error: 'Pipeline hittades inte' })
    }
    if (pipeline.status === 'RUNNING') {
      return reply.status(409).send({ error: 'Pipeline körs redan' })
    }

    await prisma.bolagsfaktaPipeline.update({
      where: { id },
      data: { status: 'RUNNING' },
    })

    const job = await scrapePipelineQueue.add('scrape', { pipelineId: id }, {
      jobId: `scrape-${id}-${Date.now()}`,
    })

    return { jobId: job.id, pipelineId: id, status: 'RUNNING' }
  })

  // Stoppa pipeline
  app.post<{ Params: { id: string } }>('/api/pipelines/:id/stop', async (request, reply) => {
    const { id } = request.params
    const pipeline = await prisma.bolagsfaktaPipeline.findUnique({ where: { id } })
    if (!pipeline) {
      return reply.status(404).send({ error: 'Pipeline hittades inte' })
    }

    await prisma.bolagsfaktaPipeline.update({
      where: { id },
      data: { status: 'STOPPED' },
    })

    return { pipelineId: id, status: 'STOPPED' }
  })

  // Lista företag i pipeline
  app.get<{ Params: { id: string } }>('/api/pipelines/:id/foretag', async (request, reply) => {
    const { id } = request.params
    const pipeline = await prisma.bolagsfaktaPipeline.findUnique({ where: { id } })
    if (!pipeline) {
      return reply.status(404).send({ error: 'Pipeline hittades inte' })
    }

    const foretag = await prisma.bolagsfaktaForetag.findMany({
      where: { pipelineId: id },
      orderBy: { createdAt: 'asc' },
      include: { customer: { select: { id: true, name: true, stage: true } } },
    })

    return { pipelineId: id, foretag }
  })

  // Köa detaljhämtning för ett företag
  app.post<{ Params: { id: string; foretagId: string }; Body: FetchDetailBody }>(
    '/api/pipelines/:id/foretag/:foretagId/fetch-detail',
    async (request, reply) => {
      const { id, foretagId } = request.params
      const { customerId, bolagsfaktaUrl } = request.body

      if (!customerId || !bolagsfaktaUrl) {
        return reply.status(400).send({ error: 'customerId och bolagsfaktaUrl krävs' })
      }

      const foretag = await prisma.bolagsfaktaForetag.findFirst({
        where: { id: foretagId, pipelineId: id },
      })
      if (!foretag) {
        return reply.status(404).send({ error: 'Företag hittades inte i denna pipeline' })
      }

      const job = await fetchDetailQueue.add('fetch-detail', {
        pipelineId: id,
        foretagId,
        customerId,
        bolagsfaktaUrl,
      }, {
        jobId: `detail-${foretagId}-${Date.now()}`,
      })

      return reply.status(202).send({ jobId: job.id, foretagId, status: 'queued' })
    },
  )
}
