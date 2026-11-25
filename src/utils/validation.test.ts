import { describe, expect, it } from 'vitest'
import type { PaymentLinkInput } from './types'
import {
  ERROR_MESSAGES,
  isValidEmail,
  isValidIndianPhone,
  normalizeIndianPhone,
  parseAmountToPaise,
  validatePaymentLink,
} from './validation'

const NOW = new Date('2026-11-26T10:00:00.000Z')

const validInput = (overrides: Partial<PaymentLinkInput> = {}): PaymentLinkInput => ({
  amount: '1499.50',
  description: 'Consultation fee',
  email: 'customer@example.com',
  phone: '',
  expiresAt: '',
  ...overrides,
})

describe('parseAmountToPaise', () => {
  it.each([
    ['1', 100],
    ['0.01', 1],
    ['1499.5', 149950],
    ['1499.50', 149950],
    ['  250  ', 25000],
    ['500000', 50_000_000],
    ['500000.00', 50_000_000],
    ['5,00,000', 50_000_000],
    ['007', 700],
  ])('accepts %j as %i paise', (raw, paise) => {
    expect(parseAmountToPaise(raw)).toEqual({ ok: true, paise })
  })

  it('avoids floating-point drift (0.29 → 29 paise, not 28.999…)', () => {
    expect(parseAmountToPaise('0.29')).toEqual({ ok: true, paise: 29 })
  })

  it.each([
    ['', ERROR_MESSAGES.amountRequired],
    ['   ', ERROR_MESSAGES.amountRequired],
    ['abc', ERROR_MESSAGES.amountInvalid],
    ['1e3', ERROR_MESSAGES.amountInvalid],
    ['.5', ERROR_MESSAGES.amountInvalid],
    ['5.', ERROR_MESSAGES.amountInvalid],
    ['₹100', ERROR_MESSAGES.amountInvalid],
    ['10.123', ERROR_MESSAGES.amountDecimals],
    ['0.001', ERROR_MESSAGES.amountDecimals],
    ['0', ERROR_MESSAGES.amountTooLow],
    ['0.00', ERROR_MESSAGES.amountTooLow],
    ['-5', ERROR_MESSAGES.amountTooLow],
    ['-0.01', ERROR_MESSAGES.amountTooLow],
    ['500000.01', ERROR_MESSAGES.amountTooHigh],
    ['500001', ERROR_MESSAGES.amountTooHigh],
    ['5,00,001', ERROR_MESSAGES.amountTooHigh],
    ['99999999999999999999999', ERROR_MESSAGES.amountTooHigh],
  ])('rejects %j with %j', (raw, error) => {
    expect(parseAmountToPaise(raw)).toEqual({ ok: false, error })
  })
})

describe('isValidEmail', () => {
  it.each(['a@b.co', 'first.last+tag@sub.example.in', '  padded@example.com  ', 'UPPER@EXAMPLE.COM'])(
    'accepts %j',
    (email) => expect(isValidEmail(email)).toBe(true),
  )

  it.each([
    '',
    'plainaddress',
    '@example.com',
    'user@',
    'user@example',
    'user@example.c',
    'user@@example.com',
    'user name@example.com',
    '.user@example.com',
    'user.@example.com',
    'us..er@example.com',
    'user@-example.com',
    'user@example..com',
    `${'a'.repeat(250)}@example.com`,
  ])('rejects %j', (email) => expect(isValidEmail(email)).toBe(false))
})

describe('isValidIndianPhone / normalizeIndianPhone', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['6000000000', '+916000000000'],
    ['+919876543210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
    ['98765-43210', '+919876543210'],
  ])('accepts %j and normalises to %j', (raw, normalised) => {
    expect(isValidIndianPhone(raw)).toBe(true)
    expect(normalizeIndianPhone(raw)).toBe(normalised)
  })

  it.each([
    '',
    '5876543210', // starts with 5
    '0987654321', // starts with 0
    '987654321', // 9 digits
    '98765432101', // 11 digits
    '919876543210', // country code without +
    '+929876543210', // wrong country code
    '+91 5876543210', // valid prefix, invalid leading digit
    '98765abcde',
  ])('rejects %j', (raw) => {
    expect(isValidIndianPhone(raw)).toBe(false)
    expect(normalizeIndianPhone(raw)).toBeNull()
  })
})

