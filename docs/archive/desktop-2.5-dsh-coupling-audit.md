# Desktop 2.5 DSH coupling audit

Authoritative Desktop version: 2.5.0.

Stable DSH package version: 0.1.0-rc.6.

Lockfile SHA-256: `a11a9d38bf8e0df4cbffca85a337de194a3dac0aa835fb50dc445e09720f923a`.

Capability discovery is compatibility evidence only. Renderer surface identity, channel allowlists, and argument validation remain the authorization boundary.

## Classification summary

| Classification | Count |
| --- | ---: |
| public-stable | 143 |
| public-experimental | 109 |
| compatibility-patch | 6 |
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
| packages/dsh-desktop-compat/src/index.ts | 1 | static-import | @deepseek-ai/dsh-agent | yes | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/index.ts | 3 | static-import | @deepseek-ai/dsh-tools | yes | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/recovery.ts | 1 | static-import | @deepseek-ai/dsh-agent | yes | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/recovery.ts | 2 | static-import | @deepseek-ai/dsh-llm | yes | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/recovery.ts | 3 | static-import | @deepseek-ai/dsh-tools | no | compatibility-patch | yes |
| packages/dsh-desktop-compat/src/recovery.ts | 4 | static-import | @deepseek-ai/dsh-tools | yes | compatibility-patch | yes |
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
| packages/dsh-git-graph/src/index.ts | 15 | static-import | @deepseek-ai/dsh-subprocess | yes | public-stable | no |
| packages/dsh-git-graph/src/index.ts | 16 | static-import | @deepseek-ai/dsh-workspace | yes | public-stable | no |
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
| packages/dsh-task-board/src/index.ts | 13 | static-import | @deepseek-ai/dsh-settings | yes | public-stable | no |
| packages/dsh-task-board/src/index.ts | 17 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-task-board/src/index.ts | 19 | static-import | @deepseek-ai/dsh-system-prompt | yes | public-stable | no |
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
| packages/dsh-web-ui-settings/src/bridge.ts | 14 | static-import | @deepseek-ai/dsh-settings | yes | public-stable | no |
| packages/dsh-web-ui-settings/src/bridge.ts | 16 | static-import | @deepseek-ai/dsh-settings | no | public-stable | no |
| packages/dsh-web-ui-settings/src/bridge.ts | 17 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-web-ui-settings/src/client/WebUIPluginsCard.tsx | 9 | static-import | @deepseek-ai/dsh-client-ui-slots | yes | public-stable | no |
| packages/dsh-web-ui-settings/src/client/compat-settings-scope.ts | 17 | static-import | @deepseek-ai/dsh-client-ui-settings/client | yes | public-experimental | no |
| packages/dsh-web-ui-settings/src/client/compat-settings-scope.ts | 21 | static-import | @deepseek-ai/dsh-api-remotes/client | yes | public-experimental | no |
| packages/dsh-web-ui-settings/src/client/compat-settings-scope.ts | 22 | static-import | @deepseek-ai/dsh-client-connection/client | yes | public-experimental | no |
| packages/dsh-web-ui-settings/src/client/compat-settings-scope.ts | 23 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-web-ui-settings/src/client/compat-settings-scope.ts | 24 | static-import | @deepseek-ai/dsh-client-runtime/client | no | public-experimental | no |
| packages/dsh-web-ui-settings/src/client/index.ts | 10 | static-import | @deepseek-ai/dsh-client-runtime/client | yes | public-experimental | no |
| packages/dsh-web-ui-settings/src/client/index.ts | 12 | static-import | @deepseek-ai/dsh-client-locale/client | yes | public-experimental | no |
| packages/dsh-web-ui-settings/src/client/index.ts | 15 | static-import | @deepseek-ai/dsh-client-ui-settings/client | yes | public-experimental | no |
| packages/dsh-web-ui-settings/src/index.ts | 11 | static-import | @deepseek-ai/dsh-host-webserver | yes | public-stable | no |
| packages/dsh-web-ui-settings/src/index.ts | 16 | static-import | @deepseek-ai/dsh-settings | yes | public-stable | no |
| packages/dsh-web-ui-settings/tests/bridge.spec.ts | 7 | static-import | @deepseek-ai/dsh-settings | no | public-stable | no |
| packages/dsh-web-ui-settings/tests/bridge.spec.ts | 9 | static-import | @deepseek-ai/dsh-settings | yes | public-stable | no |
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
| host-service | packages/dsh-desktop-compat/src/index.ts | 11 | tools |
| host-service | packages/dsh-git-graph/src/client/index.ts | 81 | locale |
| host-service | packages/dsh-git-graph/src/index.ts | 21 | subprocess |
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
| host-service | packages/dsh-task-board/src/client/index.ts | 72 | remote |
| host-service | packages/dsh-tool-describe-image/src/client/index.ts | 61 | locale |
| host-service | packages/dsh-tool-describe-image/src/index.ts | 27 | tools |
| host-service | packages/dsh-web-ui-settings/src/client/index.ts | 55 | web-ui-plugins |
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
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 16 | profileDir |
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 17 | profileDir |
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 18 | profileDir |
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 27 | DSH_HOME |
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 46 | profileDir |
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 70 | profileDir |
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 76 | profileDir |
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 125 | profileDir |
| profile-home | apps/dsh-desktop/scripts/verify-profile-migration.mjs | 134 | profileDir |
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
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 36 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 36 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 36 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 65 | runtimeHome |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 66 | DSH_HOME |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 340 | runtimeHome |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 342 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 363 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 366 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 366 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 370 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 379 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 379 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 393 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 393 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 402 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 402 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 407 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 407 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 412 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 412 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 428 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 434 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 487 | profileDir |
| profile-home | apps/dsh-desktop/src/electron-app.mjs | 487 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugin-compatibility.mjs | 54 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugin-compatibility.mjs | 56 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugin-compatibility.mjs | 56 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugin-compatibility.mjs | 57 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugin-compatibility.mjs | 61 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugin-compatibility.mjs | 61 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugin-compatibility.mjs | 61 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 101 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 102 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 114 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 117 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 126 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 127 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 167 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 168 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 171 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 173 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 174 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 183 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 186 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 206 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 214 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 214 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 239 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 240 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 245 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 258 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 279 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 281 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 303 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 307 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 353 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 353 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 435 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 435 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 469 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 470 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 476 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 476 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 501 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 502 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 506 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 506 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 510 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 521 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 525 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 582 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 583 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 587 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 587 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 591 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 597 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 610 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 618 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 670 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 675 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 687 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 697 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 702 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 702 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 708 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 714 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 718 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 725 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 725 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 730 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 742 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 746 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 746 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 750 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 760 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 807 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 814 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 840 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 850 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 878 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 901 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/plugins.mjs | 907 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/qqbot.mjs | 81 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/qqbot.mjs | 82 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/qqbot.mjs | 82 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/qqbot.mjs | 83 | profileDir |
| profile-home | apps/dsh-desktop/src/extensions/qqbot.mjs | 85 | profileDir |
| profile-home | apps/dsh-desktop/src/plugin-recovery.mjs | 167 | profileDir |
| profile-home | apps/dsh-desktop/src/plugin-recovery.mjs | 174 | profileDir |
| profile-home | apps/dsh-desktop/src/plugin-recovery.mjs | 174 | profileDir |
| profile-home | apps/dsh-desktop/src/plugin-recovery.mjs | 175 | profileDir |
| profile-home | apps/dsh-desktop/src/plugin-recovery.mjs | 175 | profileDir |
| profile-home | apps/dsh-desktop/src/plugin-recovery.mjs | 311 | profileDir |
| profile-home | apps/dsh-desktop/src/plugin-recovery.mjs | 312 | profileDir |
| profile-home | apps/dsh-desktop/src/plugin-recovery.mjs | 437 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-migration.mjs | 68 | profileDir |
| profile-home | apps/dsh-desktop/src/profile-migration.mjs | 80 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 377 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 382 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 426 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 428 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 470 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 473 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 493 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 497 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/src/profile.mjs | 499 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/src/profile.mjs | 505 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 506 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 507 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 508 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 525 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 526 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 562 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 577 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 589 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 603 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 612 | profileDir |
| profile-home | apps/dsh-desktop/src/profile.mjs | 663 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/src/profile.mjs | 712 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/src/runtime-controller.mjs | 319 | DSH_HOME |
| profile-home | apps/dsh-desktop/src/runtime-controller.mjs | 320 | DSH_PROFILE |
| profile-home | apps/dsh-desktop/src/runtime-provider.mjs | 183 | profileDir |
| profile-home | apps/dsh-desktop/src/runtime-provider.mjs | 187 | profileDir |
| profile-home | apps/dsh-desktop/src/runtime-provider.mjs | 188 | profileDir |
| profile-home | apps/dsh-desktop/src/runtime-provider.mjs | 189 | profileDir |
| profile-home | apps/dsh-desktop/src/runtime-provider.mjs | 190 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 74 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 111 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 115 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 118 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 145 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 147 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 167 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 182 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 186 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 188 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 195 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 216 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 224 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 244 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 260 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 262 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 264 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 266 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 300 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 303 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 309 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 310 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 311 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 322 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 338 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 341 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 343 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 354 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 359 | profileDir |
| profile-home | apps/dsh-desktop/test/plugin-recovery.test.mjs | 406 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 59 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 62 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 80 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 98 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 108 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 113 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 122 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 129 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 160 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 165 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 167 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 168 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 169 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 201 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 224 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 229 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 231 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 232 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 253 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 267 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 272 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 276 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 283 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 326 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 331 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 334 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 342 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 368 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 373 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 374 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 375 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 393 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 409 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 420 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 452 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 457 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 458 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 459 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 477 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 491 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 502 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 507 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 509 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 510 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 530 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 540 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 545 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 547 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 548 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 567 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 581 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 586 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 590 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 611 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 615 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 619 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 625 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 630 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 635 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 642 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 651 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 658 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 669 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 674 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 676 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 684 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 689 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 693 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 699 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 703 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 708 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 712 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 723 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 730 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 732 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 735 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 742 | profileDir |
| profile-home | apps/dsh-desktop/test/plugins.test.mjs | 746 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 22 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 26 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 27 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 142 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 144 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 144 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 148 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 158 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 217 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 223 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 225 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 231 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 235 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 238 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 247 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 253 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 255 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 260 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 264 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 267 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 286 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 287 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 288 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 289 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 290 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 291 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 291 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 295 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 297 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 301 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 318 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 322 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 325 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 331 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 341 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 343 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 352 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 364 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 365 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 374 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 380 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 391 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 392 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 397 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 405 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 411 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 421 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 422 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 431 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 443 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 447 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 450 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 453 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 454 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 460 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 470 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 474 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 475 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 477 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 479 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 486 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 488 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 498 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 504 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 508 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 515 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 516 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 517 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 523 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 525 | profileDir |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 528 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 536 | resolveRuntimePackages |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 573 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 576 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/test/profile.test.mjs | 579 | DSH_HOME |
| profile-home | apps/dsh-desktop/test/qqbot.test.mjs | 21 | profileDir |
| profile-home | apps/dsh-desktop/test/qqbot.test.mjs | 22 | profileDir |
| profile-home | apps/dsh-desktop/test/qqbot.test.mjs | 25 | profileDir |
| profile-home | apps/dsh-desktop/test/qqbot.test.mjs | 27 | profileDir |
| profile-home | apps/dsh-desktop/test/qqbot.test.mjs | 32 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-controller.test.mjs | 226 | DSH_PROFILE |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 22 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 23 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 70 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 79 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 87 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 92 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 246 | ensureDesktopProfile |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 248 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/test/runtime-integration.test.mjs | 359 | resolveDshCliPath |
| profile-home | apps/dsh-desktop/test/runtime-provider.test.mjs | 47 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-provider.test.mjs | 114 | profileDir |
| profile-home | apps/dsh-desktop/test/runtime-provider.test.mjs | 120 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 23 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 24 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 25 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 29 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 49 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 54 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 62 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 63 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 65 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 76 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 94 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 99 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 100 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 102 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 114 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 136 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 148 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 150 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 162 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 187 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 193 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 194 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 195 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 196 | profileDir |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 198 | DSH_HOME |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 199 | DSH_PROFILE |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 200 | DSH_HOME |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 201 | DSH_PROFILE |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 226 | DSH_HOME |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 227 | DSH_HOME |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 228 | DSH_PROFILE |
| profile-home | apps/dsh-desktop/test/skin-market-persistence.test.mjs | 229 | DSH_PROFILE |
| profile-home | packages/dsh-desktop-compat/src/skin-state.ts | 121 | DSH_HOME |
| profile-home | packages/dsh-desktop-compat/src/skin-state.ts | 121 | DSH_PROFILE |
| profile-home | packages/dsh-desktop-compat/src/skin-state.ts | 126 | profileDir |
| profile-home | packages/dsh-desktop-compat/src/skin-state.ts | 127 | profileDir |
| profile-home | packages/dsh-desktop-compat/src/skin-state.ts | 131 | profileDir |
| profile-home | packages/dsh-desktop-compat/src/skin-state.ts | 151 | profileDir |
| profile-home | packages/dsh-desktop-compat/tests/skin-state.spec.ts | 16 | profileDir |
| profile-home | packages/dsh-desktop-compat/tests/skin-state.spec.ts | 17 | profileDir |
| profile-home | packages/dsh-desktop-compat/tests/skin-state.spec.ts | 18 | profileDir |
| profile-home | packages/dsh-desktop-compat/tests/skin-state.spec.ts | 23 | profileDir |
| profile-home | packages/dsh-desktop-compat/tests/skin-state.spec.ts | 29 | profileDir |
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
| profile-home | packages/dsh-task-board/src/index.ts | 48 | DSH_PROFILE |
| profile-home | packages/dsh-task-board/src/index.ts | 55 | DSH_PROFILE |
| profile-home | packages/dsh-task-board/src/index.ts | 70 | DSH_PROFILE |
| profile-home | packages/dsh-task-board/src/index.ts | 71 | DSH_HOME |
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
| runtime-lifecycle | apps/dsh-desktop/src/electron-app.mjs | 489 | recover |
| runtime-lifecycle | apps/dsh-desktop/src/electron-app.mjs | 898 | start |
| runtime-lifecycle | apps/dsh-desktop/src/electron-app.mjs | 914 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/electron-app.mjs | 916 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 129 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 141 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 148 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 176 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 181 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 188 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 216 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 223 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 232 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 276 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 283 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 310 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 429 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 431 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 483 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 490 | start |
| runtime-lifecycle | apps/dsh-desktop/src/extension-ipc.mjs | 510 | start |
| runtime-lifecycle | apps/dsh-desktop/src/ipc.mjs | 176 | restart |
| runtime-lifecycle | apps/dsh-desktop/src/ipc.mjs | 178 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/ipc.mjs | 180 | start |
| runtime-lifecycle | apps/dsh-desktop/src/menu.mjs | 26 | restart |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 634 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 645 | start |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 654 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 663 | start |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 680 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 685 | start |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 695 | start |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 708 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 713 | start |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 723 | start |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 744 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 750 | start |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 760 | start |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 770 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 776 | start |
| runtime-lifecycle | apps/dsh-desktop/src/plugin-recovery.mjs | 781 | start |
| runtime-lifecycle | apps/dsh-desktop/src/runtime-provider.mjs | 158 | start |
| runtime-lifecycle | apps/dsh-desktop/src/runtime-provider.mjs | 162 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/runtime-provider.mjs | 167 | restart |
| runtime-lifecycle | apps/dsh-desktop/src/runtime-provider.mjs | 168 | stop |
| runtime-lifecycle | apps/dsh-desktop/src/runtime-provider.mjs | 169 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 220 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 239 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 277 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 325 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 358 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 366 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 387 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 397 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 416 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 438 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 464 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 468 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 469 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 481 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 511 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 516 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 517 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 559 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 565 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 566 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 567 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 583 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 613 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-controller.test.mjs | 651 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-integration.test.mjs | 254 | start |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-integration.test.mjs | 357 | stop |
| runtime-lifecycle | apps/dsh-desktop/test/runtime-integration.test.mjs | 366 | start |
| runtime-lifecycle | apps/dsh-desktop/test/updater.test.mjs | 68 | start |
| runtime-lifecycle | packages/dsh-particle-theme/src/client/index.ts | 70 | start |
| runtime-lifecycle | packages/dsh-particle-theme/tests/controller.spec.ts | 35 | start |
| runtime-lifecycle | packages/dsh-task-board/src/client/index.ts | 172 | start |
| runtime-lifecycle | packages/dsh-task-board/tests/controller-use-cases.spec.ts | 137 | start |
| runtime-lifecycle | packages/dsh-task-board/tests/controller.spec.ts | 63 | start |
| runtime-lifecycle | packages/dsh-task-board/tests/controller.spec.ts | 299 | start |
| runtime-lifecycle | packages/dsh-task-board/tests/controller.spec.ts | 325 | start |
| runtime-lifecycle | packages/dsh-task-board/tests/controller.spec.ts | 443 | start |
| runtime-lifecycle | packages/dsh-task-board/tests/controller.spec.ts | 490 | start |
| session | packages/dsh-live-stats/tests/projection.spec.ts | 28 | create |
| session | packages/dsh-remote-web-ui/src/mobile-api.ts | 245 | list |
| session | packages/dsh-remote-web-ui/src/mobile-api.ts | 286 | create |
| session | packages/dsh-remote-web-ui/src/mobile-api.ts | 289 | prompt |
| session | packages/dsh-remote-web-ui/src/mobile/views/SessionListView.tsx | 9 | create |
| session | packages/dsh-tool-describe-image/src/client/send-hook.ts | 81 | prompt |
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
| slot | packages/dsh-task-board/src/client/index.ts | 96 | web-ui.plugin.item |
| slot | packages/dsh-tool-describe-image/src/client/index.ts | 92 | web-ui.plugin.item |
| slot | packages/dsh-web-ui-settings/src/client/index.ts | 69 | settings.plugin.item |
| slot | packages/dsh-web-ui-settings/src/client/index.ts | 80 | web-ui.plugin.item |
| slot | packages/skins/skin-center/src/client/index.ts | 101 | web-ui.plugin.item |
| workspace | gallery/bundles.js | 7 | list |
| workspace | gallery/bundles.js | 13 | list |
| workspace | packages/dsh-remote-web-ui/src/mobile-api.ts | 285 | list |
| workspace | packages/dsh-remote-web-ui/src/mobile/views/WorkspaceView.tsx | 4 | list |
| workspace | packages/skins/ths/src/client/index.ts | 175 | list |
| workspace | packages/skins/trading/src/client/index.ts | 328 | list |
