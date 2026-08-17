# Packaged startup benchmark design

## Goal

Measure the current Windows release artifact with enough fidelity to distinguish
profile setup, runtime boot, and renderer load. Use the result to optimize the
largest controllable phase instead of setting a budget from an old installation
or changing low-impact code speculatively.

## Approaches considered

1. Use the installed application's historical `runtime.log`. It reflects real
   machines and antivirus behavior, but mixes old Desktop versions, retries, and
   user profile state, so it cannot provide an actionable before/after baseline.
2. Time only `ensureDesktopProfile()`. This is deterministic and cheap, but the
   existing benchmark shows a 23 ms median while historical runtime boot reached
   tens of seconds; optimizing it cannot materially improve startup.
3. Run the packaged executable repeatedly with isolated state and report both
   cold and warm phase distributions. This is the selected approach because it
   measures the exact release artifact while keeping user state untouched.

## Architecture

One runner owns process spawning, bounded diagnostics, timeout tree cleanup, and
runtime-log parsing. The release smoke test calls it once with fresh temporary
state. A benchmark command calls it for multiple fresh roots and then multiple
runs against one warmed root. The existing Electron E2E uses the same phase
parser, so local, CI, and benchmark output share one definition.

Required phases are application readiness, package resolution, profile readiness,
compatibility reconciliation, shell readiness, runtime readiness, and renderer
load. New artifacts record `total-to-renderer` directly from application start;
the parser retains the former shell, runtime, and renderer sum as an estimated
serialized counterfactual. Benchmark output reports minimum, median, mean,
maximum, and every raw sample; raw values make antivirus outliers visible.

## Error handling and verification

Every run uses isolated `userData`, `DSH_HOME`, and `DSH_AGENTS_HOME`. A timeout
terminates the complete process tree and includes bounded process output plus the
runtime log. Unit tests cover missing phases, repeated startup cycles, and summary
math. The packaged smoke, cold/warm benchmark, full repository verifier, and
release artifact checks must pass before any performance claim is made.

## Baseline and selected optimization

Three packaged runs produced a cold `total-to-renderer` median of 4,223 ms and a
warm median of 3,851 ms. Runtime boot dominated at 2,811/2,411 ms; profile setup
was only 34/21 ms and compatibility reconciliation 2/1 ms. The local startup shell
was loaded serially before runtime boot and cost about 529/546 ms.

The selected change begins runtime boot while the startup shell loads, then gates
runtime navigation until the shell and any explicitly requested auxiliary surface
are ready. No plugin is removed or deferred. A direct cumulative
`total-to-renderer` marker replaces the old sum of phases, which is no longer
valid once shell and runtime work overlap. The parser retains the derived total
only for older packaged artifacts used as pre-change baselines.

Five post-change packaged runs produced cold and warm medians of 3,976 ms and
3,575 ms, improvements of 247 ms and 276 ms against the baseline. The same-run
serialized counterfactual estimates that overlap itself saved median values of
191 ms and 218 ms.

## Log I/O decoupling

Runtime output is persisted through an ordered bounded log queue. The controller
previously awaited that queue before recognizing the official `dsh web:` ready
line. Slow storage, antivirus scanning, or a burst of preceding diagnostics could
therefore postpone the health probe and renderer navigation after DSH was ready.
Ready-line parsing and health probing now proceed independently from diagnostic
persistence. Log writes remain ordered by the store, and rejected log writes are
contained so diagnostics cannot crash or delay the runtime state machine.
