import {
  advanceStartupProgress,
  clampProgress,
  createStartupStatusGate,
  initialProgressForState,
  phaseIndexForProgress,
} from './startup-progress.mjs'
import { mountParticleWhale, OFFICIAL_WHALE_PATH } from './whale-particles.mjs'

const title = document.querySelector('#status-title')
const detail = document.querySelector('#status-detail')
const errorLog = document.querySelector('#error-log')
const actions = document.querySelector('#actions')
const version = document.querySelector('#version')
const meter = document.querySelector('#startup-progress')
const progressValue = document.querySelector('#progress-value')
const meterTip = document.querySelector('.meter-tip')
meterTip.innerHTML = `<svg viewBox="0 0 50 50" focusable="false"><path d="${OFFICIAL_WHALE_PATH}"/></svg>`
const whaleCanvas = document.querySelector('#whale-canvas')
const retry = document.querySelector('#retry')
const repair = document.querySelector('#repair')
const technicalDetails = document.querySelector('#technical-details')
const diagnosticExportStatus = document.querySelector('#diagnostic-export-status')

const STARTUP_STALL_NOTICE_MS = 30_000

const copy = {
  stopped: ['正在准备本地环境', '完整 Harness 正在本地启动'],
  starting: ['正在唤醒 Harness', '正在载入运行时、插件与技能'],
  ready: ['探索界面已经就绪', '正在进入 DeepSeek Harness'],
  stopping: ['正在安全停止服务', '请稍候，本地任务正在收束'],
  restarting: ['正在重新连接', '正在恢复本地运行时'],
  crashed: ['本地运行时启动失败', '请先重试；修复只会重建桌面版 Profile'],
}

let currentState = 'stopped'
let progress = 0
let latestStatus = { state: 'stopped' }
let startupStalled = false
let startupStallTimer

function renderProgress(value) {
  const previousRounded = Math.round(progress)
  progress = clampProgress(value)
  const rounded = Math.round(progress)
  meter.style.setProperty('--progress', `${progress.toFixed(2)}%`)
  meter.dataset.phase = String(phaseIndexForProgress(progress))
  meter.setAttribute('aria-valuenow', String(rounded))
  meter.setAttribute('aria-valuetext', `启动进度 ${rounded}%`)
  progressValue.value = `${String(rounded).padStart(2, '0')}%`
  progressValue.textContent = progressValue.value
  if (rounded !== previousRounded) {
    progressValue.classList.remove('is-ticking')
    void progressValue.offsetWidth
    progressValue.classList.add('is-ticking')
  }
}

function startingState(state) {
  return state === 'starting' || state === 'restarting'
}

function updateStartupStall(state, stateChanged) {
  if (!startingState(state)) {
    startupStalled = false
    if (startupStallTimer !== undefined) {
      window.clearTimeout(startupStallTimer)
      startupStallTimer = undefined
    }
    return
  }
  if (!stateChanged) return
  startupStalled = false
  if (startupStallTimer !== undefined) window.clearTimeout(startupStallTimer)
  startupStallTimer = window.setTimeout(() => {
    startupStallTimer = undefined
    if (!startingState(currentState)) return
    startupStalled = true
    render(latestStatus)
  }, STARTUP_STALL_NOTICE_MS)
}

function setDiagnosticExportStatus(message, failed = false) {
  diagnosticExportStatus.hidden = false
  diagnosticExportStatus.textContent = message
  diagnosticExportStatus.dataset.state = failed ? 'error' : 'success'
}

function render(status) {
  const state = copy[status?.state] ? status.state : 'crashed'
  const [heading, message] = copy[state]
  const stateChanged = currentState !== state
  latestStatus = status ?? { state }
  currentState = state
  updateStartupStall(state, stateChanged)
  document.body.dataset.state = state
  title.textContent = heading
  const stalled = startupStalled && startingState(state)
  detail.textContent = status?.restartBlocked === 'repeated-crash'
    ? '已停止自动重启，避免反复崩溃；请打开日志查看底层错误'
    : stalled
    ? '启动耗时较长；可导出诊断日志，或重新尝试启动'
    : message

  const failed = state === 'crashed'
  errorLog.hidden = true
  actions.hidden = !failed && !stalled
  errorLog.textContent = failed
    ? (incident?.technicalDetails || status?.error || 'Unknown runtime error')
    : ''
  retry.hidden = !failed
  repair.hidden = !failed
  technicalDetails.hidden = !failed
  technicalDetails.textContent = '查看技术详情'

  if (Number.isFinite(status?.previewProgress)) renderProgress(status.previewProgress)
  else if (stateChanged || progress === 0) renderProgress(initialProgressForState(state, progress))
}

mountParticleWhale(whaleCanvas)

window.setInterval(() => {
  if (currentState !== 'starting' && currentState !== 'restarting') return
  renderProgress(advanceStartupProgress(currentState, progress))
}, 220)

for (const button of document.querySelectorAll('[data-action]')) {
  button.addEventListener('click', async () => {
    const buttons = [...document.querySelectorAll('[data-action]')]
    const action = button.dataset.action
    if (action === 'export-diagnostics') {
      setDiagnosticExportStatus('正在生成已脱敏的诊断日志…')
    }
    buttons.forEach((item) => { item.disabled = true })
    try {
      const result = await window.dshDesktop.action(action)
      if (action === 'export-diagnostics') {
        setDiagnosticExportStatus(result?.canceled
          ? '已取消导出。'
          : '诊断日志已导出，可附在问题反馈中。')
      }
    } catch (error) {
      if (action === 'export-diagnostics') {
        setDiagnosticExportStatus('导出失败。请重新选择一个可写入的位置后再试。', true)
      } else {
        render({ state: 'crashed', error: error.message })
      }
    } finally {
      buttons.forEach((item) => { item.disabled = false })
    }
  })
}

technicalDetails.addEventListener('click', () => {
  errorLog.hidden = !errorLog.hidden
  technicalDetails.textContent = errorLog.hidden ? '查看技术详情' : '收起技术详情'
})

window.addEventListener('beforeunload', () => {
  if (startupStallTimer !== undefined) window.clearTimeout(startupStallTimer)
})

const previewState = new URLSearchParams(window.location.search).get('preview')
if (previewState && copy[previewState]) {
  try {
    const info = await window.dshDesktop.getInfo()
    version.textContent = `DESKTOP ${info.version}`
  } catch {
    // Preview capture can still render when the desktop bridge is unavailable.
  }
  render({ state: previewState, previewProgress: previewState === 'starting' ? 46 : undefined })
} else {
  try {
    const statusGate = createStartupStatusGate(render)
    window.dshDesktop.onStatus(statusGate.live)
    const [info, initialStatus] = await Promise.all([
      window.dshDesktop.getInfo(),
      window.dshDesktop.getStatus(),
    ])
    version.textContent = `DESKTOP ${info.version}`
    statusGate.initial(initialStatus)
  } catch (error) {
    render({
      state: 'crashed',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
