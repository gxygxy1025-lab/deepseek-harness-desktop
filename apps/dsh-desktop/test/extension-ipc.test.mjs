import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'

import { registerExtensionIpc } from '../src/extension-ipc.mjs'

class FakeIpcMain {
  handlers = new Map()

  removeHandler(channel) {
    this.handlers.delete(channel)
  }

  handle(channel, handler) {
    this.handlers.set(channel, handler)
  }
}

test('extension IPC exposes only renderer-safe QQ Bot state and forwards lifecycle events', async () => {
  const ipcMain = new FakeIpcMain()
  const sent = []
  const qqBotBinding = new EventEmitter()
  qqBotBinding.status = () => ({ bound: true, binding: false, pending: false, appId: '12*****89' })
  qqBotBinding.start = () => ({ bound: false, binding: true, pending: false })
  qqBotBinding.cancel = () => ({ bound: false, binding: false, pending: false })
  qqBotBinding.unbind = async () => ({ bound: false, binding: false, pending: false })
  const unregister = registerExtensionIpc({
    ipcMain,
    dialog: {},
    shell: {},
    getWindow: () => ({ isDestroyed: () => false, webContents: { send: (...args) => sent.push(args) } }),
    pluginManager: {},
    controller: {},
    ensureProfile: async () => {},
    projectRoot: 'C:\\project',
    dshHome: 'C:\\dsh',
    qqBotBinding,
  })

  assert.deepEqual(await ipcMain.handlers.get('extensions:qqbot-status')(), {
    bound: true,
    binding: false,
    pending: false,
    appId: '12*****89',
  })
  assert.deepEqual(await ipcMain.handlers.get('extensions:qqbot-bind')(), { bound: false, binding: true, pending: false })
  assert.deepEqual(await ipcMain.handlers.get('extensions:qqbot-cancel')(), { bound: false, binding: false, pending: false })
  assert.deepEqual(await ipcMain.handlers.get('extensions:qqbot-unbind')(), { bound: false, binding: false, pending: false })

  qqBotBinding.emit('event', { type: 'qr', status: { binding: true, qrImage: 'data:image/png;base64,abc' } })
  assert.deepEqual(sent, [[
    'extensions:qqbot-event',
    { type: 'qr', status: { binding: true, qrImage: 'data:image/png;base64,abc' } },
  ]])
  assert.equal(JSON.stringify(sent).includes('appSecret'), false)

  unregister()
  assert.equal(ipcMain.handlers.has('extensions:qqbot-bind'), false)
  assert.equal(qqBotBinding.listenerCount('event'), 0)
})
