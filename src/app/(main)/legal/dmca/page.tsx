import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'DMCA & Copyright' }

export default function DmcaPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold mb-2">DMCA & Copyright</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: September 2026</p>
      <div className="space-y-6">
        <section className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-2">Reporting infringement</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you believe content on Dark Hubb infringes your copyright, open the video, press
            Report, and choose “Copyright infringement” with details identifying the original work
            and your rights to it. Include your full name, contact email, and a statement made
            under penalty of perjury that the use is unauthorized.
          </p>
        </section>
        <section className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-2">What happens next</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Valid requests hide the video pending review, typically within 48 hours. Confirmed
            infringements are removed permanently and the uploader is penalized; repeat infringers
            are banned. Counter-notices (consent, license, fair use) can be filed by replying to
            our decision email.
          </p>
        </section>
        <section className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-2">For creators</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Only upload content you own or are licensed to distribute. Keep your licenses and
            performer documentation — our team may request them during review.
          </p>
        </section>
      </div>
    </div>
  )
}
