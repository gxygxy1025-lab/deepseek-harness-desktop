/** Desktop-owned, loopback-only authority for native workspace-file opening. */
import type { Context } from '@deepseek-ai/cordis';
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
export declare const DESKTOP_WORKSPACE_FILE_OPEN_TARGET_PATH = "/desktop/workspace-file-open-target";
type WorkspaceAuthority = {
    resolveByPath(path: string): Promise<{
        path: string;
    } | undefined>;
};
type OpenTargetFailure = {
    ok: false;
    error: {
        code: string;
        message: string;
    };
};
type OpenTargetSuccess = {
    ok: true;
    value: {
        path: string;
    };
};
/**
 * Resolve only an exact registered workspace root. The launch capability
 * authenticates Electron main to this Host route; it intentionally is not a
 * browser-session identifier. The public DSH route protocol has no
 * renderer-session credential to verify here, so a supplied session field
 * would merely be forgeable browser input.
 */
export declare function resolveDesktopWorkspaceFileOpenTarget(workspaceRegistry: WorkspaceAuthority, request: {
    root: string;
    path: string;
}): Promise<OpenTargetSuccess | OpenTargetFailure>;
/** Create the exact route so unit tests can exercise its transport fence. */
export declare function createDesktopWorkspaceFileOpenRoute(workspaceRegistry: WorkspaceAuthority, { capabilityToken }?: {
    capabilityToken?: string;
}): WebRoute;
/** Register the authority with the always-mounted Desktop compat bundle. */
export declare function registerDesktopWorkspaceFileOpenRoute(ctx: Context): () => void;
export {};
