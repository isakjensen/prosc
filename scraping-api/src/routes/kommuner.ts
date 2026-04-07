import type { FastifyInstance } from 'fastify'
import { KOMMUNER } from '../lib/kommuner.js'
import { prisma } from '../lib/db.js'
import { fetchAndCacheBranscher } from '../lib/bolagsfakta-scraper.js'

export async function kommunerRoutes(app: FastifyInstance) {
  // Lista alla kommuner
  app.get('/api/kommuner', async () => {
    return { kommuner: KOMMUNER }
  })

  // Hämta branscher för en kommun (cachad 7 dagar)
  app.get<{ Params: { slug: string } }>('/api/kommuner/:slug/branscher', async (request, reply) => {
    const { slug } = request.params
    const kommun = KOMMUNER.find(k => k.slug === slug)
    if (!kommun) {
      return reply.status(404).send({ error: 'Kommun hittades inte' })
    }

    // Check cache (7 days)
    const cached = await prisma.bolagsfaktaBransch.findMany({
      where: { kommunSlug: slug },
      orderBy: { branschKod: 'asc' },
    })

    if (cached.length > 0) {
      const age = Date.now() - cached[0].cachedAt.getTime()
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      if (age < sevenDays) {
        return {
          kommunSlug: slug,
          kommunNamn: kommun.namn,
          branscher: cached.map(b => ({
            branschNamn: b.branschNamn,
            branschSlug: b.branschSlug,
            branschKod: b.branschKod,
            foretagCount: b.foretagCount,
          })),
          cached: true,
        }
      }
    }

    // Fetch fresh
    try {
      const branscher = await fetchAndCacheBranscher(slug, kommun.namn)
      return {
        kommunSlug: slug,
        kommunNamn: kommun.namn,
        branscher: branscher.map(b => ({
          branschNamn: b.branschNamn,
          branschSlug: b.branschSlug,
          branschKod: b.branschKod,
          foretagCount: b.foretagCount,
        })),
        cached: false,
      }
    } catch (e) {
      return reply.status(502).send({
        error: 'Kunde inte hämta branscher från bolagsfakta.se',
        details: e instanceof Error ? e.message : String(e),
      })
    }
  })
}
