# Download and Performance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the hero download control perform a real installer download and reduce the amount of work required for the first usable render.

**Architecture:** Keep the static GitHub Pages architecture. Turn the terminal action into a real link with a checked-in fallback URL, then let the release API enhance it when available. Replace large PNG requests with dimension-appropriate WebP assets, remove full-screen runtime blur, and defer below-the-fold release hydration until the browser is idle.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Pillow image conversion, GitHub Pages.

---

### Task 1: Fix the download interaction

**Files:**
- Modify: `website/index.html`
- Modify: `website/script.js`
- Modify: `website/styles.css`

1. Replace the terminal's text-only command with a real anchor and explicit action label.
2. Preserve a direct checked-in release asset URL before the GitHub API responds.
3. Switch the terminal link between the installer and source repository with the existing tabs.
4. Verify every `.download-link` resolves to the installer asset.

### Task 2: Reduce first-render cost

**Files:**
- Create: `website/assets/*.webp`
- Modify: `website/index.html`
- Modify: `website/styles.css`
- Modify: `website/script.js`

1. Generate WebP variants sized for their rendered dimensions.
2. Use the compressed hero asset and remove the full-viewport CSS blur filter.
3. Replace loaded screenshot references with WebP variants while retaining width and height attributes.
4. Defer GitHub release hydration until idle and keep fallback data immediately usable.

### Task 3: Verify and publish

**Files:**
- Test: `scripts/validate-website.mjs`

1. Run `node --check website/script.js`.
2. Run `pnpm website:check`.
3. Measure generated asset sizes and verify the direct installer redirect.
4. Test desktop and mobile behavior in a real browser.
5. Commit, push to `main`, wait for GitHub Pages, and verify the live site.
