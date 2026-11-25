/** Status that is actually persisted. `Expired` is never stored — it is derived from `expiresAt`. */
export type StoredStatus = 'Active' | 'Paid'

/** Status as displayed to the merchant, after applying the auto-expiry rule. */
export type PaymentLinkStatus = StoredStatus | 'Expired'

export type StatusFilter = 'All' | PaymentLinkStatus

export interface PaymentLink {
  id: string
  /** Amount in paise (integer) to avoid floating-point money errors. ₹1,499.50 → 149950. */
  amountPaise: number
  description: string
  /** Normalised lowercase email, or null when only a phone was provided. */
  customerEmail: string | null
  /** Normalised `+91XXXXXXXXXX` phone, or null when only an email was provided. */
  customerPhone: string | null
  status: StoredStatus
  /** ISO-8601 timestamp. */
  createdAt: string
  /** ISO-8601 timestamp, or null for links that never expire. */
  expiresAt: string | null
}

/** Raw form values, exactly as typed by the merchant. */
export interface PaymentLinkInput {
  amount: string
  description: string
  email: string
  phone: string
  /** Value of an `<input type="datetime-local">` (local time), or empty string. */
  expiresAt: string
}

/**
 * `contact` is used when neither email nor phone is provided, so the UI can
 * point both fields at the same message via `aria-describedby`.
 */
export type PaymentLinkField = 'amount' | 'description' | 'email' | 'phone' | 'contact' | 'expiresAt'

export type FieldErrors = Partial<Record<PaymentLinkField, string>>

/** Validated, normalised data ready to become a `PaymentLink`. */
export type ValidPaymentLinkData = Pick<
  PaymentLink,
  'amountPaise' | 'description' | 'customerEmail' | 'customerPhone' | 'expiresAt'
>

export type ValidationResult =
  | { valid: true; data: ValidPaymentLinkData; errors: Record<string, never> }
  | { valid: false; errors: FieldErrors }
