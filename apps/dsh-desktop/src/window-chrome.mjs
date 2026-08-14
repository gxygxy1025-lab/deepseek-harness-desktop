export const WINDOW_CHROME_HEIGHT = 46

const WINDOW_CHROME_ID = 'dsh-desktop-window-chrome'

export const WINDOW_CHROME_THEMES = Object.freeze({
  dark: Object.freeze({ color: '#071117', symbolColor: '#d9edf4' }),
  light: Object.freeze({ color: '#eef2f8', symbolColor: '#1f2937' }),
})

export function normalizeWindowChromeTheme(value) {
  if (typeof value !== 'string' || !(value in WINDOW_CHROME_THEMES)) {
    throw new TypeError(`invalid window chrome theme: ${JSON.stringify(value)}`)
  }
  return value
}

export function setWindowChromeTheme(browserWindow, rawTheme) {
  const theme = normalizeWindowChromeTheme(rawTheme)
  browserWindow?.setTitleBarOverlay?.({
    ...WINDOW_CHROME_THEMES[theme],
    height: WINDOW_CHROME_HEIGHT,
  })
  return theme
}

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
  color: var(--dsh-desktop-chrome-fg, #d9edf4);
  border-bottom: 1px solid var(--dsh-desktop-chrome-border, rgba(114, 213, 238, 0.16));
  background: var(--dsh-desktop-chrome-bg, linear-gradient(180deg, #0b1a22, #071117));
  box-shadow: var(--dsh-desktop-chrome-shadow, 0 10px 28px rgba(0, 4, 7, 0.24));
  font-family: "Bahnschrift", "Aptos Display", sans-serif;
  user-select: none;
}

html[data-dsh-desktop-chrome-theme="dark"] {
  --dsh-desktop-chrome-fg: #d9edf4;
  --dsh-desktop-chrome-border: rgba(114, 213, 238, 0.16);
  --dsh-desktop-chrome-bg: radial-gradient(circle at 17px 50%, rgba(105, 227, 255, 0.16), transparent 26px), linear-gradient(90deg, rgba(79, 191, 219, 0.08), transparent 30%), linear-gradient(180deg, #0b1a22 0%, #071117 100%);
  --dsh-desktop-chrome-shadow: inset 0 1px rgba(225, 249, 255, 0.08), 0 10px 28px rgba(0, 4, 7, 0.24);
}

html[data-dsh-desktop-chrome-theme="light"] {
  --dsh-desktop-chrome-fg: #1f2937;
  --dsh-desktop-chrome-border: rgba(71, 85, 105, 0.18);
  --dsh-desktop-chrome-bg: radial-gradient(circle at 17px 50%, rgba(59, 130, 246, 0.12), transparent 26px), linear-gradient(90deg, rgba(59, 130, 246, 0.06), transparent 32%), linear-gradient(180deg, #f8fafc 0%, #eef2f8 100%);
  --dsh-desktop-chrome-shadow: inset 0 1px rgba(255, 255, 255, 0.9), 0 8px 24px rgba(15, 23, 42, 0.1);
}

html[data-dsh-desktop-chrome-theme="light"] #${WINDOW_CHROME_ID} .dsh-window-chrome-title {
  color: #111827;
}

html[data-dsh-desktop-chrome-theme="light"] #${WINDOW_CHROME_ID} .dsh-window-chrome-context,
html[data-dsh-desktop-chrome-theme="light"] #${WINDOW_CHROME_ID} .dsh-window-chrome-mode {
  color: rgba(51, 65, 85, 0.7);
}

html[data-dsh-desktop-chrome-theme="light"] #${WINDOW_CHROME_ID} .dsh-window-chrome-mark {
  border-color: rgba(37, 99, 235, 0.42);
  background: rgba(255, 255, 255, 0.76);
}

html[data-dsh-desktop-chrome-theme="light"] #${WINDOW_CHROME_ID} .dsh-window-chrome-mark::after {
  background: #2563eb;
  box-shadow: 0 0 7px rgba(37, 99, 235, 0.55);
}

html[data-dsh-desktop-window-chrome="true"] .dsh-desktop-modal-layer {
  top: var(--dsh-desktop-window-chrome-height) !important;
  height: calc(100vh - var(--dsh-desktop-window-chrome-height)) !important;
  max-height: calc(100vh - var(--dsh-desktop-window-chrome-height)) !important;
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
  const theme = WINDOW_CHROME_THEMES.dark
  return {
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      ...theme,
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

    const isDark = () => {
      if (document.body.hasAttribute('data-ds-dark-theme')) return true;
      const scheme = getComputedStyle(document.documentElement).colorScheme;
      if (scheme && scheme !== 'normal') return scheme.includes('dark');
      const rgb = getComputedStyle(document.body).backgroundColor.match(/\\d+(?:\\.\\d+)?/g)?.slice(0, 3).map(Number);
      return Array.isArray(rgb) && rgb.length === 3 && (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) < 128000;
    };
    let activeTheme;
    const syncTheme = () => {
      const theme = isDark() ? 'dark' : 'light';
      if (document.documentElement.dataset.dshDesktopChromeTheme !== theme) {
        document.documentElement.dataset.dshDesktopChromeTheme = theme;
      }
      if (theme !== activeTheme) {
        activeTheme = theme;
        window.dshDesktop?.setWindowChromeTheme?.(theme);
      }
    };
    const markModalLayers = () => {
      document.querySelectorAll('[role="dialog"], [aria-modal="true"], dialog[open]').forEach((dialog) => {
        let layer = dialog;
        while (layer.parentElement && layer.parentElement !== document.body) {
          if (getComputedStyle(layer).position === 'fixed') break;
          layer = layer.parentElement;
        }
        if (getComputedStyle(layer).position === 'fixed' && !layer.classList.contains('dsh-desktop-modal-layer')) {
          layer.classList.add('dsh-desktop-modal-layer');
        }
      });
    };
    const sync = () => { syncTheme(); markModalLayers(); };
    new MutationObserver(sync).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-ds-dark-theme'],
      childList: true,
      subtree: true,
    });
    sync();
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
