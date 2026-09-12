import 'server-only'
import nodemailer from 'nodemailer'

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!isEmailConfigured()) throw new Error('Email is not configured')
  await transporter().sendMail({
    from: process.env.EMAIL_FROM ?? 'Dark Hubb <noreply@darkhubb.com>',
    to,
    subject,
    html,
  })
}

export function resetEmailHtml(link: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#eee;background:#0A0A0F;padding:32px;border-radius:16px">
      <h1 style="font-size:20px">Reset your Dark Hubb password</h1>
      <p style="color:#aaa">Someone requested a password reset. If that was you, click below within 1 hour:</p>
      <p><a href="${link}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none">Reset password</a></p>
      <p style="color:#666;font-size:12px">Didn't ask for this? Ignore the email — your password stays unchanged.</p>
    </div>`
}
