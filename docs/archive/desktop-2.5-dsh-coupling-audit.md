# Desktop 2.5 DSH coupling audit

Authoritative Desktop version: 2.7.0.

Stable DSH package version: 0.1.0-rc.7.

Lockfile SHA-256: `0ad4191004722b095725bc1cdf6ae52d909bb6adfaff3c7683a1fb1420fc74f8`.

Capability discovery is compatibility evidence only. Renderer surface identity, channel allowlists, and argument validation remain the authorization boundary.

## Classification summary

| Classification | Count |
| --- | ---: |
| public-stable | 144 |
| public-experimental | 109 |
| compatibility-patch | 23 |
| private-high-risk | 0 |

## Direct imports, dynamic imports, and requires

| File | Line | Kind | Specifier | Type-only | Classification | Controlled |
| --- | ---: | --- | --- | --- | --- | --- |
| packages/dsh-aionui-panel/src/client/drag/DragFileInlay.tsx | 17 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-aionui-panel/src/client/drag/DragFileInlay.tsx | 19 | static-import | @deepseek-ai/dsh-client-ui-conversation/client | yes | public-experimental | no |
| packages/dsh-aionui-panel/src/client/index.ts | 16 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-aionui-panel/src/client/index.ts | 17 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-aionui-panel/src/client/index.ts | 18 | static-import | @deepseek-ai/dsh-client-locale/client | yes | public-experimental | no |
| packages/dsh-aionui-panel/src/client/index.ts | 20 | static-import | @deepseek-ai/dsh-client-ui-conversation/client | yes | public-experimental | no |
| packages/dsh-aionui-panel/src/host/gate.ts | 10 | static-import | @deepseek-ai/dsh-workspace | yes | public-stable | no |
| packages/dsh-aionui-panel/src/host/git-service.ts | 11 | static-import | @deepseek-ai/dsh-subprocess | yes | public-stable | no |
| packages/dsh-aionui-panel/src/host/git-service.ts | 15 | static-import | @deepseek-ai/dsh-subprocess | yes | public-stable | no |
| packages/dsh-aionui-panel/src/host/routes.ts | 9 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-aionui-panel/src/index.ts | 17 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-aionui-panel/src/index.ts | 19 | static-import | @deepseek-ai/dsh-subprocess | yes | public-stable | no |
| packages/dsh-aionui-panel/src/index.ts | 20 | static-import | @deepseek-ai/dsh-workspace | yes | public-stable | no |
| packages/dsh-aionui-panel/src/index.ts | 21 | static-import | @deepseek-ai/dsh-system-prompt | yes | public-stable | no |
| packages/dsh-desktop-compat/src/background-scheduler-runner.ts | 11 | static-import | @deepseek-ai/dsh-agent | no | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/background-scheduler-runner.ts | 13 | static-import | @deepseek-ai/dsh-agent-default-model | yes | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/background-scheduler-runner.ts | 14 | static-import | @deepseek-ai/dsh-llm | no | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/background-scheduler-runner.ts | 15 | static-import | @deepseek-ai/dsh-session | no | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/background-scheduler-runner.ts | 16 | static-import | @deepseek-ai/dsh-session-persistence | yes | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/background-scheduler-runner.ts | 17 | static-import | @deepseek-ai/dsh-workspace | yes | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/index.ts | 1 | static-import | @deepseek-ai/dsh-agent | yes | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/index.ts | 3 | static-import | @deepseek-ai/dsh-agent-default-model | yes | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/index.ts | 4 | static-import | @deepseek-ai/dsh-session | yes | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/index.ts | 5 | static-import | @deepseek-ai/dsh-session-persistence | yes | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/index.ts | 6 | static-import | @deepseek-ai/dsh-tools | yes | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/index.ts | 7 | static-import | @deepseek-ai/dsh-workspace | yes | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/recovery.ts | 1 | static-import | @deepseek-ai/dsh-agent | yes | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/recovery.ts | 2 | static-import | @deepseek-ai/dsh-llm | yes | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/recovery.ts | 3 | static-import | @deepseek-ai/dsh-tools | no | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/recovery.ts | 4 | static-import | @deepseek-ai/dsh-tools | yes | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/tool-call-normalization.ts | 1 | static-import | @deepseek-ai/dsh-llm | yes | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/tool-call-normalization.ts | 3 | static-import | @deepseek-ai/dsh-tools | no | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/workspace-file-open-route.ts | 3 | static-import | @deepseek-ai/dsh-host-webserver | yes | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/workspace-file-open-route.ts | 9 | static-import | @deepseek-ai/dsh-workspace | yes | compatibility-patch | yes |
| packages/dsh-desktop-compat/tests/tool-call-normalization.spec.ts | 1 | static-import | @deepseek-ai/dsh-llm | no | compatibility-patch | no |
| packages/dsh-desktop-compat/tests/tool-call-normalization.spec.ts | 4 | static-import | @deepseek-ai/dsh-llm | yes | compatibility-patch | no |
| packages/dsh-desktop-compat/tests/tool-call-normalization.spec.ts | 5 | static-import | @deepseek-ai/dsh-tools | no | compatibility-patch | no |
| packages/dsh-git-graph/src/client/chips/BranchChip.tsx | 16 | static-import | @deepseek-ai/dsh-client-ui-primitives | no | public-stable | no |
| packages/dsh-git-graph/src/client/chips/BranchChip.tsx | 18 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-git-graph/src/client/chips/BranchPopover.tsx | 8 | static-import | @deepseek-ai/dsh-client-ui-primitives | no | public-stable | no |
| packages/dsh-git-graph/src/client/chips/BranchPopover.tsx | 10 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-git-graph/src/client/chips/Chip.tsx | 6 | static-import | @deepseek-ai/dsh-client-ui-primitives | yes | public-stable | no |
| packages/dsh-git-graph/src/client/chips/CreateBranchDialog.tsx | 8 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-git-graph/src/client/chips/error-copy.ts | 8 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-git-graph/src/client/graph/GraphDialog.tsx | 7 | static-import | @deepseek-ai/dsh-client-ui-primitives | no | public-stable | no |
| packages/dsh-git-graph/src/client/graph/GraphDialog.tsx | 9 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-git-graph/src/client/index.ts | 31 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-git-graph/src/client/index.ts | 32 | static-import | @deepseek-ai/dsh-client-locale/client | yes | public-experimental | no |
| packages/dsh-git-graph/src/client/index.ts | 36 | static-import | @deepseek-ai/dsh-client-ui-conversation/client | yes | public-experimental | no |
| packages/dsh-git-graph/src/client/index.ts | 37 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-git-graph/src/host/git-service.ts | 10 | static-import | @deepseek-ai/dsh-subprocess | yes | public-stable | no |
| packages/dsh-git-graph/src/host/git-service.ts | 14 | static-import | @deepseek-ai/dsh-subprocess | yes | public-stable | no |
| packages/dsh-git-graph/src/host/routes.ts | 9 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-git-graph/src/index.ts | 12 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-git-graph/src/index.ts | 17 | static-import | @deepseek-ai/dsh-subprocess | yes | public-stable | no |
| packages/dsh-git-graph/src/index.ts | 18 | static-import | @deepseek-ai/dsh-workspace | yes | public-stable | no |
| packages/dsh-git-graph/src/invariant.ts | 9 | static-import | @deepseek-ai/dsh-invariants | yes | public-stable | no |
| packages/dsh-git-graph/tests/client.spec.tsx | 11 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-liangshen/src/index.ts | 17 | static-import | @deepseek-ai/dsh-system-prompt | yes | public-stable | no |
| packages/dsh-live-stats/src/client/LiveStatsSettingsCard.tsx | 7 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-live-stats/src/client/LiveStatsSettingsCard.tsx | 8 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-live-stats/src/client/TpsLine.tsx | 1 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-live-stats/src/client/TpsLine.tsx | 3 | static-import | @deepseek-ai/dsh-token-meter/client | yes | public-experimental | no |
| packages/dsh-live-stats/src/client/TpsLine.tsx | 4 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-live-stats/src/client/TpsLine.tsx | 6 | static-import | @deepseek-ai/dsh-client-ui-conversation/client | yes | public-experimental | no |
| packages/dsh-live-stats/src/client/index.ts | 1 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-live-stats/src/client/index.ts | 3 | static-import | @deepseek-ai/dsh-client-locale/client | yes | public-experimental | no |
| packages/dsh-live-stats/src/client/index.ts | 6 | static-import | @deepseek-ai/dsh-client-ui-conversation/client | yes | public-experimental | no |
| packages/dsh-live-stats/src/client/index.ts | 7 | static-import | @deepseek-ai/dsh-client-ui-settings/client | yes | public-experimental | no |
| packages/dsh-live-stats/src/client/index.ts | 8 | static-import | @deepseek-ai/dsh-token-meter/client | yes | public-experimental | no |
| packages/dsh-live-stats/src/client/settings-form.ts | 11 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-live-stats/src/client/settings-form.ts | 12 | static-import | @deepseek-ai/dsh-client-runtime/client | no | public-experimental | no |
| packages/dsh-live-stats/src/estimator.ts | 1 | static-import | @deepseek-ai/dsh-llm | yes | public-stable | no |
| packages/dsh-live-stats/src/estimator.ts | 2 | static-import | @deepseek-ai/dsh-session | yes | public-stable | no |
| packages/dsh-live-stats/src/index.ts | 1 | static-import | @deepseek-ai/dsh-settings | yes | public-stable | no |
| packages/dsh-live-stats/src/index.ts | 3 | static-import | @deepseek-ai/dsh-session-projection | yes | public-stable | no |
| packages/dsh-live-stats/src/invariant.ts | 7 | static-import | @deepseek-ai/dsh-invariants | yes | public-stable | no |
| packages/dsh-live-stats/src/projection.ts | 1 | static-import | @deepseek-ai/dsh-session-projection/types | yes | public-stable | no |
| packages/dsh-live-stats/src/projection.ts | 6 | static-import | @deepseek-ai/dsh-llm | yes | public-stable | no |
| packages/dsh-live-stats/src/projection.ts | 7 | static-import | @deepseek-ai/dsh-session | yes | public-stable | no |
| packages/dsh-live-stats/src/projection.ts | 8 | static-import | @deepseek-ai/dsh-session | no | public-stable | no |
| packages/dsh-live-stats/src/projection.ts | 9 | static-import | @deepseek-ai/dsh-session-projection | yes | public-stable | no |
| packages/dsh-live-stats/src/projection.ts | 10 | static-import | @deepseek-ai/dsh-token-meter/client | yes | public-experimental | no |
| packages/dsh-live-stats/src/projection.ts | 11 | static-import | @deepseek-ai/dsh-token-meter/client | yes | public-experimental | no |
| packages/dsh-live-stats/src/projection.ts | 20 | static-export | @deepseek-ai/dsh-token-meter/client | yes | public-experimental | no |
| packages/dsh-live-stats/tests/estimator.spec.ts | 1 | static-import | @deepseek-ai/dsh-llm | no | public-stable | no |
| packages/dsh-live-stats/tests/projection.spec.ts | 1 | static-import | @deepseek-ai/dsh-llm | no | public-stable | no |
| packages/dsh-live-stats/tests/projection.spec.ts | 6 | static-import | @deepseek-ai/dsh-llm | yes | public-stable | no |
| packages/dsh-live-stats/tests/projection.spec.ts | 7 | static-import | @deepseek-ai/dsh-session | no | public-stable | no |
| packages/dsh-live-stats/tests/projection.spec.ts | 8 | static-import | @deepseek-ai/dsh-session | yes | public-stable | no |
| packages/dsh-live-stats/tests/projection.spec.ts | 9 | static-import | @deepseek-ai/dsh-session-projection | no | public-stable | no |
| packages/dsh-live-stats/tests/tps-line.spec.tsx | 3 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-mode-switcher/src/client/index.ts | 1 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-mode-switcher/src/client/index.ts | 2 | static-import | @deepseek-ai/dsh-client-locale/client | yes | public-experimental | no |
| packages/dsh-mode-switcher/src/client/index.ts | 3 | static-import | @deepseek-ai/dsh-client-ui-conversation/client | yes | public-experimental | no |
| packages/dsh-mode-switcher/src/client/index.ts | 4 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-particle-theme/src/client/ParticleThemeSettingsCard.tsx | 1 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-particle-theme/src/client/ParticleThemeSettingsCard.tsx | 2 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-particle-theme/src/client/controller.ts | 1 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-particle-theme/src/client/index.ts | 1 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-particle-theme/src/client/index.ts | 2 | static-import | @deepseek-ai/dsh-client-locale/client | yes | public-experimental | no |
| packages/dsh-particle-theme/src/client/index.ts | 3 | static-import | @deepseek-ai/dsh-client-ui-conversation/client | yes | public-experimental | no |
| packages/dsh-particle-theme/src/client/index.ts | 4 | static-import | @deepseek-ai/dsh-client-ui-settings/client | yes | public-experimental | no |
| packages/dsh-particle-theme/src/client/index.ts | 5 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-particle-theme/src/client/settings-form.ts | 11 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-particle-theme/src/client/settings-form.ts | 12 | static-import | @deepseek-ai/dsh-client-runtime/client | no | public-experimental | no |
| packages/dsh-particle-theme/src/index.ts | 1 | static-import | @deepseek-ai/dsh-settings | yes | public-stable | no |
| packages/dsh-particle-theme/tests/controller.spec.ts | 1 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-particle-theme/tests/settings-card.spec.ts | 1 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-pet/src/client/PetDockEntry.tsx | 12 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-pet/src/client/PetSettingsCard.tsx | 7 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-pet/src/client/PetSettingsCard.tsx | 8 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-pet/src/client/WhalePet.tsx | 10 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-pet/src/client/index.ts | 13 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-pet/src/client/index.ts | 15 | static-import | @deepseek-ai/dsh-client-locale/client | yes | public-experimental | no |
| packages/dsh-pet/src/client/index.ts | 17 | static-import | @deepseek-ai/dsh-client-ui-settings/client | yes | public-experimental | no |
| packages/dsh-pet/src/client/index.ts | 18 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-pet/src/client/index.ts | 19 | static-import | @deepseek-ai/dsh-client-ui-conversation/client | yes | public-experimental | no |
| packages/dsh-pet/src/client/pet-store.ts | 9 | static-import | @deepseek-ai/dsh-client-runtime/client | no | public-experimental | no |
| packages/dsh-pet/src/client/pet-store.ts | 10 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-pet/src/client/settings-form.ts | 11 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-pet/src/client/settings-form.ts | 12 | static-import | @deepseek-ai/dsh-client-runtime/client | no | public-experimental | no |
| packages/dsh-pet/src/event-projection.ts | 9 | static-import | @deepseek-ai/dsh-session | yes | public-stable | no |
| packages/dsh-pet/src/index.ts | 10 | static-import | @deepseek-ai/dsh-settings | no | public-stable | no |
| packages/dsh-pet/src/index.ts | 12 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-pet/src/routes.ts | 10 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-pet/src/service.ts | 11 | static-import | @deepseek-ai/dsh-session | yes | public-stable | no |
| packages/dsh-pet/tests/service-enabled.spec.ts | 1 | static-import | @deepseek-ai/dsh-session | yes | public-stable | no |
| packages/dsh-remote-web-ui/src/client/FooterRemoteEntry.tsx | 11 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-remote-web-ui/src/client/PairFailedNotice.tsx | 7 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-remote-web-ui/src/client/RemoteEntry.tsx | 10 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-remote-web-ui/src/client/RemotePanel.tsx | 7 | static-import | @deepseek-ai/dsh-client-ui-primitives | no | public-stable | no |
| packages/dsh-remote-web-ui/src/client/RemotePanel.tsx | 12 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-remote-web-ui/src/client/RemoteSettingsCard.tsx | 7 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-remote-web-ui/src/client/RemoteSettingsCard.tsx | 8 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/client/UpdateEntry.tsx | 8 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-remote-web-ui/src/client/UpdateEntry.tsx | 11 | static-import | @deepseek-ai/dsh-client-ui-primitives | no | public-stable | no |
| packages/dsh-remote-web-ui/src/client/UpdatePanel.tsx | 7 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-remote-web-ui/src/client/UpdatePanel.tsx | 8 | static-import | @deepseek-ai/dsh-client-ui-primitives | no | public-stable | no |
| packages/dsh-remote-web-ui/src/client/deep-link.ts | 13 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/client/index.ts | 9 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/client/index.ts | 14 | static-import | @deepseek-ai/dsh-client-locale/client | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/client/index.ts | 17 | static-import | @deepseek-ai/dsh-client-ui-settings/client | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/client/index.ts | 18 | static-import | @deepseek-ai/dsh-client-ui-sidebar/client | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/client/index.ts | 19 | static-import | @deepseek-ai/dsh-client-connection/client | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/client/settings-form.ts | 11 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/client/settings-form.ts | 12 | static-import | @deepseek-ai/dsh-client-runtime/client | no | public-experimental | no |
| packages/dsh-remote-web-ui/src/index.ts | 11 | static-import | @deepseek-ai/dsh-settings | yes | public-stable | no |
| packages/dsh-remote-web-ui/src/index.ts | 16 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-remote-web-ui/src/invariant.ts | 7 | static-import | @deepseek-ai/dsh-invariants | yes | public-stable | no |
| packages/dsh-remote-web-ui/src/mobile-api.ts | 22 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-remote-web-ui/src/mobile-api.ts | 24 | static-import | @deepseek-ai/dsh-host-apiproxy | yes | public-stable | no |
| packages/dsh-remote-web-ui/src/mobile-api.ts | 25 | static-import | @deepseek-ai/dsh-host-apiproxy/api/rpc | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/mobile-api.ts | 26 | static-import | @deepseek-ai/dsh-host-apiproxy/api/rpc | no | public-experimental | no |
| packages/dsh-remote-web-ui/src/mobile-routes.ts | 11 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-remote-web-ui/src/mobile/api.ts | 8 | static-import | @deepseek-ai/dsh-host-apiproxy/api/workspace | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/mobile/api.ts | 9 | static-import | @deepseek-ai/dsh-host-apiproxy/api/sessions | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/mobile/api.ts | 29 | dynamic-import | @deepseek-ai/dsh-host-apiproxy/api/sessions | no | public-experimental | no |
| packages/dsh-remote-web-ui/src/mobile/mux.ts | 27 | static-import | @deepseek-ai/dsh-host-apiproxy/api/events | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/mobile/mux.ts | 28 | static-import | @deepseek-ai/dsh-host-apiproxy/api/events.schema | no | public-experimental | no |
| packages/dsh-remote-web-ui/src/mobile/mux.ts | 29 | static-import | @deepseek-ai/dsh-host-apiproxy/api/rpc.schema | no | public-experimental | no |
| packages/dsh-remote-web-ui/src/mobile/views/App.tsx | 8 | static-import | @deepseek-ai/dsh-host-apiproxy/api/workspace | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/mobile/views/ChatView.test.tsx | 3 | static-import | @deepseek-ai/dsh-host-apiproxy/api/sessions | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/mobile/views/ChatView.tsx | 14 | static-import | @deepseek-ai/dsh-host-apiproxy/api/events | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/mobile/views/ChatView.tsx | 16 | static-import | @deepseek-ai/dsh-host-apiproxy/api/sessions | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/mobile/views/SessionListView.test.tsx | 3 | static-import | @deepseek-ai/dsh-host-apiproxy/api/workspace | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/mobile/views/SessionListView.tsx | 14 | static-import | @deepseek-ai/dsh-host-apiproxy/api/workspace | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/mobile/views/SessionListView.tsx | 16 | static-import | @deepseek-ai/dsh-host-apiproxy/api/sessions | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/mobile/views/WorkspaceView.test.tsx | 3 | static-import | @deepseek-ai/dsh-host-apiproxy/api/workspace | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/mobile/views/WorkspaceView.tsx | 8 | static-import | @deepseek-ai/dsh-host-apiproxy/api/workspace | yes | public-experimental | no |
| packages/dsh-remote-web-ui/src/routes.ts | 11 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-remote-web-ui/src/update-routes.ts | 8 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-remote-web-ui/tests/mobile-api.spec.ts | 7 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-remote-web-ui/tests/mobile-api.spec.ts | 11 | static-import | @deepseek-ai/dsh-host-apiproxy | yes | public-stable | no |
| packages/dsh-remote-web-ui/tests/mobile-routes.spec.ts | 2 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-remote-web-ui/tests/routes.spec.ts | 2 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-ssh/src/client/index.ts | 13 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-ssh/src/client/index.ts | 15 | static-import | @deepseek-ai/dsh-client-locale/client | yes | public-experimental | no |
| packages/dsh-ssh/src/client/index.ts | 17 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-ssh/src/index.ts | 11 | static-import | @deepseek-ai/dsh-settings | yes | public-stable | no |
| packages/dsh-ssh/src/index.ts | 13 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-ssh/src/index.ts | 15 | static-import | @deepseek-ai/dsh-system-prompt | yes | public-stable | no |
| packages/dsh-ssh/src/index.ts | 16 | static-import | @deepseek-ai/dsh-tools | yes | public-stable | no |
| packages/dsh-ssh/src/routes.ts | 10 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-ssh/src/tools.ts | 7 | static-import | @deepseek-ai/dsh-tools | no | public-stable | no |
| packages/dsh-ssh/src/tools.ts | 8 | static-import | @deepseek-ai/dsh-llm | yes | public-stable | no |
| packages/dsh-ssh/tests/tools.test.ts | 7 | static-import | @deepseek-ai/dsh-llm | yes | public-stable | no |
| packages/dsh-ssh/tests/tools.test.ts | 9 | static-import | @deepseek-ai/dsh-tools | yes | public-stable | no |
| packages/dsh-task-board/src/client/TaskBoardSettingsCard.tsx | 8 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-task-board/src/client/TaskBoardSettingsCard.tsx | 9 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-task-board/src/client/index.ts | 11 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-task-board/src/client/index.ts | 12 | static-import | @deepseek-ai/dsh-client-connection/client | yes | public-experimental | no |
| packages/dsh-task-board/src/client/index.ts | 13 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-task-board/src/client/index.ts | 16 | static-import | @deepseek-ai/dsh-client-locale/client | yes | public-experimental | no |
| packages/dsh-task-board/src/client/index.ts | 18 | static-import | @deepseek-ai/dsh-client-ui-settings/client | yes | public-experimental | no |
| packages/dsh-task-board/src/client/settings-form.ts | 11 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-task-board/src/client/settings-form.ts | 12 | static-import | @deepseek-ai/dsh-client-runtime/client | no | public-experimental | no |
| packages/dsh-task-board/src/host/routes.ts | 2 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-task-board/src/host/v3-routes.ts | 3 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-task-board/src/index.ts | 13 | static-import | @deepseek-ai/dsh-settings | yes | public-stable | no |
| packages/dsh-task-board/src/index.ts | 18 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-task-board/src/index.ts | 20 | static-import | @deepseek-ai/dsh-system-prompt | yes | public-stable | no |
| packages/dsh-tool-describe-image/src/attach-routes.ts | 16 | static-import | @deepseek-ai/dsh-attachment | yes | public-stable | no |
| packages/dsh-tool-describe-image/src/client/DescribeImageSettingsCard.tsx | 11 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-tool-describe-image/src/client/DescribeImageSettingsCard.tsx | 12 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-tool-describe-image/src/client/index.ts | 15 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-tool-describe-image/src/client/index.ts | 16 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-tool-describe-image/src/client/index.ts | 17 | static-import | @deepseek-ai/dsh-client-ui-conversation/client | yes | public-experimental | no |
| packages/dsh-tool-describe-image/src/client/index.ts | 18 | static-import | @deepseek-ai/dsh-client-ui-settings/client | yes | public-experimental | no |
| packages/dsh-tool-describe-image/src/client/index.ts | 19 | static-import | @deepseek-ai/dsh-client-locale/client | yes | public-experimental | no |
| packages/dsh-tool-describe-image/src/client/settings-form.ts | 11 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-tool-describe-image/src/client/settings-form.ts | 12 | static-import | @deepseek-ai/dsh-client-runtime/client | no | public-experimental | no |
| packages/dsh-tool-describe-image/src/config-resolve.ts | 10 | static-import | @deepseek-ai/dsh-credentials | yes | public-stable | no |
| packages/dsh-tool-describe-image/src/config-resolve.ts | 13 | static-import | @deepseek-ai/dsh-credentials | yes | public-stable | no |
| packages/dsh-tool-describe-image/src/config-resolve.ts | 14 | static-import | @deepseek-ai/dsh-launch-environment | no | public-stable | no |
| packages/dsh-tool-describe-image/src/config-resolve.ts | 15 | static-import | @deepseek-ai/dsh-settings | no | public-stable | no |
| packages/dsh-tool-describe-image/src/index.ts | 17 | static-import | @deepseek-ai/dsh-settings | yes | public-stable | no |
| packages/dsh-tool-describe-image/src/index.ts | 19 | static-import | @deepseek-ai/dsh-tools | no | public-stable | no |
| packages/dsh-tool-describe-image/src/index.ts | 20 | static-import | @deepseek-ai/dsh-tools | yes | public-stable | no |
| packages/dsh-tool-describe-image/src/vision-client.ts | 11 | static-import | @deepseek-ai/dsh-attachment | yes | public-stable | no |
| packages/dsh-tool-describe-image/tests/attach-routes.spec.ts | 8 | static-import | @deepseek-ai/dsh-attachment | yes | public-stable | no |
| packages/dsh-tool-describe-image/tests/attach-routes.spec.ts | 11 | static-import | @deepseek-ai/dsh-attachment | yes | public-stable | no |
| packages/dsh-tool-describe-image/tests/loader-composition.spec.ts | 5 | static-import | @deepseek-ai/dsh-llm | no | public-stable | no |
| packages/dsh-tool-describe-image/tests/loader-composition.spec.ts | 14 | static-import | @deepseek-ai/dsh-agent | no | public-stable | no |
| packages/dsh-tool-describe-image/tests/loader-composition.spec.ts | 15 | static-import | @deepseek-ai/dsh-system-prompt | no | public-stable | no |
| packages/dsh-tool-describe-image/tests/loader-composition.spec.ts | 16 | static-import | @deepseek-ai/dsh-tools | no | public-stable | no |
| packages/dsh-tool-describe-image/tests/settings.spec.ts | 3 | static-import | @deepseek-ai/dsh-llm | yes | public-stable | no |
| packages/dsh-tool-describe-image/tests/settings.spec.ts | 10 | static-import | @deepseek-ai/dsh-settings | no | public-stable | no |
| packages/dsh-tool-describe-image/tests/settings.spec.ts | 11 | static-import | @deepseek-ai/dsh-settings | yes | public-stable | no |
| packages/dsh-tool-describe-image/tests/settings.spec.ts | 12 | static-import | @deepseek-ai/dsh-system-prompt | no | public-stable | no |
| packages/dsh-tool-describe-image/tests/settings.spec.ts | 13 | static-import | @deepseek-ai/dsh-tools | no | public-stable | no |
| packages/dsh-tool-describe-image/tests/tool.spec.ts | 1 | static-import | @deepseek-ai/dsh-llm | no | public-stable | no |
| packages/dsh-tool-describe-image/tests/tool.spec.ts | 7 | static-import | @deepseek-ai/dsh-attachment | no | public-stable | no |
| packages/dsh-tool-describe-image/tests/tool.spec.ts | 8 | static-import | @deepseek-ai/dsh-attachment | yes | public-stable | no |
| packages/dsh-tool-describe-image/tests/tool.spec.ts | 9 | static-import | @deepseek-ai/dsh-credentials | no | public-stable | no |
| packages/dsh-tool-describe-image/tests/tool.spec.ts | 10 | static-import | @deepseek-ai/dsh-credentials | yes | public-stable | no |
| packages/dsh-tool-describe-image/tests/tool.spec.ts | 11 | static-import | @deepseek-ai/dsh-system-prompt | no | public-stable | no |
| packages/dsh-tool-describe-image/tests/tool.spec.ts | 12 | static-import | @deepseek-ai/dsh-tools | no | public-stable | no |
| packages/dsh-tool-describe-image/tests/vision-cache.spec.ts | 3 | static-import | @deepseek-ai/dsh-llm | no | public-stable | no |
| packages/dsh-tool-describe-image/tests/vision-cache.spec.ts | 9 | static-import | @deepseek-ai/dsh-system-prompt | no | public-stable | no |
| packages/dsh-tool-describe-image/tests/vision-cache.spec.ts | 10 | static-import | @deepseek-ai/dsh-tools | no | public-stable | no |
| packages/dsh-web-ui-settings/src/bridge.ts | 15 | static-import | @deepseek-ai/dsh-settings | yes | public-stable | no |
| packages/dsh-web-ui-settings/src/bridge.ts | 18 | static-import | @deepseek-ai/dsh-settings | no | public-stable | no |
| packages/dsh-web-ui-settings/src/bridge.ts | 19 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-web-ui-settings/src/client/WebUIPluginsCard.tsx | 7 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-web-ui-settings/src/client/compat-settings-scope.ts | 17 | static-import | @deepseek-ai/dsh-client-ui-settings/client | yes | public-experimental | no |
| packages/dsh-web-ui-settings/src/client/compat-settings-scope.ts | 21 | static-import | @deepseek-ai/dsh-api-remotes/client | yes | public-experimental | no |
| packages/dsh-web-ui-settings/src/client/compat-settings-scope.ts | 22 | static-import | @deepseek-ai/dsh-client-connection/client | yes | public-experimental | no |
| packages/dsh-web-ui-settings/src/client/compat-settings-scope.ts | 23 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-web-ui-settings/src/client/compat-settings-scope.ts | 24 | static-import | @deepseek-ai/dsh-client-runtime/client | no | public-experimental | no |
| packages/dsh-web-ui-settings/src/client/index.ts | 8 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-web-ui-settings/src/client/index.ts | 10 | static-import | @deepseek-ai/dsh-client-locale/client | yes | public-experimental | no |
| packages/dsh-web-ui-settings/src/client/index.ts | 13 | static-import | @deepseek-ai/dsh-client-ui-settings/client | yes | public-experimental | no |
| packages/dsh-web-ui-settings/src/index.ts | 13 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-web-ui-settings/src/index.ts | 18 | static-import | @deepseek-ai/dsh-settings | yes | public-stable | no |
| packages/dsh-web-ui-settings/tests/bridge.spec.ts | 7 | static-import | @deepseek-ai/dsh-settings | yes | public-stable | no |
| packages/dsh-web-ui-settings/tests/bridge.spec.ts | 10 | static-import | @deepseek-ai/dsh-settings | yes | public-stable | no |
| packages/dsh-web-ui-settings/tests/compat-scope.spec.ts | 10 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-web-ui-settings/tests/compat-scope.spec.ts | 12 | static-import | @deepseek-ai/dsh-client-runtime/client | no | public-experimental | no |
| packages/skins/skin-center/src/client/SkinCenter.tsx | 11 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/skins/skin-center/src/client/SkinCenter.tsx | 13 | static-import | @deepseek-ai/dsh-client-ui-theme/client | yes | public-experimental | no |
| packages/skins/skin-center/src/client/background.ts | 16 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/skins/skin-center/src/client/index.ts | 10 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/skins/skin-center/src/client/index.ts | 11 | static-import | @deepseek-ai/dsh-client-ui-theme/client | yes | public-experimental | no |
| packages/skins/skin-center/src/client/index.ts | 13 | static-import | @deepseek-ai/dsh-client-locale/client | yes | public-experimental | no |
| packages/skins/skin-center/src/client/index.ts | 15 | static-import | @deepseek-ai/dsh-client-ui-settings/client | yes | public-experimental | no |
| packages/skins/skin-center/src/index.ts | 11 | static-import | @deepseek-ai/dsh-settings | no | public-stable | no |
| packages/skins/skin-center/src/index.ts | 13 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/skins/skin-center/src/routes.ts | 21 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/skins/skin-center/tests/routes.spec.ts | 7 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/skins/ths/src/client/index.ts | 12 | static-import | @deepseek-ai/dsh-client-connection/client | yes | public-experimental | no |
| packages/skins/trading/src/client/index.ts | 22 | static-import | @deepseek-ai/dsh-client-connection/client | yes | public-experimental | no |
| packages/skins/trading/src/client/quotes.ts | 22 | static-import | @deepseek-ai/dsh-client-connection/client | yes | public-experimental | no |
| shared/client/settings/settings-form.ts | 10 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| shared/client/settings/settings-form.ts | 11 | static-import | @deepseek-ai/dsh-client-runtime/client | no | public-experimental | no |
| shared/tests/settings-form.spec.ts | 1 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |

