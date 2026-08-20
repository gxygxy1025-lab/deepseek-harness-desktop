/**
 * Host single-instance guard shared by the plugin family. The aggregate can
 * load a package alongside a standalone installation; duplicate web routes or
 * settings registrations would otherwise make the runtime abort during boot.
 */

const MOUNTED = Symbol.for('dsh-web-ui.mounted-plugins')

/** Retrieve the process-wide registry shared by linked and registry copies. */
function mountedSet(): Set<string> {
  const registry = globalThis as typeof globalThis & { [key: symbol]: Set<string> | undefined }
  return registry[MOUNTED] ??= new Set<string>()
}

/**
 * Wrap a Cordis plugin apply so one package identity mounts at most once per
 * process. The first mount unregisters itself when its lifecycle disposes.
 */
export function mountOnce<T extends (...args: any[]) => unknown>(packageName: string, fn: T): T {
  return ((...args: Parameters<T>) => {
    const mounted = mountedSet()
    if (mounted.has(packageName)) return undefined
    mounted.add(packageName)
    const ctx = args[0] as { effect?: (callback: () => () => void) => unknown } | undefined
    ctx?.effect?.(() => () => { mounted.delete(packageName) })
    return fn(...args)
  }) as T
}
