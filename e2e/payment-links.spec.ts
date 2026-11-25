import { expect, test, type Page } from '@playwright/test'

const filter = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`^${name}\\b`) })
const cards = (page: Page) => page.getByTestId('payment-link')

/** Seed data: 3 Active, 2 Paid, 1 derived Expired. */
const SEED_COUNT = 6
const SEED_ACTIVE = 3

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Payment Links' })).toBeVisible()
  // Auto-retrying assertion (not a one-off count) so a Vite dep-optimisation reload can't race us.
  await expect(cards(page)).toHaveCount(SEED_COUNT)
})

test('happy path: create a link, see it listed, filter Active / All', async ({ page }) => {
  await page.getByLabel('Amount (₹)').fill('12500.75')
  await page.getByLabel('Description').fill('E2E – Photography session')
  await page.getByLabel('Email', { exact: true }).fill('e2e.customer@example.com')
  await page.getByLabel('Phone', { exact: true }).fill('9876501234')
  await page.getByLabel(/Expiry/).fill('2099-12-31T18:30')
  await page.getByRole('button', { name: 'Create payment link' }).click()

  await expect(page.getByRole('status')).toHaveText('Payment link for ₹12,500.75 created.')
  await expect(cards(page)).toHaveCount(SEED_COUNT + 1)

  const created = cards(page).first()
  await expect(created).toContainText('E2E – Photography session')
  await expect(created).toContainText('₹12,500.75')
  await expect(created).toContainText('e2e.customer@example.com')
  await expect(created).toContainText('+91 98765 01234')
  await expect(created).toContainText('Active')

  // Active: only Active links remain, and the new one is among them.
  await filter(page, 'Active').click()
  await expect(filter(page, 'Active')).toHaveAttribute('aria-pressed', 'true')
  await expect(cards(page)).toHaveCount(SEED_ACTIVE + 1)
  for (const card of await cards(page).all()) {
    await expect(card.locator('.status-badge')).toHaveText(/Active$/)
  }
  await expect(page.getByText('E2E – Photography session')).toBeVisible()
  await expect(page.getByText('Website design deposit')).toHaveCount(0) // auto-expired seed link

  // All: everything is back.
  await filter(page, 'All').click()
  await expect(filter(page, 'All')).toHaveAttribute('aria-pressed', 'true')
  await expect(cards(page)).toHaveCount(SEED_COUNT + 1)
  await expect(page.getByText('Website design deposit')).toBeVisible()
})

test('blocks invalid submissions with inline errors', async ({ page }) => {
  await page.getByLabel('Amount (₹)').fill('500000.001')
  await page.getByLabel('Description').fill('x'.repeat(101))
  await page.getByRole('button', { name: 'Create payment link' }).click()

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByLabel('Amount (₹)')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Amount (₹)')).toBeFocused()
  await expect(page.getByText('Amount can have at most 2 decimal places')).toBeVisible()
  await expect(page.getByText('Description must be 100 characters or fewer')).toBeVisible()
  await expect(page.getByText('Enter a customer email or phone number')).toBeVisible()
  await expect(cards(page)).toHaveCount(SEED_COUNT)
})

test('Expired filter shows the auto-expired seed link', async ({ page }) => {
  await filter(page, 'Expired').click()
  await expect(cards(page)).toHaveCount(1)
  await expect(cards(page).first()).toContainText('Website design deposit')
  await expect(cards(page).first().locator('.status-badge')).toHaveText(/Expired$/)
})

test('has no horizontal overflow', async ({ page }) => {
  // Trigger the widest states: errors visible and longest content rendered.
  await page.getByRole('button', { name: 'Create payment link' }).click()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
