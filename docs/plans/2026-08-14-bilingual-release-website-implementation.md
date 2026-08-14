# Bilingual Releases and Introduction Website Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enforce bilingual desktop release notes and refine the static project introduction website without losing its existing visual direction.

**Architecture:** A dependency-free Node validator protects one canonical bilingual Markdown release body in both CI workflows. The static website hydrates release metadata from the GitHub API while retaining checked-in fallbacks, and CSS reveal motion becomes progressive enhancement.

**Tech Stack:** Node.js built-ins, GitHub Actions, static HTML/CSS/JavaScript, Playwright CLI.

---

### Task 1: Bilingual release contract

**Files:**
- Create: `docs/launch/release-notes.template.md`
- Create: `scripts/validate-release-notes.mjs`
- Create: `scripts/validate-release-notes.test.mjs`
- Modify: `docs/launch/release-notes.md`
- Modify: `CHANGELOG.md`

1. Write validator tests for missing Chinese, missing English, stale version and placeholder content.
2. Run `node --test scripts/validate-release-notes.test.mjs` and confirm the tests fail before the validator exists.
3. Implement the validator and bilingual template.
4. Convert the current 0.1.3 notes and changelog entry to the canonical bilingual structure.
5. Run the validator tests and validate the real release body.

### Task 2: Release pipeline enforcement

**Files:**
- Modify: `.github/workflows/desktop-ci.yml`
- Modify: `.github/workflows/desktop-release.yml`
- Modify: `package.json`

1. Add a root `release:notes:check` script.
2. Run it in CI before desktop tests and in the tag workflow before packaging.
3. Check YAML formatting and run the command locally.

### Task 3: Bilingual in-app update framing

**Files:**
- Modify: `apps/dsh-desktop/src/updater.mjs`
- Modify: `apps/dsh-desktop/test/updater.test.mjs`

1. Add assertions for bilingual fixed labels and fallback notes.
2. Update available, no-update, downloaded and error dialogs to Chinese-first bilingual copy.
3. Run the desktop unit and integration suite.

### Task 4: Introduction website refinement

**Files:**
- Modify: `website/index.html`
- Modify: `website/styles.css`
- Modify: `website/script.js`
- Modify: `.gitignore`

1. Add the latest-release panel and first-screen community/unsigned context.
2. Hydrate version, date, size, release URL and checksum URL from GitHub without inserting remote HTML.
3. Convert reveal effects to progressive enhancement with IntersectionObserver fallback.
4. Refine responsive layout, focus states and reduced motion.
5. Ignore local Playwright state and generated output.

### Task 5: Verification and publication

**Files:**
- Modify: `README.md`
- Modify: `README.en.md`

1. Run release-note validation, script tests and desktop tests.
2. Serve `website/` locally and inspect desktop and mobile snapshots with Playwright CLI.
3. Check all local assets and public links.
4. Commit only scoped source, workflow and documentation files; exclude generated screenshots and tool state.
5. Push the existing desktop branch to the public `main` branch and update the 0.1.3 GitHub Release body to bilingual content.
