import { GITHUB_PROJECT_URL, PRIVACY_POLICY_URL } from './community-links.mjs'
import { runBestEffort } from './best-effort-events.mjs'

export function createApplicationMenuTemplate({
  app,
  shell,
  controller,
  openCommunity,
  openFeedback,
  openExtensions,
  openLogs,
  openPrivacy = () => shell.openExternal(PRIVACY_POLICY_URL),
  openProject = () => shell.openExternal(GITHUB_PROJECT_URL),
  checkForUpdates,
  onActionError = () => {},
}) {
  const action = (operation) => () => runBestEffort(operation, onActionError)
  return [
    {
      label: '应用 / App',
      submenu: [
        { role: 'quit', label: '退出 / Quit' },
      ],
    },
    {
      label: '运行时 / Runtime',
      submenu: [
        { label: '重启 DSH / Restart DSH', accelerator: 'CmdOrCtrl+Shift+R', click: action(() => controller.restart()) },
        { label: '打开日志 / Open Logs', click: action(openLogs) },
      ],
    },
    {
      label: '视图 / View',
      submenu: [
        { role: 'reload', label: '刷新界面 / Reload' },
        { role: 'forceReload', label: '强制刷新 / Force Reload' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放 / Actual Size' },
        { role: 'zoomIn', label: '放大 / Zoom In' },
        { role: 'zoomOut', label: '缩小 / Zoom Out' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏 / Full Screen' },
      ],
    },
    {
      label: '工具 / Tools',
      submenu: [
        { label: '扩展坞 / Extension Dock', accelerator: 'CmdOrCtrl+Shift+X', click: action(openExtensions) },
      ],
    },
    {
      label: '编辑 / Edit',
      submenu: [
        { role: 'undo', label: '撤销 / Undo' },
        { role: 'redo', label: '重做 / Redo' },
        { type: 'separator' },
        { role: 'cut', label: '剪切 / Cut' },
        { role: 'copy', label: '复制 / Copy' },
        { role: 'paste', label: '粘贴 / Paste', accelerator: 'CmdOrCtrl+V' },
        { role: 'selectAll', label: '全选 / Select All' },
      ],
    },
    {
      label: '帮助 / Help',
      submenu: [
        { label: '检查更新 / Check for Updates', click: action(() => checkForUpdates({ manual: true })) },
        { type: 'separator' },
        { label: '加入社群 / Join QQ Group', click: action(openCommunity) },
        { label: '提建议 / Suggest an Idea', click: action(openFeedback) },
        { label: 'GitHub 项目', click: action(openProject) },
        { label: '隐私政策 / Privacy', click: action(openPrivacy) },
        { type: 'separator' },
        { label: `版本 / Version ${app.getVersion()}`, enabled: false },
      ],
    },
  ]
}

/** Install native right-click and terminal-style keyboard paste affordances. */
export function installEditContextMenu({ webContents, Menu }) {
  const onContextMenu = (_event, params = {}) => {
    const menu = Menu.buildFromTemplate([
      { role: 'cut', label: '剪切 / Cut', enabled: params.editFlags?.canCut === true },
      { role: 'copy', label: '复制 / Copy', enabled: params.editFlags?.canCopy === true || Boolean(params.selectionText) },
      { role: 'paste', label: '粘贴 / Paste' },
      { type: 'separator' },
      { role: 'selectAll', label: '全选 / Select All' },
    ])
    menu.popup()
  }
  const onBeforeInput = (event, input = {}) => {
    if (input.type !== 'keyDown' || String(input.key).toLowerCase() !== 'v') return
    if (!(input.control || input.meta) || !input.shift || input.alt) return
    event.preventDefault()
    webContents.paste()
  }
  webContents.on('context-menu', onContextMenu)
  webContents.on('before-input-event', onBeforeInput)
  return () => {
    webContents.removeListener('context-menu', onContextMenu)
    webContents.removeListener('before-input-event', onBeforeInput)
  }
}

export function installApplicationMenu(options) {
  const { Menu } = options
  const template = createApplicationMenuTemplate(options)
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
