const releaseApi = 'https://api.github.com/repos/ningbainb/deepseek-harness-desktop/releases/latest'

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return null
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function hydrateLatestRelease() {
  try {
    const response = await fetch(releaseApi, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!response.ok) return

    const release = await response.json()
    const installer = release.assets?.find(asset => asset.name.endsWith('-x64.exe'))
    if (!installer) return

    const version = String(release.tag_name || '').replace(/^desktop-v/, 'v')
    document.querySelectorAll('.download-link').forEach(link => {
      link.href = installer.browser_download_url
    })
    if (version) {
      document.querySelectorAll('.release-version').forEach(node => {
        node.textContent = version
      })
    }

    const size = formatBytes(installer.size)
    if (size) {
      document.querySelectorAll('.release-size').forEach(node => {
        node.textContent = size
      })
    }
  } catch {
    // The checked-in release link remains usable when GitHub's API is unavailable.
  }
}

const header = document.querySelector('[data-header]')
const syncHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 24)
syncHeader()
window.addEventListener('scroll', syncHeader, { passive: true })

const reveals = document.querySelectorAll('.reveal')
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return
    entry.target.classList.add('is-visible')
    observer.unobserve(entry.target)
  })
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })

reveals.forEach(element => observer.observe(element))
hydrateLatestRelease()
