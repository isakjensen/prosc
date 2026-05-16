export async function register() {
  // Only run in the Node.js runtime (not Edge), and only on the server.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startPipelineScheduler } = await import('./src/lib/pipeline-scheduler')
    startPipelineScheduler()
  }
}
