const UPDATE_SURFACE_ID = 'dsh-desktop-update-surface'

export const UPDATE_SURFACE_CSS = `
#${UPDATE_SURFACE_ID} {
  position: fixed;
  z-index: 2147483646;
  inset: var(--dsh-desktop-window-chrome-height, 32px) 0 0;
  display: grid;
  place-items: center;
  padding: 24px;
  color: var(--dsw-alias-label-primary, #0f1115);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif;
}

#${UPDATE_SURFACE_ID}[hidden] { display: none; }

#${UPDATE_SURFACE_ID} .dsh-update-mask {
  position: absolute;
  inset: 0;
  background: var(--dsw-alias-bg-mask-1, rgba(17, 24, 39, 0.28));
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
}

#${UPDATE_SURFACE_ID} .dsh-update-panel {
  position: relative;
  width: min(520px, calc(100vw - 48px));
  max-height: min(680px, calc(100vh - 88px));
  padding: 22px 24px 24px;
  overflow: auto;
  border: 1px solid var(--dsw-alias-border-l2, #e1e4e8);
  border-radius: 18px;
  background: var(--dsw-alias-bg-base, #ffffff);
  box-shadow: var(--dsw-shadow-lv3, 0 0 1px rgba(0, 0, 0, 0.2), 0 0 4px rgba(0, 0, 0, 0.02), 0 12px 32px rgba(0, 0, 0, 0.08));
}

#${UPDATE_SURFACE_ID} .dsh-update-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

#${UPDATE_SURFACE_ID} .dsh-update-kicker {
  margin: 0 0 4px;
  color: var(--dsw-alias-label-secondary, #737984);
  font-size: 12px;
}

#${UPDATE_SURFACE_ID} .dsh-update-title {
  margin: 0;
  color: var(--dsw-alias-label-primary, #0f1115);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

#${UPDATE_SURFACE_ID} .dsh-update-close {
  width: 30px;
  height: 30px;
  flex: none;
  border: 0;
  border-radius: 28px;
  color: var(--dsw-alias-label-secondary, #656b75);
  background: transparent;
  cursor: pointer;
  font-size: 20px;
}

#${UPDATE_SURFACE_ID} .dsh-update-status {
  margin: 18px 0 0;
  color: var(--dsw-alias-label-secondary, #656b75);
  font-size: 13px;
  line-height: 1.6;
}

#${UPDATE_SURFACE_ID} .dsh-update-version {
  display: flex;
  gap: 8px;
  margin: 14px 0 0;
  color: var(--dsw-alias-label-secondary, #656b75);
  font-size: 12px;
}

#${UPDATE_SURFACE_ID} .dsh-update-version span {
  padding: 4px 8px;
  border: 1px solid var(--dsw-alias-border-l1, #e5e7eb);
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-2, #f7f8fa);
}

#${UPDATE_SURFACE_ID} .dsh-update-notes {
  max-height: 230px;
  margin: 14px 0 0;
  padding: 12px 14px;
  overflow: auto;
  border: 1px solid var(--dsw-alias-border-l1, #e5e7eb);
  border-radius: 8px;
  color: var(--dsw-alias-label-secondary, #656b75);
  background: var(--dsw-alias-bg-layer-2, #f7f8fa);
  font: 12px/1.65 "Segoe UI Variable Text", "Microsoft YaHei UI", sans-serif;
  white-space: pre-wrap;
}

#${UPDATE_SURFACE_ID} .dsh-update-progress {
  height: 4px;
  margin-top: 18px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--dsw-alias-interactive-bg-hover, #e8ebf0);
}

#${UPDATE_SURFACE_ID} .dsh-update-progress i {
  display: block;
  width: var(--dsh-update-progress, 0%);
  height: 100%;
  border-radius: inherit;
  background: var(--dsw-alias-state-business-primary, #4d78e8);
  transition: width 260ms ease;
}

#${UPDATE_SURFACE_ID} .dsh-update-actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 20px;
}

#${UPDATE_SURFACE_ID} .dsh-update-action {
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l2, #d9dce1);
  border-radius: 14px;
  color: var(--dsw-alias-label-primary, #3f444c);
  background: var(--dsw-alias-bg-base, #ffffff);
  cursor: pointer;
  font: 400 12px/18px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

#${UPDATE_SURFACE_ID} .dsh-update-action[data-primary="true"] {
  min-height: 34px;
  padding-inline: 14px;
  border-color: var(--dsw-alias-state-business-primary, #4d78e8);
  border-radius: 9px;
  color: var(--dsw-alias-label-primary-foreground, #ffffff);
  background: var(--dsw-alias-button-info-fill, #4d78e8);
}

#${UPDATE_SURFACE_ID} .dsh-update-close:hover,
#${UPDATE_SURFACE_ID} .dsh-update-action:hover:not([data-primary="true"]) {
  background: var(--dsw-alias-interactive-bg-hover, #f1f2f4);
}

#${UPDATE_SURFACE_ID} .dsh-update-action[data-primary="true"]:hover {
  background: var(--dsw-alias-button-info-hover, #416ad3);
}

#${UPDATE_SURFACE_ID} button:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary, #4d78e8);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  #${UPDATE_SURFACE_ID} * { transition: none !important; }
}
`

