import { createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'
import { prisma } from '../src/lib/db/prisma'
import { getStorageProvider } from '../src/lib/storage'

const segs = await prisma.videoAsset.findMany({
  where: { videoId: 'cmtvs2l480005uwrx69u8gycv', type: 'HLS_SEGMENT', quality: '360p' },
  orderBy: { segmentIndex: 'asc' },
  take: 2,
  select: { segmentIndex: true, telegramFileId: true },
})
const tg = getStorageProvider()
for (const s of segs) {
  const up = await tg.downloadStream(s.telegramFileId!)
  await new Promise<void>((res, rej) => {
    const o = createWriteStream(`/tmp/probe-seg${s.segmentIndex}.ts`)
    o.on('finish', res)
    o.on('error', rej)
    Readable.fromWeb(up.body as import('node:stream/web').ReadableStream).pipe(o)
  })
  console.log('saved seg', s.segmentIndex)
}
await prisma.$disconnect()
