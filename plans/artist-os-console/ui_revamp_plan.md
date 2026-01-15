# Artist OS Console UI Revamp Plan

## Goal
Revamp the `artist-os-console` UI to move away from the "robotic cold", dark, terminal-like aesthetic to a "light mode", aesthetically pleasing, and pleasant interface, without changing functionality or information density.

## Design Concept
- **Theme:** Light Mode (Soft Slate/White).
- **Vibe:** Clean, airy, professional but friendly.
- **Palette:**
    - **Backgrounds:** Off-whites and light slates to reduce eye strain compared to pure white.
    - **Accents:** Shift from "Cyberpunk Cyan" (`#22d3ee`) to a more refined "Indigo" or "Violet".
    - **Text:** Dark slate for high readability, but not harsh pure black.

## Color Palette Strategy

We will update the CSS variables in `src/app/artist-os-console/page.tsx`.

| Variable | Old (Dark) | New (Light) | Description |
| :--- | :--- | :--- | :--- |
| `--console-bg` | `#0a0a0a` | `#f8fafc` (Slate 50) | Main page background |
| `--console-surface` | `#141414` | `#ffffff` (White) | Cards/Panels background |
| `--console-border` | `#262626` | `#e2e8f0` (Slate 200) | Borders |
| `--console-text` | `#fafafa` | `#0f172a` (Slate 900) | Primary text |
| `--console-text-muted` | `#a1a1aa` | `#64748b` (Slate 500) | Secondary text/labels |
| `--console-accent` | `#22d3ee` | `#6366f1` (Indigo 500) | Primary action color |
| `--console-success` | `#22c55e` | `#10b981` (Emerald 500) | Success states |
| `--console-warning` | `#f59e0b` | `#f59e0b` (Amber 500) | Warning states |
| `--console-error` | `#ef4444` | `#f43f5e` (Rose 500) | Error states |
| `--console-input-bg` | *N/A (Hardcoded)* | `#f1f5f9` (Slate 100) | Background for inputs/logs |

## Implementation Steps

### 1. Update Theme Configuration
**File:** `src/app/artist-os-console/page.tsx`
- Update the `consoleTheme` object with the new palette.
- Replace the dark radial gradients with subtle, light gradients (e.g., faint indigo/emerald touches) to maintain depth without darkness.
- Add `--console-input-bg` to the theme definition.

### 2. Refactor Components (Remove Hardcoded Dark Styles)
Several components have hardcoded `bg-black/xx` classes. These must be replaced with the new semantic variable `--console-input-bg` or appropriate Tailwind classes.

**Files:**
- `src/app/artist-os-console/components/QueryForm.tsx`
    - Replace `bg-black/30` with `bg-[var(--console-input-bg)]`.
- `src/app/artist-os-console/components/StatusTimeline.tsx`
    - Replace `bg-black/30` with `bg-[var(--console-input-bg)]`.
- `src/app/artist-os-console/components/ResultPanel.tsx`
    - Replace `bg-black/40` and `bg-black/20` with `bg-[var(--console-input-bg)]`.
    - Update border colors to use `--console-border` consistently if hardcoded.
- `src/app/artist-os-console/components/StreamViewer.tsx`
    - Replace `bg-black/40` (container) and `bg-black/10` (log entries) with `bg-[var(--console-input-bg)]` and `bg-white` (or `bg-slate-50`) respectively.

### 3. Verification
- Start dev server.
- Visit `/artist-os-console`.
- Verify the "pleasantness" and contrast.
- Ensure streaming logs are still readable in the new color scheme.

## Implementation Complete ✅

**Date:** 2026-01-07

### Changes Made

1. **Theme Configuration (`page.tsx`)**
   - Updated all CSS variables to light mode palette (Slate/White/Indigo)
   - Replaced dark radial gradients with subtle light gradients using indigo/emerald
   - Added `--console-input-bg` variable for consistent input backgrounds

2. **Component Refactoring**
   - **QueryForm.tsx**: Replaced all `bg-black/30` and `bg-black/40` with `bg-[var(--console-input-bg)]`, updated button text from `text-black` to `text-white` for accent buttons
   - **StatusTimeline.tsx**: Replaced `bg-black/30` with `bg-[var(--console-input-bg)]`
   - **ResultPanel.tsx**: Replaced `bg-black/40`, `bg-black/20`, and `bg-black/30` with `bg-[var(--console-input-bg)]`, updated success badge text to white
   - **StreamViewer.tsx**: Replaced `bg-black/40` (container) and `bg-black/10` (log entries) with `bg-[var(--console-input-bg)]` and `bg-white` respectively
   - **DebugDrawer.tsx**: Replaced all `bg-black/30`, `bg-black/40` with `bg-[var(--console-input-bg)]` or `bg-white`, updated overlay from `bg-black/40` to `bg-slate-900/20`, updated shadow from `shadow-black/40` to `shadow-slate-200`
   - **PromptHistory.tsx**: Replaced `bg-black/20` with `bg-[var(--console-input-bg)]`

3. **Animation Updates (`console.css`)**
   - Updated `phase-pulse` animation to use new Indigo accent color (`rgba(99, 102, 241, 0.35)`) instead of cyan

### Result
The UI now features a clean, light mode aesthetic with:
- Soft Slate backgrounds (`#f8fafc`) instead of harsh black
- White card surfaces for better contrast
- Indigo accent color (`#6366f1`) replacing the "cyberpunk cyan"
- Pleasant, readable text colors with proper contrast
- Subtle background gradients for depth without darkness

All functionality preserved; only visual styling changed.
