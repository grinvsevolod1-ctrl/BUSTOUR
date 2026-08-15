import { closeDbPool } from "../lib/db"
import { mediaService } from "../lib/media-service"

const pollMs = Number(process.env.MEDIA_WORKER_POLL_MS || 3000)
const leaseMs = Number(process.env.MEDIA_WORKER_LEASE_MS || 120000)

let stopping = false

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function loop() {
  while (!stopping) {
    const job = await mediaService.claimNextProcessingMedia(leaseMs)
    if (!job) {
      await delay(pollMs)
      continue
    }

    console.log(`[media-worker] processing ${job.id} type=${job.type} stage=${job.processingStage}`)

    const result = await mediaService.processMediaJob(job)
    console.log(`[media-worker] finished ${job.id} status=${result.status} stage=${result.processingStage}`)
  }
}

async function shutdown(signal: string) {
  if (stopping) return
  stopping = true
  console.log(`[media-worker] received ${signal}, shutting down`)
  await closeDbPool().catch((error) => {
    console.error("[media-worker] failed to close pool", error)
  })
  process.exit(0)
}

process.on("SIGINT", () => void shutdown("SIGINT"))
process.on("SIGTERM", () => void shutdown("SIGTERM"))

loop()
  .catch(async (error) => {
    console.error("[media-worker] fatal error", error)
    await closeDbPool().catch(() => {})
    process.exit(1)
  })
