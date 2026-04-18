import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { apiKeyAuth } from './auth.js'
import { healthRoutes } from './routes/health.js'
import { kommunerRoutes } from './routes/kommuner.js'
import { pipelineRoutes } from './routes/pipelines.js'
import { companyRoutes } from './routes/companies.js'
import { kunderBolagsfaktaRoutes } from './routes/kunder-bolagsfakta.js'
import { reconcileAllBolagsfaktaStaleStatuses } from './lib/bolagsfakta-status-reconcile.js'
import { startScrapePipelineWorker } from './workers/scrape-pipeline.js'
import { startFetchDetailWorker } from './workers/fetch-detail.js'

const PORT = parseInt(process.env.PORT || '3100', 10)

const app = Fastify({
  logger: true,
})

// CORS
await app.register(cors, {
  origin: true,
  credentials: true,
})

// Auth middleware (skips /health)
app.addHook('onRequest', apiKeyAuth)

// Register routes
await app.register(healthRoutes)
await app.register(kommunerRoutes)
await app.register(pipelineRoutes)
await app.register(companyRoutes)
await app.register(kunderBolagsfaktaRoutes)

// Start BullMQ workers
startScrapePipelineWorker()
startFetchDetailWorker()

void reconcileAllBolagsfaktaStaleStatuses()
  .then((r) => {
    if (r.pipelinesFixed > 0 || r.detailRowsFixed > 0) {
      console.log(
        `[reconcile] Rensade stale status: pipelines=${r.pipelinesFixed}, detailRader=${r.detailRowsFixed}`,
      )
    }
  })
  .catch((e) => console.error('[reconcile] misslyckades', e))

// Start server
try {
  // `::` is dual-stack on most platforms so `localhost` (often ::1 in Node on Windows) can connect.
  await app.listen({ port: PORT, host: '::' })
  console.log(`\nScraping API listening on port ${PORT} (IPv4 + IPv6)`)
  console.log(`   Health: http://127.0.0.1:${PORT}/health`)
  console.log(`   API:    http://127.0.0.1:${PORT}/api/...`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
