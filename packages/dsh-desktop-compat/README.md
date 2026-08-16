# dsh-desktop-compat

English | [中文](README.zh.md)

Desktop-only compatibility fixes for DeepSeek Harness Desktop 2.0.

## What it does

The package preserves the existing queue-first interaction. If DSH rc.6 becomes idle after cancelling an active turn while ordinary follow-up messages remain queued, the plugin re-arms the official agent driver without duplicating or reordering those messages. It also replaces the known `code run failed (abort): [object Object]` presentation with a clear cancellation message.

The implementation is host-only and uses public `agent/status`, agent inbox, `followup`, and `tools/post-execute` SDK contracts. It does not patch files in DeepSeek Harness and can be removed after the upstream runtime implements the documented cancellation behavior.

## Install

DeepSeek Harness Desktop 2.0 mounts this bundle automatically in its isolated desktop profile. The package is not intended as a general Web UI plugin.

## Config

The bundle has no user configuration. Queue-first sending remains the default, and steering messages are not changed.

## Known limitations

The recovery targets the DSH rc.6 cancellation wake gap for ordinary next-turn messages. It should be removed when the official runtime fulfills the same documented contract.

## Development

```bash
pnpm --filter @linxin666/dsh-desktop-compat test
pnpm --filter @linxin666/dsh-desktop-compat build
```
