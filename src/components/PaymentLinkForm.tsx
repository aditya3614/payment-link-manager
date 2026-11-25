import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { formatAmount, toDateTimeLocalValue } from '../utils/format'
import type { FieldErrors, PaymentLink, PaymentLinkInput, ValidPaymentLinkData } from '../utils/types'
import { MAX_DESCRIPTION_LENGTH, validatePaymentLink } from '../utils/validation'

type InputField = keyof PaymentLinkInput

const EMPTY_VALUES: PaymentLinkInput = { amount: '', description: '', email: '', phone: '', expiresAt: '' }

/** Order in which focus jumps to the first invalid field on submit. */
const FOCUS_ORDER: { error: keyof FieldErrors; field: InputField }[] = [
  { error: 'amount', field: 'amount' },
  { error: 'description', field: 'description' },
  { error: 'contact', field: 'email' },
  { error: 'email', field: 'email' },
  { error: 'phone', field: 'phone' },
  { error: 'expiresAt', field: 'expiresAt' },
]

const errorId = (field: keyof FieldErrors) => `${field}-error`

/** Joins ids for aria-describedby, dropping empty entries. */
const describedBy = (...ids: (string | false | undefined)[]) => ids.filter(Boolean).join(' ') || undefined

interface PaymentLinkFormProps {
  onCreate: (data: ValidPaymentLinkData) => PaymentLink
}

