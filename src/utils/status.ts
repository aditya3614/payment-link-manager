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

export function countByStatus(
  links: readonly Pick<PaymentLink, 'status' | 'expiresAt'>[],
  now: Date = new Date(),
): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = { All: links.length, Active: 0, Paid: 0, Expired: 0 }
  for (const link of links) counts[getEffectiveStatus(link, now)] += 1
  return counts
}

/**
 * Earliest future moment at which some link's effective status will flip to
 * Expired, or null if none will. Lets the UI re-render exactly when needed.
 */
export function getNextExpiryTime(
  links: readonly Pick<PaymentLink, 'status' | 'expiresAt'>[],
  now: Date = new Date(),
): number | null {
  let next: number | null = null
  for (const link of links) {
    if (link.status === 'Paid' || !link.expiresAt) continue
    const at = Date.parse(link.expiresAt)
    if (Number.isNaN(at) || at <= now.getTime()) continue
    if (next === null || at < next) next = at
  }
  return next
}
