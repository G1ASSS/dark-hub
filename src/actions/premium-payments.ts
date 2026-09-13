'use server'

import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { revalidatePath } from 'next/cache'
import sharp from 'sharp'
import { prisma } from '@/lib/db/prisma'
import { verifySession, requireAdmin } from '@/lib/auth/dal'
import { getStorageProvider } from '@/lib/storage'
import { checkRateLimit } from '@/lib/rate-limit'
import { confirmTransaction } from '@/lib/payments'
import {
  PREMIUM_PRICE,
  PREMIUM_CURRENCY,
  PREMIUM_PLAN_SLUG,
  isManualPayMethod,
} from '@/lib/premium-payments'

const TX_ID_RE = /^[A-Za-z0-9][A-Za-z0-9 _\-#]{3,63}$/
const SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024

type ActionResult = { ok: true } | { error: string }

function revalidatePaymentPages() {
  revalidatePath('/premium/buy')
  revalidatePath('/premium')
  revalidatePath('/dashboard/premium')
  revalidatePath('/admin/payments')
}

/**
 * User submits proof of a manual QR payment. Always creates a PENDING
 * record — Premium is NEVER activated here. Price is enforced server-side.
 */
export async function submitPaymentAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const session = await verifySession()
  if (!session) return { error: 'Sign in to submit a payment.' }

  const rl = await checkRateLimit(`payment-submit:${session.userId}`, 5, 3600)
  if (!rl.allowed) return { error: 'Too many submissions. Try again later.' }

  const method = formData.get('method')
  if (!isManualPayMethod(method)) return { error: 'Choose KBZ Pay, AYA Pay or UAB Pay.' }

  const transactionId = String(formData.get('transactionId') ?? '').trim()
  if (!TX_ID_RE.test(transactionId)) {
    return { error: 'Enter a valid transaction ID / reference (4–64 characters).' }
  }

  const existing = await prisma.paymentTransaction.findFirst({
    where: { userId: session.userId, status: 'PENDING' },
    select: { id: true },
  })
  if (existing) return { error: 'You already have a payment waiting for verification.' }

  let screenshotKey: string | null = null
  const file = formData.get('screenshot')
  if (file instanceof File && file.size > 0) {
    if (file.size > SCREENSHOT_MAX_BYTES) return { error: 'Screenshot must be 5MB or smaller.' }
    let input: Buffer
    try {
      input = Buffer.from(await file.arrayBuffer())
    } catch {
      return { error: 'Could not read the screenshot file.' }
    }
    let normalized: Buffer
    try {
      normalized = await sharp(input)
        .resize({ width: 1600, withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer()
    } catch {
      return { error: 'Screenshot must be a JPEG, PNG or WebP image.' }
    }
    const tmpRoot = process.env.UPLOAD_TMP_DIR || join(tmpdir(), 'darkhubb-uploads')
    await fs.mkdir(tmpRoot, { recursive: true })
    const tmpPath = join(tmpRoot, `payment-${session.userId}-${Date.now()}.jpg`)
    try {
      await fs.writeFile(tmpPath, normalized)
      const uploaded = await getStorageProvider().uploadFile({
        filePath: tmpPath,
        fileName: `payment-${method}.jpg`,
        mimeType: 'image/jpeg',
        asVideo: false,
      })
      screenshotKey = `tg:${uploaded.fileId}`
    } catch {
      return { error: 'Screenshot upload failed. Try again.' }
    } finally {
      await fs.rm(tmpPath, { force: true })
    }
  }

  const payment = await prisma.paymentTransaction.create({
    data: {
      userId: session.userId,
      provider: method,
      // NEVER trust client amounts — the price is fixed server-side.
      amountCents: PREMIUM_PRICE,
      currency: PREMIUM_CURRENCY,
      status: 'PENDING',
      transactionRef: transactionId,
      screenshotKey,
      raw: { planSlug: PREMIUM_PLAN_SLUG },
    },
    select: { id: true },
  })
  await prisma.auditLog.create({
    data: {
      actorId: session.userId,
      action: 'PAYMENT_SUBMITTED',
      targetType: 'PAYMENT',
      targetId: payment.id,
      metadata: { method, amount: PREMIUM_PRICE, currency: PREMIUM_CURRENCY },
    },
  })
  revalidatePaymentPages()
  return { ok: true }
}

/** User cancels their own pending payment. */
export async function cancelPaymentAction(paymentId: string): Promise<ActionResult> {
  const session = await verifySession()
  if (!session) return { error: 'Sign in required.' }
  const payment = await prisma.paymentTransaction.findFirst({
    where: { id: paymentId, userId: session.userId },
    select: { id: true, status: true },
  })
  if (!payment) return { error: 'Payment not found.' }
  if (payment.status !== 'PENDING') return { error: 'Only pending payments can be cancelled.' }
  await prisma.paymentTransaction.update({
    where: { id: payment.id },
    data: { status: 'CANCELED' },
  })
  await prisma.auditLog.create({
    data: { actorId: session.userId, action: 'PAYMENT_CANCELLED', targetType: 'PAYMENT', targetId: payment.id },
  })
  revalidatePaymentPages()
  return { ok: true }
}

/** Admin approves a pending payment → activates (or extends) Premium. */
export async function approvePaymentAction(paymentId: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  const payment = await prisma.paymentTransaction.findUnique({
    where: { id: paymentId },
    select: { id: true, userId: true, status: true, provider: true, amountCents: true },
  })
  if (!payment) return { error: 'Payment not found.' }
  if (payment.status !== 'PENDING') return { error: 'Only pending payments can be approved.' }
  if (payment.amountCents !== PREMIUM_PRICE) return { error: 'Amount mismatch — refusing to approve.' }

  await prisma.paymentTransaction.update({
    where: { id: payment.id },
    data: { status: 'APPROVED', reviewedById: admin.userId, reviewedAt: new Date() },
  })
  try {
    // confirmTransaction keeps APPROVED and creates/extends the subscription.
    await confirmTransaction(payment.id)
  } catch (e) {
    return { error: `Approval saved but activation failed: ${(e as Error).message}` }
  }
  await prisma.auditLog.create({
    data: {
      actorId: admin.userId,
      action: 'PAYMENT_APPROVED',
      targetType: 'PAYMENT',
      targetId: payment.id,
      metadata: { userId: payment.userId, method: payment.provider },
    },
  })
  revalidatePaymentPages()
  return { ok: true }
}

/** Admin rejects a pending payment with an optional reason. */
export async function rejectPaymentAction(paymentId: string, reason?: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  const cleanReason = String(reason ?? '').trim().slice(0, 500) || null
  const payment = await prisma.paymentTransaction.findUnique({
    where: { id: paymentId },
    select: { id: true, userId: true, status: true, provider: true },
  })
  if (!payment) return { error: 'Payment not found.' }
  if (payment.status !== 'PENDING') return { error: 'Only pending payments can be rejected.' }
  await prisma.paymentTransaction.update({
    where: { id: payment.id },
    data: {
      status: 'REJECTED',
      rejectionReason: cleanReason,
      reviewedById: admin.userId,
      reviewedAt: new Date(),
    },
  })
  await prisma.auditLog.create({
    data: {
      actorId: admin.userId,
      action: 'PAYMENT_REJECTED',
      targetType: 'PAYMENT',
      targetId: payment.id,
      metadata: { userId: payment.userId, method: payment.provider, reason: cleanReason },
    },
  })
  revalidatePaymentPages()
  return { ok: true }
}
