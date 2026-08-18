import {
  DESKTOP_ERROR_CODES,
  DESKTOP_SURFACES,
  DesktopContractError,
} from './desktop-contract.mjs'

const VALID_SURFACES = new Set(Object.values(DESKTOP_SURFACES))

/** Live webContents-to-surface identity registry used by every privileged IPC handler. */
export class DesktopSurfaceRegistry {
  #surfaces = new WeakMap()
  #disposers = new WeakMap()

  register(webContents, surface) {
    if (!webContents || typeof webContents !== 'object') throw new TypeError('webContents is required')
    if (!VALID_SURFACES.has(surface)) throw new TypeError(`invalid desktop surface: ${surface}`)
    this.unregister(webContents)
    this.#surfaces.set(webContents, surface)
    const onDestroyed = () => this.unregister(webContents)
    webContents.once?.('destroyed', onDestroyed)
    const dispose = () => {
      if (this.#surfaces.get(webContents) === surface) this.#surfaces.delete(webContents)
      webContents.removeListener?.('destroyed', onDestroyed)
      this.#disposers.delete(webContents)
    }
    this.#disposers.set(webContents, dispose)
    return dispose
  }

  unregister(webContents) {
    this.#disposers.get(webContents)?.()
  }

  surfaceOf(webContents) {
    if (!webContents || webContents.isDestroyed?.()) return undefined
    return this.#surfaces.get(webContents)
  }

  assert(webContents, allowedSurfaces) {
    const surface = this.surfaceOf(webContents)
    if (surface === undefined) {
      throw new DesktopContractError(
        DESKTOP_ERROR_CODES.SURFACE_UNKNOWN,
        'desktop IPC rejected an unregistered renderer surface',
      )
    }
    const allowed = Array.isArray(allowedSurfaces) ? allowedSurfaces : [allowedSurfaces]
    if (!allowed.includes(surface)) {
      throw new DesktopContractError(
        DESKTOP_ERROR_CODES.CAPABILITY_DENIED,
        `desktop IPC is unavailable to the ${surface} surface`,
      )
    }
    return surface
  }
}
