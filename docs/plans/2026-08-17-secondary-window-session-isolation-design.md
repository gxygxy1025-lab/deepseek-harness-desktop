# Secondary window session isolation design

## Problem

Electron permission handlers belong to a `Session`, not to one `BrowserWindow`. The main runtime window installs a narrow handler that permits sanitized clipboard writes from the active loopback origin. The Extension Dock and community windows currently use the default session too, then replace its permission handlers with deny-all callbacks. Opening either secondary window can therefore revoke the main runtime window's permission policy for the remainder of the process.

## Selected design

Keep the main window on Electron's default session and move all trusted local secondary surfaces to one named, non-persistent partition. The secondary session retains deny-all permission handlers. Sharing one isolated partition between the Extension Dock and community window avoids an unnecessary second network context while keeping both surfaces separate from the runtime page.

The partition name deliberately omits the `persist:` prefix, so cookies, cache, and other session data are discarded when the application exits. The existing context isolation, sandbox, disabled Node integration, web security, and spellcheck settings remain unchanged. Only the session ownership changes.

Window actions also return a clone-safe boolean acknowledgement across IPC instead of leaking Electron `BrowserWindow` objects to the renderer. Community-window creation is coalesced before asynchronous QR generation begins, so concurrent menu or IPC requests share one opening operation. A failed load destroys its partial window and releases the slot for a retry.

## Verification

- A unit test validates that secondary-window preferences use the named non-persistent partition and preserve all security settings.
- The Electron window-chrome E2E opens both secondary windows and proves their real sessions differ from the main runtime session while sharing the expected isolated partition.
- IPC tests prove window actions never return non-cloneable Electron objects, and the E2E issues two concurrent community requests while asserting that only one window exists.
- Existing desktop tests and packaged smoke verification cover startup, navigation, IPC, and packaging regressions.
