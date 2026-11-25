import type { PaymentLink, PaymentLinkStatus, StatusFilter } from './types'

export const STATUS_FILTERS: readonly StatusFilter[] = ['All', 'Active', 'Paid', 'Expired']

/**
 * Derives the status to display. A link that is not Paid and whose expiry is
 * at or before `now` is Expired — this is computed on every render, never stored.
 */
export function getEffectiveStatus(
  link: Pick<PaymentLink, 'status' | 'expiresAt'>,
  now: Date = new Date(),
): PaymentLinkStatus {
  if (link.status !== 'Paid' && link.expiresAt && new Date(link.expiresAt) <= now) {
    return 'Expired'
  }
  return link.status
}

export function filterLinksByStatus<T extends Pick<PaymentLink, 'status' | 'expiresAt'>>(
  links: readonly T[],
  filter: StatusFilter,
  now: Date = new Date(),
): T[] {
  if (filter === 'All') return [...links]
  return links.filter((link) => getEffectiveStatus(link, now) === filter)
}
