import { expect, test, type Locator, type Page } from '@playwright/test'
import { MOBILE_VIEWPORT } from './viewports.ts'
import { SEED, boxOf, cards, expectAllCardsToHaveStatus, fillLinkForm, filterButton, openApp, submitButton } from './helpers.ts'

/** Comfortable touch target; every control in the app is sized to at least this. */
const MIN_TOUCH_TARGET = 44
/** Below this iOS Safari zooms the page when an input is focused. */
const MIN_INPUT_FONT_PX = 16

/**
 * Worst-case content: the longest description allowed, in the widest glyph, with no spaces or hyphens
 * for the browser to wrap at (think a pasted invoice reference). Only `overflow-wrap` keeps it on screen.
 */
const LONGEST_DESCRIPTION = 'W'.repeat(100)
const LONG_EMAIL = 'accountspayabledepartment@verylongenterprisedomainexample.co.in'

async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(clientWidth, 'layout viewport should be the phone width').toBe(MOBILE_VIEWPORT.width)
  expect(scrollWidth, 'page must not scroll sideways').toBeLessThanOrEqual(clientWidth)
}

/** Catches content clipped by an `overflow: hidden` ancestor, which scrollWidth alone would miss. */
async function expectInsideViewport(locator: Locator) {
  for (const element of await locator.all()) {
    const box = await boxOf(element)
    expect(box.x, `${element} starts off-screen`).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width, `${element} runs off the right edge`).toBeLessThanOrEqual(MOBILE_VIEWPORT.width)
  }
}

test.beforeEach(async ({ page }) => {
  expect(page.viewportSize()).toEqual(MOBILE_VIEWPORT)
  await openApp(page)
})

test('layout at 375×812: single column, no sideways scroll, touch-sized controls', async ({ page }) => {
  await expectNoHorizontalOverflow(page)

  // Form first, list below it: one column on a phone.
  const formPanel = await boxOf(page.getByRole('region', { name: 'Create payment link' }))
  const listPanel = await boxOf(page.getByRole('region', { name: 'Your payment links' }))
  expect(listPanel.y).toBeGreaterThanOrEqual(formPanel.y + formPanel.height)
  expect(Math.abs(listPanel.x - formPanel.x)).toBeLessThan(1)

  const fields = ['Amount (₹)', 'Description', 'Email', 'Phone', 'Expiry (optional)']
  for (const label of fields) {
    const input = page.getByLabel(label, { exact: true })
    const fontSize = await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    expect(fontSize, `${label} font size`).toBeGreaterThanOrEqual(MIN_INPUT_FONT_PX)
    // Amount's visible box is the ₹-prefixed wrapper around the input.
    const visibleField = label === 'Amount (₹)' ? input.locator('xpath=..') : input
    expect((await boxOf(visibleField)).height, `${label} height`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET)
    await expectInsideViewport(visibleField)
  }

  const buttons = [submitButton(page), ...(await filterButton(page, '\\w+').all())]
  expect(buttons).toHaveLength(5) // submit + All/Active/Paid/Expired
  for (const button of buttons) {
    expect((await boxOf(button)).height, `${await button.textContent()} height`).toBeGreaterThanOrEqual(
      MIN_TOUCH_TARGET,
    )
    await expectInsideViewport(button)
  }
  await expectInsideViewport(cards(page))

  // The widest form state: every inline error showing.
  await submitButton(page).tap()
  await expect(page.getByRole('alert')).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('happy path at 375×812: create with long values, then filter Active / All by touch', async ({ page }) => {
  await fillLinkForm(page, {
    amount: '500000',
    description: LONGEST_DESCRIPTION,
    email: LONG_EMAIL,
    phone: '+91 9876501234',
  })
  await submitButton(page).tap()

  const status = page.getByRole('status')
  await expect(status).toHaveText('Payment link for ₹5,00,000.00 created.')
  // Focus returns to Amount for the next link; the confirmation must be on screen there too.
  await expect(page.getByLabel('Amount (₹)')).toBeFocused()
  await expect(status).toBeInViewport()

  const created = cards(page).first()
  await expect(cards(page)).toHaveCount(SEED.total + 1)
  await expect(created).toContainText(LONGEST_DESCRIPTION)
  await expect(created).toContainText(LONG_EMAIL)
  await expect(created).toContainText('₹5,00,000.00')
  await created.scrollIntoViewIfNeeded()
  await expectInsideViewport(created)
  await expectInsideViewport(created.getByText(LONGEST_DESCRIPTION))
  await expectInsideViewport(created.getByText(LONG_EMAIL))
  await expectNoHorizontalOverflow(page)

  await filterButton(page, 'Active').tap()
  await expect(filterButton(page, 'Active')).toHaveAttribute('aria-pressed', 'true')
  await expect(cards(page)).toHaveCount(SEED.active + 1)
  await expectAllCardsToHaveStatus(page, 'Active')
  await expect(created).toContainText(LONGEST_DESCRIPTION)
  await expectInsideViewport(cards(page))
  await expectNoHorizontalOverflow(page)

  await filterButton(page, 'All').tap()
  await expect(filterButton(page, 'All')).toHaveAttribute('aria-pressed', 'true')
  await expect(cards(page)).toHaveCount(SEED.total + 1)
  await expectNoHorizontalOverflow(page)
})
