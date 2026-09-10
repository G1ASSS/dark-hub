import 'server-only'

/**
 * Payment provider contract. The app never talks to a specific gateway;
 * everything goes through this interface so providers (Stripe, crypto,
 * manual transfer, …) are swappable via PAYMENT_PROVIDER.
 */

export type CheckoutInput = {
  userId: string
  planSlug: string
  amountCents: number
  currency: string
}

export type CheckoutResult = {
  /** Our PaymentTransaction id */
  transactionId: string
  /** Provider-side reference (payment intent id, invoice ref, …) */
  providerRef?: string
  /** Hosted checkout URL, when the provider has one */
  checkoutUrl?: string
  /** Human instructions (used by manual/offline providers) */
  instructions?: string
}

export type PaymentEvent =
  | { type: 'payment.succeeded'; providerRef: string; amountCents?: number; currency?: string; raw?: unknown }
  | { type: 'payment.failed'; providerRef: string; reason?: string; raw?: unknown }

export interface PaymentProvider {
  readonly name: string
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>
  /** Verify authenticity and normalize an incoming webhook request. */
  verifyWebhook(req: Request): Promise<PaymentEvent>
}
