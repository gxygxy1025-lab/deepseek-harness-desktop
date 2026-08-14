# Bilingual releases and introduction website design

## Purpose

Every desktop release should be understandable to Chinese and English readers without maintaining two separate GitHub Releases. The project introduction website should remain download-first while explaining the newest version, updater behavior, security boundary, and real product capabilities more clearly.

## Release language contract

The canonical release body uses one Markdown document with a Chinese section first and an English section second. Both sections contain the same five information groups: highlights, update behavior or migration notes, verification, download and checksum guidance, and the community-build disclaimer. The app updater keeps GitHub's bilingual body as plain text and uses bilingual fixed labels around it.

A checked-in template defines the required headings. A dependency-free validator reads the desktop package version and release body, verifies that the title matches, requires Chinese and English content, rejects placeholder tokens, and checks the essential headings. Desktop CI and tag-release CI both run the validator, so a monolingual or stale release body cannot be published accidentally.

## Introduction website direction

The existing deep-sea editorial layout remains the visual foundation. Optimization focuses on information density and resilience instead of changing its identity:

- add a latest-release panel with version, publication date, installer size, bilingual release-note entry point, updater status and checksum access;
- clarify the community/non-official status and unsigned-build warning near the first download decision;
- make reveal animations progressive enhancement so content remains visible when JavaScript, IntersectionObserver or screenshots fail;
- improve hero hierarchy, mobile download actions, keyboard focus, reduced-motion behavior and live-release fallback;
- keep every screenshot authentic and avoid introducing new remote font or analytics dependencies.

The site remains a build-free static artifact deployed by GitHub Pages. GitHub API failures retain the checked-in 0.1.3 download and release links.

## Verification

Tests cover the release-note validator, bilingual updater labels and GitHub API data formatting. The website receives HTML/link checks plus Playwright visual inspection at desktop and mobile viewports. Generated screenshots stay under `output/playwright/` and are not committed.
