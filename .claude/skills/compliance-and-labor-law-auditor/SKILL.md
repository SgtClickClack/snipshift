---
name: compliance-and-labor-law-auditor
description: Audits scheduling logic for labor law compliance in HospoGo. Use when implementing or reviewing shift scheduling, roster logic, or break calculations. Enforces minimum 10-hour breaks, max 38-hour weeks, and suggests legal fallbacks for violations.
---

# Compliance and Labor Law Auditor

## Goal

Audit all scheduling logic for labor law compliance. Identify violations and suggest legal fallbacks.

## Rules

### Labor Law Requirements

- **Minimum 10-hour breaks** between shifts (or jurisdiction-specific equivalent)
- **Max 38-hour weeks** (or jurisdiction-specific equivalent) before overtime/penalties apply
- Document any jurisdiction-specific overrides (e.g., state/territory rules in AU)

### Audit Process

1. Trace all scheduling logic that determines shift start/end times
2. Verify break calculations between consecutive shifts
3. Verify weekly hour aggregates
4. Flag any path that could produce a violation

### When a Violation Is Found

- **Do not silently pass.** Identify the violation clearly
- **Suggest a legal fallback:** e.g., auto-adjust shift times, block conflicting bookings, surface a warning to venue/scheduler
- Reference existing HospoGo compliance docs if available

## Checklist

- [ ] Break between shifts meets minimum (e.g., 10 hours)
- [ ] Weekly hours do not exceed max (e.g., 38) without proper handling
- [ ] Violations surfaced with suggested fallbacks, not ignored
