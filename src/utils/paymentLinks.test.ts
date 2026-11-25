import { describe, expect, it } from 'vitest'
import { createSeedLinks } from '../data/seedLinks'
import { buildPaymentLink, generatePaymentLinkId, sortByCreatedDesc } from './paymentLinks'
import { countByStatus, getEffectiveStatus } from './status'

const NOW = new Date('2026-11-26T10:00:00.000Z')

describe('generatePaymentLinkId', () => {
  it('produces plink_ ids with 14 alphanumeric chars', () => {
    expect(generatePaymentLinkId()).toMatch(/^plink_[A-Za-z0-9]{14}$/)
  })

  it('does not repeat across many calls', () => {
    const ids = new Set(Array.from({ length: 500 }, generatePaymentLinkId))
    expect(ids.size).toBe(500)
  })
})

describe('buildPaymentLink', () => {
  it('creates an Active link stamped with the given time and id', () => {
    const link = buildPaymentLink(
      {
        amountPaise: 100,
        description: 'Test',
        customerEmail: 'a@b.co',
        customerPhone: null,
        expiresAt: null,
      },
      NOW,
      'plink_test',
    )
    expect(link).toEqual({
      id: 'plink_test',
      amountPaise: 100,
      description: 'Test',
      customerEmail: 'a@b.co',
      customerPhone: null,
      expiresAt: null,
      status: 'Active',
      createdAt: NOW.toISOString(),
    })
  })
})

describe('sortByCreatedDesc', () => {
  it('orders newest first without mutating the input', () => {
    const input = [
      { createdAt: '2026-01-01T00:00:00Z', n: 1 },
      { createdAt: '2026-03-01T00:00:00Z', n: 3 },
      { createdAt: '2026-02-01T00:00:00Z', n: 2 },
    ]
    expect(sortByCreatedDesc(input).map((x) => x.n)).toEqual([3, 2, 1])
    expect(input.map((x) => x.n)).toEqual([1, 3, 2])
  })
})

describe('createSeedLinks', () => {
  const seed = createSeedLinks(NOW)

  it('covers every displayed status', () => {
    expect(countByStatus(seed, NOW)).toEqual({ All: 6, Active: 3, Paid: 2, Expired: 1 })
  })

  it('never stores Expired — it is derived from a past expiry', () => {
    expect(seed.some((l) => (l.status as string) === 'Expired')).toBe(false)
    const derived = seed.filter((l) => getEffectiveStatus(l, NOW) === 'Expired')
    expect(derived.map((l) => l.status)).toEqual(['Active'])
  })

  it('has unique ids and only valid amounts', () => {
    expect(new Set(seed.map((l) => l.id)).size).toBe(seed.length)
    for (const l of seed) {
      expect(l.amountPaise).toBeGreaterThan(0)
      expect(l.amountPaise).toBeLessThanOrEqual(50_000_000)
      expect(l.customerEmail ?? l.customerPhone).toBeTruthy()
    }
  })
})
