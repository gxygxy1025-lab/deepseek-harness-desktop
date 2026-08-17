import { GITHUB_PROJECT_URL } from './community-links.mjs'
import { runBestEffort } from './best-effort-events.mjs'

export function createApplicationMenuTemplate({
  app,
  shell,
  controller,
  openCommunity,
  openFeedback,
  openExtensions,
  openLogs,
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
      label: '帮助 / Help',
      submenu: [
        { label: '检查更新 / Check for Updates', click: action(() => checkForUpdates({ manual: true })) },
        { type: 'separator' },
        { label: '加入社群 / Join QQ Group', click: action(openCommunity) },
        { label: '提建议 / Suggest an Idea', click: action(openFeedback) },
        { label: 'GitHub 项目', click: action(() => shell.openExternal(GITHUB_PROJECT_URL)) },
        { type: 'separator' },
        { label: `版本 / Version ${app.getVersion()}`, enabled: false },
      ],
    },
  ]
}

export function installApplicationMenu(options) {
  const { Menu } = options
  const template = createApplicationMenuTemplate(options)
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
