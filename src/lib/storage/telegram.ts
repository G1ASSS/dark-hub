import 'server-only'
import { createReadStream, statSync } from 'node:fs'
import { Readable } from 'node:stream'
import type { StorageProvider, UploadInput, UploadResult, ProxiedBody } from './types'

/**
 * Telegram origin storage via the Bot API against a PRIVATE chat/channel.
 * The bot token never leaves the server: files are fetched with getFile
 * and re-streamed through our proxy routes.
 *
 * Bot API constraint: a single send caps at ~50MB per file
 * (TELEGRAM_MAX_UPLOAD_BYTES, default 52428800). HLS segments are a few
 * MB each so they fit naturally; full MP4 renditions above the cap are
 * rejected with a clear error instead of failing obscurely.
 */
export class TelegramStorageProvider implements StorageProvider {
  readonly name = 'telegram'
  private readonly token: string
  private readonly chatId: string
  private readonly maxUploadBytes: number

  constructor(opts?: { token?: string; chatId?: string; maxUploadBytes?: number }) {
    const token = opts?.token ?? process.env.TELEGRAM_BOT_TOKEN
    const chatId = opts?.chatId ?? process.env.TELEGRAM_STORAGE_CHAT_ID
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set')
    if (!chatId) throw new Error('TELEGRAM_STORAGE_CHAT_ID is not set (private channel/chat id)')
    this.token = token
    this.chatId = chatId
    this.maxUploadBytes =
      opts?.maxUploadBytes ?? Number(process.env.TELEGRAM_MAX_UPLOAD_BYTES ?? 52428800)
  }

  private apiUrl(method: string) {
    return `https://api.telegram.org/bot${this.token}/${method}`
  }

  private async call<T>(method: string, body: FormData | string, isJson: boolean): Promise<T> {
    const res = await fetch(this.apiUrl(method), {
      method: 'POST',
      headers: isJson ? { 'content-type': 'application/json' } : undefined,
      body,
    })
    const data = (await res.json()) as { ok: boolean; result?: T; description?: string }
    if (!res.ok || !data.ok) {
      throw new Error(`Telegram ${method} failed: ${data.description ?? res.statusText}`)
    }
    return data.result as T
  }

  async uploadFile(input: UploadInput): Promise<UploadResult> {
    const { size } = statSync(input.filePath)
    if (size > this.maxUploadBytes) {
      throw new Error(
        `File ${(size / 1048576).toFixed(1)}MB exceeds the Telegram Bot API send limit ` +
          `(${(this.maxUploadBytes / 1048576).toFixed(0)}MB). Split into smaller assets or raise quality ladder bitrates accordingly.`
      )
    }

    const form = new FormData()
    form.set('chat_id', this.chatId)
    if (input.caption) form.set('caption', input.caption.slice(0, 1024))

    const stream = createReadStream(input.filePath)
    const blob = new Blob(await streamToParts(stream), { type: input.mimeType })

    type SendResult = {
      message_id: number
      chat: { id: number | string }
      video?: { file_id: string; file_size?: number; mime_type?: string; duration?: number; width?: number; height?: number }
      document?: { file_id: string; file_size?: number; mime_type?: string }
    }

    if (input.asVideo) {
      form.set('video', blob, input.fileName)
      form.set('supports_streaming', 'true')
      const msg = await this.call<SendResult>('sendVideo', form, false)
      const v = msg.video
      if (!v) throw new Error('Telegram sendVideo returned no video object')
      return {
        chatId: String(msg.chat.id),
        messageId: msg.message_id,
        fileId: v.file_id,
        fileSize: v.file_size ?? size,
        mimeType: v.mime_type ?? input.mimeType,
        duration: v.duration,
        width: v.width,
        height: v.height,
      }
    }

    form.set('document', blob, input.fileName)
    const msg = await this.call<SendResult>('sendDocument', form, false)
    const d = msg.document
    if (!d) throw new Error('Telegram sendDocument returned no document object')
    return {
      chatId: String(msg.chat.id),
      messageId: msg.message_id,
      fileId: d.file_id,
      fileSize: d.file_size ?? size,
      mimeType: d.mime_type ?? input.mimeType,
    }
  }

  /** Resolve the (credentialed, temporary) file URL — server-side only. */
  private async resolveFileUrl(fileId: string): Promise<string> {
    const info = await this.call<{ file_path?: string }>(
      'getFile',
      JSON.stringify({ file_id: fileId }),
      true
    )
    if (!info.file_path) throw new Error('Telegram getFile returned no file_path')
    return `https://api.telegram.org/file/bot${this.token}/${info.file_path}`
  }

  async downloadStream(fileId: string, range?: string | null): Promise<ProxiedBody> {
    const url = await this.resolveFileUrl(fileId)
    const upstream = await fetch(url, range ? { headers: { Range: range } } : undefined)
    if (!upstream.ok && upstream.status !== 206) {
      throw new Error(`Telegram file fetch failed: ${upstream.status}`)
    }
    const headers: Record<string, string> = {}
    for (const key of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
      const v = upstream.headers.get(key)
      if (v) headers[key] = v
    }
    return { status: upstream.status, headers, body: upstream.body as ReadableStream<Uint8Array> | null }
  }

  async deleteMessage(chatId: string, messageId: number): Promise<void> {
    await this.call('deleteMessage', JSON.stringify({ chat_id: chatId, message_id: messageId }), true)
  }
}

async function streamToParts(stream: Readable): Promise<Uint8Array<ArrayBuffer>[]> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  // Copy into a fresh ArrayBuffer so the part satisfies BlobPart typing
  // (Buffer pooling otherwise widens the type to ArrayBufferLike).
  const combined = Buffer.concat(chunks)
  const copy: Uint8Array<ArrayBuffer> = new Uint8Array(combined.length)
  copy.set(combined)
  return [copy]
}
