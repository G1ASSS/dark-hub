import { signPlaybackToken } from '../src/lib/playback/token'
import { prisma } from '../src/lib/db/prisma'

const [videoId] = process.argv.slice(2)
const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } })
if (!admin) throw new Error('no admin')
const token = await signPlaybackToken({ videoId, userId: admin.id, kind: 'stream' }, 900)
console.log(token)
await prisma.$disconnect()
