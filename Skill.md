---
name: payment-links-qa
description: Enforces Razorpay Payment Links validation rules, dynamic expiry logic, accessibility, and mandatory Vitest + Playwright verification.
---

# Payment Links Implementation & Verification Skill

When building or modifying components, forms, or tests in this repository, follow these steps strictly:

## 1. Pure Validation & Status Derivation
- Keep all form rules in a pure `validatePaymentLink(input)` helper:
  - Reject amounts `<= 0`, `> 500000`, or with `> 2` decimal places.
  - Reject empty descriptions or length `> 100`.
  - Require at least one valid contact (valid email regex OR valid 10-digit Indian phone number).
  - Reject expiry dates `<= Date.now()`.
- Compute link status dynamically via `getEffectiveStatus(link)`: if `link.status !== 'Paid'` and `link.expiresAt && new Date(link.expiresAt) <= new Date()`, return `'Expired'`.

## 2. UI & A11y Checklist
- Associate every input with an explicit `<label htmlFor="...">`.
- Show field-level validation messages linked via `aria-describedby` and set `aria-invalid="true"` on invalid fields.
- Ensure status filter tabs/buttons expose `aria-pressed` or `role="tab"` + `aria-selected`.
- Verify layout does not overflow horizontally at `375px` viewport width.

## 3. Mandatory Test Coverage
Before declaring a section complete, write and run:
1. **Unit Tests (Vitest + RTL):**
   - At least 2 meaningful test suites covering boundary validation (e.g., `5,00,000` cap, 3 decimals, missing email+phone, past expiry) and dynamic `Expired` status derivation/filtering.
2. **E2E Test (Playwright):**
   - Happy path: Open app -> fill valid payment link form -> submit -> verify card/row renders in list -> toggle status filter (`Active` / `All`) -> verify filtering works.
- Execute `npx vitest run` and `npx playwright test` and fix any failures immediately.