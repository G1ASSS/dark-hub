/**
 * Remove everything created by seed-demo.mts (Telegram messages + DB rows):
 *
 *   npm run demo:clear
 */
import { readFileSync, rmSync } from 'node:fs'
import { prisma } from '../src/lib/db/prisma'
import { getStorageProvider } from '../src/lib/storage'

const manifest = JSON.parse(readFileSync('/tmp/darkhubb-demo.json', 'utf8')) as { ids: string[] }
const storage = getStorageProvider()
let videos = 0
for (const id of manifest.ids) {
  const assets = await prisma.videoAsset.findMany({
    where: { videoId: id, telegramMessageId: { not: null } },
    select: { telegramChatId: true, telegramMessageId: true },
  })
  for (const a of assets) {
    try {
      await storage.deleteMessage(a.telegramChatId!, a.telegramMessageId!)
    } catch { /* best effort */ }
  }
  await prisma.video.delete({ where: { id } }).catch(() => {})
  videos += 1
}
rmSync('/tmp/darkhubb-demo.json', { force: true })
await prisma.$disconnect()
console.log(`Cleared ${videos} demo videos (DB rows + Telegram messages).`)
