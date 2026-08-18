# ADR-0003: Desktop Contract v1 and renderer surface identities

## Status

Accepted for Desktop 2.4.0.

## Context

The main Harness renderer and the Extension Dock previously received the same preload API. That made product update actions, plugin mutations, skill import, and QQ Bot binding appear to belong to one undifferentiated renderer contract. Capability discovery was implicit, and IPC handlers did not have a shared identity registry for validating the sending `webContents`.

## Decision

Desktop exposes Contract v1 with `apiVersion: 1.0.0`, a surface name, and a snapshot of capability strings. The main, extensions, and community windows are registered by their live `webContents` identities when created and unregistered when destroyed. Every privileged IPC handler checks that registry before processing arguments.

The main preload contains product actions, Desktop update actions, read-only skill discovery, notifications, status, and deep-link subscription. The extension preload contains plugin lifecycle, skill import, and QQ Bot binding operations but no Desktop update installation. The community window receives no privileged preload.

Stable error codes distinguish an unknown surface, a capability denial, and an invalid argument. Capability strings are for feature detection and compatibility negotiation; the sender registry and per-channel allowlist remain the security boundary.

## Consequences

- Renderer code can feature-detect without probing privileged methods.
- Main renderer compromise does not expose plugin install/remove, QQ Bot credentials, or skill import.
- Extension renderer compromise does not expose Desktop update installation or application recovery actions.
- Contract snapshots and major-version compatibility are testable independently of Electron.

## Alternatives Considered

One preload with runtime checks was rejected because sensitive functions would still be present on every renderer. Capability strings as authorization were rejected because renderer-provided data is not trustworthy. A public general-purpose SDK was deferred; Contract v1 is an internal Desktop bridge only.
