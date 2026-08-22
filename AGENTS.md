# Repository rules

- Keep the repository limited to the DeepSeek Harness Desktop core and official `@deepseek-ai/*` runtime packages.
- Do not add plugin markets, third-party extension bundles, bots, skins, task boards, or marketing-site source.
- Keep the Electron renderer sandboxed and context-isolated with Node integration disabled.
- Pin runtime and build dependencies exactly; update the lockfile with pnpm.
- Add focused tests for process launch, IPC, installer, updater, profile, and workspace behavior.
- Do not commit credentials, user profiles, logs, generated installers, or local smoke-test data.
- Do not use emoji in source, documentation, UI text, commit messages, or generated artifacts.
