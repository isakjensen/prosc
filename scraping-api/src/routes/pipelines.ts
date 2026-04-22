import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/db.js'
import { deletePipelineCascade } from '../lib/delete-pipeline-cascade.js'
import { reconcileAllBolagsfaktaStaleStatuses, reconcileStalePipelineRunningStatus } from '../lib/bolagsfakta-status-reconcile.js'
import { scrapePipelineQueue, fetchDetailQueue } from '../lib/queue.js'
import { normalizeOrgNumber, orgNumberLookupVariants } from '../lib/swedish-org-number.js'
import { searchBolagsfaktaByOrgNumber } from '../lib/bolagsfakta-search.js'
import type { CreatePipelineBody, FetchDetailBody } from '../types/api.js'

export async function pipelineRoutes(app: FastifyInstance) {
  /** Synka DB-status mot BullMQ (t.ex. efter omstart) — anropas från Next vid sidladdning. */
  app.post<{ Body: { pipelineId?: string } }>('/api/pipelines/reconcile-status', async (request) => {
    const raw = request.body?.pipelineId
    const pipelineId = typeof raw === 'string' && raw.trim() ? raw.trim() : undefined
    return reconcileAllBolagsfaktaStaleStatuses(pipelineId)
  })

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
          orderBy: [{ isRedlisted: 'asc' }, { createdAt: 'desc' }],
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

  // Ta bort pipeline (inkl. kunder som bara fanns i denna lista)
  app.delete<{ Params: { id: string } }>('/api/pipelines/:id', async (request, reply) => {
    const { id } = request.params
    const result = await deletePipelineCascade(prisma, id)
    if (!result.ok) {
      if (result.code === 'NOT_FOUND') {
        return reply.status(404).send({ error: 'Pipeline hittades inte' })
      }
      return reply.status(409).send({
        error: 'Pipeline körs — stoppa den innan du tar bort den.',
      })
    }
    return { deleted: true, deletedCustomerCount: result.deletedCustomerCount }
  })

  // Starta scraping (köar BullMQ-jobb)
  app.post<{ Params: { id: string } }>('/api/pipelines/:id/scrape', async (request, reply) => {
    const { id } = request.params
    const pipeline = await prisma.bolagsfaktaPipeline.findUnique({ where: { id } })
    if (!pipeline) {
      return reply.status(404).send({ error: 'Pipeline hittades inte' })
    }
    if (pipeline.status === 'RUNNING') {
      await reconcileStalePipelineRunningStatus(id)
      const fresh = await prisma.bolagsfaktaPipeline.findUnique({ where: { id } })
      if (fresh?.status === 'RUNNING') {
        return reply.status(409).send({ error: 'Pipeline körs redan' })
      }
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
  app.get<{ Params: { id: string } }>('/api/pipelines/:id/companies', async (request, reply) => {
    const { id } = request.params
    const pipeline = await prisma.bolagsfaktaPipeline.findUnique({ where: { id } })
    if (!pipeline) {
      return reply.status(404).send({ error: 'Pipeline hittades inte' })
    }

    const foretag = await prisma.bolagsfaktaForetag.findMany({
      where: { pipelineId: id },
      orderBy: [{ isRedlisted: 'asc' }, { createdAt: 'desc' }],
      include: { customer: { select: { id: true, name: true, stage: true } } },
    })

    return { pipelineId: id, foretag }
  })

  // Köa detaljhämtning för ett företag
  app.post<{ Params: { id: string; foretagId: string }; Body: FetchDetailBody }>(
    '/api/pipelines/:id/companies/:foretagId/fetch-detail',
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

      if (!foretag.customerId) {
        return reply.status(400).send({ error: 'Företaget saknar customerId och kan inte detaljskrapas' })
      }

      if (foretag.detailStatus === 'RUNNING' || foretag.detailStatus === 'QUEUED') {
        return reply.status(409).send({
          error: 'Detaljskrapning körs redan för detta företag',
          jobId: foretag.detailJobId ?? undefined,
        })
      }

      const job = await fetchDetailQueue.add('fetch-detail', {
        pipelineId: id,
        foretagId,
        customerId,
        bolagsfaktaUrl,
      }, {
        jobId: `detail-${foretagId}-${Date.now()}`,
      })

      await prisma.bolagsfaktaForetag.update({
        where: { id: foretagId },
        data: {
          detailStatus: 'QUEUED',
          detailJobId: job.id!,
          detailQueuedAt: new Date(),
          detailStartedAt: null,
          detailFinishedAt: null,
          detailError: null,
        },
      })

      return reply.status(202).send({ jobId: job.id, foretagId, status: 'queued' })
    },
  )

  // Lägg till ett specifikt företag via organisationsnummer (söker på Bolagsfakta)
  app.post<{ Params: { id: string }; Body: { orgNummer: string } }>(
    '/api/pipelines/:id/companies/add-by-org-number',
    async (request, reply) => {
      const { id } = request.params
      const { orgNummer } = request.body ?? {}

      if (!orgNummer) {
        return reply.status(400).send({ error: 'orgNummer krävs' })
      }

      const normalized = normalizeOrgNumber(orgNummer)
      if (!normalized || /XXXX/i.test(normalized)) {
        return reply.status(400).send({ error: 'Ogiltigt organisationsnummer. Ange 10 siffror (t.ex. 556123-4567).' })
      }

      const pipeline = await prisma.bolagsfaktaPipeline.findUnique({ where: { id } })
      if (!pipeline) {
        return reply.status(404).send({ error: 'Pipeline hittades inte' })
      }

      // Kontrollera om företaget redan finns i pipelinen
      const variants = orgNumberLookupVariants(normalized)
      const existing = await prisma.bolagsfaktaForetag.findFirst({
        where: { pipelineId: id, orgNummer: { in: variants } },
      })
      if (existing) {
        return reply.status(409).send({ error: 'Företaget finns redan i denna pipeline', foretagId: existing.id })
      }

      // Sök upp Bolagsfakta-URL för org.nr
      const digits = normalized.replace(/\D/g, '')
      const bolagsfaktaUrl = await searchBolagsfaktaByOrgNumber(digits)
      if (!bolagsfaktaUrl) {
        return reply.status(404).send({
          error: 'Företaget hittades inte på Bolagsfakta. Kontrollera att organisationsnumret är korrekt.',
        })
      }

      // Extrahera namn från URL-slug (t.ex. /5561234567-foretaget-ab → "Foretaget Ab")
      const urlPath = new URL(bolagsfaktaUrl).pathname
      const slug = urlPath.split('/').pop() ?? ''
      const nameFromSlug = slug
        .replace(/^\d{10}-/, '')
        .split('-')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ') || `Företag ${normalized}`

      // Koppla till befintlig kund eller skapa ny
      const existingCustomer = await prisma.customer.findFirst({
        where: { orgNumber: { in: variants } },
      })

      let customerId: string
      if (existingCustomer) {
        customerId = existingCustomer.id
      } else {
        const customer = await prisma.customer.create({
          data: { name: nameFromSlug, stage: 'SCRAPED', orgNumber: normalized },
        })
        customerId = customer.id
      }

      // Skapa pipeline-rad
      const foretag = await prisma.bolagsfaktaForetag.create({
        data: { pipelineId: id, customerId, namn: nameFromSlug, orgNummer: normalized, url: bolagsfaktaUrl },
      })

      // Köa detaljhämtning direkt
      const job = await fetchDetailQueue.add(
        'fetch-detail',
        { pipelineId: id, foretagId: foretag.id, customerId, bolagsfaktaUrl },
        { jobId: `detail-${foretag.id}-${Date.now()}` },
      )

      await prisma.bolagsfaktaForetag.update({
        where: { id: foretag.id },
        data: { detailStatus: 'QUEUED', detailJobId: job.id!, detailQueuedAt: new Date() },
      })

      return reply.status(201).send({
        foretagId: foretag.id,
        customerId,
        bolagsfaktaUrl,
        namn: nameFromSlug,
        orgNummer: normalized,
      })
    },
  )
}
