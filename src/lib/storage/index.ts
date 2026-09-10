import 'server-only'
import { TelegramStorageProvider } from './telegram'
import type { StorageProvider } from './types'

export type { StorageProvider, UploadInput, UploadResult, ProxiedBody } from './types'
export { TelegramStorageProvider } from './telegram'

/**
 * Future providers (R2 / Bunny / S3 / Cloudflare Stream) plug in here by
 * implementing `StorageProvider` in their own file and adding a case.
 * They intentionally throw until configured so a missing setup fails
 * loudly instead of silently serving nothing.
 */
function notConfigured(name: string): StorageProvider {
  const err = () =>
    Promise.reject(
      new Error(
        `Storage provider "${name}" is not configured yet. Implement src/lib/storage/${name}.ts or set STORAGE_PROVIDER=telegram.`
      )
    )
  return {
    name,
    uploadFile: err,
    downloadStream: err,
    deleteMessage: () => Promise.reject(new Error(`Storage provider "${name}" is not configured yet.`)),
  }
}

const providers: Record<string, () => StorageProvider> = {
  telegram: () => new TelegramStorageProvider(),
  r2: () => notConfigured('r2'),
  bunny: () => notConfigured('bunny'),
  s3: () => notConfigured('s3'),
  'cf-stream': () => notConfigured('cf-stream'),
}

export function getStorageProvider(name?: string): StorageProvider {
  const key = (name ?? process.env.STORAGE_PROVIDER ?? 'telegram').toLowerCase()
  const factory = providers[key]
  if (!factory) throw new Error(`Unknown STORAGE_PROVIDER "${key}". Expected one of: ${Object.keys(providers).join(', ')}`)
  return factory()
}
