# Vivid Light Website Theme Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an optional animated, high-key website theme without replacing the existing dark official-inspired design.

**Architecture:** A fixed-header button toggles `data-site-theme="vivid"` on the root element and persists the choice in localStorage. CSS variables and targeted component overrides provide the bright palette, while pseudo-element gradient orbs create motion without JavaScript animation or additional image downloads. Reduced-motion users receive the same colors without movement.

**Tech Stack:** Static HTML, CSS custom properties, vanilla JavaScript, GitHub Pages.

---

### Task 1: Add the theme control and early preference restore

**Files:**
- Modify: `website/index.html`
- Modify: `website/script.js`

1. Add an accessible theme toggle in the fixed header.
2. Restore the stored theme before CSS loads to avoid a dark-to-light flash.
3. Update button label, pressed state, theme-color metadata, and localStorage when toggled.

### Task 2: Build the vivid light visual system

**Files:**
- Modify: `website/styles.css`

1. Define the light palette and component overrides under `[data-site-theme="vivid"]`.
2. Add blue, cyan, coral, and pink ambient shapes with lightweight CSS keyframes.
3. Keep text contrast, card borders, download CTA hierarchy, and mobile navigation usable.
4. Disable ambient motion under `prefers-reduced-motion: reduce`.

### Task 3: Verify and publish

**Files:**
- Test: `scripts/validate-website.mjs`

1. Run JavaScript syntax and website validation checks.
2. Verify toggling, persistence, desktop layout, and mobile overflow in a real browser.
3. Commit and push to main.
4. Wait for GitHub Pages and verify the live theme.
