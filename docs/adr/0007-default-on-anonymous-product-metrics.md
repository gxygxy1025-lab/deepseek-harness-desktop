# ADR-0007: Default-on anonymous product metrics

## Status

Accepted

## Context

DeepSeek Harness Desktop needs coarse product evidence about released-version adoption, startup reliability, update delivery, surface usage, extension operations, and session duration while remaining a free open-source desktop distribution.

The desktop application handles sensitive local conversations, credentials, source trees, paths, logs, and extension metadata. A conventional analytics SDK would introduce a persistent installation identity and a vendor-defined automatic collection surface that is broader than the product questions require.

Official releases need metrics by default and do not expose an application opt-out. Ordinary development, test, source, and Fork builds must not report to the official service.

## Decision

Official packaged builds send a closed vocabulary of coarse product events from the Electron main process to a first-party Cloudflare Worker endpoint supplied only by the official release workflow.

The client creates no persistent installation or device identifier, does not reuse the DeepSeek Harness anonymous user identifier, keeps its queue only in memory, does not retry failed delivery, and never blocks product behavior on telemetry.

The Worker validates exact fields, derives the UTC day at ingestion, groups identical records, and increments daily Cloudflare D1 aggregate rows. It does not store raw events, client timestamps, IP addresses, user agents, request headers, content, paths, logs, stack traces, package names, model names, or other free-form values.

Product metrics are enabled whenever an official HTTPS endpoint is present in the packaged resource. The application exposes no user-facing switch. The public privacy policy describes the default behavior and states that installation, launch, or continued use indicates agreement where applicable law permits.

The service has an operator-controlled ingestion kill switch. Daily aggregate rows are deleted after 365 days.

## Consequences

### Positive

- The product can measure reliability and feature trends without constructing user histories.
- Source and Fork builds remain disconnected because the committed endpoint configuration is empty.
- The event and storage contracts are first-party, reviewable, and replaceable.
- Transport, storage, and reporting failures cannot break or delay the desktop application.
- Aggregation keeps Cloudflare Workers and D1 usage within their free tiers at the project's expected scale.

### Negative

- The product cannot calculate unique users, retention cohorts, funnels across launches, uninstall rates, or per-user crash histories.
- The public ingestion endpoint cannot authenticate a distributed desktop binary, so aggregated trends can be spoofed and cannot support billing or security decisions.
- Default-on collection without an application opt-out may require a different consent experience before intentionally targeting jurisdictions that require prior affirmative consent.
- Aggregated rows cannot distinguish legitimate traffic from forged traffic after ingestion.

### Neutral

- Cloudflare processes the HTTPS connection as infrastructure provider even though application metrics do not persist network identifiers.
- Operational debugging continues to rely on user-exported local logs rather than remote stack traces.

## Alternatives Considered

**Firebase Analytics and Crashlytics** were rejected because the Android-oriented RikkaHub implementation creates vendor-managed installation identifiers and automatic collection behavior that are unnecessary for this Electron product.

**PostHog Cloud** was rejected because its main strengths depend on persistent distinct identities and user-level event histories.

**DeepSeek Harness session telemetry** was rejected because it observes the sensitive conversation/session domain, has a different owner and purpose, and must remain isolated from desktop-shell product metrics.

**Raw events in D1** were rejected because they would enable per-request timelines, increase write/storage usage, and add no required product insight.

## References

- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Product privacy policy](../../PRIVACY.md)
