export const WINDOW_CHROME_HEIGHT = 46

const WINDOW_CHROME_ID = 'dsh-desktop-window-chrome'

export const WINDOW_CHROME_CSS = `
:root {
  --dsh-desktop-window-chrome-height: ${WINDOW_CHROME_HEIGHT}px;
}

html[data-dsh-desktop-window-chrome="true"] body {
  box-sizing: border-box !important;
  height: 100vh !important;
  min-height: 0 !important;
  padding-top: var(--dsh-desktop-window-chrome-height) !important;
}

#${WINDOW_CHROME_ID} {
  -webkit-app-region: drag;
  position: fixed;
  z-index: 2147483647;
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  height: var(--dsh-desktop-window-chrome-height);
  align-items: center;
  justify-content: space-between;
  padding: 0 154px 0 16px;
  overflow: hidden;
  color: #d9edf4;
  border-bottom: 1px solid rgba(114, 213, 238, 0.16);
  background:
    radial-gradient(circle at 17px 50%, rgba(105, 227, 255, 0.16), transparent 26px),
    linear-gradient(90deg, rgba(79, 191, 219, 0.08), transparent 30%),
    linear-gradient(180deg, #0b1a22 0%, #071117 100%);
  box-shadow:
    inset 0 1px rgba(225, 249, 255, 0.08),
    0 10px 28px rgba(0, 4, 7, 0.24);
  font-family: "Bahnschrift", "Aptos Display", sans-serif;
  user-select: none;
}

#${WINDOW_CHROME_ID}::after {
  position: absolute;
  right: 154px;
  bottom: 0;
  left: 48px;
  height: 1px;
  content: "";
  opacity: 0.65;
  background: linear-gradient(90deg, rgba(105, 227, 255, 0.55), transparent 24%);
}

#${WINDOW_CHROME_ID} .dsh-window-chrome-brand,
#${WINDOW_CHROME_ID} .dsh-window-chrome-context {
  display: flex;
  min-width: 0;
  align-items: center;
}

#${WINDOW_CHROME_ID} .dsh-window-chrome-brand {
  gap: 10px;
}

#${WINDOW_CHROME_ID} .dsh-window-chrome-mark {
  position: relative;
  width: 20px;
  height: 20px;
  flex: none;
  border: 1px solid rgba(124, 224, 248, 0.42);
  border-radius: 50%;
  background: rgba(4, 14, 20, 0.78);
  box-shadow: inset 0 0 0 4px rgba(105, 227, 255, 0.035);
}

#${WINDOW_CHROME_ID} .dsh-window-chrome-mark::before,
#${WINDOW_CHROME_ID} .dsh-window-chrome-mark::after {
  position: absolute;
  content: "";
  border-radius: 50%;
}

#${WINDOW_CHROME_ID} .dsh-window-chrome-mark::before {
  inset: 4px;
  border: 1px solid rgba(124, 224, 248, 0.5);
}

#${WINDOW_CHROME_ID} .dsh-window-chrome-mark::after {
  top: 8px;
  left: 8px;
  width: 3px;
  height: 3px;
  background: #bff5ff;
  box-shadow: 0 0 7px rgba(105, 227, 255, 0.9);
}

#${WINDOW_CHROME_ID} .dsh-window-chrome-title {
  overflow: hidden;
  color: #e8f6fa;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.11em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

#${WINDOW_CHROME_ID} .dsh-window-chrome-divider {
  width: 28px;
  height: 1px;
  margin: 0 10px;
  background: linear-gradient(90deg, rgba(105, 227, 255, 0.48), rgba(105, 227, 255, 0.06));
}

#${WINDOW_CHROME_ID} .dsh-window-chrome-context {
  color: rgba(171, 209, 220, 0.62);
  font-size: 9px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  white-space: nowrap;
}

#${WINDOW_CHROME_ID} .dsh-window-chrome-mode {
  color: rgba(171, 209, 220, 0.36);
  font-size: 8px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  white-space: nowrap;
}

@media (max-width: 760px) {
  #${WINDOW_CHROME_ID} .dsh-window-chrome-divider,
  #${WINDOW_CHROME_ID} .dsh-window-chrome-context,
  #${WINDOW_CHROME_ID} .dsh-window-chrome-mode {
    display: none;
  }
}

@media (prefers-contrast: more) {
  #${WINDOW_CHROME_ID} {
    border-bottom-color: rgba(190, 238, 250, 0.5);
    background: #071117;
  }
}
`

export function windowChromeBrowserOptions() {
  return {
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#071117',
      symbolColor: '#d9edf4',
      height: WINDOW_CHROME_HEIGHT,
    },
  }
}

export function createWindowChromeScript({ title, context }) {
  const data = JSON.stringify({
    context: String(context || 'Desktop'),
    id: WINDOW_CHROME_ID,
    title: String(title || 'DeepSeek Harness'),
  })
  return `(() => {
    const data = ${data};
    document.getElementById(data.id)?.remove();
    const chrome = document.createElement('div');
    chrome.id = data.id;
    chrome.setAttribute('aria-hidden', 'true');
    chrome.innerHTML = '<div class="dsh-window-chrome-brand"><span class="dsh-window-chrome-mark"></span><span class="dsh-window-chrome-title"></span><span class="dsh-window-chrome-divider"></span><span class="dsh-window-chrome-context"></span></div><span class="dsh-window-chrome-mode">LOCAL SURFACE</span>';
    chrome.querySelector('.dsh-window-chrome-title').textContent = data.title;
    chrome.querySelector('.dsh-window-chrome-context').textContent = data.context;
    document.documentElement.dataset.dshDesktopWindowChrome = 'true';
    document.body.prepend(chrome);
    return true;
  })()`
}

export async function applyWindowChrome({ webContents, title, context }) {
  if (!webContents || webContents.isDestroyed?.()) return false
  await webContents.insertCSS(WINDOW_CHROME_CSS, { cssOrigin: 'author' })
  return webContents.executeJavaScript(createWindowChromeScript({ title, context }), true)
}

export function installWindowChrome({ browserWindow, title, getContext, onError = () => {} }) {
  const { webContents } = browserWindow
  const apply = () => {
    const url = webContents.getURL()
    const context = getContext?.(url) || 'Desktop'
    void applyWindowChrome({ webContents, title, context }).catch(onError)
  }
  webContents.on('did-finish-load', apply)
  return () => webContents.removeListener('did-finish-load', apply)
}
