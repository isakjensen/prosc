import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/db.js'
import { scrapePipelineQueue } from '../lib/queue.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (_request, reply) => {
    const checks: Record<string, string> = {}

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`
      checks.database = 'ok'
    } catch (e) {
      checks.database = `error: ${e instanceof Error ? e.message : String(e)}`
    }

    // Check Redis via BullMQ
    try {
      const client = await scrapePipelineQueue.client
      await client.ping()
      checks.redis = 'ok'
    } catch (e) {
      checks.redis = `error: ${e instanceof Error ? e.message : String(e)}`
    }

    const healthy = checks.database === 'ok' && checks.redis === 'ok'
    return reply.status(healthy ? 200 : 503).send({
      status: healthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
    })
  })
}
