export const WINDOW_CHROME_HEIGHT = 32

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
  padding: 0 140px 0 10px;
  overflow: hidden;
  border-bottom: 1px solid var(--dsh-desktop-chrome-border, rgba(174, 232, 245, 0.12));
  background-color: var(--dsh-desktop-chrome-bg, rgba(8, 18, 24, 0.7));
  background-image: linear-gradient(180deg, var(--dsh-desktop-chrome-highlight, rgba(255, 255, 255, 0.08)), transparent 58%);
  box-shadow: var(--dsh-desktop-chrome-shadow, inset 0 1px rgba(235, 251, 255, 0.1), 0 1px 6px rgba(0, 3, 7, 0.12));
  -webkit-backdrop-filter: blur(26px) saturate(145%);
  backdrop-filter: blur(26px) saturate(145%);
  isolation: isolate;
  user-select: none;
}

html[data-dsh-desktop-chrome-theme="dark"] {
  --dsh-desktop-chrome-border: rgba(174, 232, 245, 0.12);
  --dsh-desktop-chrome-bg: rgba(8, 18, 24, 0.7);
  --dsh-desktop-chrome-highlight: rgba(255, 255, 255, 0.08);
  --dsh-desktop-chrome-sheen: rgba(148, 226, 245, 0.055);
  --dsh-desktop-chrome-shadow: inset 0 1px rgba(235, 251, 255, 0.1), 0 1px 6px rgba(0, 3, 7, 0.12);
}

html[data-dsh-desktop-chrome-theme="light"] {
  --dsh-desktop-chrome-border: rgba(71, 85, 105, 0.13);
  --dsh-desktop-chrome-bg: rgba(246, 248, 252, 0.72);
  --dsh-desktop-chrome-highlight: rgba(255, 255, 255, 0.58);
  --dsh-desktop-chrome-sheen: rgba(255, 255, 255, 0.3);
  --dsh-desktop-chrome-shadow: inset 0 1px rgba(255, 255, 255, 0.82), 0 1px 6px rgba(15, 23, 42, 0.08);
}

html[data-dsh-desktop-window-chrome="true"] .dsh-desktop-modal-layer {
  top: var(--dsh-desktop-window-chrome-height) !important;
  height: calc(100vh - var(--dsh-desktop-window-chrome-height)) !important;
  max-height: calc(100vh - var(--dsh-desktop-window-chrome-height)) !important;
}

#${WINDOW_CHROME_ID}::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  content: "";
  pointer-events: none;
  background:
    linear-gradient(108deg, var(--dsh-desktop-chrome-sheen, rgba(148, 226, 245, 0.055)), transparent 24%),
    linear-gradient(90deg, transparent 54%, rgba(255, 255, 255, 0.025) 72%, transparent 90%);
}

#${WINDOW_CHROME_ID} .dsh-window-chrome-icon {
  position: relative;
  z-index: 1;
  width: 18px;
  height: 18px;
  flex: none;
  border-radius: 5px;
  object-fit: contain;
  filter: saturate(106%) drop-shadow(0 1px 2px rgba(0, 8, 18, 0.3));
}

@media (prefers-contrast: more) {
  #${WINDOW_CHROME_ID} {
    border-bottom-color: rgba(190, 238, 250, 0.5);
    background: #071117;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
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

export function createWindowChromeScript({ iconDataUrl = '' } = {}) {
  const data = JSON.stringify({
    iconDataUrl: String(iconDataUrl),
    id: WINDOW_CHROME_ID,
  })
  return `(() => {
    const data = ${data};
    document.getElementById(data.id)?.remove();
    const chrome = document.createElement('div');
    chrome.id = data.id;
    chrome.setAttribute('aria-hidden', 'true');
    const icon = document.createElement('img');
    icon.className = 'dsh-window-chrome-icon';
    icon.alt = '';
    icon.draggable = false;
    if (data.iconDataUrl) icon.src = data.iconDataUrl;
    chrome.append(icon);
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

export async function applyWindowChrome({ webContents, iconDataUrl }) {
  if (!webContents || webContents.isDestroyed?.()) return false
  await webContents.insertCSS(WINDOW_CHROME_CSS, { cssOrigin: 'author' })
  return webContents.executeJavaScript(createWindowChromeScript({ iconDataUrl }), true)
}

export function installWindowChrome({ browserWindow, iconDataUrl, onError = () => {} }) {
  const { webContents } = browserWindow
  const apply = () => {
    void applyWindowChrome({ webContents, iconDataUrl }).catch(onError)
  }
  webContents.on('did-finish-load', apply)
  return () => webContents.removeListener('did-finish-load', apply)
}
