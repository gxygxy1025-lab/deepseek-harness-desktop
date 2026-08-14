import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyWindowChrome,
  createWindowChromeScript,
  installWindowChrome,
  WINDOW_CHROME_CSS,
  WINDOW_CHROME_HEIGHT,
  normalizeWindowChromeTheme,
  setWindowChromeTheme,
  windowChromeBrowserOptions,
} from '../src/window-chrome.mjs'

test('window chrome uses a native overlay with a compact caption area', () => {
  assert.equal(WINDOW_CHROME_HEIGHT, 46)
  assert.deepEqual(windowChromeBrowserOptions(), {
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#071117',
      symbolColor: '#d9edf4',
      height: 46,
    },
  })
  assert.match(WINDOW_CHROME_CSS, /-webkit-app-region: drag/)
  assert.match(WINDOW_CHROME_CSS, /padding-top: var\(--dsh-desktop-window-chrome-height\)/)
  assert.match(WINDOW_CHROME_CSS, /data-dsh-desktop-chrome-theme="light"/)
  assert.match(WINDOW_CHROME_CSS, /dsh-desktop-modal-layer/)
})

test('window chrome script keeps labels as text content', () => {
  const script = createWindowChromeScript({
    title: 'DeepSeek <Harness>',
    context: 'Web Surface',
  })
  assert.match(script, /textContent = data\.title/)
  assert.match(script, /textContent = data\.context/)
  assert.match(script, /MutationObserver/)
  assert.match(script, /setWindowChromeTheme/)
  assert.match(script, /dsh-desktop-modal-layer/)
  assert.doesNotMatch(script, /DeepSeek <Harness><\/span>/)
})

test('window chrome theme validation and native overlay are bounded', () => {
  assert.equal(normalizeWindowChromeTheme('light'), 'light')
  assert.equal(normalizeWindowChromeTheme('dark'), 'dark')
  assert.throws(() => normalizeWindowChromeTheme('transparent'), /window chrome theme/)
  const calls = []
  const browserWindow = { setTitleBarOverlay: (options) => calls.push(options) }
  assert.equal(setWindowChromeTheme(browserWindow, 'light'), 'light')
  assert.deepEqual(calls, [{ color: '#eef2f8', symbolColor: '#1f2937', height: 46 }])
})

test('window chrome applies CSS before mounting the drag surface', async () => {
  const calls = []
  const webContents = {
    isDestroyed: () => false,
    insertCSS: async (css, options) => calls.push(['css', css, options]),
    executeJavaScript: async (script, userGesture) => {
      calls.push(['script', script, userGesture])
      return true
    },
  }
  assert.equal(await applyWindowChrome({ webContents, title: 'Harness', context: 'Startup' }), true)
  assert.equal(calls[0][0], 'css')
  assert.deepEqual(calls[0][2], { cssOrigin: 'author' })
  assert.equal(calls[1][0], 'script')
  assert.equal(calls[1][2], true)
})

test('window chrome follows page navigations and can be detached', () => {
  const listeners = new Map()
  const webContents = {
    getURL: () => 'file:///startup.html',
    on: (name, listener) => listeners.set(name, listener),
    removeListener: (name, listener) => {
      if (listeners.get(name) === listener) listeners.delete(name)
    },
  }
  const dispose = installWindowChrome({
    browserWindow: { webContents },
    title: 'Harness',
    getContext: () => 'Startup',
  })
  assert.equal(typeof listeners.get('did-finish-load'), 'function')
  dispose()
  assert.equal(listeners.has('did-finish-load'), false)
})
