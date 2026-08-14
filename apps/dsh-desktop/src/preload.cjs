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
  getQqBotStatus: () => ipcRenderer.invoke('extensions:qqbot-status'),
  startQqBotBinding: () => ipcRenderer.invoke('extensions:qqbot-bind'),
  cancelQqBotBinding: () => ipcRenderer.invoke('extensions:qqbot-cancel'),
  unbindQqBot: () => ipcRenderer.invoke('extensions:qqbot-unbind'),
  onQqBotEvent(callback) {
    if (typeof callback !== 'function') throw new TypeError('QQ Bot callback must be a function')
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('extensions:qqbot-event', listener)
    return () => ipcRenderer.removeListener('extensions:qqbot-event', listener)
  },
  onStatus(callback) {
    if (typeof callback !== 'function') throw new TypeError('status callback must be a function')
    const listener = (_event, status) => callback(status)
    ipcRenderer.on('desktop:status', listener)
    return () => ipcRenderer.removeListener('desktop:status', listener)
  },
})

contextBridge.exposeInMainWorld('dshDesktop', api)
