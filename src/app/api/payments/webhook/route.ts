import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getPaymentProvider, confirmTransaction } from '@/lib/payments'

/**
 * Gateway webhook, e.g. POST /api/payments/webhook?provider=manual
 * Verifies authenticity through the provider, then applies the event.
 * Unknown providerRefs are logged and acknowledged (200) so gateways
 * don't retry forever — but nothing is activated.
 */
export async function POST(req: NextRequest) {
  const providerName = req.nextUrl.searchParams.get('provider') ?? undefined
  let provider: ReturnType<typeof getPaymentProvider>
  try {
    provider = getPaymentProvider(providerName)
  } catch {
    return Response.json({ error: 'Unknown provider.' }, { status: 400 })
  }

  let event: Awaited<ReturnType<typeof provider.verifyWebhook>>
  try {
    event = await provider.verifyWebhook(req)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 })
  }

  const tx = await prisma.paymentTransaction.findUnique({
    where: { providerRef: event.providerRef },
    select: { id: true, status: true },
  })
  if (!tx) {
    console.warn('[payments] webhook for unknown ref:', event.providerRef)
    return Response.json({ received: true })
  }

  if (event.type === 'payment.succeeded') {
    try {
      const { subscriptionId } = await confirmTransaction(tx.id)
      return Response.json({ received: true, subscriptionId })
    } catch (err) {
      console.error('[payments] confirm failed:', (err as Error).message)
      return Response.json({ error: 'Confirmation failed.' }, { status: 500 })
    }
  }

  await prisma.paymentTransaction.update({
    where: { id: tx.id },
    data: { status: 'FAILED', raw: { reason: event.reason ?? null } },
  })
  return Response.json({ received: true })
}
