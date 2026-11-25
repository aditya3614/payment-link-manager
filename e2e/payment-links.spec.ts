import { expect, test } from '@playwright/test'
import {
  SEED,
  cards,
  expectAllCardsToHaveStatus,
  fillLinkForm,
  filterButton,
  openApp,
  submitButton,
} from './helpers.ts'

test.beforeEach(async ({ page }) => {
  await openApp(page)
})

test('happy path: create a link, see it listed, filter Active / All', async ({ page }) => {
  await fillLinkForm(page, {
    amount: '12500.75',
    description: 'E2E – Photography session',
    email: 'e2e.customer@example.com',
    phone: '9876501234',
    expiresAt: '2099-12-31T18:30',
  })
  await submitButton(page).click()

  // Submission feedback, and the form is reset and ready for the next link.
  await expect(page.getByRole('status')).toHaveText('Payment link for ₹12,500.75 created.')
  await expect(page.getByLabel('Amount (₹)')).toHaveValue('')
  await expect(page.getByLabel('Amount (₹)')).toBeFocused()

  // The new link is listed first, with every column the list must show.
  await expect(cards(page)).toHaveCount(SEED.total + 1)
  await expect(page.getByText(`Showing all ${SEED.total + 1} links`)).toBeVisible()
  const created = cards(page).first()
  await expect(created).toContainText('₹12,500.75')
  await expect(created).toContainText('E2E – Photography session')
  await expect(created).toContainText('e2e.customer@example.com')
  await expect(created).toContainText('+91 98765 01234')
  await expect(created.locator('.status-badge')).toHaveText(/Active$/)
  await expect(created.locator('time').first()).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}T/)

  // Active: only Active links remain, and the new one is among them.
  await filterButton(page, 'Active').click()
  await expect(filterButton(page, 'Active')).toHaveAttribute('aria-pressed', 'true')
  await expect(filterButton(page, 'All')).toHaveAttribute('aria-pressed', 'false')
  await expect(filterButton(page, 'Active')).toHaveAccessibleName(`Active, ${SEED.active + 1} links`)
  await expect(cards(page)).toHaveCount(SEED.active + 1)
  await expectAllCardsToHaveStatus(page, 'Active')
  await expect(page.getByText('E2E – Photography session')).toBeVisible()
  await expect(page.getByText('Website design deposit')).toHaveCount(0) // auto-expired seed link
  await expect(page.getByText(`Showing ${SEED.active + 1} of ${SEED.total + 1} links · Active`)).toBeVisible()

  // All: everything is back.
  await filterButton(page, 'All').click()
  await expect(filterButton(page, 'All')).toHaveAttribute('aria-pressed', 'true')
  await expect(cards(page)).toHaveCount(SEED.total + 1)
  await expect(page.getByText('Website design deposit')).toBeVisible()
})

test('the create → filter flow works with the keyboard alone', async ({ page }) => {
  await page.getByLabel('Amount (₹)').focus()
  await page.keyboard.type('999')
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Description')).toBeFocused()
  await page.keyboard.type('Keyboard-only link')
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Email', { exact: true })).toBeFocused()
  await page.keyboard.type('keys@example.com')
  await page.keyboard.press('Enter') // submits the form from any field

  await expect(page.getByRole('status')).toHaveText('Payment link for ₹999.00 created.')
  await expect(cards(page).first()).toContainText('Keyboard-only link')

  await filterButton(page, 'Paid').focus()
  await page.keyboard.press('Space')
  await expect(filterButton(page, 'Paid')).toHaveAttribute('aria-pressed', 'true')
  await expect(cards(page)).toHaveCount(SEED.paid)
  await expectAllCardsToHaveStatus(page, 'Paid')
})

test('blocks invalid submissions with inline errors', async ({ page }) => {
  await page.getByLabel('Amount (₹)').fill('500000.001')
  await page.getByLabel('Description').fill('x'.repeat(101))
  await submitButton(page).click()

  await expect(page.getByRole('alert')).toBeVisible()
  const amount = page.getByLabel('Amount (₹)')
  await expect(amount).toHaveAttribute('aria-invalid', 'true')
  await expect(amount).toBeFocused()
  await expect(amount).toHaveAccessibleDescription(/Amount can have at most 2 decimal places/)
  await expect(page.getByLabel('Description')).toHaveAccessibleDescription(
    /Description must be 100 characters or fewer/,
  )
  await expect(page.getByLabel('Email', { exact: true })).toHaveAccessibleDescription(
    /Enter a customer email or phone number/,
  )
  await expect(cards(page)).toHaveCount(SEED.total)
})

test('Expired filter shows the auto-expired seed link', async ({ page }) => {
  await filterButton(page, 'Expired').click()
  await expect(cards(page)).toHaveCount(SEED.expired)
  await expect(cards(page).first()).toContainText('Website design deposit')
  await expect(cards(page).first().locator('.status-badge')).toHaveText(/Expired$/)
})
