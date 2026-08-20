/**
 * Shared Desktop authority policy for the native workspace-file opener.
 *
 * The Electron main process and its always-mounted host route use this exact
 * allowlist. `shell.openPath()` follows operating-system associations, so a
 * denylist would leave future executable/shortcut extensions exposed.
 */
/**
 * Process-private Desktop-to-Host capability transport. These identifiers are
 * deliberately public constants; only the per-runtime random value is
 * secret. It must never cross a renderer/preload/SDK boundary.
 */
export declare const DESKTOP_WORKSPACE_FILE_OPEN_TOKEN_ENV = "DSH_DESKTOP_WORKSPACE_FILE_OPEN_TOKEN";
export declare const DESKTOP_WORKSPACE_FILE_OPEN_TOKEN_HEADER = "x-dsh-desktop-workspace-file-open-token";
export declare const DESKTOP_WORKSPACE_FILE_OPEN_TOKEN_LENGTH = 43;
/** True only for the base64url encoding of Desktop's 32-byte launch secret. */
export declare function isDesktopWorkspaceFileOpenToken(value: unknown): value is string;
/**
 * True only for a non-shell-dispatched file type allowed by Desktop's native
 * opener. It rejects Windows alternate data streams as well as script,
 * shortcut, executable, and URL-shaped names by construction.
 */
export declare function isSafeDesktopWorkspaceFileOpenPath(value: unknown): value is string;
