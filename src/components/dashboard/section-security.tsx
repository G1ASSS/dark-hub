'use client'
import { useState, useActionState } from 'react'
import { Lock, Loader2, Shield, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { changePassword, confirmTwoFactor, disableTwoFactor, deleteAccount } from '@/actions/account'
import { useAccount } from './account-context'

export function SecuritySection() {
  const initial = useAccount()
  const [passState, passAction, passPending] = useActionState(changePassword, undefined)
  const [totpState, totpAction, totpPending] = useActionState(confirmTwoFactor, undefined)
  const [disableState, disableAction, disablePending] = useActionState(disableTwoFactor, undefined)
  const [deleteState, deleteAction, deletePending] = useActionState(deleteAccount, undefined)
  const [qr, setQr] = useState<{ qr: string; manualKey: string } | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const justEnabled = totpState?.message === 'Two-factor authentication is on.'
  const justDisabled = disableState?.message === 'Two-factor authentication is off.'
  const twoFA = justDisabled ? false : justEnabled ? true : initial.twoFactorEnabled
  const showQr = qr && !justEnabled ? qr : null

  const start2FA = async () => {
    setQrLoading(true)
    try {
      const res = await fetch('/api/account/2fa/setup')
      const data = await res.json()
      if (data.qr) setQr(data)
    } finally {
      setQrLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form action={passAction}>
        <h3 className="mb-3 text-sm font-bold">Change Password</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5"><Label htmlFor="cur">Current</Label><Input id="cur" name="currentPassword" type="password" autoComplete="current-password" required /></div>
          <div className="space-y-1.5"><Label htmlFor="new">New</Label><Input id="new" name="newPassword" type="password" autoComplete="new-password" required minLength={8} /></div>
          <div className="space-y-1.5"><Label htmlFor="conf">Confirm</Label><Input id="conf" name="confirmPassword" type="password" autoComplete="new-password" required /></div>
        </div>
        {passState?.errors && <p className="mt-2 text-xs text-rose-400">{Object.values(passState.errors).flat().filter(Boolean).join(' ')}</p>}
        {passState?.message && <p className="mt-2 text-xs text-emerald-400">{passState.message}</p>}
        <Button type="submit" size="sm" loading={passPending} className="mt-3">Update Password</Button>
      </form>

      <div className="rounded-2xl border border-white/[0.07] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              <Shield className="h-[18px] w-[18px]" />
            </div>
            <div>
              <p className="text-sm font-bold">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground">Authenticator codes at sign in</p>
            </div>
          </div>
          <Badge variant={twoFA ? 'new' : 'secondary'}>{twoFA ? 'On' : 'Off'}</Badge>
        </div>
        {!twoFA ? (
          !showQr ? (
            <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={start2FA} disabled={qrLoading}>
              {qrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Enable 2FA
            </Button>
          ) : (
            <form action={totpAction} className="mt-3 max-w-sm space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={showQr.qr} alt="2FA QR code" className="h-40 w-40 rounded-lg bg-white p-2" />
              <p className="break-all text-xs text-muted-foreground">Manual key: <span className="font-mono text-foreground">{showQr.manualKey}</span></p>
              <div className="space-y-1.5">
                <Label htmlFor="code">Confirm with a code</Label>
                <Input id="code" name="code" inputMode="numeric" placeholder="6-digit code" required maxLength={6} />
              </div>
              {totpState?.message && <p className="text-xs text-muted-foreground">{totpState.message}</p>}
              <Button type="submit" size="sm" loading={totpPending}>Confirm & Enable</Button>
            </form>
          )
        ) : (
          <form action={disableAction} className="mt-3 flex max-w-sm gap-2">
            <Input name="password" type="password" placeholder="Current password" required className="flex-1" />
            <Button type="submit" variant="outline" size="sm" loading={disablePending}>Disable</Button>
          </form>
        )}
        {disableState?.message && <p className="mt-2 text-xs text-muted-foreground">{disableState.message}</p>}
      </div>

      <div className="rounded-2xl border border-white/[0.07] p-4">
        <p className="text-sm font-bold">Your Data</p>
        <p className="mb-3 mt-0.5 text-xs text-muted-foreground">Signed in as {initial.email}</p>
        <div className="flex flex-wrap items-center gap-2">
          <a href="/api/account/export" download>
            <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
          </a>
          {!confirmDelete ? (
            <Button variant="destructive" size="sm" className="gap-2" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> Delete Account
            </Button>
          ) : (
            <form action={deleteAction} className="flex flex-1 min-w-[220px] gap-2">
              <Input name="password" type="password" placeholder="Confirm with password" required className="flex-1" />
              <Button type="submit" variant="destructive" size="sm" loading={deletePending}>Confirm</Button>
            </form>
          )}
        </div>
        {deleteState?.message && <p className="mt-2 text-xs text-rose-400">{deleteState.message}</p>}
      </div>
    </div>
  )
}
