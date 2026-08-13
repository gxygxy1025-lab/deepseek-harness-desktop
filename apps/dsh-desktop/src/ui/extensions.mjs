const pluginList = document.querySelector('#plugin-list')
const skillList = document.querySelector('#skill-list')
const pluginCount = document.querySelector('#plugin-count')
const skillCount = document.querySelector('#skill-count')
const toast = document.querySelector('#toast')

function escapeHtml(value) {
  const element = document.createElement('span')
  element.textContent = String(value)
  return element.innerHTML
}

function notify(message, error = false) {
  toast.textContent = message
  toast.classList.toggle('error', error)
  toast.hidden = false
  clearTimeout(notify.timer)
  notify.timer = setTimeout(() => { toast.hidden = true }, 4_000)
}

function pluginMarkup(plugin) {
  const badge = plugin.builtIn ? '<span class="badge builtin">BUILT-IN</span>' : '<span class="badge">COMMUNITY</span>'
  const requested = plugin.builtIn ? 'Desktop bundle / managed' : plugin.requested
  const action = plugin.builtIn
    ? '<span class="meta">PROTECTED</span>'
    : `<button type="button" class="item-action danger" data-remove-plugin="${escapeHtml(plugin.name)}">移除</button>`
  return `<article class="item"><div><div class="name-row"><span class="name">${escapeHtml(plugin.name)}</span>${badge}</div><p class="description">${escapeHtml(requested)}</p></div>${action}</article>`
}

function skillMarkup(skill) {
  const shadow = skill.shadowed ? '<span class="badge shadowed">SHADOWED</span>' : ''
  return `<article class="item"><div><div class="name-row"><span class="name">${escapeHtml(skill.name)}</span>${shadow}</div><p class="description">${escapeHtml(skill.description)}</p></div><button type="button" class="item-action" data-open-skill="${escapeHtml(skill.id)}">${escapeHtml(skill.source)}</button></article>`
}

async function refresh() {
  document.body.dataset.busy = 'true'
  try {
    const inventory = await window.dshDesktop.listExtensions()
    pluginCount.textContent = inventory.plugins.length
    skillCount.textContent = inventory.skills.length
    pluginList.innerHTML = inventory.plugins.length ? inventory.plugins.map(pluginMarkup).join('') : '<p class="empty">暂无插件</p>'
    skillList.innerHTML = inventory.skills.length ? inventory.skills.map(skillMarkup).join('') : '<p class="empty">尚未发现技能</p>'
  } catch (error) {
    notify(error.message, true)
  } finally {
    delete document.body.dataset.busy
  }
}

for (const tab of document.querySelectorAll('[data-tab]')) {
  tab.addEventListener('click', () => {
    for (const item of document.querySelectorAll('[data-tab]')) item.classList.toggle('active', item === tab)
    for (const panel of document.querySelectorAll('.panel')) {
      const active = panel.id === tab.dataset.tab
      panel.hidden = !active
      panel.classList.toggle('active', active)
    }
  })
}

document.querySelector('#plugin-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  const spec = new FormData(event.currentTarget).get('spec')
  const button = event.currentTarget.querySelector('button')
  button.disabled = true
  try {
    const result = await window.dshDesktop.installPlugin(spec)
    notify(`${result.name} 已安装，DSH 已重启`)
    event.currentTarget.reset()
    await refresh()
  } catch (error) {
    notify(error.message, true)
  } finally {
    button.disabled = false
  }
})

pluginList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-remove-plugin]')
  if (!button) return
  button.disabled = true
  try {
    await window.dshDesktop.removePlugin(button.dataset.removePlugin)
    notify(`${button.dataset.removePlugin} 已移除`)
    await refresh()
  } catch (error) {
    notify(error.message, true)
    button.disabled = false
  }
})

skillList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-open-skill]')
  if (button) await window.dshDesktop.openSkill(button.dataset.openSkill)
})

document.querySelector('#import-skill').addEventListener('click', async () => {
  try {
    const result = await window.dshDesktop.importSkill()
    if (!result.canceled) {
      notify(`${result.skill.name} 已导入`)
      await refresh()
    }
  } catch (error) {
    notify(error.message, true)
  }
})
document.querySelector('#open-skill-root').addEventListener('click', () => window.dshDesktop.openSkillRoot())
document.querySelector('#refresh').addEventListener('click', refresh)

await refresh()