## Slot, Host service, Profile/Home, Workspace, Session, and Runtime lifecycle seams

| Category | File | Line | Operation or identity |
| --- | --- | ---: | --- |
| host-service | apps/dsh-desktop/src/runtime-provider.mjs | 220 | host-service.register |
| host-service | apps/dsh-desktop/test/runtime-provider.test.mjs | 152 | task-board |
| host-service | packages/dsh-aionui-panel/src/client/index.ts | 37 | locale |
| host-service | packages/dsh-aionui-panel/src/index.ts | 28 | subprocess |
| host-service | packages/dsh-desktop-compat/src/index.ts | 18 | tools |
| host-service | packages/dsh-git-graph/src/client/index.ts | 81 | locale |
| host-service | packages/dsh-git-graph/src/index.ts | 27 | subprocess |
| host-service | packages/dsh-git-graph/src/invariant.ts | 17 | invariants |
| host-service | packages/dsh-liangshen/presets/liangshen/tool-bootstrap.mjs | 33 | tools |
| host-service | packages/dsh-live-stats/src/client/index.ts | 58 | remote |
| host-service | packages/dsh-live-stats/src/invariant.ts | 15 | invariants |
| host-service | packages/dsh-mode-switcher/src/client/index.ts | 8 | connection |
| host-service | packages/dsh-particle-theme/src/client/index.ts | 29 | object |
| host-service | packages/dsh-pet/src/client/index.ts | 70 | remote |
| host-service | packages/dsh-remote-web-ui/src/client/index.ts | 93 | remote |
| host-service | packages/dsh-remote-web-ui/src/invariant.ts | 15 | invariants |
| host-service | packages/dsh-ssh/src/client/index.ts | 35 | locale |
| host-service | packages/dsh-ssh/src/index.ts | 26 | tools |
| host-service | packages/dsh-task-board/src/client/index.ts | 79 | remote |
| host-service | packages/dsh-tool-describe-image/src/client/index.ts | 61 | locale |
| host-service | packages/dsh-tool-describe-image/src/index.ts | 27 | tools |
| host-service | packages/dsh-web-ui-settings/src/client/index.ts | 43 | web-ui-plugins |
| host-service | packages/skins/skin-center/src/client/index.ts | 63 | remote |
| profile-home | apps/dsh-desktop/scripts/capture-startup.mjs | 39 | DSH_HOME |
| profile-home | apps/dsh-desktop/scripts/measure-profile.mjs | 6 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/scripts/measure-profile.mjs | 6 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/scripts/measure-profile.mjs | 35 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/scripts/measure-profile.mjs | 38 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/scripts/measure-profile.mjs | 43 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/scripts/measure-profile.mjs | 44 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/scripts/measure-profile.mjs | 50 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/scripts/measure-startup-fps.mjs | 23 | DSH_HOME |
| profile-home | apps/dsh-desktop/scripts/packaged-smoke-runner.mjs | 47 | DSH_HOME |
| profile-home | apps/dsh-desktop/scripts/preset-deep-link-runner.mjs | 61 | DSH_HOME |
| profile-home | apps/dsh-desktop/scripts/verify-conversation-skills.mjs | 27 | DSH_HOME |
| profile-home | apps/dsh-desktop/scripts/verify-directory-picker.mjs | 38 | DSH_HOME |
| profile-home | apps/dsh-desktop/scripts/verify-particle-theme.mjs | 25 | DSH_HOME |
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 29 | DSH_HOME |
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 55 | profileDir |
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 56 | profileDir |
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 57 | profileDir |
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 63 | profileDir |
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 88 | profileDir |
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 94 | profileDir |
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 123 | profileDir |
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 175 | profileDir |
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 181 | profileDir |
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 185 | profileDir |
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 228 | profileDir |
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
| profile-home | apps/dsh-desktop/scripts/verify-window-chrome.mjs | 29 | DSH_HOME |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 57 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 58 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 59 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 94 | runtimeHome |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 95 | DSH_HOME |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 204 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 485 | runtimeHome |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 490 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 494 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 515 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 518 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 518 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 523 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 533 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 533 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 551 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 551 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 572 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 572 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 577 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 577 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 592 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 592 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 630 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 636 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 696 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 696 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 825 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugin-compatibility.mjs | 92 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugin-compatibility.mjs | 94 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugin-compatibility.mjs | 94 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugin-compatibility.mjs | 95 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugin-compatibility.mjs | 99 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugin-compatibility.mjs | 99 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugin-compatibility.mjs | 99 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 197 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 198 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 210 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 213 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 225 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 226 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 266 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 267 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 270 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 272 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 273 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 282 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 285 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 305 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 313 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 313 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 345 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 359 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 360 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 365 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 378 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 399 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 401 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 415 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 431 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 435 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 481 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 481 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 563 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 563 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 597 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 598 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 604 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 604 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 629 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 630 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 634 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 634 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 638 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 649 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 653 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 710 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 711 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 715 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 715 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 719 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 725 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 738 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 746 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 798 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 803 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 815 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 825 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 830 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 830 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 836 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 842 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 846 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 853 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 853 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 858 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 870 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 874 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 874 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 878 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 888 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 935 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 942 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 968 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 978 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 1006 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 1029 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 1035 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/qqbot.mjs | 81 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/qqbot.mjs | 82 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/qqbot.mjs | 82 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/qqbot.mjs | 83 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/qqbot.mjs | 85 | profileDir |
| profile-home | apps/dsh-desktop/src/plugin-recovery.mjs | 219 | profileDir |
| profile-home | apps/dsh-desktop/src/plugin-recovery.mjs | 226 | profileDir |
| profile-home | apps/dsh-desktop/src/plugin-recovery.mjs | 226 | profileDir |
| profile-home | apps/dsh-desktop/src/plugin-recovery.mjs | 227 | profileDir |
| profile-home | apps/dsh-desktop/src/plugin-recovery.mjs | 227 | profileDir |
| profile-home | apps/dsh-desktop/src/plugin-recovery.mjs | 372 | profileDir |
| profile-home | apps/dsh-desktop/src/plugin-recovery.mjs | 373 | profileDir |
| profile-home | apps/dsh-desktop/src/plugin-recovery.mjs | 499 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-baseline-quarantine.mjs | 26 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-baseline-quarantine.mjs | 30 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-baseline-quarantine.mjs | 36 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-baseline-quarantine.mjs | 48 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-baseline-quarantine.mjs | 142 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-baseline-quarantine.mjs | 143 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-baseline-quarantine.mjs | 144 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-baseline-quarantine.mjs | 147 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-baseline-quarantine.mjs | 147 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-baseline-quarantine.mjs | 152 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-baseline-quarantine.mjs | 164 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-baseline-quarantine.mjs | 164 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-baseline-quarantine.mjs | 228 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-baseline-quarantine.mjs | 242 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-baseline-quarantine.mjs | 252 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-baseline-quarantine.mjs | 260 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-baseline-quarantine.mjs | 279 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-baseline-quarantine.mjs | 309 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-baseline-quarantine.mjs | 311 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-migration.mjs | 68 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-migration.mjs | 80 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 627 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 654 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 820 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 825 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 888 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 890 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 915 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/src/profile.mjs | 917 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/src/profile.mjs | 923 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 924 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 925 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 926 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 952 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 953 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 969 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 991 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 1009 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 1021 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 1035 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 1086 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/src/profile.mjs | 1135 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/src/runtime-controller.mjs | 372 | DSH_HOME |
| profile-home | apps/dsh-desktop/src/runtime-controller.mjs | 373 | DSH_PROFILE |
| profile-home | apps/dsh-desktop/src/runtime-provider.mjs | 183 | profileDir |
| profile-home | apps/dsh-desktop/src/runtime-provider.mjs | 187 | profileDir |
| profile-home | apps/dsh-desktop/src/runtime-provider.mjs | 188 | profileDir |
| profile-home | apps/dsh-desktop/src/runtime-provider.mjs | 189 | profileDir |
| profile-home | apps/dsh-desktop/src/runtime-provider.mjs | 190 | profileDir |
| profile-home | apps/dsh-desktop/test/background-scheduler-runtime.test.mjs | 8 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/background-scheduler-runtime.test.mjs | 8 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/test/background-scheduler-runtime.test.mjs | 16 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/background-scheduler-runtime.test.mjs | 18 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/test/background-scheduler-runtime.test.mjs | 61 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/background-scheduler-runtime.test.mjs | 63 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 18 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 105 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 112 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 113 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 115 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 116 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 117 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 123 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 126 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 128 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 139 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 141 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 142 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 151 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 153 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 154 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 160 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 169 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 181 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 183 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 186 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 199 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 202 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 203 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 209 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 211 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 232 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 270 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 274 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 275 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 281 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 282 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 308 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 329 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 339 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 350 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 353 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 354 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 360 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 361 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 368 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 408 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 435 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 439 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 440 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 446 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 447 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 487 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 519 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 523 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 525 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 532 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 534 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 549 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 565 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 568 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 569 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 571 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 582 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 584 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 609 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 653 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 654 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 655 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 657 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 707 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 744 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 748 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 751 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 778 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 780 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 800 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 815 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 819 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 821 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 828 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 849 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 857 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 877 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 893 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 895 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 897 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 899 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 933 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 936 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 942 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 943 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 944 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 955 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 971 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 1016 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 1054 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 1057 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 1059 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 1070 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 1075 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 1122 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 71 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 74 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 83 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 87 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 101 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 154 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 156 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 162 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 166 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 170 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 175 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 178 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 196 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 214 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 224 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 229 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 238 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 245 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 276 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 281 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 283 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 284 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 285 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 317 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 340 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 345 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 347 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 348 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 369 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 383 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 388 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 392 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 399 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 442 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 447 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 450 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 458 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 484 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 489 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 490 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 491 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 509 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 525 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 536 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 568 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 573 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 574 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 575 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 593 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 607 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 618 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 623 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 625 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 626 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 646 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 656 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 661 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 663 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 664 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 683 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 697 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 702 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 706 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 727 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 731 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 735 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 741 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 746 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 751 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 762 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 771 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 778 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 790 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 795 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 797 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 805 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 810 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 814 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 820 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 824 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 829 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 833 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 844 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 851 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 853 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 856 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 863 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 867 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 23 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 28 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 29 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 145 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 147 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 147 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 151 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 161 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 220 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 226 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 228 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 234 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 238 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 241 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 250 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 256 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 258 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 263 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 267 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 270 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 289 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 290 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 291 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 292 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 293 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 294 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 294 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 298 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 300 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 304 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 321 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 325 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 328 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 334 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 344 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 346 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 355 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 367 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 368 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 377 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 383 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 394 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 395 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 400 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 408 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 414 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 424 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 425 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 434 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 446 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 478 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 479 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 483 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 486 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 487 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 489 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 503 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 513 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 529 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 530 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 534 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 536 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 538 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 554 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 556 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 565 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 566 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 569 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 574 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 577 | DSH_HOME |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 584 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 594 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 596 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 607 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 610 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 614 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 617 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 619 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 620 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 621 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 622 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 634 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 642 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 720 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 738 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 751 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 758 | DSH_HOME |
| profile-home | apps/dsh-desktop/test/qqbot.test.mjs | 21 | profileDir |
| profile-home | apps/dsh-desktop/test/qqbot.test.mjs | 22 | profileDir |
| profile-home | apps/dsh-desktop/test/qqbot.test.mjs | 25 | profileDir |
| profile-home | apps/dsh-desktop/test/qqbot.test.mjs | 27 | profileDir |
| profile-home | apps/dsh-desktop/test/qqbot.test.mjs | 32 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-controller.test.mjs | 230 | DSH_PROFILE |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 24 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 25 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 91 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 100 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 108 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 113 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 273 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 275 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 277 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 284 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 287 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 293 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 299 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 299 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 302 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 305 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 314 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 317 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 318 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 324 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 327 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 333 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 334 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 340 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 341 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 367 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 372 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 424 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 427 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 438 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 446 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 454 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 481 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 484 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 491 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 499 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 507 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 538 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 539 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 540 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 542 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 544 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 551 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 556 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 562 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 600 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 602 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 713 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/test/runtime-provider.test.mjs | 47 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-provider.test.mjs | 114 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-provider.test.mjs | 120 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 26 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 27 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 28 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 32 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 67 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 72 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 89 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 90 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 92 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 112 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 138 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 143 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 144 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 146 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 164 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 195 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 207 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 211 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 223 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 257 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 262 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 264 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 272 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 277 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 279 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 284 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 286 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 289 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 301 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 306 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 312 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 313 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 314 | profileDir |
| profile-home | packages/dsh-desktop-compat/src/skin-state.ts | 136 | DSH_HOME |
| profile-home | packages/dsh-desktop-compat/src/skin-state.ts | 136 | DSH_PROFILE |
| profile-home | packages/dsh-desktop-compat/src/skin-state.ts | 141 | profileDir |
| profile-home | packages/dsh-desktop-compat/src/skin-state.ts | 142 | profileDir |
| profile-home | packages/dsh-desktop-compat/src/skin-state.ts | 146 | profileDir |
| profile-home | packages/dsh-desktop-compat/src/skin-state.ts | 166 | profileDir |
| profile-home | packages/dsh-desktop-compat/tests/skin-state.spec.ts | 20 | profileDir |
| profile-home | packages/dsh-desktop-compat/tests/skin-state.spec.ts | 21 | profileDir |
| profile-home | packages/dsh-desktop-compat/tests/skin-state.spec.ts | 22 | profileDir |
| profile-home | packages/dsh-desktop-compat/tests/skin-state.spec.ts | 27 | profileDir |
| profile-home | packages/dsh-desktop-compat/tests/skin-state.spec.ts | 33 | profileDir |
| profile-home | packages/dsh-git-graph/src/host/worktree-service.ts | 214 | DSH_HOME |
| profile-home | packages/dsh-git-graph/src/index.ts | 82 | DSH_HOME |
| profile-home | packages/dsh-liangshen/src/dsh-home.ts | 3 | DSH_HOME |
| profile-home | packages/dsh-liangshen/src/dsh-home.ts | 20 | DSH_HOME |
| profile-home | packages/dsh-liangshen/src/dsh-home.ts | 25 | DSH_HOME |
| profile-home | packages/dsh-liangshen/src/index.test.ts | 7 | DSH_HOME |
| profile-home | packages/dsh-liangshen/src/index.test.ts | 27 | DSH_HOME |
| profile-home | packages/dsh-liangshen/src/index.test.ts | 33 | DSH_HOME |
| profile-home | packages/dsh-liangshen/src/index.test.ts | 36 | DSH_HOME |
| profile-home | packages/dsh-liangshen/src/index.test.ts | 42 | DSH_HOME |
| profile-home | packages/dsh-liangshen/src/index.test.ts | 48 | DSH_HOME |
| profile-home | packages/dsh-liangshen/src/index.test.ts | 51 | DSH_HOME |
| profile-home | packages/dsh-liangshen/src/index.test.ts | 57 | DSH_HOME |
| profile-home | packages/dsh-liangshen/src/index.test.ts | 63 | DSH_HOME |
| profile-home | packages/dsh-liangshen/src/index.ts | 53 | DSH_HOME |
| profile-home | packages/dsh-liangshen/src/index.ts | 56 | DSH_HOME |
| profile-home | packages/dsh-pet/src/dsh-home.test.ts | 7 | DSH_HOME |
| profile-home | packages/dsh-pet/src/dsh-home.test.ts | 12 | DSH_HOME |
| profile-home | packages/dsh-pet/src/dsh-home.test.ts | 14 | DSH_HOME |
| profile-home | packages/dsh-pet/src/dsh-home.test.ts | 19 | DSH_HOME |
| profile-home | packages/dsh-pet/src/dsh-home.test.ts | 23 | DSH_HOME |
| profile-home | packages/dsh-pet/src/dsh-home.test.ts | 25 | DSH_HOME |
| profile-home | packages/dsh-pet/src/dsh-home.test.ts | 31 | DSH_HOME |
| profile-home | packages/dsh-pet/src/dsh-home.ts | 3 | DSH_HOME |
| profile-home | packages/dsh-pet/src/dsh-home.ts | 20 | DSH_HOME |
| profile-home | packages/dsh-pet/src/dsh-home.ts | 25 | DSH_HOME |
| profile-home | packages/dsh-pet/src/persist.ts | 3 | DSH_HOME |
| profile-home | packages/dsh-pet/src/persist.ts | 64 | DSH_HOME |
| profile-home | packages/dsh-pet/src/persist.ts | 65 | DSH_HOME |
| profile-home | packages/dsh-pet/src/service.ts | 50 | DSH_HOME |
| profile-home | packages/dsh-remote-web-ui/src/index.ts | 275 | profileDir |
| profile-home | packages/dsh-remote-web-ui/src/index.ts | 275 | profileDir |
| profile-home | packages/dsh-remote-web-ui/src/update.ts | 209 | profileDir |
| profile-home | packages/dsh-remote-web-ui/src/update.ts | 237 | profileDir |
| profile-home | packages/dsh-remote-web-ui/src/update.ts | 379 | profileDir |
| profile-home | packages/dsh-remote-web-ui/src/update.ts | 416 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 46 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 47 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 52 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 58 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 194 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 195 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 199 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 237 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 243 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 244 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 248 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 302 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 312 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 324 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 338 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 354 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 369 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 389 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 401 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 410 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 425 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 439 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 457 | profileDir |
| profile-home | packages/dsh-remote-web-ui/tests/update.spec.ts | 475 | profileDir |
| profile-home | packages/dsh-task-board/src/index.ts | 75 | DSH_PROFILE |
| profile-home | packages/dsh-task-board/src/index.ts | 82 | DSH_PROFILE |
| profile-home | packages/dsh-task-board/src/index.ts | 97 | DSH_PROFILE |
| profile-home | packages/dsh-task-board/src/index.ts | 98 | DSH_HOME |
| profile-home | packages/skins/skin-center/src/skin-switch.ts | 580 | DSH_HOME |
| profile-home | packages/skins/skin-center/src/skin-switch.ts | 589 | DSH_HOME |
| profile-home | packages/skins/skin-center/src/skin-switch.ts | 597 | DSH_PROFILE |
| profile-home | packages/skins/skin-center/src/skin-switch.ts | 616 | DSH_PROFILE |
| profile-home | packages/skins/skin-center/src/skin-switch.ts | 639 | DSH_HOME |
| profile-home | packages/skins/skin-center/src/skin-switch.ts | 645 | profileDir |
| profile-home | packages/skins/skin-center/src/skin-switch.ts | 647 | profileDir |
| profile-home | packages/skins/skin-center/src/skin-switch.ts | 649 | profileDir |
| profile-home | packages/skins/skin-center/src/skin-switch.ts | 650 | profileDir |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 290 | DSH_HOME |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 291 | DSH_HOME |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 294 | DSH_HOME |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 306 | DSH_HOME |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 308 | DSH_HOME |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 312 | DSH_HOME |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 317 | DSH_HOME |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 321 | DSH_HOME |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 334 | DSH_HOME |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 347 | DSH_PROFILE |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 352 | DSH_PROFILE |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 356 | DSH_PROFILE |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 376 | DSH_PROFILE |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 386 | DSH_PROFILE |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 386 | DSH_HOME |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 391 | DSH_PROFILE |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 409 | profileDir |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 410 | profileDir |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 412 | profileDir |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 414 | DSH_PROFILE |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 414 | DSH_HOME |
| profile-home | packages/skins/skin-center/tests/skin-switch.spec.ts | 416 | profileDir |
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
| profile-home | shared/host/dsh-home.ts | 2 | DSH_HOME |
| profile-home | shared/host/dsh-home.ts | 19 | DSH_HOME |
| profile-home | shared/host/dsh-home.ts | 24 | DSH_HOME |
| profile-home | shared/tests/dsh-home.spec.ts | 19 | DSH_HOME |
| profile-home | shared/tests/dsh-home.spec.ts | 20 | DSH_HOME |
| profile-home | shared/tests/dsh-home.spec.ts | 21 | DSH_HOME |
| profile-home | shared/tests/dsh-home.spec.ts | 25 | DSH_HOME |
| runtime-lifecycle | apps/dsh-desktop/src/electron-app.mjs | 475 | recover |
| runtime-lifecycle | apps/dsh-desktop/src/electron-app.mjs | 698 | recover |
| runtime-lifecycle | apps/dsh-desktop/src/electron-app.mjs | 1164 | start |
| runtime-lifecycle | apps/dsh-desktop/src/electron-app.mjs | 1180 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/electron-app.mjs | 1182 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 130 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 142 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 149 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 177 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 182 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 189 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 217 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 224 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 233 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 277 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 284 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 311 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 442 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 444 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 496 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 503 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 523 | start |
| runtime-lifecycle | apps/dsh-desktop/src/ipc.mjs | 213 | restart |
| runtime-lifecycle | apps/dsh-desktop/src/ipc.mjs | 215 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/ipc.mjs | 217 | start |
| runtime-lifecycle | apps/dsh-desktop/src/menu.mjs | 57 | restart |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 866 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 874 | start |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 973 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 984 | start |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 993 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 1006 | start |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 1028 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 1033 | start |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 1043 | start |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 1056 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 1065 | start |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 1079 | start |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 1100 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 1106 | start |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 1116 | start |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 1126 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 1132 | start |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 1137 | start |
| runtime-lifecycle | apps/dsh-desktop/src/runtime-provider.mjs | 158 | start |
| runtime-lifecycle | apps/dsh-desktop/src/runtime-provider.mjs | 162 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/runtime-provider.mjs | 167 | restart |
| runtime-lifecycle | apps/dsh-desktop/src/runtime-provider.mjs | 168 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/runtime-provider.mjs | 169 | start |
| runtime-lifecycle | apps/dsh-desktop/test/background-scheduler-runtime.test.mjs | 25 | start |
| runtime-lifecycle | apps/dsh-desktop/test/background-scheduler-runtime.test.mjs | 69 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 224 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 246 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 271 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 313 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 319 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 321 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 329 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 346 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 384 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 432 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 465 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 473 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 494 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 504 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 523 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 545 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 571 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 575 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 576 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 588 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 618 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 623 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 624 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 666 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 672 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 673 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 674 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 690 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 720 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 758 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-integration.test.mjs | 568 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-integration.test.mjs | 608 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-integration.test.mjs | 711 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-integration.test.mjs | 720 | start |
| runtime-lifecycle | apps/dsh-desktop/test/updater.test.mjs | 68 | start |
| runtime-lifecycle | packages/dsh-particle-theme/src/client/index.ts | 70 | start |
| runtime-lifecycle | packages/dsh-particle-theme/tests/controller.spec.ts | 35 | start |
| runtime-lifecycle | packages/dsh-task-board/src/client/index.ts | 179 | start |
| runtime-lifecycle | packages/dsh-task-board/tests/controller-use-cases.spec.ts | 170 | start |
| runtime-lifecycle | packages/dsh-task-board/tests/controller.spec.ts | 66 | start |
| runtime-lifecycle | packages/dsh-task-board/tests/controller.spec.ts | 249 | start |
| runtime-lifecycle | packages/dsh-task-board/tests/controller.spec.ts | 347 | start |
| runtime-lifecycle | packages/dsh-task-board/tests/controller.spec.ts | 373 | start |
| runtime-lifecycle | packages/dsh-task-board/tests/controller.spec.ts | 438 | start |
| runtime-lifecycle | packages/dsh-task-board/tests/controller.spec.ts | 479 | start |
| runtime-lifecycle | packages/dsh-task-board/tests/controller.spec.ts | 521 | start |
| runtime-lifecycle | packages/dsh-task-board/tests/controller.spec.ts | 694 | start |
| runtime-lifecycle | packages/dsh-task-board/tests/controller.spec.ts | 821 | start |
| session | packages/dsh-live-stats/tests/projection.spec.ts | 28 | create |
| session | packages/dsh-remote-web-ui/src/mobile-api.ts | 245 | list |
| session | packages/dsh-remote-web-ui/src/mobile-api.ts | 286 | create |
| session | packages/dsh-remote-web-ui/src/mobile-api.ts | 289 | prompt |
| session | packages/dsh-remote-web-ui/src/mobile/views/SessionListView.tsx | 9 | create |
| session | packages/dsh-task-board/src/core/worktree-execution.ts | 284 | subscribe |
| session | packages/dsh-task-board/src/core/worktree-execution.ts | 286 | prompt |
| session | packages/dsh-task-board/src/core/worktree-execution.ts | 386 | subscribe |
| session | packages/dsh-tool-describe-image/src/client/send-hook.ts | 81 | prompt |
| session | scripts/dsh-candidate-execution.mjs | 91 | get |
| session | scripts/dsh-candidate-execution.mjs | 160 | subscribe |
| session | scripts/dsh-candidate-execution.mjs | 161 | prompt |
| slot | packages/dsh-aionui-panel/src/client/index.ts | 51 | conversation.input.dock |
| slot | packages/dsh-git-graph/src/client/index.ts | 202 | conversation.input.selector.context |
| slot | packages/dsh-git-graph/src/client/index.ts | 211 | conversation.input.dock |
| slot | packages/dsh-live-stats/src/client/index.ts | 76 | web-ui.plugin.item |
| slot | packages/dsh-live-stats/src/client/index.ts | 88 | conversation.composer.dock |
| slot | packages/dsh-mode-switcher/src/client/index.ts | 20 | conversation.session.header.actions |
| slot | packages/dsh-particle-theme/src/client/index.ts | 75 | web-ui.plugin.item |
| slot | packages/dsh-pet/src/client/index.ts | 128 | web-ui.plugin.item |
| slot | packages/dsh-remote-web-ui/src/client/index.ts | 117 | sidebar.remote |
| slot | packages/dsh-remote-web-ui/src/client/index.ts | 139 | sidebar.footer.action |
| slot | packages/dsh-remote-web-ui/src/client/index.ts | 160 | web-ui.plugin.item |
| slot | packages/dsh-task-board/src/client/index.ts | 103 | web-ui.plugin.item |
| slot | packages/dsh-tool-describe-image/src/client/index.ts | 92 | web-ui.plugin.item |
| slot | packages/dsh-web-ui-settings/src/client/index.ts | 57 | settings.section |
| slot | packages/skins/skin-center/src/client/index.ts | 101 | web-ui.plugin.item |
| workspace | gallery/bundles.js | 7 | list |
| workspace | gallery/bundles.js | 13 | list |
| workspace | packages/dsh-remote-web-ui/src/mobile-api.ts | 285 | list |
| workspace | packages/dsh-remote-web-ui/src/mobile/views/WorkspaceView.tsx | 4 | list |
| workspace | packages/skins/ths/src/client/index.ts | 175 | list |
| workspace | packages/skins/trading/src/client/index.ts | 328 | list |
