import { warmVideoCache } from '../src/lib/cache/origin'
import { prisma } from '../src/lib/db/prisma'

const [videoId] = process.argv.slice(2)
if (!videoId) {
  console.error('Usage: warm-cache.mts <videoId>')
  process.exit(1)
}
const started = Date.now()
const result = await warmVideoCache(videoId)
await prisma.$disconnect()
console.log(`warmed=${result.warmed} failed=${result.failed} in ${((Date.now() - started) / 1000).toFixed(1)}s`)
