# Desktop 2.5 DSH coupling audit

Authoritative Desktop version: 1.0.4.

Stable DSH package version: 0.1.1-rc.2.

Lockfile SHA-256: `8394847263b698a0a0a7c1432927131838b09d87c2f010a7cc6777bd14d07d67`.

Capability discovery is compatibility evidence only. Renderer surface identity, channel allowlists, and argument validation remain the authorization boundary.

## Classification summary

| Classification | Count |
| --- | ---: |
| public-stable | 0 |
| public-experimental | 0 |
| compatibility-patch | 0 |
| private-high-risk | 0 |

## Direct imports, dynamic imports, and requires

| File | Line | Kind | Specifier | Type-only | Classification | Controlled |
| --- | ---: | --- | --- | --- | --- | --- |

## Slot, Host service, Profile/Home, Workspace, Session, and Runtime lifecycle seams

| Category | File | Line | Operation or identity |
| --- | --- | ---: | --- |
| host-service | apps/dsh-desktop/src/runtime-provider.mjs | 220 | host-service.register |
| host-service | apps/dsh-desktop/test/runtime-provider.test.mjs | 152 | task-board |
| profile-home | apps/dsh-desktop/scripts/capture-startup.mjs | 36 | DSH_HOME |
| profile-home | apps/dsh-desktop/scripts/measure-profile.mjs | 6 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/scripts/measure-profile.mjs | 6 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/scripts/measure-profile.mjs | 35 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/scripts/measure-profile.mjs | 38 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/scripts/measure-profile.mjs | 43 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/scripts/measure-profile.mjs | 44 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/scripts/measure-profile.mjs | 50 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/scripts/measure-startup-fps.mjs | 23 | DSH_HOME |
| profile-home | apps/dsh-desktop/scripts/packaged-smoke-runner.mjs | 47 | DSH_HOME |
| profile-home | apps/dsh-desktop/scripts/verify-conversation-skills.mjs | 27 | DSH_HOME |
| profile-home | apps/dsh-desktop/scripts/verify-directory-picker.mjs | 38 | DSH_HOME |
| profile-home | apps/dsh-desktop/scripts/verify-runtime-provider.mjs | 5 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/scripts/verify-runtime-provider.mjs | 5 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/scripts/verify-runtime-provider.mjs | 5 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/scripts/verify-runtime-provider.mjs | 12 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/scripts/verify-runtime-provider.mjs | 13 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/scripts/verify-runtime-provider.mjs | 18 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/scripts/verify-runtime-provider.mjs | 43 | profileDir |
| profile-home | apps/dsh-desktop/scripts/verify-runtime-provider.mjs | 43 | profileDir |
| profile-home | apps/dsh-desktop/scripts/verify-settings-window.mjs | 57 | DSH_HOME |
| profile-home | apps/dsh-desktop/scripts/verify-star-prompt.mjs | 25 | DSH_HOME |
| profile-home | apps/dsh-desktop/scripts/verify-update-shutdown.mjs | 39 | DSH_HOME |
| profile-home | apps/dsh-desktop/scripts/verify-update-shutdown.mjs | 99 | DSH_HOME |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 31 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 31 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 31 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 60 | runtimeHome |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 61 | DSH_HOME |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 328 | runtimeHome |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 330 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 345 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 360 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 366 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 515 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 141 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/src/profile.mjs | 151 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 152 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 169 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/src/profile.mjs | 169 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/src/profile.mjs | 171 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 172 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 179 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 180 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 181 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 182 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 183 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 184 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 187 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/src/runtime-controller.mjs | 373 | DSH_HOME |
| profile-home | apps/dsh-desktop/src/runtime-controller.mjs | 374 | DSH_PROFILE |
| profile-home | apps/dsh-desktop/src/runtime-provider.mjs | 183 | profileDir |
| profile-home | apps/dsh-desktop/src/runtime-provider.mjs | 187 | profileDir |
| profile-home | apps/dsh-desktop/src/runtime-provider.mjs | 188 | profileDir |
| profile-home | apps/dsh-desktop/src/runtime-provider.mjs | 189 | profileDir |
| profile-home | apps/dsh-desktop/src/runtime-provider.mjs | 190 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 12 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 15 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 16 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 54 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 59 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 65 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 66 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 67 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 73 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-controller.test.mjs | 230 | DSH_PROFILE |
| profile-home | apps/dsh-desktop/test/runtime-provider.test.mjs | 47 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-provider.test.mjs | 114 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-provider.test.mjs | 120 | profileDir |
| profile-home | scripts/audit-dsh-coupling.mjs | 33 | ensureDesktopProfile |
| profile-home | scripts/audit-dsh-coupling.mjs | 33 | resolveRuntimePackages |
| profile-home | scripts/audit-dsh-coupling.mjs | 33 | resolveDshCliPath |
| profile-home | scripts/audit-dsh-coupling.mjs | 33 | DSH_HOME |
| profile-home | scripts/audit-dsh-coupling.mjs | 33 | DSH_PROFILE |
| profile-home | scripts/audit-dsh-coupling.mjs | 33 | profileDir |
| profile-home | scripts/audit-dsh-coupling.mjs | 33 | runtimeHome |
| profile-home | scripts/dsh-skin.test.mjs | 21 | DSH_HOME |
| profile-home | scripts/dsh-skin.test.mjs | 68 | DSH_HOME |
| profile-home | scripts/dsh-skin.test.mjs | 75 | DSH_HOME |
| profile-home | scripts/dsh-skin.test.mjs | 87 | DSH_HOME |
| profile-home | scripts/dsh-skin.test.mjs | 102 | DSH_HOME |
| profile-home | scripts/dsh-skin.test.mjs | 120 | DSH_HOME |
| profile-home | scripts/dsh-skin.test.mjs | 126 | DSH_HOME |
| runtime-lifecycle | apps/dsh-desktop/src/electron-app.mjs | 320 | recover |
| runtime-lifecycle | apps/dsh-desktop/src/electron-app.mjs | 715 | start |
| runtime-lifecycle | apps/dsh-desktop/src/electron-app.mjs | 728 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/electron-app.mjs | 730 | start |
| runtime-lifecycle | apps/dsh-desktop/src/ipc.mjs | 202 | restart |
| runtime-lifecycle | apps/dsh-desktop/src/ipc.mjs | 204 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/ipc.mjs | 206 | start |
| runtime-lifecycle | apps/dsh-desktop/src/menu.mjs | 56 | restart |
| runtime-lifecycle | apps/dsh-desktop/src/runtime-provider.mjs | 158 | start |
| runtime-lifecycle | apps/dsh-desktop/src/runtime-provider.mjs | 162 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/runtime-provider.mjs | 167 | restart |
| runtime-lifecycle | apps/dsh-desktop/src/runtime-provider.mjs | 168 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/runtime-provider.mjs | 169 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 224 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 239 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 264 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 306 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 312 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 314 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 322 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 339 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 377 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 425 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 458 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 466 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 487 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 497 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 516 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 538 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 564 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 568 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 569 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 581 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 611 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 616 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 617 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 659 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 665 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 666 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 667 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 683 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 713 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 751 | start |
| runtime-lifecycle | apps/dsh-desktop/test/updater.test.mjs | 68 | start |
| session | scripts/dsh-candidate-execution.mjs | 91 | get |
| session | scripts/dsh-candidate-execution.mjs | 160 | subscribe |
| session | scripts/dsh-candidate-execution.mjs | 161 | prompt |
| workspace | gallery/bundles.js | 7 | list |
| workspace | gallery/bundles.js | 13 | list |
