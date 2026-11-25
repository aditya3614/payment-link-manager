import { expect, type Locator, type Page } from '@playwright/test'

/** Seed data (src/data/seedLinks.ts): 3 Active, 2 Paid, 1 stored-Active link that derives as Expired. */
export const SEED = { total: 6, active: 3, paid: 2, expired: 1 } as const

/** Filter buttons' accessible names include a count ("Active, 3 links"), so match on the leading word. */
export const filterButton = (page: Page, name: string) =>
  page
    .getByRole('group', { name: 'Filter payment links by status' })
    .getByRole('button', { name: new RegExp(`^${name}\\b`) })

export const cards = (page: Page) => page.getByTestId('payment-link')

export const submitButton = (page: Page) => page.getByRole('button', { name: 'Create payment link' })

export async function openApp(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Payment Links' })).toBeVisible()
  // Auto-retrying assertion (not a one-off count) so a Vite dep-optimisation reload can't race us.
  await expect(cards(page)).toHaveCount(SEED.total)
}

export interface LinkDetails {
  amount: string
  description: string
  email?: string
  phone?: string
  expiresAt?: string
}

export async function fillLinkForm(page: Page, details: LinkDetails) {
  await page.getByLabel('Amount (₹)').fill(details.amount)
  await page.getByLabel('Description').fill(details.description)
  if (details.email) await page.getByLabel('Email', { exact: true }).fill(details.email)
  if (details.phone) await page.getByLabel('Phone', { exact: true }).fill(details.phone)
  if (details.expiresAt) await page.getByLabel(/Expiry/).fill(details.expiresAt)
}

/** Every card in the list shows the given status badge. */
export async function expectAllCardsToHaveStatus(page: Page, status: string) {
  for (const card of await cards(page).all()) {
    await expect(card.locator('.status-badge')).toHaveText(new RegExp(`${status}$`))
  }
}

export async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error(`${locator} is not rendered`)
  return box
}
