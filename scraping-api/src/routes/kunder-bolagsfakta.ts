import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/db.js'
import { fetchDetailQueue } from '../lib/queue.js'
import { searchBolagsfaktaByOrgNumber } from '../lib/bolagsfakta-search.js'

/**
 * Bolagsfakta-uppdatering för kund utan pipeline-rad (samma kö som pipeline fetch-detail).
 */
export async function kunderBolagsfaktaRoutes(app: FastifyInstance) {
  app.post<{ Params: { customerId: string } }>(
    '/api/kunder/:customerId/bolagsfakta/refresh',
    async (request, reply) => {
      const { customerId } = request.params

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          bolagsfaktaData: true,
          bolagsfaktaForetag: {
            where: { url: { not: null } },
            take: 1,
          },
        },
      })

      if (!customer) {
        return reply.status(404).send({ error: 'Kunden hittades inte' })
      }

      let url =
        customer.bolagsfaktaData?.sourceUrl?.trim() ||
        customer.bolagsfaktaForetag[0]?.url?.trim() ||
        null

      if (!url && customer.orgNumber) {
        url = await searchBolagsfaktaByOrgNumber(customer.orgNumber)
      }

      if (!url) {
        return reply.status(400).send({
          error: 'Saknar Bolagsfakta-URL och organisationsnummer — kan inte söka på Bolagsfakta',
        })
      }

      const foretagId = `kund-${customerId}`
      const job = await fetchDetailQueue.add(
        'fetch-detail',
        {
          pipelineId: 'customer-refresh',
          foretagId,
          customerId,
          bolagsfaktaUrl: url,
        },
        {
          jobId: `kund-refresh-${customerId}-${Date.now()}`,
        },
      )

      return reply.status(202).send({ jobId: job.id, status: 'queued' })
    },
  )
}