export function createUpdateSurfaceScript() {
  return `(() => {
    const id = '${UPDATE_SURFACE_ID}';
    document.getElementById(id)?.remove();
    const api = window.dshDesktop;
    if (typeof api?.getUpdateStatus !== 'function') return false;

    const root = document.createElement('div');
    root.id = id;
    root.hidden = true;
    const mask = document.createElement('div');
    mask.className = 'dsh-update-mask';
    const panel = document.createElement('section');
    panel.className = 'dsh-update-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'dsh-update-title');

    const header = document.createElement('header');
    header.className = 'dsh-update-header';
    const heading = document.createElement('div');
    const kicker = document.createElement('p');
    kicker.className = 'dsh-update-kicker';
    kicker.textContent = '桌面版更新';
    const title = document.createElement('h2');
    title.id = 'dsh-update-title';
    title.className = 'dsh-update-title';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'dsh-update-close';
    close.setAttribute('aria-label', '关闭更新窗口');
    close.textContent = '×';
    heading.append(kicker, title);
    header.append(heading, close);

    const status = document.createElement('p');
    status.className = 'dsh-update-status';
    const versions = document.createElement('div');
    versions.className = 'dsh-update-version';
    const notes = document.createElement('pre');
    notes.className = 'dsh-update-notes';
    const progress = document.createElement('div');
    progress.className = 'dsh-update-progress';
    progress.setAttribute('role', 'progressbar');
    const progressFill = document.createElement('i');
    progress.append(progressFill);
    const actions = document.createElement('div');
    actions.className = 'dsh-update-actions';
    panel.append(header, status, versions, notes, progress, actions);
    root.append(mask, panel);
    document.body.append(root);

    const button = (label, action, primary = false) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'dsh-update-action';
      item.dataset.action = action;
      item.dataset.primary = String(primary);
      item.textContent = label;
      return item;
    };
    const later = button('稍后', 'later');
    const recheck = button('重新检查', 'check');
    const install = button('重启并安装', 'install', true);

    const hide = () => { root.hidden = true; };
    const show = () => { root.hidden = false; close.focus(); };
    const render = (value = {}) => {
      const phase = value.phase || 'idle';
      const percent = Math.max(0, Math.min(100, Number(value.percent) || 0));
      progress.style.setProperty('--dsh-update-progress', percent + '%');
      progress.setAttribute('aria-valuenow', String(Math.round(percent)));
      versions.replaceChildren();
      if (value.currentVersion) {
        const current = document.createElement('span');
        current.textContent = '当前 ' + value.currentVersion;
        versions.append(current);
      }
      if (value.version) {
        const next = document.createElement('span');
        next.textContent = '最新 ' + value.version;
        versions.append(next);
      }
      notes.textContent = value.releaseNotes || '';
      notes.hidden = !value.releaseNotes;
      progress.hidden = phase !== 'downloading';
      actions.replaceChildren();

      if (phase === 'checking') {
        title.textContent = '正在检查更新';
        status.textContent = '正在连接桌面版更新服务，请稍候。';
        actions.append(later);
      } else if (phase === 'downloading') {
        title.textContent = '正在后台下载';
        status.textContent = '新版本正在静默下载，你可以继续当前工作。已完成 ' + Math.round(percent) + '%。';
        actions.append(later);
      } else if (phase === 'ready') {
        title.textContent = '新版本已准备就绪';
        status.textContent = '更新已经下载完成。重启前会安全停止本地 Harness 运行时。';
        actions.append(later, install);
      } else if (phase === 'current') {
        title.textContent = '已经是最新版本';
        status.textContent = '当前桌面版无需更新。';
        actions.append(later, recheck);
      } else if (phase === 'unavailable') {
        title.textContent = '当前环境无法检查更新';
        status.textContent = '桌面更新仅在已安装的 Windows 版本中可用。';
        actions.append(later);
      } else if (phase === 'error') {
        title.textContent = '更新没有完成';
        status.textContent = value.message || '请检查网络连接后重试。';
        actions.append(later, recheck);
      } else {
        title.textContent = '桌面版更新';
        status.textContent = '点击检查以获取最新桌面版本。';
        actions.append(later, recheck);
      }
      if (value.visible || phase === 'ready') show();
    };

    close.addEventListener('click', hide);
    mask.addEventListener('click', hide);
    later.addEventListener('click', hide);
    recheck.addEventListener('click', () => { void api.checkForUpdates(); });
    install.addEventListener('click', () => { install.disabled = true; void api.installUpdate().finally(() => { install.disabled = false; }); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !root.hidden) hide(); });
    api.onUpdateStatus?.(render);
    void api.getUpdateStatus().then(render).catch(() => {});
    return true;
  })()`
}

export async function applyUpdateSurface({ webContents }) {
  if (!webContents || webContents.isDestroyed?.()) return false
  await webContents.insertCSS(UPDATE_SURFACE_CSS, { cssOrigin: 'author' })
  return webContents.executeJavaScript(createUpdateSurfaceScript(), true)
}

export function installUpdateSurface({ browserWindow, onError = () => {} }) {
  const { webContents } = browserWindow
  const apply = () => {
    void applyUpdateSurface({ webContents }).catch(onError)
  }
  webContents.on('did-finish-load', apply)
  return () => webContents.removeListener('did-finish-load', apply)
}
