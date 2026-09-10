import 'server-only'

/**
 * Storage abstraction — the origin layer (Telegram today; R2 / Bunny /
 * S3 / Cloudflare Stream tomorrow). The frontend must NEVER depend on
 * any provider directly; all access goes through backend proxy routes.
 */

export type ProxiedBody = {
  status: number
  headers: Record<string, string>
  body: ReadableStream<Uint8Array> | null
}

export type UploadInput = {
  /** Local file to push to origin storage */
  filePath: string
  fileName: string
  mimeType: string
  caption?: string
  /** Send as a streamable video instead of a generic document */
  asVideo?: boolean
}

export type UploadResult = {
  chatId: string
  messageId: number
  fileId: string
  fileSize: number
  mimeType?: string
  duration?: number
  width?: number
  height?: number
}

export interface StorageProvider {
  readonly name: string
  uploadFile(input: UploadInput): Promise<UploadResult>
  /**
   * Stream bytes for a stored file. `range` is an optional HTTP Range
   * header value to forward. Returns status/headers/body ready for
   * `new Response()` — never exposes provider credentials or raw URLs.
   */
  downloadStream(fileId: string, range?: string | null): Promise<ProxiedBody>
  deleteMessage(chatId: string, messageId: number): Promise<void>
}
