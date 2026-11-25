import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { PaymentLink } from './utils/types'
import { ERROR_MESSAGES } from './utils/validation'

const cards = () => screen.queryAllByTestId('payment-link')
const cardFor = (description: string) => {
  const card = screen.getByText(description).closest('li')
  if (!card) throw new Error(`No card for "${description}"`)
  return card
}
const filterButton = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}\\b`) })
const field = (label: string | RegExp) => screen.getByLabelText(label)

const link = (overrides: Partial<PaymentLink>): PaymentLink => ({
  id: `plink_${Math.random().toString(36).slice(2)}`,
  amountPaise: 10_000,
  description: 'Link',
  customerEmail: 'a@b.co',
  customerPhone: null,
  status: 'Active',
  createdAt: new Date(Date.now() - 60_000).toISOString(),
  expiresAt: null,
  ...overrides,
})

describe('Payment links list (seed data)', () => {
  it('renders every seeded link with formatted amount, contact and created time', () => {
    render(<App />)
    expect(cards()).toHaveLength(6)

    const consult = cardFor('Consultation fee – November')
    expect(within(consult).getByText('₹1,499.50')).toBeInTheDocument()
    expect(within(consult).getByText('rahul.sharma@example.com')).toBeInTheDocument()
    expect(within(consult).getByText('+91 98765 43210')).toBeInTheDocument()
    expect(within(consult).getByText('Created').nextElementSibling?.querySelector('time')).toHaveAttribute('datetime')

    expect(within(cardFor('Wedding venue booking advance')).getByText('₹5,00,000.00')).toBeInTheDocument()
  })

  it('derives Expired for a stored-Active link past its expiry, but keeps Paid as Paid', () => {
    render(<App />)
    expect(within(cardFor('Website design deposit')).getByText('Expired')).toBeInTheDocument()
    expect(within(cardFor('Wedding venue booking advance')).getByText('Paid')).toBeInTheDocument()
  })

  it('shows newest links first', () => {
    render(<App />)
    expect(within(cards()[0]).getByText('Early-bird workshop ticket')).toBeInTheDocument()
  })
})

describe('Status filter', () => {
  it('exposes filter state via aria-pressed and shows counts', () => {
    render(<App />)
    expect(screen.getByRole('group', { name: /filter payment links by status/i })).toBeInTheDocument()
    expect(filterButton('All')).toHaveAttribute('aria-pressed', 'true')
    expect(filterButton('Active')).toHaveAccessibleName('Active, 3 links')
    expect(filterButton('Paid')).toHaveAccessibleName('Paid, 2 links')
    expect(filterButton('Expired')).toHaveAccessibleName('Expired, 1 link')
  })

  it('filters by derived status', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(filterButton('Paid'))
    expect(filterButton('Paid')).toHaveAttribute('aria-pressed', 'true')
    expect(filterButton('All')).toHaveAttribute('aria-pressed', 'false')
    expect(cards()).toHaveLength(2)
    cards().forEach((card) => expect(within(card).getByText('Paid')).toBeInTheDocument())

    await user.click(filterButton('Expired'))
    expect(cards()).toHaveLength(1)
    expect(cardFor('Website design deposit')).toBeInTheDocument()

    await user.click(filterButton('Active'))
    expect(cards()).toHaveLength(3)
    expect(screen.queryByText('Website design deposit')).not.toBeInTheDocument()

    await user.click(filterButton('All'))
    expect(cards()).toHaveLength(6)
  })

  it('is keyboard operable', async () => {
    const user = userEvent.setup()
    render(<App />)
    filterButton('All').focus()
    await user.tab()
    expect(filterButton('Active')).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(filterButton('Active')).toHaveAttribute('aria-pressed', 'true')
    expect(cards()).toHaveLength(3)
  })
})

describe('Empty states', () => {
  it('shows a first-run empty state when there are no links', () => {
    render(<App initialLinks={[]} />)
    expect(screen.getByText('No payment links yet')).toBeInTheDocument()
    expect(cards()).toHaveLength(0)
  })

  it('shows a no-matches state with a way back to all links', async () => {
    const user = userEvent.setup()
    render(<App initialLinks={[link({ description: 'Only active' })]} />)

    await user.click(filterButton('Paid'))
    expect(screen.getByText('No paid links')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show all links' }))
    expect(filterButton('All')).toHaveAttribute('aria-pressed', 'true')
    expect(cardFor('Only active')).toBeInTheDocument()
  })
})

describe('Create payment link form', () => {
  it('labels every input', () => {
    render(<App initialLinks={[]} />)
    for (const label of ['Amount (₹)', 'Description', 'Email', 'Phone', /Expiry/]) {
      expect(field(label)).toBeInstanceOf(HTMLInputElement)
    }
  })

  it('shows inline, accessible errors on an empty submit and focuses the first invalid field', async () => {
    const user = userEvent.setup()
    render(<App initialLinks={[]} />)

    await user.click(screen.getByRole('button', { name: 'Create payment link' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Fix the 3 highlighted fields')
    expect(field('Amount (₹)')).toHaveFocus()

    expect(field('Amount (₹)')).toHaveAttribute('aria-invalid', 'true')
    expect(field('Amount (₹)')).toHaveAccessibleDescription(expect.stringContaining(ERROR_MESSAGES.amountRequired))
    expect(field('Description')).toHaveAccessibleDescription(
      expect.stringContaining(ERROR_MESSAGES.descriptionRequired),
    )

    // One contact message, referenced by both inputs.
    expect(screen.getAllByText(ERROR_MESSAGES.contactRequired)).toHaveLength(1)
    for (const label of ['Email', 'Phone']) {
      expect(field(label)).toHaveAttribute('aria-invalid', 'true')
      expect(field(label)).toHaveAccessibleDescription(expect.stringContaining(ERROR_MESSAGES.contactRequired))
    }

    expect(field(/Expiry/)).not.toHaveAttribute('aria-invalid')
    expect(cards()).toHaveLength(0)
  })

  it('validates a field on blur and clears the error once fixed', async () => {
    const user = userEvent.setup()
    render(<App initialLinks={[]} />)

    await user.type(field('Amount (₹)'), '500000.01')
    expect(screen.queryByText(ERROR_MESSAGES.amountTooHigh)).not.toBeInTheDocument() // not yet blurred
    await user.tab()
    expect(screen.getByText(ERROR_MESSAGES.amountTooHigh)).toBeInTheDocument()

    await user.clear(field('Amount (₹)'))
    await user.type(field('Amount (₹)'), '10.999')
    expect(screen.getByText(ERROR_MESSAGES.amountDecimals)).toBeInTheDocument()

    await user.clear(field('Amount (₹)'))
    await user.type(field('Amount (₹)'), '500000')
    expect(screen.queryByText(ERROR_MESSAGES.amountDecimals)).not.toBeInTheDocument()
    expect(field('Amount (₹)')).not.toHaveAttribute('aria-invalid')
  })

  it('flags an invalid phone and a past expiry', async () => {
    const user = userEvent.setup()
    render(<App initialLinks={[]} />)

    await user.type(field('Phone'), '5876543210')
    await user.tab()
    expect(field('Phone')).toHaveAccessibleDescription(expect.stringContaining(ERROR_MESSAGES.phoneInvalid))

    await user.type(field(/Expiry/), '2020-01-01T10:00')
    await user.tab()
    expect(field(/Expiry/)).toHaveAccessibleDescription(expect.stringContaining(ERROR_MESSAGES.expiryNotFuture))
  })

  it('creates a link, shows feedback, resets the form and lists it first', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(field('Amount (₹)'), '2,499.5')
    await user.type(field('Description'), 'Guitar lessons – December')
    await user.type(field('Phone'), '+91 91234 56789')
    await user.click(screen.getByRole('button', { name: 'Create payment link' }))

    expect(screen.getByRole('status')).toHaveTextContent('Payment link for ₹2,499.50 created.')
    expect(field('Amount (₹)')).toHaveValue('')
    expect(field('Description')).toHaveValue('')
    expect(field('Amount (₹)')).toHaveFocus()

    expect(cards()).toHaveLength(7)
    const created = cards()[0]
    expect(within(created).getByText('Guitar lessons – December')).toBeInTheDocument()
    expect(within(created).getByText('₹2,499.50')).toBeInTheDocument()
    expect(within(created).getByText('+91 91234 56789')).toBeInTheDocument()
    expect(within(created).getByText('Active')).toBeInTheDocument()
    expect(within(created).getByText('Never')).toBeInTheDocument()
    expect(filterButton('Active')).toHaveAccessibleName('Active, 4 links')
  })

  it('switches back to All if a new link would be hidden by the current filter', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(filterButton('Paid'))

    await user.type(field('Amount (₹)'), '100')
    await user.type(field('Description'), 'Hidden otherwise')
    await user.type(field('Email'), 'x@y.in')
    await user.click(screen.getByRole('button', { name: 'Create payment link' }))

    expect(filterButton('All')).toHaveAttribute('aria-pressed', 'true')
    expect(cardFor('Hidden otherwise')).toBeInTheDocument()
  })

  it('can be completed with the keyboard alone', async () => {
    const user = userEvent.setup()
    render(<App initialLinks={[]} />)

    field('Amount (₹)').focus()
    await user.keyboard('750')
    await user.tab()
    await user.keyboard('Keyboard only')
    await user.tab()
    await user.keyboard('kb@example.com')
    await user.tab() // phone
    await user.tab() // expiry
    await user.tab() // submit
    expect(screen.getByRole('button', { name: 'Create payment link' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(cardFor('Keyboard only')).toBeInTheDocument()
  })
})

describe('Live auto-expiry', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('flips a link to Expired when its expiry passes, without reloading', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-26T10:00:00.000Z'))
    render(
      <App
        initialLinks={[
          link({ description: 'Expiring soon', createdAt: '2026-11-26T09:00:00.000Z', expiresAt: '2026-11-26T10:00:30.000Z' }),
        ]}
      />,
    )
    expect(within(cardFor('Expiring soon')).getByText('Active')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(31_000)
    })

    expect(within(cardFor('Expiring soon')).getByText('Expired')).toBeInTheDocument()
    expect(filterButton('Expired')).toHaveAccessibleName('Expired, 1 link')
  })
})
