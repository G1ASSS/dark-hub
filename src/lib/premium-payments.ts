/**
 * Manual QR premium payments (KBZ Pay / AYA Pay / UAB Pay).
 * Single source of truth for price + method metadata. The server always
 * enforces PREMIUM_PRICE / PREMIUM_CURRENCY — never trust client input.
 */

export const PREMIUM_PRICE = 6900
export const PREMIUM_CURRENCY = 'MMK'
export const PREMIUM_PLAN_SLUG = 'premium'

export function formatMMK(amount: number): string {
  return `${amount.toLocaleString('en-US')} MMK`
}

export type ManualPayMethodId = 'kbz_pay' | 'aya_pay' | 'uab_pay'

export type ManualPayMethod = {
  id: ManualPayMethodId
  name: string
  shortName: string
  logo: string
  qr: string
  /** App name shown in instructions ("Open KBZPay."). */
  appName: string
  accent: string
}

export const MANUAL_PAY_METHODS: ManualPayMethod[] = [
  {
    id: 'kbz_pay',
    name: 'KBZ Pay',
    shortName: 'KBZPay',
    logo: '/payments/kbz.png',
    qr: '/qrcode/kbz.jpg',
    appName: 'KBZPay',
    accent: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  },
  {
    id: 'aya_pay',
    name: 'AYA Pay',
    shortName: 'AYAPay',
    logo: '/payments/Aya.jpeg',
    qr: '/qrcode/aya.jpg',
    appName: 'AYA Pay',
    accent: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  },
  {
    id: 'uab_pay',
    name: 'UAB Pay',
    shortName: 'uabpay',
    logo: '/payments/Uab.jpeg',
    qr: '/qrcode/uab.jpg',
    appName: 'UAB Pay',
    accent: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  },
]

export function getPayMethod(id: string): ManualPayMethod | undefined {
  return MANUAL_PAY_METHODS.find((m) => m.id === id)
}

export function isManualPayMethod(id: unknown): id is ManualPayMethodId {
  return typeof id === 'string' && MANUAL_PAY_METHODS.some((m) => m.id === id)
}

/** Admin-facing label: manual APPROVED/REJECTED map onto stored statuses. */
export function paymentStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Pending'
    case 'APPROVED':
    case 'SUCCEEDED':
      return 'Approved'
    case 'REJECTED':
    case 'FAILED':
      return 'Rejected'
    case 'CANCELED':
      return 'Cancelled'
    case 'REFUNDED':
      return 'Refunded'
    default:
      return status
  }
}
