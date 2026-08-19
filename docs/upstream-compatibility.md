# Upstream DSH compatibility

Desktop Stable pins one tested DSH runtime graph and does not follow `latest`. The authoritative version is the exact `@deepseek-ai/dsh` dependency in `apps/dsh-desktop/package.json`; `pnpm-lock.yaml` is authoritative for resolved bytes. `apps/dsh-desktop/runtime-support/known-good.json` is atomically generated diagnostic evidence and never replaces either source.

## Known Good evidence

Run `pnpm runtime-support:write` only when authoritative package or compatibility inputs intentionally change. `pnpm runtime-support:check` verifies the derived manifest contains the exact Desktop/root versions, Node engine, package manager, DSH version and SHA-512 integrity, package exports and peers, lockfile SHA-256, provider capabilities, compat patch registry hash/ids, and expected packaged CLI identity.

The coupling audit in `docs/archive/desktop-2.5-dsh-coupling-audit.md` lists direct imports, dynamic imports, requires, slots, Host services, Profile/Home paths, Workspace and Session calls, and lifecycle calls. Each import is classified as public stable, public experimental, compatibility patch, or private high risk. `pnpm dsh-imports:check` rejects any additional direct `@deepseek-ai/dsh*` import outside the controlled runtime adapter and `dsh-desktop-compat` areas, including another occurrence in an existing file.

## Compatibility patches

`packages/dsh-desktop-compat/src/patch-registry.ts` is the patch authority. Every entry has an id, exact applicable versions, reason, upstream reference, test, removal condition, and last verification date. A patch is removed only when its removal condition is true for the candidate and all referenced regressions pass.

## Candidate Lite

The manual `DSH Candidate Lite` workflow requires an exact candidate version. It creates a detached temporary worktree, resolves and installs the candidate plus each peer at an exact version, and runs typecheck, unit and script tests, provider start/stop/recover, profile creation, Desktop Contract, built-ins, Task Board, Directory Picker, package verification, and packaged smoke.

The workflow uploads Markdown and JSON reports comparing package exports, peers, provider capabilities, compat patches, and slot evidence. Failed runs may comment on one explicitly supplied compatibility issue. A stable hash guard covers the root/Desktop manifests, lockfile, release notes, and updater metadata. Candidate work never edits `main`, Stable dependencies, releases, or updater metadata.

Normal Desktop startup performs no Candidate or registry work. Registry access remains confined to explicit Extension Dock checks and manually dispatched Candidate jobs.

## Promotion

A candidate can become Stable only through a separate reviewed release change that intentionally updates exact package metadata and the lockfile, regenerates Known Good evidence and the coupling audit, evaluates every compat patch, and passes the complete Desktop release gate. Candidate reports never promote automatically.
