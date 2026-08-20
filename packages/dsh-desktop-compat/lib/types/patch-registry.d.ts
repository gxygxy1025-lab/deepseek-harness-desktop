export interface DesktopCompatPatch {
    id: string;
    applicableVersions: readonly string[];
    reason: string;
    upstreamReference: string;
    test: string;
    removeWhen: string;
    lastVerified: string;
}
export declare function validateCompatPatchRegistry(entries: readonly DesktopCompatPatch[]): readonly DesktopCompatPatch[];
export declare const DESKTOP_COMPAT_PATCHES: readonly DesktopCompatPatch[];
