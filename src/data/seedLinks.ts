import type { PaymentLink } from '../utils/types'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * In-memory mock data, timed relative to `now` so the demo always shows every status.
 * Note "Website design deposit" is *stored* as Active — its Expired badge is derived.
 */
export function createSeedLinks(now: Date = new Date()): PaymentLink[] {
  const t = now.getTime()
  const at = (offsetMs: number) => new Date(t + offsetMs).toISOString()

  return [
    {
      id: 'plink_SeedEarlyBird01',
      amountPaise: 79_900,
      description: 'Early-bird workshop ticket',
      customerEmail: 'meera.iyer@example.com',
      customerPhone: null,
      status: 'Active',
      createdAt: at(-20 * MINUTE),
      expiresAt: at(5 * MINUTE),
    },
    {
      id: 'plink_SeedConsult0002',
      amountPaise: 149_950,
      description: 'Consultation fee – November',
      customerEmail: 'rahul.sharma@example.com',
      customerPhone: '+919876543210',
      status: 'Active',
      createdAt: at(-2 * HOUR),
      expiresAt: at(2 * DAY),
    },
    {
      id: 'plink_SeedYogaClass03',
      amountPaise: 29_900,
      description: 'Monthly yoga class',
      customerEmail: null,
      customerPhone: '+918123456789',
      status: 'Active',
      createdAt: at(-1 * DAY),
      expiresAt: null,
    },
    {
      id: 'plink_SeedAmcQ3Paid04',
      amountPaise: 1_250_000,
      description: 'Annual maintenance contract – Q3',
      customerEmail: 'accounts@acme-traders.example',
      customerPhone: null,
      status: 'Paid',
      createdAt: at(-3 * DAY),
      expiresAt: null,
    },
    {
      id: 'plink_SeedWebDeposit5',
      amountPaise: 4_500_000,
      description: 'Website design deposit',
      customerEmail: null,
      customerPhone: '+917012345678',
      status: 'Active',
      createdAt: at(-5 * DAY),
      expiresAt: at(-1 * DAY),
    },
    {
      id: 'plink_SeedVenuePaid06',
      amountPaise: 50_000_000,
      description: 'Wedding venue booking advance',
      customerEmail: 'priya.nair@example.com',
      customerPhone: '+919988776655',
      status: 'Paid',
      createdAt: at(-10 * DAY),
      expiresAt: at(-3 * DAY),
    },
  ]
}
