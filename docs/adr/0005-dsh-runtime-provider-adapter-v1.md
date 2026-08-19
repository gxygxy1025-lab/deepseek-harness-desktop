# ADR-0005: DSH Runtime Provider Adapter v1

## Status

Accepted for Desktop 2.5.0.

## Context

Desktop 2.4 starts the official DSH CLI as an isolated child process and prepares a private Desktop profile. Lifecycle and profile behavior is reliable, but consumers previously received the concrete controller and profile closure directly. An upstream DSH change could therefore surface as an unknown deep failure, and the Desktop Contract had no structured support evidence.

## Decision

Desktop uses `dsh-cli-provider-v1`, a composition adapter around the existing controller and profile preparation. The current provider exposes `probe`, `start`, `stop`, `recover`, `ensureProfile`, `resolveProfilePaths`, and `getSupportEvidence`. It also defines optional `registerWorkspace`, `createSession`, `subscribeSession`, and `registerHostService` operations.

Capability ids are `runtime.lifecycle`, `profile.paths`, `workspace.register`, `session.create`, `session.observe`, and `host-service.register`. The CLI provider reports lifecycle and profile paths as available. Optional operations remain unsupported until a public typed upstream face is deliberately wired; calling one returns `runtime-capability-unsupported`. Upstream operation failures become `runtime-provider-operation-failed` at the adapter boundary.

The raw 2.4 controller is confined to provider construction. Startup, shutdown, updates, Plugin Recovery, Extension Dock mutations, QQ Bot restart, menu actions, status publication, and Desktop Contract reporting use the provider. The adapter delegates controller events and lifecycle semantics, so the current runtime behavior remains unchanged.

Desktop Contract includes only a clone-safe provider id, upstream version, support status, and capability list. It never exposes Electron, controller, Cordis, or DSH objects. Capabilities support compatibility negotiation only; renderer surface identity, IPC channel allowlists, and argument validation remain the authorization boundary.

## Consequences

- Upstream changes have one translation and capability boundary.
- Missing optional APIs fail early with stable Desktop errors.
- Candidate and packaged checks can compare the same provider evidence.
- The adapter does not claim to sandbox plugins or replace official DSH services.
- Adding an optional capability requires a public typed upstream face, tests, Known Good evidence, and an updated coupling audit.

## Alternatives Considered

Subclassing the controller was rejected because it would mix compatibility policy into process supervision. Replacing the CLI with an in-process Agent Loop was rejected because Desktop must not reimplement or fork DSH runtime semantics. Version-string branches in feature code were rejected because support must be capability-based and centrally evidenced.
