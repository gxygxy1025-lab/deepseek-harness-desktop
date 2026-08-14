import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = path.resolve(import.meta.dirname, '..')
const websiteRoot = path.join(root, 'website')
const htmlPath = path.join(websiteRoot, 'index.html')
const desktopPackagePath = path.join(root, 'apps', 'dsh-desktop', 'package.json')

function collectAttributeValues(html, attribute) {
  const pattern = new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']+)["']`, 'gi')
  return [...html.matchAll(pattern)].map(match => match[1])
}

function isLocalAsset(value) {
  return !value.startsWith('#')
    && !value.startsWith('http://')
    && !value.startsWith('https://')
    && !value.startsWith('mailto:')
    && !value.startsWith('data:')
}

export async function collectWebsiteErrors(html, expectedVersion) {
  const errors = []
  const requiredMarkers = [
    ['main landmark', /\bid=["']main["']/i],
    ['release section', /\bid=["']release["']/i],
    ['release card', /\bdata-release-card\b/i],
    ['download link', /\bclass=["'][^"']*\bdownload-link\b[^"']*["']/i],
    ['release page link', /\bclass=["'][^"']*\brelease-page-link\b[^"']*["']/i],
    ['checksum link', /\bclass=["'][^"']*\bchecksum-link\b[^"']*["']/i],
  ]

  for (const [label, pattern] of requiredMarkers) {
    if (!pattern.test(html)) errors.push(`missing required marker: ${label}`)
  }

  if (/\b(?:href|src)\s*=\s*["']javascript:/i.test(html)) {
    errors.push('javascript: URLs are not allowed')
  }

  if (expectedVersion) {
    const expectedArtifact = `DeepSeek-Harness-Desktop-Setup-${expectedVersion}-x64.exe`
    const artifactVersions = [...html.matchAll(/DeepSeek-Harness-Desktop-Setup-(\d+\.\d+\.\d+)-x64\.exe/g)]
      .map(match => match[1])
    if (!html.includes(expectedArtifact)) errors.push(`website fallback installer must target ${expectedArtifact}`)
    for (const version of new Set(artifactVersions)) {
      if (version !== expectedVersion) errors.push(`website contains stale installer version ${version}; expected ${expectedVersion}`)
    }
    if (!html.includes(`v${expectedVersion}`)) errors.push(`website fallback label must include v${expectedVersion}`)
  }

  const blankLinks = [...html.matchAll(/<a\b[^>]*\btarget=["']_blank["'][^>]*>/gi)]
  for (const match of blankLinks) {
    if (!/\brel=["'][^"']*\bnoreferrer\b[^"']*["']/i.test(match[0])) {
      errors.push(`target=_blank link is missing rel=noreferrer: ${match[0]}`)
    }
  }

  const localAssets = [...new Set([
    ...collectAttributeValues(html, 'href'),
    ...collectAttributeValues(html, 'src'),
  ].filter(isLocalAsset).map(value => value.split(/[?#]/, 1)[0]))]

  for (const relativePath of localAssets) {
    const candidate = path.resolve(websiteRoot, relativePath)
    if (!candidate.startsWith(`${websiteRoot}${path.sep}`)) {
      errors.push(`local asset escapes website directory: ${relativePath}`)
      continue
    }
    try {
      await access(candidate)
    } catch {
      errors.push(`missing local asset: ${relativePath}`)
    }
  }

  return errors
}

export async function validateWebsite() {
  const [html, desktopPackage] = await Promise.all([
    readFile(htmlPath, 'utf8'),
    readFile(desktopPackagePath, 'utf8'),
  ])
  const version = JSON.parse(desktopPackage).version
  const errors = await collectWebsiteErrors(html, version)
  if (errors.length > 0) {
    throw new Error(`website validation failed:\n- ${errors.join('\n- ')}`)
  }
  return localSummary(html)
}

function localSummary(html) {
  const imageCount = collectAttributeValues(html, 'src').filter(value => /\.(?:png|jpe?g|webp|svg)(?:[?#]|$)/i.test(value)).length
  const sectionCount = (html.match(/<section\b/gi) || []).length
  return `validated website: ${sectionCount} sections, ${imageCount} images`
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  validateWebsite()
    .then(summary => console.log(summary))
    .catch(error => {
      console.error(error.message)
      process.exitCode = 1
    })
}
