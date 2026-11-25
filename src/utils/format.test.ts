import { describe, expect, it } from 'vitest'
import { formatAmount, formatDateTime, formatPhone, toDateTimeLocalValue } from './format'

/** ICU may emit narrow/no-break spaces; normalise for stable assertions. */
const norm = (s: string) => s.replace(/\s/g, ' ')

describe('formatAmount (en-IN)', () => {
  it.each([
    [1, '₹0.01'],
    [100, '₹1.00'],
    [149950, '₹1,499.50'],
    [1_250_000, '₹12,500.00'],
    [4_500_000, '₹45,000.00'],
    [10_000_000, '₹1,00,000.00'],
    [50_000_000, '₹5,00,000.00'],
  ])('%i paise → %s', (paise, expected) => {
    expect(formatAmount(paise)).toBe(expected)
  })
})

describe('formatDateTime', () => {
  it('formats in en-IN medium date + short time', () => {
    const out = norm(formatDateTime('2026-11-26T10:00:00.000Z', 'Asia/Kolkata'))
    expect(out).toContain('26 Nov 2026')
    expect(out).toMatch(/3:30 ?pm/i)
  })

  it('returns a dash for invalid input', () => {
    expect(formatDateTime('nope')).toBe('—')
  })
})

describe('formatPhone', () => {
  it('groups Indian mobile numbers', () => {
    expect(formatPhone('+919876543210')).toBe('+91 98765 43210')
  })

  it('leaves unexpected formats untouched', () => {
    expect(formatPhone('12345')).toBe('12345')
  })
})

describe('toDateTimeLocalValue', () => {
  it('produces a datetime-local compatible string in local time', () => {
    const date = new Date(2030, 0, 5, 7, 3) // local time
    expect(toDateTimeLocalValue(date)).toBe('2030-01-05T07:03')
  })

  it('round-trips through Date parsing', () => {
    const date = new Date(2031, 11, 31, 23, 59)
    expect(new Date(toDateTimeLocalValue(date)).getTime()).toBe(date.getTime())
  })
})
