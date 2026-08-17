import { Service, type Context } from '@deepseek-ai/cordis';
export declare const SKIN_STATE_START = "# --- dsh-skin managed (auto-generated; do not edit) ---";
export declare const SKIN_STATE_END = "# --- end dsh-skin managed ---";
export interface SkinLoaderEntry {
    options: {
        id?: string;
        name?: string;
    };
}
export interface DesktopSkinStateFace {
    migrateLegacy(disabledNames: Iterable<string>, entries: Iterable<SkinLoaderEntry>): Set<string>;
    disabledNames(themeNames: Iterable<string>, entries: Iterable<SkinLoaderEntry>): Set<string>;
    activateBundleTheme(name: string, themeNames: Iterable<string>, entries: Iterable<SkinLoaderEntry>): void;
}
export declare class DesktopSkinStateStore implements DesktopSkinStateFace {
    readonly home: string;
    readonly profile: string;
    constructor(home?: string, profile?: string);
    private get patchPath();
    private get profileDir();
    private wiredPackageNames;
    private loaderId;
    migrateLegacy(disabledNames: Iterable<string>, entries: Iterable<SkinLoaderEntry>): Set<string>;
    disabledNames(themeNames: Iterable<string>, entries: Iterable<SkinLoaderEntry>): Set<string>;
    activateBundleTheme(name: string, themeNames: Iterable<string>, entries: Iterable<SkinLoaderEntry>): void;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        desktopSkinState: DesktopSkinStateService;
    }
}
export declare class DesktopSkinStateService extends Service implements DesktopSkinStateFace {
    private readonly store;
    constructor(ctx: Context);
    migrateLegacy(disabledNames: Iterable<string>, entries: Iterable<SkinLoaderEntry>): Set<string>;
    disabledNames(themeNames: Iterable<string>, entries: Iterable<SkinLoaderEntry>): Set<string>;
    activateBundleTheme(name: string, themeNames: Iterable<string>, entries: Iterable<SkinLoaderEntry>): void;
}
