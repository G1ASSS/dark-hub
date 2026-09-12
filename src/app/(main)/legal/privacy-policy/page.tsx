import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy' }

const SECTIONS = [
  {
    h: 'What we store',
    p: 'Account details (email, username, profile), your uploads and their processing metadata, favourites, watch history and progress, downloads, subscriptions and payment records, reports you file, and security logs (sign-ins, moderation actions). Passwords are bcrypt-hashed; 2FA secrets are encrypted at rest in our database access controls.',
  },
  {
    h: 'What we never do',
    p: 'We do not sell personal data, run third-party advertising trackers, or expose your viewing activity publicly. Commenter names are anonymized in the interface, and downloads carry only a forensic watermark visible to our abuse team.',
  },
  {
    h: 'Media storage',
    p: 'Video files are stored with our private storage provider and served through short-lived, signed URLs. Files are never publicly listed or indexed.',
  },
  {
    h: 'Your rights',
    p: 'From your dashboard you can export everything stored about you (Privacy → Data Export) and delete your account at any time (Privacy → Delete Account), which deactivates it immediately. Contact support for correction or erasure requests.',
  },
  {
    h: 'Retention',
    p: 'Active account data is kept while your account exists. Safety records (abuse reports, bans, takedowns) are retained as required for legal compliance even after deletion.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
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
