import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service' }

const SECTIONS = [
  {
    h: '1. Adults only (18+)',
    p: 'Dark Hubb is strictly for adults. By creating an account or viewing content you confirm you are at least 18 years old (or the age of majority in your jurisdiction, if higher) and legally permitted to view adult content where you live.',
  },
  {
    h: '2. Your account',
    p: 'You are responsible for keeping your credentials private. Sharing accounts, selling access, or circumventing access controls (including download limits and plan restrictions) violates these terms and may lead to suspension.',
  },
  {
    h: '3. Content rules for creators',
    p: 'Every performer must be 18+ with documented proof of age and written, informed consent. You must own or be licensed to distribute everything you upload. Non-consensual, leaked, underage, or rights-infringing content is prohibited and will be removed, reported where the law requires, and results in a permanent ban.',
  },
  {
    h: '4. Downloads and personal use',
    p: 'Premium downloads are licensed for your personal offline viewing only. Re-uploading, sharing, or redistributing downloaded files is prohibited. Downloads carry a forensic watermark tied to your account.',
  },
  {
    h: '5. Acceptable use',
    p: 'No scraping, bulk downloading, credential sharing, abuse of staff or creators, or attempts to breach platform security. Rate limits and abuse detection are enforced technically and manually.',
  },
  {
    h: '6. Termination',
    p: 'We may suspend or terminate accounts that breach these terms, with downloads and premium access revoked. Serious violations (underage or non-consensual content) are reported to the relevant authorities.',
  },
  {
    h: '7. Changes',
    p: 'We may update these terms; material changes will be announced in-app. Continued use after changes take effect constitutes acceptance.',
  },
]

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: September 2026</p>
      <div className="space-y-6">
        {SECTIONS.map((s) => (
          <section key={s.h} className="glass rounded-2xl p-6">
            <h2 className="font-semibold mb-2">{s.h}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.p}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
