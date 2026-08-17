# Desktop window-state persistence design

## Problem

The main window accepts a minimum size of 720 by 540 device-independent pixels, but restored state is clamped to 900 by 640. A valid compact layout therefore grows after every restart, which is especially disruptive on small displays, split-screen layouts, and remote desktop sessions.

The persistence debounce also clears its timer when the window closes. If the last move or resize occurs inside that debounce interval, the final geometry is never written. The shutdown lifecycle calls the returned save function, but by then the BrowserWindow may already be destroyed and cannot provide a final snapshot.

## Selected design

Use the BrowserWindow's `close` event to capture the final normal bounds and maximized state synchronously, before destruction. Queue disk writes so an older debounced write can never complete after the final close write. The save function returns the current queue when the window is already destroyed, allowing the existing shutdown lifecycle to wait for the close snapshot without delaying or cancelling the close event itself.

Keep resize and move writes debounced at 250 ms. Event-triggered writes handle failures internally to avoid unhandled promise rejections, while explicit shutdown saves still reject so the lifecycle can log or surface a persistence failure. Align the normalization minimum with BrowserWindow's actual 720 by 540 constraint.

## Verification

- A compact saved window restores at 720 by 540 rather than expanding.
- A move or resize immediately followed by close persists the final geometry.
- Calling save after destruction waits for the already queued final write without accessing the destroyed window.
- Existing off-screen recentering, maximized restoration, and full Desktop tests remain green.
