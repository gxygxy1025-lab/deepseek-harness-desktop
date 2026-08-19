import { createRequire } from 'node:module'

interface LoaderEntry {
  id: string
  factory: (require: (spec: string) => unknown) => unknown
}

const nodeRequire = createRequire(import.meta.url)
const modules = new Map<string, { exports: unknown }>()
const loader = {
  load(entry: LoaderEntry): unknown {
    const cached = modules.get(entry.id)
    if (cached) return cached.exports
    const module = { exports: {} as unknown }
    modules.set(entry.id, module)
    module.exports = entry.factory((spec) => modules.get(spec)?.exports ?? nodeRequire(spec)) ?? module.exports
    return module.exports
  },
}

Object.defineProperty(window, '__ModuleLoader__', { value: loader, configurable: true, writable: true })
