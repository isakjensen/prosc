import type { FastifyRequest, FastifyReply } from 'fastify'

export async function apiKeyAuth(request: FastifyRequest, reply: FastifyReply) {
  // Skip auth for health check
  if (request.url === '/health') return

  const apiKey = process.env.API_KEY
  if (!apiKey) {
    console.warn('[auth] API_KEY is not set — all requests will be rejected')
    return reply.status(500).send({ error: 'Server misconfigured: API_KEY not set' })
  }

  const auth = request.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing Authorization header (Bearer token)' })
  }

  const token = auth.slice(7)
  if (token !== apiKey) {
    return reply.status(403).send({ error: 'Invalid API key' })
  }
}
