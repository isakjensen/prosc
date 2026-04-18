import { Queue, type ConnectionOptions } from 'bullmq'

function getRedisConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL || 'redis://localhost:6379'
  const parsed = new URL(url)
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
  }
}

export const redisConnection = getRedisConnection()

/**
 * BullMQ defaults to lockDuration 30s. Our jobs run Playwright + (for detail) Google + Cursor CLI
 * (~3–10+ min). If the lock expires before renewal, the job is marked stalled and can fail with
 * "job stalled more than allowable limit" — Next.js then surfaces that as HTTP 502.
 */
export const bullMqLongJobWorkerSettings = {
  lockDuration: 600_000,
  stalledInterval: 60_000,
  maxStalledCount: 5,
} as const

export const scrapePipelineQueue = new Queue('scrape-pipeline', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
})

export const fetchDetailQueue = new Queue('fetch-detail', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
  },
})
