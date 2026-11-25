import type { PaymentLink, ValidPaymentLinkData } from './types'

const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/** Generates an id like `plink_Nf3kQ9aZ2xLm8T`. Not pure (random); kept tiny and separate. */
export function generatePaymentLinkId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(14))
  return `plink_${Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('')}`
}

/** Builds a new, unpaid link from validated form data. Pure given `now` and `id`. */
export function buildPaymentLink(data: ValidPaymentLinkData, now: Date, id: string): PaymentLink {
  return { ...data, id, status: 'Active', createdAt: now.toISOString() }
}

/** Newest first; returns a new array. */
export function sortByCreatedDesc<T extends Pick<PaymentLink, 'createdAt'>>(links: readonly T[]): T[] {
  return [...links].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}
