import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { apiKeyAuth } from './auth.js'
import { healthRoutes } from './routes/health.js'
import { kommunerRoutes } from './routes/kommuner.js'
import { pipelineRoutes } from './routes/pipelines.js'
import { companyRoutes } from './routes/companies.js'
import { kunderBolagsfaktaRoutes } from './routes/kunder-bolagsfakta.js'
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

// Start server
try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`\n🚀 Scraping API running on http://0.0.0.0:${PORT}`)
  console.log(`   Health: http://0.0.0.0:${PORT}/health`)
  console.log(`   API:    http://0.0.0.0:${PORT}/api/...`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