describe('validatePaymentLink', () => {
  it('returns normalised data for a valid input', () => {
    const result = validatePaymentLink(
      validInput({
        description: '  Consultation fee  ',
        email: ' Customer@Example.com ',
        phone: '+91 98765 43210',
        expiresAt: '2026-12-01T10:00:00.000Z',
      }),
      NOW,
    )
    expect(result).toEqual({
      valid: true,
      errors: {},
      data: {
        amountPaise: 149950,
        description: 'Consultation fee',
        customerEmail: 'customer@example.com',
        customerPhone: '+919876543210',
        expiresAt: '2026-12-01T10:00:00.000Z',
      },
    })
  })

  describe('amount boundaries', () => {
    it('accepts exactly the ₹5,00,000 cap', () => {
      expect(validatePaymentLink(validInput({ amount: '500000' }), NOW).valid).toBe(true)
    })

    it('rejects one paisa over the cap', () => {
      const result = validatePaymentLink(validInput({ amount: '500000.01' }), NOW)
      expect(result.valid).toBe(false)
      expect(result.errors.amount).toBe(ERROR_MESSAGES.amountTooHigh)
    })

    it('rejects 3 decimal places', () => {
      expect(validatePaymentLink(validInput({ amount: '10.999' }), NOW).errors.amount).toBe(
        ERROR_MESSAGES.amountDecimals,
      )
    })

    it('rejects zero and missing amounts', () => {
      expect(validatePaymentLink(validInput({ amount: '0' }), NOW).errors.amount).toBe(ERROR_MESSAGES.amountTooLow)
      expect(validatePaymentLink(validInput({ amount: '' }), NOW).errors.amount).toBe(ERROR_MESSAGES.amountRequired)
    })
  })

  describe('description', () => {
    it('accepts exactly 100 characters', () => {
      expect(validatePaymentLink(validInput({ description: 'x'.repeat(100) }), NOW).valid).toBe(true)
    })

    it('rejects 101 characters', () => {
      expect(validatePaymentLink(validInput({ description: 'x'.repeat(101) }), NOW).errors.description).toBe(
        ERROR_MESSAGES.descriptionTooLong,
      )
    })

    it('ignores surrounding whitespace when measuring length', () => {
      expect(validatePaymentLink(validInput({ description: `  ${'x'.repeat(100)}  ` }), NOW).valid).toBe(true)
    })

    it('rejects empty and whitespace-only descriptions', () => {
      expect(validatePaymentLink(validInput({ description: '' }), NOW).errors.description).toBe(
        ERROR_MESSAGES.descriptionRequired,
      )
      expect(validatePaymentLink(validInput({ description: '   ' }), NOW).errors.description).toBe(
        ERROR_MESSAGES.descriptionRequired,
      )
    })
  })

  describe('customer contact', () => {
    it('requires at least one of email or phone', () => {
      const result = validatePaymentLink(validInput({ email: '', phone: '' }), NOW)
      expect(result.valid).toBe(false)
      expect(result.errors).toEqual({ contact: ERROR_MESSAGES.contactRequired })
    })

    it('treats whitespace-only contact fields as missing', () => {
      expect(validatePaymentLink(validInput({ email: '  ', phone: '  ' }), NOW).errors.contact).toBe(
        ERROR_MESSAGES.contactRequired,
      )
    })

    it('accepts phone only', () => {
      const result = validatePaymentLink(validInput({ email: '', phone: '9876543210' }), NOW)
      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.data.customerEmail).toBeNull()
        expect(result.data.customerPhone).toBe('+919876543210')
      }
    })

    it('accepts email only', () => {
      const result = validatePaymentLink(validInput({ email: 'a@b.co', phone: '' }), NOW)
      expect(result.valid).toBe(true)
      if (result.valid) expect(result.data.customerPhone).toBeNull()
    })

    it('rejects an invalid email even when a valid phone is present', () => {
      const result = validatePaymentLink(validInput({ email: 'not-an-email', phone: '9876543210' }), NOW)
      expect(result.errors).toEqual({ email: ERROR_MESSAGES.emailInvalid })
    })

    it('rejects an invalid phone even when a valid email is present', () => {
      const result = validatePaymentLink(validInput({ phone: '12345' }), NOW)
      expect(result.errors).toEqual({ phone: ERROR_MESSAGES.phoneInvalid })
    })

    it('reports both contact errors when both are invalid', () => {
      const result = validatePaymentLink(validInput({ email: 'bad', phone: '123' }), NOW)
      expect(result.errors).toEqual({ email: ERROR_MESSAGES.emailInvalid, phone: ERROR_MESSAGES.phoneInvalid })
    })
  })

  describe('expiry', () => {
    it('is optional', () => {
      const result = validatePaymentLink(validInput({ expiresAt: '' }), NOW)
      expect(result.valid).toBe(true)
      if (result.valid) expect(result.data.expiresAt).toBeNull()
    })

    it('accepts one millisecond in the future', () => {
      expect(validatePaymentLink(validInput({ expiresAt: '2026-11-26T10:00:00.001Z' }), NOW).valid).toBe(true)
    })

    it('rejects an expiry exactly equal to now (must be strictly future)', () => {
      expect(validatePaymentLink(validInput({ expiresAt: NOW.toISOString() }), NOW).errors.expiresAt).toBe(
        ERROR_MESSAGES.expiryNotFuture,
      )
    })

    it('rejects a past expiry', () => {
      expect(validatePaymentLink(validInput({ expiresAt: '2026-11-25T10:00:00.000Z' }), NOW).errors.expiresAt).toBe(
        ERROR_MESSAGES.expiryNotFuture,
      )
    })

    it('rejects an unparseable date', () => {
      expect(validatePaymentLink(validInput({ expiresAt: 'tomorrow-ish' }), NOW).errors.expiresAt).toBe(
        ERROR_MESSAGES.expiryInvalid,
      )
    })

    it('parses datetime-local values and stores them as ISO', () => {
      const result = validatePaymentLink(validInput({ expiresAt: '2030-01-15T09:30' }), NOW)
      expect(result.valid).toBe(true)
      if (result.valid) expect(result.data.expiresAt).toBe(new Date('2030-01-15T09:30').toISOString())
    })

    it('defaults `now` to the current time', () => {
      const past = new Date(Date.now() - 60_000).toISOString()
      expect(validatePaymentLink(validInput({ expiresAt: past })).errors.expiresAt).toBe(
        ERROR_MESSAGES.expiryNotFuture,
      )
    })
  })

  it('collects every field error at once', () => {
    const result = validatePaymentLink(
      { amount: '10.001', description: '', email: '', phone: '', expiresAt: '2020-01-01T00:00:00Z' },
      NOW,
    )
    expect(result.valid).toBe(false)
    expect(Object.keys(result.errors).sort()).toEqual(['amount', 'contact', 'description', 'expiresAt'])
  })
})
