# Desktop 8% startup recovery

Date: 2026-08-19

Status: implemented and verified

## Report

Affected users could complete a first launch, run a project, and then remain on "正在准备本地环境" at 8% after restarting Desktop. Reinstalling Desktop or deleting `~/.dsh/profiles/desktop` did not reliably recover the application, while a downgrade could appear to help.

## Evidence and root cause

The affected machine's persisted runtime log records DSH exiting because `~/.dsh/cordis.patch.yml` was not a top-level YAML array of loader patch entries. This file lives in the DSH home rather than the Desktop installation or Desktop Profile, so uninstalling the application or deleting only `profiles/desktop` does not remove it.

Desktop already repaired zero-byte patch files, but legacy placeholders such as `{}`, `[]`, and comment-only YAML were not treated consistently. An empty mapping in the Desktop Profile could also be followed by the managed loader block, producing a structurally invalid document.

The startup renderer had a second defect: it fetched an initial status before registering the live status listener. A newer failure or starting event could therefore be missed or overwritten by the stale `stopped` snapshot. An IPC rejection also terminated initialization while the static HTML still displayed 8%.

## Design

Semantically empty patch documents are normalized to the canonical empty array before Desktop appends its managed loader block. This applies only to YAML that parses as null, an empty sequence, or an empty mapping; non-empty and malformed user configuration is preserved so Desktop never silently discards user entries or conceals a syntax error.

The startup renderer now subscribes before requesting the initial snapshot. A small status gate prevents a late initial snapshot from overwriting a live event, and initialization failures are rendered as the existing crashed state with technical details instead of leaving the static 8% screen visible.

## Verification

The profile regression test exercises blank, comment-only, empty-map, empty-list, non-empty, and malformed inputs, then starts the pinned official DSH CLI with the repaired temporary home and verifies that configuration loading succeeds. Startup progress tests cover live-before-initial ordering and normal initial rendering.

The full `@deepseek-ai/dsh-desktop` suite passes with 331 tests. DSH import-boundary and packaged runtime-dependency checks also pass.

## Additional plugin diagnostics

A second report and two byte-identical exported diagnostics files describe an unattributed `DSH runtime did not become ready within 120000ms` incident while three packages with heavy install-time work were being added. The export proves the unknown timeout, later safe-mode state, and disabled names, but it does not contain an incident resolution, package-operation timeline, or cache-deletion event; those parts of the narrative are treated as hypotheses rather than diagnostic facts.

Code inspection exposed a concrete transaction escape: the patched market rejected direct Desktop installs only when the optional `desktopSkinState` service was present. When that unrelated service was unavailable, market requests could mutate the authoritative profile outside Extension Dock's serialized stop/apply/start/rollback transaction. The guard now keys off the host-owned explicit profile directory, so install, update, and uninstall requests cannot race runtime startup even when skin persistence is unavailable.

The diagnostics also listed `schemastery`, a Desktop-managed compatibility dependency, as a disabled plugin. It was absent from the protected package set and is now classified as Desktop-managed so safe mode retains it. Existing recovery policy already preserves all plugins for an unattributed first crash and repairs legacy automatically-entered unknown-timeout safe mode, so no destructive cache or dependency cleanup was added.

The market's installed view now reads Desktop's existing `.dsh-desktop-links.json` ownership record and excludes those managed packages while leaving community dependencies visible. Verification accepts a package whose only executable surface is a declared `dsh.bundle.patch`, and a declared bundle that is not in the profile bundle layer receives an accurate inactive explanation instead of the contradictory "未声明 dsh.bundle" message.

## Windows PowerShell wrapper failure

A third field report isolates a configuration-independent Windows failure: Desktop 2.5.0's embedded Runtime exited in about 220 milliseconds with unsigned code `4294967295` (`0xFFFFFFFF`, signed `-1`) and produced no output. The reporter reproduced the same invocation under Windows 11 build 26200 and Windows PowerShell 5.1; removing only `-WindowStyle Hidden` made both the DSH Runtime and a `--version` probe work, while changing the install path and profile did not.

Desktop launches the Electron GUI-subsystem executable in Node mode through PowerShell so the Runtime can attach to a parent console and share it with restricted terminal descendants. The child-process call already sets `windowsHide: true`, so passing PowerShell's independent `-WindowStyle Hidden` is redundant and triggers the reported platform-specific failure. The invocation now retains the PowerShell console host and console preload but omits that switch, leaving window suppression at the spawn boundary.

The Windows regression test asserts that the generated invocation never contains `-WindowStyle` or `Hidden`. On Windows, the integration tests also execute the wrapper, verify Runtime stdout and exit-code propagation, and confirm that the Electron Node-mode process still attaches to the PowerShell console.
