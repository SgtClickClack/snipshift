# UI Audit Report

## 1. Raw Inputs

These locations use native HTML form elements where Shadcn UI components should be used for consistency and styling.

- **src/components/profile/profile-form.tsx: Line 197**
  - Usage: `<select>`
  - Fix: Replace with `<Select>`, `<SelectTrigger>`, `<SelectContent>`, `<SelectItem>`.

- **src/components/profile/profile-form.tsx: Line 327**
  - Usage: `<input type="checkbox">`
  - Fix: Replace with `<Checkbox>`.

## 2. Z-Index Hacks

These locations use arbitrary high z-indices, indicating potential layout context stacking issues.

- **src/components/navbar.tsx: Line 141**
  - Usage: `z-[9999]` on `<DropdownMenuContent>`
  - Fix: Ensure proper stacking context or use `z-50` (standard) and check `shadcn` component configuration (Portals usually handle this).

- **src/components/navbar.tsx: Line 234**
  - Usage: `z-[9999]` on `<DropdownMenuContent>`
  - Fix: Same as above.

## 3. "Hidden" Overflows

These containers have `overflow-hidden` which might clip absolute positioned elements (dropdowns, tooltips) if they are not portalled.

- **src/pages/messages.tsx: Lines 208, 280**
  - Usage: `overflow-hidden` on `<Card>` containers.
  - Note: Currently contains `ReportButton` which uses `Dialog` (Portalled), so likely safe. However, if inline dropdowns are added, they will be clipped.

- **src/components/navbar.tsx: Line 284**
  - Usage: `overflow-hidden` on user details container.
  - Note: Used for text truncation. Verify it doesn't clip focus rings or future tooltips.

- **src/components/job-feed/google-map-view.tsx: Line 396** & **src/components/job-feed/map-view.tsx: Line 144**
  - Usage: `overflow-hidden` on map containers.
  - Note: Standard for maps, but check if custom overlay controls are clipped.

