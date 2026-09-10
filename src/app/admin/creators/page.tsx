"use client"
import { BadgeCheck, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Metadata } from 'next'

const PENDING = Array.from({ length: 10 }, (_, i) => ({
  id: `vc-${i+1}`,
  name: ['Stella Noir','Axe Media','Luna Spark','Prism Studio','Dark Vale','Crimson Arc','Nova Films','Echo Collective','Silver Veil','Obsidian Peak'][i],
  slug: `creator-${i+1}`,
  email: `creator${i+1}@example.com`,
  docs: ((i * 29) % 3) + 2,
  appliedAt: new Date(Date.now() - i * 86400000 * 0.5).toISOString(),
  status: ['PENDING','PENDING','PENDING','UNDER_REVIEW','PENDING','PENDING','UNDER_REVIEW','PENDING','PENDING','PENDING'][i],
}))

export default function AdminCreatorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Creator Verification</h1>
        <p className="text-sm text-muted-foreground mt-1">{PENDING.filter(p => p.status === 'PENDING').length} applications pending review</p>
      </div>
      <div className="glass rounded-2xl divide-y divide-white/6">
        {PENDING.map((c) => (
          <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-white/3 transition-colors">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-rose-500/20 flex items-center justify-center shrink-0">
              <BadgeCheck className="h-6 w-6 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{c.name}</p>
                <Badge variant={c.status === 'UNDER_REVIEW' ? 'verified' : 'secondary'} className="text-[10px]">
                  {c.status === 'UNDER_REVIEW' ? <><Clock className="h-2.5 w-2.5 mr-1" />Under Review</> : 'Pending'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{c.email} · Applied {new Date(c.appliedAt).toLocaleDateString()} · {c.docs} documents</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <FileText className="h-3 w-3" /> Review Docs
              </Button>
              <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors" title="Approve">
                <CheckCircle2 className="h-4 w-4" />
              </button>
              <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors" title="Reject">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
