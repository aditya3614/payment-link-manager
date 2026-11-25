import { afterEach, describe, expect, it, vi } from 'vitest'
import { filterLinksByStatus, getEffectiveStatus, STATUS_FILTERS } from './status'
import type { PaymentLink } from './types'

const NOW = new Date('2026-11-26T10:00:00.000Z')
const PAST = '2026-11-26T09:59:59.999Z'
const FUTURE = '2026-11-26T10:00:00.001Z'

let seq = 0
const makeLink = (overrides: Partial<PaymentLink> = {}): PaymentLink => ({
  id: `plink_${++seq}`,
  amountPaise: 10_000,
  description: 'Test link',
  customerEmail: 'a@b.co',
  customerPhone: null,
  status: 'Active',
  createdAt: '2026-11-20T10:00:00.000Z',
  expiresAt: null,
  ...overrides,
})

describe('getEffectiveStatus', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps an Active link with no expiry Active', () => {
    expect(getEffectiveStatus(makeLink(), NOW)).toBe('Active')
  })

  it('keeps an Active link with a future expiry Active', () => {
    expect(getEffectiveStatus(makeLink({ expiresAt: FUTURE }), NOW)).toBe('Active')
  })

  it('derives Expired for an Active link whose expiry has passed', () => {
    expect(getEffectiveStatus(makeLink({ expiresAt: PAST }), NOW)).toBe('Expired')
  })

  it('treats expiry exactly at `now` as Expired', () => {
    expect(getEffectiveStatus(makeLink({ expiresAt: NOW.toISOString() }), NOW)).toBe('Expired')
  })

  it('never overrides Paid, even after expiry', () => {
    expect(getEffectiveStatus(makeLink({ status: 'Paid', expiresAt: PAST }), NOW)).toBe('Paid')
    expect(getEffectiveStatus(makeLink({ status: 'Paid' }), NOW)).toBe('Paid')
  })

  it('does not mutate the stored status', () => {
    const link = makeLink({ expiresAt: PAST })
    getEffectiveStatus(link, NOW)
    expect(link.status).toBe('Active')
  })

  it('flips from Active to Expired as time passes, without changing the link', () => {
    const link = makeLink({ expiresAt: '2026-11-26T10:05:00.000Z' })
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2026-11-26T10:04:59.999Z'))
    expect(getEffectiveStatus(link)).toBe('Active')

    vi.setSystemTime(new Date('2026-11-26T10:05:00.000Z'))
    expect(getEffectiveStatus(link)).toBe('Expired')
  })

  it('falls back to the stored status for an unparseable expiry', () => {
    expect(getEffectiveStatus(makeLink({ expiresAt: 'garbage' }), NOW)).toBe('Active')
  })
})

describe('filterLinksByStatus', () => {
  const active = makeLink({ description: 'active', expiresAt: FUTURE })
  const activeNoExpiry = makeLink({ description: 'active-no-expiry' })
  const paid = makeLink({ description: 'paid', status: 'Paid' })
  const paidAfterExpiry = makeLink({ description: 'paid-after-expiry', status: 'Paid', expiresAt: PAST })
  const staleActive = makeLink({ description: 'stale-active', expiresAt: PAST })
  const links = [active, activeNoExpiry, paid, paidAfterExpiry, staleActive]

  const descriptions = (result: PaymentLink[]) => result.map((l) => l.description)

  it('exposes filters in display order', () => {
    expect(STATUS_FILTERS).toEqual(['All', 'Active', 'Paid', 'Expired'])
  })

  it('All returns every link in original order', () => {
    expect(filterLinksByStatus(links, 'All', NOW)).toEqual(links)
  })

  it('All returns a new array (safe to sort without mutating state)', () => {
    expect(filterLinksByStatus(links, 'All', NOW)).not.toBe(links)
  })

  it('Active excludes links whose expiry has passed', () => {
    expect(descriptions(filterLinksByStatus(links, 'Active', NOW))).toEqual(['active', 'active-no-expiry'])
  })

  it('Paid includes paid links regardless of expiry', () => {
    expect(descriptions(filterLinksByStatus(links, 'Paid', NOW))).toEqual(['paid', 'paid-after-expiry'])
  })

  it('Expired matches stored-Active links that have auto-expired', () => {
    expect(descriptions(filterLinksByStatus(links, 'Expired', NOW))).toEqual(['stale-active'])
  })

  it('every link lands in exactly one non-All bucket', () => {
    const buckets = STATUS_FILTERS.filter((f) => f !== 'All').flatMap((f) => filterLinksByStatus(links, f, NOW))
    expect(buckets).toHaveLength(links.length)
    expect(new Set(buckets)).toEqual(new Set(links))
  })

  it('re-evaluates expiry against the supplied time', () => {
    const later = new Date('2026-11-27T00:00:00.000Z')
    expect(descriptions(filterLinksByStatus(links, 'Expired', later))).toEqual(['active', 'stale-active'])
  })

  it('returns an empty array when nothing matches', () => {
    expect(filterLinksByStatus([active], 'Paid', NOW)).toEqual([])
    expect(filterLinksByStatus([], 'All', NOW)).toEqual([])
  })
})
