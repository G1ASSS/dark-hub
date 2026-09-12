import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Content Policy' }

const RULES = [
  { h: 'Always required', items: ['All performers 18+ with verifiable proof of age', 'Written, informed consent from every performer', 'Full rights ownership or license to distribute'] },
  { h: 'Zero tolerance — instant removal + ban + report to authorities where required', items: ['Underage content or anything sexualizing minors', 'Non-consensual or leaked private content', 'Content facilitating exploitation or trafficking'] },
  { h: 'Prohibited', items: ['Copyright-infringing uploads', 'Stolen, re-uploaded, or watermark-stripped content', 'Spam, scams, or deceptive metadata', 'Extreme gore unrelated to consensual adult performance'] },
]

export default function ContentPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">Content Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: September 2026</p>
      <div className="space-y-6">
        {RULES.map((s) => (
          <section key={s.h} className="glass rounded-2xl p-6">
            <h2 className="font-semibold mb-3">{s.h}</h2>
            <ul className="space-y-2">
              {s.items.map((i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-cyan mt-0.5">•</span> {i}
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-2">Enforcement</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every upload passes automated checks plus human moderation before publishing.
            Use the Report button on any video — reports enter a real staff queue with
            audit-logged outcomes.
          </p>
        </section>
      </div>
    </div>
  )
}
