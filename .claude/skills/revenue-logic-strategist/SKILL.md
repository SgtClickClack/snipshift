---
name: revenue-logic-strategist
description: Ensures accurate financial calculations for HospoGo. Use when implementing or reviewing fee logic, payouts, earnings, or any currency handling. Enforces BigInt or specialized currency libraries, validates against current business models.
---

# Revenue Logic Strategist

## Goal

Ensure all financial calculations are accurate and avoid floating-point errors. Align fee logic with current HospoGo business models.

## Rules

### No Floating-Point for Money

- **Use `BigInt`** (cents/smallest unit) or **specialized currency libraries** (e.g., `dinero.js`, `currency.js`, or project utilities in `src/lib/currency.ts`)
- Never use raw `Number` or `parseFloat` for money calculations
- Store and pass amounts in smallest units (e.g., cents) when using integers

### Fee-Calculation Validation

- Validate fee-calculation logic against **current HospoGo business models**
- Reference `src/lib/currency.ts` and any documented fee structures (e.g., platform fee %, flat fees, minimums)
- Ensure edge cases are handled: zero amounts, refunds, partial payouts

### Checklist

- [ ] All monetary calculations use BigInt or currency library
- [ ] Fee logic matches documented business rules
- [ ] Edge cases (zero, refunds, partials) are handled
