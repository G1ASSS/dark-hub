"use client"
import { useState } from 'react'
import { Flag, Eye, Trash2, CheckCircle2, XCircle, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { Metadata } from 'next'

const REPORTS = Array.from({ length: 20 }, (_, i) => ({
  id: `report-${i + 1}`,
  type: ['VIDEO', 'USER', 'COMMENT'][i % 3],
  reason: ['ILLEGAL_CONTENT', 'NON_CONSENSUAL', 'COPYRIGHT_INFRINGEMENT', 'HARASSMENT', 'ABUSE', 'SPAM'][i % 6],
  target: i % 3 === 1 ? `@user_${i}` : `Video #${7000 + i}`,
  reporter: `@reporter_${i + 1}`,
  status: ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'][i % 4],
  createdAt: new Date(Date.now() - i * 3600000 * 4).toISOString(),
  details: i % 2 === 0 ? 'This content appears to violate community guidelines.' : null,
}))

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  UNDER_REVIEW: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  RESOLVED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  DISMISSED: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
}

export default function AdminReportsPage() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterReason, setFilterReason] = useState('')

  const filtered = REPORTS.filter((r) => {
    if (search && !r.target.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus && r.status !== filterStatus) return false
    if (filterReason && r.reason !== filterReason) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">{REPORTS.filter(r => r.status === 'PENDING').length} pending review</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reports…" className="pl-9" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Status</option>
          {['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={filterReason} onChange={(e) => setFilterReason(e.target.value)} className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Reasons</option>
          {['ILLEGAL_CONTENT', 'NON_CONSENSUAL', 'COPYRIGHT_INFRINGEMENT', 'HARASSMENT', 'ABUSE', 'SPAM'].map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/6 text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left px-4 py-3">Target</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Reason</th>
                <th className="text-left px-4 py-3">Reporter</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((report, i) => (
                <tr key={report.id} className={`border-b border-white/4 hover:bg-white/3 transition-colors ${i === filtered.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-4 py-3 font-medium">{report.target}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{report.type}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{report.reason.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{report.reporter}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[report.status]}`}>
                      {report.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors" title="Review">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 transition-colors" title="Resolve">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                      <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors" title="Dismiss">
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
