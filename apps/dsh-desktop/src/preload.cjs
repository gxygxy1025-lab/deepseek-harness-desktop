const { contextBridge, ipcRenderer } = require('electron')

const api = Object.freeze({
  getInfo: () => ipcRenderer.invoke('desktop:info'),
  getStatus: () => ipcRenderer.invoke('desktop:status'),
  action: (action) => ipcRenderer.invoke('desktop:action', action),
  setWindowChromeTheme: (theme) => ipcRenderer.invoke('desktop:window-chrome-theme', theme),
  listExtensions: () => ipcRenderer.invoke('extensions:list'),
  installPlugin: (spec) => ipcRenderer.invoke('extensions:plugin-install', spec),
  removePlugin: (name) => ipcRenderer.invoke('extensions:plugin-remove', name),
  importSkill: () => ipcRenderer.invoke('extensions:skill-import'),
  openSkill: (id) => ipcRenderer.invoke('extensions:skill-open', id),
  openSkillRoot: () => ipcRenderer.invoke('extensions:skill-root'),
  onStatus(callback) {
    if (typeof callback !== 'function') throw new TypeError('status callback must be a function')
    const listener = (_event, status) => callback(status)
    ipcRenderer.on('desktop:status', listener)
    return () => ipcRenderer.removeListener('desktop:status', listener)
  },
})

contextBridge.exposeInMainWorld('dshDesktop', api)
