import type { Context } from '@deepseek-ai/cordis'

export const inject: string[] = []

/** Host-side no-op; the package's behavior lives entirely in its browser client. */
export function apply(_ctx: Context): void {}
