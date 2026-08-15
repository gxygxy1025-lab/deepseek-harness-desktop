# DeepSeek-style startup motion design

## Direction

The startup surface uses a refined deep-ocean aesthetic inspired by the restraint of DeepSeek's product presence: generous negative space, one cobalt-blue signal color, precise typography, and a single orbital discovery field. The Chinese line “探索未至之境” is the visual center. Motion is slow and purposeful rather than decorative noise.

## Structure

- A compact DeepSeek Harness Desktop identity anchors the upper-left corner.
- The headline and three local-first principles explain the product before the runtime is ready.
- A translucent launch panel reports the current runtime state, percentage, and three visible phases: environment, runtime, and surface.
- The recovery state retains the existing retry, repair, logs, and exit actions.

## Progress behavior

Progress is state-driven. Stopped, starting, restarting, stopping, ready, and crashed each have an explicit floor. Starting and restarting advance smoothly toward a bounded ceiling but never claim completion before the runtime emits `ready`; readiness alone moves the bar to 100%. A crash preserves the current position so diagnostic context is not visually erased.

## Motion and accessibility

The orbital field, ambient light, staged content reveal, and progress highlight use CSS animations. `prefers-reduced-motion` reduces every animation and transition to a single frame. The progress element exposes numeric and textual ARIA values, active phases use `aria-current`, and recovery controls preserve keyboard focus styling.

## Verification

- Unit-test progress clamping, state floors, bounded advancement, and phase mapping.
- Run the complete desktop test suite.
- Capture the real Electron startup window at 1440 × 900 and inspect hierarchy, clipping, readability, and title-bar integration.
