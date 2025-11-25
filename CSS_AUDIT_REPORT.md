# CSS & Design System Audit Report

**Date:** 2025-11-25
**Status:** Initial Audit

## Executive Summary

The codebase has a defined Design System based on a custom "Steel" and "Chrome" palette, but adherence is inconsistent. There is significant mixing of custom theme colors (`steel-*`, `chrome-*`) with default Tailwind colors (`gray-*`, `slate-*`). Additionally, there are hardcoded hex values and inline styles that should be refactored to use the utility classes for better maintainability and dark mode support.

## 1. Design System Consistency

### Issue: Mixed Color Palettes
The `tailwind.config.js` defines a rich `steel` color scale, but many components still use `gray` or `slate` scales.

*   **Defined Theme**: `steel-50` to `steel-900`, `chrome-*`, `red-accent`.
*   **Observed Usage**:
    *   `src/components/layout/footer.tsx`: Uses `slate-950`, `border-slate-800`, `text-gray-300`.
    *   `src/pages/admin/dashboard.tsx`: Heavily relies on `gray-800`/`gray-900` for a hardcoded dark theme.
    *   `src/components/social/community-feed.tsx`: Mixes `gray-200` placeholders with other styles.

### Recommendation
*   Standardize on the `steel` scale for all neutrals to ensure a consistent "blue-grey" metallic feel across the app.
*   Replace `gray-*` and `slate-*` with corresponding `steel-*` values.

## 2. Maintainability & Refactoring

### Issue: Hardcoded Colors
Several files contain hardcoded hex codes, making theme changes and dark mode implementation difficult.

*   **High Impact**: `src/components/job-feed/google-map-view.tsx`
    *   Markers and map elements use specific hex codes like `#3b82f6`, `#ef4444`.
    *   These should be moved to constants that reference the Tailwind theme colors or CSS variables.
*   **Charts**: `src/components/analytics/analytics-dashboard.tsx` uses hardcoded colors array.

### Issue: Inline Styles for Theme Variables
Some pages use inline styles to apply background colors defined in CSS variables.

*   **Example**: `<div style={{backgroundColor: 'var(--bg-professional)'}}>` in `src/pages/professional-dashboard.tsx`.
*   **Fix**: Add these as utility classes in Tailwind config (e.g., `bg-page-professional`) so they can be used as `<div className="bg-page-professional">`.

## 3. Dark Mode Strategy

### Issue: Hardcoded Dark Styles
The Admin Dashboard (`src/pages/admin/dashboard.tsx`) appears to have a "forced" dark mode using `bg-gray-900` classes, rather than using the semantic `dark:` modifier or standardizing on the global `dark` theme variables.

### Recommendation
*   Refactor Admin Dashboard to use semantic colors (`bg-background`, `bg-card`) which automatically switch based on the theme.
*   Ensure `src/index.css` dark mode variables cover all necessary cases.

## 4. Specific File Audits

| Component | Issues Identified | Priority |
|-----------|-------------------|----------|
| `src/components/job-feed/google-map-view.tsx` | Hardcoded hex colors for map markers | High |
| `src/pages/admin/dashboard.tsx` | Hardcoded `gray-*` dark theme, ignoring system theme | Medium |
| `src/components/layout/footer.tsx` | Uses `slate-*` instead of `steel-*` | Low |
| `src/components/social/post-creation-form.tsx` | Mixed `gray-*` usage | Low |
| `src/pages/*.tsx` | Inline styles for page backgrounds | Low |

## Next Steps (Proposed)

1.  **Refactor Map Markers**: Extract map colors to a config object that pulls from the design system.
2.  **Admin Dashboard Overhaul**: Update to use semantic `card`, `background`, and `foreground` classes.
3.  **Global Search & Replace**: Systematically replace `gray-*` and `slate-*` with `steel-*` equivalents.
4.  **Utility Class Updates**: Add page-specific background colors to `tailwind.config.js`.

