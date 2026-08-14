import { join } from 'node:path'

export const PACKAGED_APP_ICON_NAME = 'app-icon.png'

export function resolveAppIconPath({ isPackaged, resourcesPath, sourceDir }) {
  if (isPackaged) {
    if (!resourcesPath) throw new TypeError('resourcesPath is required for a packaged app')
    return join(resourcesPath, PACKAGED_APP_ICON_NAME)
  }
  if (!sourceDir) throw new TypeError('sourceDir is required for a development app')
  return join(sourceDir, '..', 'build', 'icon.png')
}

export function applyWindowIcon(browserWindow, icon) {
  browserWindow.setIcon(icon)
  return browserWindow
}
