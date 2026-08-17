# Extension operation coordination

## Problem

The plugin manager serializes manifest mutations, but the Extension Dock can
still issue independent inventory scans, update checks, plugin changes, and QQ
Bot operations at the same time. A scan combines plugin inventory with a
slower skill-directory walk. Its plugin snapshot can therefore be captured
before a mutation and rendered after that mutation has completed, replacing a
new list with stale data.

QQ Bot binding has a second cross-component race. Successful QR binding and
unbind both update the desktop profile and restart the runtime from callbacks
inside `QqBotBindingService`. They do not currently participate in the plugin
transaction gate. A QR success that arrives during plugin install can produce
overlapping profile changes and consecutive runtime restarts.

## Options considered

1. Attach a monotonically increasing render token to scans. This hides stale
   results but still performs redundant work and does not protect QQ Bot and
   plugin runtime mutations.
2. Put every read and write into the existing main-process mutation queue.
   This is consistent, but a slow registry check would delay app shutdown and
   installer launch even though it has no persistent mutation to finish.
3. Use a renderer operation queue for ordered presentation and add a narrow
   main-process exclusion gate between plugin mutations and QQ Bot binding
   transitions. This prevents the data race without making shutdown wait for
   ordinary network reads.

Option 3 is selected.

## Design

The Extension Dock owns a small failure-tolerant FIFO queue. All user actions
that invoke extension IPC run through it. The queue reports a reference-counted
busy state so refresh and mutation controls remain disabled until all queued
work settles. A rejected operation does not poison later operations.

The main process tracks active and queued plugin mutation transactions. A new
plugin mutation is rejected while QQ Bot is binding or persisting credentials.
Starting binding or unbinding is rejected while any plugin transaction is
active or queued. Cancellation remains available at all times. Read-only QQ
status, inventory, and update checks remain independent so app shutdown is not
coupled to registry latency.

## Verification

- Prove the UI queue runs operations FIFO, exposes one busy interval, and
  continues after a rejection.
- Prove plugin mutations are rejected during QQ binding without stopping DSH.
- Prove bind/unbind are rejected during a plugin transaction while cancel is
  still accepted.
- Run the complete Desktop suite and the real Extension Dock window E2E.
