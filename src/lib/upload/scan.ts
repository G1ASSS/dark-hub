import 'server-only'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type ScanResult = { clean: boolean; detail?: string }

export interface MalwareScanner {
  readonly name: string
  scan(filePath: string): Promise<ScanResult>
}

/** Default: explicit no-op. Uploads are still gated by type/size checks. */
class NoopScanner implements MalwareScanner {
  readonly name = 'none'
  async scan(_filePath: string): Promise<ScanResult> {
    return { clean: true, detail: 'scanning disabled (SCANNER=none)' }
  }
}

/** ClamAV via the `clamscan` binary. Fails closed when SCANNER=clamav. */
class ClamAvScanner implements MalwareScanner {
  readonly name = 'clamav'
  private readonly bin: string
  constructor() {
    this.bin = process.env.CLAMSCAN_PATH ?? 'clamscan'
  }
  async scan(filePath: string): Promise<ScanResult> {
    try {
      await execFileAsync(this.bin, ['--no-summary', filePath])
      return { clean: true, detail: 'clamav: no threats' }
    } catch (err) {
      const e = err as { code?: number; stdout?: string; message?: string }
      // clamscan exit 1 = virus found, 2 = error. Both fail closed.
      if (e.code === 1) return { clean: false, detail: `clamav: threat detected in upload` }
      throw new Error(`Malware scan failed (${this.bin}): ${e.message ?? e.stdout ?? 'unknown error'}`)
    }
  }
}

export function getScanner(): MalwareScanner {
  const kind = (process.env.SCANNER ?? 'none').toLowerCase()
  if (kind === 'clamav') return new ClamAvScanner()
  return new NoopScanner()
}
