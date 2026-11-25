# Payment Links Manager (Merchant Dashboard)

## Stack & Commands
- **Stack:** Vite, React, TypeScript (strict mode), Vitest + React Testing Library, Playwright.
- **Install:** `npm install`
- **Dev:** `npm run dev`
- **Unit Tests:** `npx vitest run`
- **E2E Tests:** `npx playwright test`
- **Build/Lint:** `npm run build`

## Core Domain & Validation Rules
State is kept in-memory/mocked (no backend).
1. **Create Form:**
   - **Amount (`₹`):** Required, `> 0`, max `5,00,000` (500000), max 2 decimal places. Format display using Indian numbering (`en-IN`).
   - **Description:** Required, max 100 characters.
   - **Customer Contact:** Either **Email** OR **Phone** is required (at least one). Validate standard email format and 10-digit Indian mobile format (`+91` optional, starts with 6–9).
   - **Expiry Date:** Optional; if provided, must be strictly in the future.
2. **Payment Links List:**
   - Display: Amount (`₹`), Description, Customer (email/phone), Status (`Active` | `Paid` | `Expired`), and Created Time.
   - **Auto-Expiry Rule:** Any link whose expiry timestamp is in the past **must** compute and display status as `Expired` (derive status dynamically, do not hardcode stale state).
3. **Filtering:**
   - Filter list by `All` | `Active` | `Paid` | `Expired`.

## UX, Accessibility & Quality Standards
- **States:** Implement clear empty states (no links yet / no filter matches), inline field validation errors, and form submission feedback.
- **Accessibility & Mobile:** Semantic HTML (`<label>`, `<button>`, `aria-invalid`, `aria-describedby`), full keyboard navigation, and responsive layout usable at `375px` mobile width.
- **Architecture:** Keep validation logic and status derivation in pure TypeScript utility functions (`src/utils/`) so they are easily unit-tested.

## Git & Assessment Workflow
- Commit cleanly after completing each section of the assessment.
- Before finishing any task, run `npx vitest run` and `npx playwright test` to ensure zero regressions.