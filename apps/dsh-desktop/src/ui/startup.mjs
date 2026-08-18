import {
  advanceStartupProgress,
  clampProgress,
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
const recoverySummary = document.querySelector('#recovery-summary')
const recoveryTitle = document.querySelector('#recovery-title')
const recoveryReason = document.querySelector('#recovery-reason')
const disablePlugin = document.querySelector('#disable-plugin')
const safeMode = document.querySelector('#safe-mode')
const retry = document.querySelector('#retry')
const repair = document.querySelector('#repair')
const technicalDetails = document.querySelector('#technical-details')

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

function render(status) {
  const state = copy[status?.state] ? status.state : 'crashed'
  const [heading, message] = copy[state]
  const stateChanged = currentState !== state
  currentState = state
  document.body.dataset.state = state
  title.textContent = heading
  const recovery = status?.recovery
  const incident = recovery?.currentIncident
  detail.textContent = recovery?.safeMode
    ? '桌面版正在使用只加载内置插件的安全模式'
    : status?.restartBlocked === 'repeated-crash'
    ? '已停止自动重启，避免反复崩溃；请打开日志查看底层错误'
    : message

  const failed = state === 'crashed'
  const identifiedPlugin = failed && incident?.identified && incident?.pluginName
  recoverySummary.hidden = !failed || !incident
  if (incident) {
    recoveryTitle.textContent = identifiedPlugin
      ? `检测到插件 ${incident.pluginName} 导致启动失败`
      : '插件恢复中心已接管本次启动失败'
    recoveryReason.textContent = incident.summary || '未能可靠定位故障插件，请进入安全模式。'
  }
  errorLog.hidden = true
  actions.hidden = !failed
  errorLog.textContent = failed
    ? (incident?.technicalDetails || status?.error || 'Unknown runtime error')
    : ''
  disablePlugin.hidden = !identifiedPlugin
  safeMode.hidden = false
  retry.hidden = Boolean(incident)
  repair.hidden = Boolean(incident)
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
    buttons.forEach((item) => { item.disabled = true })
    try {
      await window.dshDesktop.action(button.dataset.action)
    } catch (error) {
      render({ state: 'crashed', error: error.message })
    } finally {
      buttons.forEach((item) => { item.disabled = false })
    }
  })
}

technicalDetails.addEventListener('click', () => {
  errorLog.hidden = !errorLog.hidden
  technicalDetails.textContent = errorLog.hidden ? '查看技术详情' : '收起技术详情'
})

const info = await window.dshDesktop.getInfo()
version.textContent = `DESKTOP ${info.version}`

const previewState = new URLSearchParams(window.location.search).get('preview')
if (previewState && copy[previewState]) {
  render({ state: previewState, previewProgress: previewState === 'starting' ? 46 : undefined })
} else {
  render(await window.dshDesktop.getStatus())
  window.dshDesktop.onStatus(render)
}
