const releaseApi = 'https://api.github.com/repos/ningbainb/deepseek-harness-desktop/releases/latest'

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return null
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatReleaseDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return {
    datetime: date.toISOString().slice(0, 10),
    label: new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date),
  }
}

function setText(selector, value) {
  if (!value) return
  document.querySelectorAll(selector).forEach(node => {
    node.textContent = value
  })
}

function setLinks(selector, value) {
  if (!value) return
  document.querySelectorAll(selector).forEach(link => {
    link.href = value
  })
}

async function hydrateLatestRelease() {
  const card = document.querySelector('[data-release-card]')
  const status = document.querySelector('[data-release-status]')
  try {
    const response = await fetch(releaseApi, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`)

    const release = await response.json()
    const installer = release.assets?.find(asset => asset.name.endsWith('-x64.exe'))
    const checksum = release.assets?.find(asset => asset.name === 'SHA256SUMS.txt')
    if (!installer) throw new Error('release installer is missing')

    const version = String(release.tag_name || '').replace(/^desktop-v/, 'v')
    setLinks('.download-link', installer.browser_download_url)
    setLinks('.release-page-link', release.html_url)
    setLinks('.checksum-link', checksum?.browser_download_url)
    setText('.release-version', version)
    setText('.release-size', formatBytes(installer.size))

    const published = formatReleaseDate(release.published_at)
    if (published) {
      document.querySelectorAll('.release-date').forEach(node => {
        node.textContent = published.label
        node.dateTime = published.datetime
      })
    }
    if (status) status.textContent = 'LIVE FROM GITHUB / 已同步'
    document.documentElement.dataset.releaseSource = 'live'
  } catch {
    if (status) status.textContent = 'FALLBACK / 使用内置版本信息'
    document.documentElement.dataset.releaseSource = 'fallback'
  } finally {
    card?.setAttribute('aria-busy', 'false')
  }
}

const header = document.querySelector('[data-header]')
const syncHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 24)
syncHeader()
window.addEventListener('scroll', syncHeader, { passive: true })

const reveals = [...document.querySelectorAll('.reveal')]
const revealAll = () => reveals.forEach(element => element.classList.add('is-visible'))
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (reduceMotion || !('IntersectionObserver' in window)) {
  revealAll()
} else {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return
      entry.target.classList.add('is-visible')
      observer.unobserve(entry.target)
    })
  }, { rootMargin: '240px 0px', threshold: 0.04 })
  reveals.forEach(element => observer.observe(element))
  window.setTimeout(revealAll, 2_400)
}

hydrateLatestRelease()
