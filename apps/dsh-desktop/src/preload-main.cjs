const { contextBridge, ipcRenderer } = require('electron')

// Sandboxed Electron preloads cannot require sibling files. Keep this entry
// self-contained so the bridge is available before the first local page loads.
function createSubscription(channel, label) {
  return (callback) => {
    if (typeof callback !== 'function') throw new TypeError(`${label} callback must be a function`)
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  }
}

const baseApi = {
  getContract: () => ipcRenderer.invoke('desktop:contract'),
  getInfo: () => ipcRenderer.invoke('desktop:info'),
  getStatus: () => ipcRenderer.invoke('desktop:status'),
  setWindowChromeTheme: (theme) => ipcRenderer.invoke('desktop:window-chrome-theme', theme),
  showNotification: (notification) => ipcRenderer.invoke('desktop:notification-show', notification),
  onStatus: createSubscription('desktop:status', 'status'),
  onDeepLink: createSubscription('desktop:deep-link', 'deep link'),
}

const api = Object.freeze({
  ...baseApi,
  action: (action) => ipcRenderer.invoke('desktop:action', action),
  helpAction: (action) => ipcRenderer.invoke('desktop:help-action', action),
  toolAction: (action) => ipcRenderer.invoke('desktop:tool-action', action),
  claimStarPrompt: () => ipcRenderer.invoke('desktop:star-prompt-claim'),
  getUpdateStatus: () => ipcRenderer.invoke('desktop:update-status'),
  checkForUpdates: () => ipcRenderer.invoke('desktop:update-check'),
  installUpdate: () => ipcRenderer.invoke('desktop:update-install'),
  listSkills: () => ipcRenderer.invoke('desktop:skills-list'),
  onUpdateStatus: createSubscription('desktop:update-status', 'update status'),
})

contextBridge.exposeInMainWorld('dshDesktop', api)
