---
name: ui-aesthetics-expert
description: Transforms basic UIs into high-end, premium B2B interfaces for HospoGo. Use when building or refining dashboards, lists, forms, or any user-facing component. Applies strict hospitality-themed design system with glassmorphism and micro-interactions.
---

# UI Aesthetics Expert

## Goal

Transform basic UIs into high-end, premium B2B interfaces that feel polished and professional for the hospitality marketplace.

## Tech Stack

- **Tailwind CSS v4.0** for all styling
- **Framer Motion** for transitions and animations

## Design System

### Theme: Hospitality Dark/Light

Enforce a strict theme using CSS variables. Define and use:

```css
/* CSS variables for Hospitality theme */
:root {
  /* Light mode */
  --bg-primary: ...;
  --bg-secondary: ...;
  --border-subtle: ...;
  --text-primary: ...;
  --text-muted: ...;
  --accent: ...;
}

[data-theme="dark"] {
  /* Dark mode overrides */
}
```

### Typography

- **Headings:** Bricolage Grotesque
- **Data / Metrics:** JetBrains Mono

### Glassmorphism (Dashboards)

Apply to dashboard cards, modals, and sidebars:

- Thin borders (`border border-white/10` or similar)
- Subtle backdrop blur (`backdrop-blur-md` or `backdrop-blur-xl`)
- Semi-transparent backgrounds
- Avoid heavy shadows; prefer subtle elevation

### Micro-Interactions

Apply to **all list items** and interactive elements:

- **Staggered reveals:** Use Framer Motion `staggerChildren` for list layouts
- **Hover lifts:** `whileHover={{ y: -2 }}` or `whileHover={{ scale: 1.02 }}`
- **Tap feedback:** `whileTap={{ scale: 0.98 }}`
- **Smooth transitions:** `transition={{ duration: 0.2 }}`

## Checklist

Before finishing any UI work:

- [ ] Tailwind v4 and Framer Motion used (no inline styles for layout)
- [ ] Glassmorphism applied to dashboard surfaces
- [ ] CSS variables used for theme colors
- [ ] Bricolage Grotesque for headings, JetBrains Mono for metrics
- [ ] List items have staggered reveals and hover lifts
- [ ] No jarring or abrupt transitions
