'use client'
import { useState, useTransition } from 'react'
import { CheckCircle2, XCircle, Ban, Undo2 } from 'lucide-react'
import {
  approveVideoAction,
  rejectVideoAction,
  approveCreatorAction,
  rejectCreatorAction,
  resolveReportAction,
  dismissReportAction,
  banUserAction,
  unbanUserAction,
} from '@/actions/moderation'

function useModAction(fn: (id: string) => Promise<unknown>) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const run = (id: string) =>
    startTransition(async () => {
      setError(null)
      const res = (await fn(id)) as { error?: string } | string | { ok: boolean }
      if (res && typeof res === 'object' && 'error' in res && res.error) setError(res.error)
    })
  return { run, pending, error }
}

const iconBtn =
  'h-7 w-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-40'

export function VideoModButtons({ videoId }: { videoId: string }) {
  const approve = useModAction(approveVideoAction)
  const reject = useModAction(rejectVideoAction)
  const busy = approve.pending || reject.pending
  return (
    <span className="flex gap-1.5 items-center">
      <button
        className={`${iconBtn} bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25`}
        disabled={busy}
        onClick={() => approve.run(videoId)}
        title="Approve & publish"
        aria-label="Approve video"
      >
        <CheckCircle2 className="h-4 w-4" />
      </button>
      <button
        className={`${iconBtn} bg-rose-500/15 text-rose-400 hover:bg-rose-500/25`}
        disabled={busy}
        onClick={() => reject.run(videoId)}
        title="Reject"
        aria-label="Reject video"
      >
        <XCircle className="h-4 w-4" />
      </button>
      {(approve.error || reject.error) && (
        <span className="text-[11px] text-rose-400">{approve.error ?? reject.error}</span>
      )}
    </span>
  )
}

export function CreatorModButtons({ creatorId }: { creatorId: string }) {
  const approve = useModAction(approveCreatorAction)
  const reject = useModAction(rejectCreatorAction)
  const busy = approve.pending || reject.pending
  return (
    <span className="flex gap-1.5 items-center">
      <button
        className={`${iconBtn} bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25`}
        disabled={busy}
        onClick={() => approve.run(creatorId)}
        title="Verify creator"
        aria-label="Approve creator"
      >
        <CheckCircle2 className="h-4 w-4" />
      </button>
      <button
        className={`${iconBtn} bg-rose-500/15 text-rose-400 hover:bg-rose-500/25`}
        disabled={busy}
        onClick={() => reject.run(creatorId)}
        title="Reject application"
        aria-label="Reject creator"
      >
        <XCircle className="h-4 w-4" />
      </button>
      {(approve.error || reject.error) && (
        <span className="text-[11px] text-rose-400">{approve.error ?? reject.error}</span>
      )}
    </span>
  )
}

export function ReportModButtons({ reportId }: { reportId: string }) {
  const resolve = useModAction(resolveReportAction)
  const dismiss = useModAction(dismissReportAction)
  const busy = resolve.pending || dismiss.pending
  return (
    <span className="flex gap-1.5 items-center">
      <button
        className={`${iconBtn} bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25`}
        disabled={busy}
        onClick={() => resolve.run(reportId)}
        title="Mark resolved"
        aria-label="Resolve report"
      >
        <CheckCircle2 className="h-4 w-4" />
      </button>
      <button
        className={`${iconBtn} bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground`}
        disabled={busy}
        onClick={() => dismiss.run(reportId)}
        title="Dismiss"
        aria-label="Dismiss report"
      >
        <XCircle className="h-4 w-4" />
      </button>
      {(resolve.error || dismiss.error) && (
        <span className="text-[11px] text-rose-400">{resolve.error ?? dismiss.error}</span>
      )}
    </span>
  )
}

export function UserBanButton({ userId, banned }: { userId: string; banned: boolean }) {
  const ban = useModAction(banUserAction)
  const unban = useModAction(unbanUserAction)
  const busy = ban.pending || unban.pending
  return (
    <span className="flex gap-1.5 items-center">
      {banned ? (
        <button
          className={`${iconBtn} bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25`}
          disabled={busy}
          onClick={() => unban.run(userId)}
          title="Unban user"
          aria-label="Unban user"
        >
          <Undo2 className="h-4 w-4" />
        </button>
      ) : (
        <button
          className={`${iconBtn} bg-rose-500/15 text-rose-400 hover:bg-rose-500/25`}
          disabled={busy}
          onClick={() => ban.run(userId)}
          title="Ban user"
          aria-label="Ban user"
        >
          <Ban className="h-4 w-4" />
        </button>
      )}
      {(ban.error || unban.error) && (
        <span className="text-[11px] text-rose-400">{ban.error ?? unban.error}</span>
      )}
    </span>
  )
}
