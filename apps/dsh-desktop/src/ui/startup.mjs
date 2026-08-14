import {
  advanceStartupProgress,
  clampProgress,
  initialProgressForState,
  phaseIndexForProgress,
} from './startup-progress.mjs'

const title = document.querySelector('#status-title')
const detail = document.querySelector('#status-detail')
const sequence = document.querySelector('#sequence')
const errorLog = document.querySelector('#error-log')
const actions = document.querySelector('#actions')
const version = document.querySelector('#version')
const meter = document.querySelector('#startup-progress')
const meterFill = document.querySelector('#meter-fill')
const progressValue = document.querySelector('#progress-value')
const phases = [...document.querySelectorAll('[data-phase]')]

const copy = {
  stopped: ['准备探索未至之境', 'Securing the local workspace before launch.', 'STANDBY / 00'],
  starting: ['正在唤醒完整 Harness', 'Loading the official runtime, plugins, skins, and skill catalog.', 'LAUNCH / 02'],
  ready: ['探索界面已经就绪', 'Handing control to the original DSH Web surface.', 'ARRIVAL / 03'],
  stopping: ['正在安全收束旅程', 'Waiting for sessions and background work to settle.', 'RETURN / 01'],
  restarting: ['正在重新连接深处', 'Recovering the secure local runtime without losing your workspace.', 'RECOVERY / AUTO'],
  crashed: ['本地运行时未能抵达', 'Use Retry first. Repair only rebuilds the managed desktop profile links.', 'RECOVERY / MANUAL'],
}

let currentState = 'stopped'
let progress = 0

function renderProgress(value) {
  progress = clampProgress(value)
  const rounded = Math.round(progress)
  meterFill.style.setProperty('--progress', `${progress.toFixed(2)}%`)
  meter.setAttribute('aria-valuenow', String(rounded))
  meter.setAttribute('aria-valuetext', `启动进度 ${rounded}%`)
  progressValue.value = `${String(rounded).padStart(2, '0')}%`
  progressValue.textContent = progressValue.value

  const activePhase = phaseIndexForProgress(progress)
  phases.forEach((phase, index) => {
    phase.dataset.complete = String(index < activePhase || progress >= 100)
    if (index === activePhase && progress < 100) phase.setAttribute('aria-current', 'step')
    else phase.removeAttribute('aria-current')
  })
}

function render(status) {
  const state = copy[status?.state] ? status.state : 'crashed'
  const [heading, message, code] = copy[state]
  const stateChanged = currentState !== state
  currentState = state
  document.body.dataset.state = state
  title.textContent = heading
  detail.textContent = message
  sequence.textContent = code

  const failed = state === 'crashed'
  errorLog.hidden = !failed
  actions.hidden = !failed
  errorLog.textContent = failed ? (status?.error || 'Unknown runtime error') : ''

  if (Number.isFinite(status?.previewProgress)) renderProgress(status.previewProgress)
  else if (stateChanged || progress === 0) renderProgress(initialProgressForState(state, progress))
}

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

const info = await window.dshDesktop.getInfo()
version.textContent = `DESKTOP ${info.version}`

const previewState = new URLSearchParams(window.location.search).get('preview')
if (previewState && copy[previewState]) {
  render({ state: previewState, previewProgress: previewState === 'starting' ? 46 : undefined })
} else {
  render(await window.dshDesktop.getStatus())
  window.dshDesktop.onStatus(render)
}
