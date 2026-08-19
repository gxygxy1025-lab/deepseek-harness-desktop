# ADR 0006: Atomic extension batches and Desktop Preset v1

## Status

Accepted for Desktop 2.5.0.

## Context

Single-package extension transactions cannot safely restore a shared environment when a portable setup changes several packages, settings, skills, and task templates together. Applying each item independently creates intermediate Runtime graphs and makes a later failure ambiguous to roll back.

Preset files are untrusted input. An integrity manifest detects corruption but does not establish publisher identity, and a renderer must not receive arbitrary filesystem paths or package-manager access.

## Decision

`PluginManager.prepareMany()` resolves unique registry names to exact versions, checks bundle and host compatibility, requires SHA-512 registry integrity, and prefetches the complete set before Runtime downtime. `applyPreparedBatch()` takes one manifest/lock snapshot, performs one exact offline install, verifies every installed identity, integrity, bundle patch, and compatibility result, updates bundles once, and exposes one commit/rollback transaction.

Extension IPC owns the outer mutation queue and QQ Bot binding exclusion. A successful batch emits `preparing`, `prefetched`, `stopping`, `applying`, `starting`, and `committed`; failure emits `rolling-back` and `restored`. Runtime is stopped and started once on the successful path.

`.dshpreset` v1 is a bounded ZIP container with `dsh-preset.json`, `packages.lock.json`, `settings.json`, `skills/`, `task-templates.json`, `README.md`, and `integrity.json`. The parser inspects central-directory sizes, paths, types, and compression ratios before decompression, then verifies SHA-256 for every payload file before returning a plan. ZIP64, symlinks, special files, traversal, executable scripts, local paths, Git URLs, secret-bearing fields, non-exact versions, and non-allowlisted settings are rejected.

The main process retains selected file paths and gives Extension Dock only a bounded preview token, manifest, trust summary, capability result, required Secret names, and item plan. Conflicts allow only cancel, skip, or the Preset exact version. Applying a confirmed plan stages configuration before downtime and restores package, settings, templates, skills, and the old Runtime on any failure.

Web Profile migration is a sibling transaction rather than a blind profile copy. It maps source patch rows to selected registry bundles by explicit package name or IDs found in the installed bundle patch, omits secret-keyed rows, exposes counts rather than configuration values to the renderer, and stages one replaceable Desktop patch section. The package snapshot and patch bytes commit or roll back in the same Runtime stop/start cycle.

## Consequences

Batch and Preset changes have a longer preflight but a single atomic switch. Integrity-verified Presets remain explicitly untrusted because capability discovery and hashes are not an authorization or publisher-identity mechanism. Secret values must be configured separately after import.
