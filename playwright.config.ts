import { defineConfig, devices } from '@playwright/test'
import { MOBILE_VIEWPORT } from './e2e/viewports.ts'

const PORT = 5173
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // Layout checks are written for a 375px phone and would be meaningless at desktop width.
      testIgnore: /mobile\.spec\.ts$/,
    },
    {
      // Functional specs run here too, so every flow is also proven at phone width.
      name: 'mobile-375',
      use: {
        ...devices['Desktop Chrome'],
        viewport: MOBILE_VIEWPORT,
        // Honour the meta viewport and enable touch so `tap()` and mobile layout behave like a phone.
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
})
