
#### 2025-11-20: UI Polish - Navbar & Hero Logo

**Core Components**
- `src/components/navbar.tsx`
- `src/components/hero.tsx`

**Key Features**
- **Navbar**: Reverted to `logo-processed.png` as `logo-white.png` was causing display issues (white box).
- **Hero**: 
  - Reverted to `logo-processed.png` but maintained the increased size (`h-48`).
  - Removed `logo-white.png` reference which was incorrect.

**Integration Points**
- N/A

**File Paths**
- `src/components/navbar.tsx`
- `src/components/hero.tsx`

**Next Priority Task**
- Verify visual appearance in browser.
