import type { FieldErrors, PaymentLinkInput, ValidationResult } from './types'

export const MAX_AMOUNT_RUPEES = 500_000
export const MAX_AMOUNT_PAISE = MAX_AMOUNT_RUPEES * 100
export const MAX_DESCRIPTION_LENGTH = 100

export const ERROR_MESSAGES = {
  amountRequired: 'Amount is required',
  amountInvalid: 'Enter a valid amount, e.g. 1499.50',
  amountDecimals: 'Amount can have at most 2 decimal places',
  amountTooLow: 'Amount must be greater than ₹0',
  amountTooHigh: 'Amount cannot exceed ₹5,00,000',
  descriptionRequired: 'Description is required',
  descriptionTooLong: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`,
  contactRequired: 'Enter a customer email or phone number',
  emailInvalid: 'Enter a valid email address',
  phoneInvalid: 'Enter a valid 10-digit Indian mobile number starting with 6–9',
  expiryInvalid: 'Enter a valid expiry date and time',
  expiryNotFuture: 'Expiry must be in the future',
} as const

type AmountResult = { ok: true; paise: number } | { ok: false; error: string }

/**
 * Parses a rupee amount string into integer paise without going through floats.
 * Accepts optional Indian/Western thousands separators (e.g. "5,00,000").
 */
export function parseAmountToPaise(raw: string): AmountResult {
  const value = raw.trim().replace(/,/g, '')
  if (value === '') return { ok: false, error: ERROR_MESSAGES.amountRequired }

  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value)
  if (!match) return { ok: false, error: ERROR_MESSAGES.amountInvalid }

  const [, sign, rupees, fraction = ''] = match
  if (fraction.length > 2) return { ok: false, error: ERROR_MESSAGES.amountDecimals }

  // Reject absurdly long inputs before Number() loses precision.
  if (rupees.replace(/^0+/, '').length > String(MAX_AMOUNT_RUPEES).length) {
    return { ok: false, error: sign ? ERROR_MESSAGES.amountTooLow : ERROR_MESSAGES.amountTooHigh }
  }

  const magnitude = Number(rupees) * 100 + Number(fraction.padEnd(2, '0'))
  const paise = sign ? -magnitude : magnitude

  if (paise <= 0) return { ok: false, error: ERROR_MESSAGES.amountTooLow }
  if (paise > MAX_AMOUNT_PAISE) return { ok: false, error: ERROR_MESSAGES.amountTooHigh }
  return { ok: true, paise }
}

const EMAIL_PATTERN =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/

export function isValidEmail(raw: string): boolean {
  const email = raw.trim()
  return email.length <= 254 && EMAIL_PATTERN.test(email)
}

/** Strips spaces and hyphens so "+91 98765-43210" is accepted. */
function compactPhone(raw: string): string {
  return raw.trim().replace(/[\s-]/g, '')
}

const INDIAN_MOBILE_PATTERN = /^(?:\+91)?([6-9]\d{9})$/

export function isValidIndianPhone(raw: string): boolean {
  return INDIAN_MOBILE_PATTERN.test(compactPhone(raw))
}

/** Returns the phone in `+91XXXXXXXXXX` form, or null if invalid. */
export function normalizeIndianPhone(raw: string): string | null {
  const match = INDIAN_MOBILE_PATTERN.exec(compactPhone(raw))
  return match ? `+91${match[1]}` : null
}

/**
 * Validates raw form input. Pure: `now` is injectable so expiry checks are deterministic in tests.
 *
 * Contact rule: at least one of email/phone is required, and any field the
 * merchant did fill in must itself be valid (we never silently drop bad data).
 */
export function validatePaymentLink(input: PaymentLinkInput, now: Date = new Date()): ValidationResult {
  const errors: FieldErrors = {}

  const amount = parseAmountToPaise(input.amount)
  if (!amount.ok) errors.amount = amount.error

  const description = input.description.trim()
  if (description === '') errors.description = ERROR_MESSAGES.descriptionRequired
  else if (description.length > MAX_DESCRIPTION_LENGTH) errors.description = ERROR_MESSAGES.descriptionTooLong

  const email = input.email.trim()
  const phone = input.phone.trim()
  const customerPhone = phone ? normalizeIndianPhone(phone) : null
  if (!email && !phone) {
    errors.contact = ERROR_MESSAGES.contactRequired
  } else {
    if (email && !isValidEmail(email)) errors.email = ERROR_MESSAGES.emailInvalid
    if (phone && !customerPhone) errors.phone = ERROR_MESSAGES.phoneInvalid
  }

  let expiresAt: string | null = null
  if (input.expiresAt.trim() !== '') {
    const expiry = new Date(input.expiresAt)
    if (Number.isNaN(expiry.getTime())) errors.expiresAt = ERROR_MESSAGES.expiryInvalid
    else if (expiry.getTime() <= now.getTime()) errors.expiresAt = ERROR_MESSAGES.expiryNotFuture
    else expiresAt = expiry.toISOString()
  }

  if (Object.keys(errors).length > 0 || !amount.ok) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    errors: {},
    data: {
      amountPaise: amount.paise,
      description,
      customerEmail: email ? email.toLowerCase() : null,
      customerPhone,
      expiresAt,
    },
  }
}