export function PaymentLinkForm({ onCreate }: PaymentLinkFormProps) {
  const [values, setValues] = useState<PaymentLinkInput>(EMPTY_VALUES)
  const [touched, setTouched] = useState<Partial<Record<InputField, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  // Picker hint only (validation is authoritative); refreshed whenever the field is focused.
  const [minExpiry, setMinExpiry] = useState(() => toDateTimeLocalValue(new Date()))
  const inputRefs = useRef<Partial<Record<InputField, HTMLInputElement | null>>>({})

  // Re-validated on every render so errors clear the moment the merchant fixes them.
  const result = validatePaymentLink(values)
  const allErrors: FieldErrors = result.errors

  const shown = (field: keyof FieldErrors): string | undefined => {
    if (field === 'contact') {
      // Only nag about "email or phone" once both have been visited (or on submit).
      return submitted || (touched.email && touched.phone) ? allErrors.contact : undefined
    }
    return submitted || touched[field] ? allErrors[field] : undefined
  }

  const errors: FieldErrors = {
    amount: shown('amount'),
    description: shown('description'),
    contact: shown('contact'),
    email: shown('email'),
    phone: shown('phone'),
    expiresAt: shown('expiresAt'),
  }
  const visibleErrorCount = Object.values(errors).filter(Boolean).length

  const handleChange = (field: InputField) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setValues((prev) => ({ ...prev, [field]: value }))
    setSuccessMessage(null)
  }

  const handleBlur = (field: InputField) => () => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const outcome = validatePaymentLink(values)

    if (!outcome.valid) {
      setSubmitted(true)
      setSuccessMessage(null)
      const first = FOCUS_ORDER.find(({ error }) => outcome.errors[error])
      if (first) inputRefs.current[first.field]?.focus()
      return
    }

    const link = onCreate(outcome.data)
    setValues(EMPTY_VALUES)
    setTouched({})
    setSubmitted(false)
    setSuccessMessage(`Payment link for ${formatAmount(link.amountPaise)} created.`)
    inputRefs.current.amount?.focus()
  }

  const register = (field: InputField) => ({
    id: field,
    name: field,
    value: values[field],
    onChange: handleChange(field),
    onBlur: handleBlur(field),
    ref: (el: HTMLInputElement | null) => {
      inputRefs.current[field] = el
    },
  })

  const descriptionLength = values.description.trim().length
  const contactInvalid = Boolean(errors.contact)

  return (
    <form className="link-form" noValidate onSubmit={handleSubmit} aria-labelledby="create-heading">
      {/* Top of the form, next to the Amount field that receives focus after a create: on a phone, a
          message below the submit button would be scrolled out of view by that focus move. */}
      <p className="form-success" role="status">
        {successMessage}
      </p>

      {submitted && visibleErrorCount > 0 && (
        <p className="form-alert" role="alert">
          Fix {visibleErrorCount === 1 ? 'the highlighted field' : `the ${visibleErrorCount} highlighted fields`} to
          create the link.
        </p>
      )}

      <div className="field">
        <label htmlFor="amount">Amount (₹)</label>
        <div className={`input-affix${errors.amount ? ' is-invalid' : ''}`}>
          <span className="input-affix__prefix" aria-hidden="true">
            ₹
          </span>
          <input
            {...register('amount')}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            aria-required="true"
            aria-invalid={errors.amount ? true : undefined}
            aria-describedby={describedBy('amount-hint', errors.amount && errorId('amount'))}
          />
        </div>
        <p id="amount-hint" className="field-hint">
          Up to ₹5,00,000, with at most 2 decimal places.
        </p>
        <FieldError id={errorId('amount')} message={errors.amount} />
      </div>

      <div className="field">
        <div className="field-label-row">
          <label htmlFor="description">Description</label>
          <span
            id="description-count"
            className={`char-count${descriptionLength > MAX_DESCRIPTION_LENGTH ? ' is-over' : ''}`}
          >
            <span aria-hidden="true">
              {descriptionLength}/{MAX_DESCRIPTION_LENGTH}
            </span>
            <span className="visually-hidden">
              {descriptionLength} of {MAX_DESCRIPTION_LENGTH} characters used
            </span>
          </span>
        </div>
        <input
          {...register('description')}
          type="text"
          autoComplete="off"
          placeholder="e.g. Consultation fee"
          aria-required="true"
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={describedBy('description-count', errors.description && errorId('description'))}
        />
        <FieldError id={errorId('description')} message={errors.description} />
      </div>

      {/* autoComplete is off: these are the customer's details, and autofill would insert the merchant's own. */}
      <fieldset className="field-group" aria-describedby={describedBy('contact-hint')}>
        <legend>Customer contact</legend>
        <p id="contact-hint" className="field-hint">
          Provide an email, a phone number, or both.
        </p>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            {...register('email')}
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="customer@example.com"
            aria-invalid={errors.email || contactInvalid ? true : undefined}
            aria-describedby={describedBy(
              errors.email && errorId('email'),
              contactInvalid && errorId('contact'),
            )}
          />
          <FieldError id={errorId('email')} message={errors.email} />
        </div>

        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input
            {...register('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="+91 98765 43210"
            aria-invalid={errors.phone || contactInvalid ? true : undefined}
            aria-describedby={describedBy(
              'phone-hint',
              errors.phone && errorId('phone'),
              contactInvalid && errorId('contact'),
            )}
          />
          <p id="phone-hint" className="field-hint">
            10-digit Indian mobile number; +91 is optional.
          </p>
          <FieldError id={errorId('phone')} message={errors.phone} />
        </div>

        <FieldError id={errorId('contact')} message={errors.contact} />
      </fieldset>

      <div className="field">
        <label htmlFor="expiresAt">
          Expiry <span className="optional">(optional)</span>
        </label>
        <input
          {...register('expiresAt')}
          type="datetime-local"
          min={minExpiry}
          onFocus={() => setMinExpiry(toDateTimeLocalValue(new Date()))}
          aria-invalid={errors.expiresAt ? true : undefined}
          aria-describedby={describedBy('expiry-hint', errors.expiresAt && errorId('expiresAt'))}
        />
        <p id="expiry-hint" className="field-hint">
          Leave blank for a link that never expires.
        </p>
        <FieldError id={errorId('expiresAt')} message={errors.expiresAt} />
      </div>

      <button type="submit" className="button button--primary">
        Create payment link
      </button>
    </form>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="field-error">
      {message}
    </p>
  )
}
