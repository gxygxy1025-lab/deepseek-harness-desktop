export const DESKTOP_WORKSPACE_FILE_OPEN_TOKEN_ENV = 'DSH_DESKTOP_WORKSPACE_FILE_OPEN_TOKEN'
export const DESKTOP_WORKSPACE_FILE_OPEN_TOKEN_HEADER = 'x-dsh-desktop-workspace-file-open-token'
export const DESKTOP_WORKSPACE_FILE_OPEN_TOKEN_LENGTH = 43

const TOKEN_PATTERN = new RegExp(`^[A-Za-z0-9_-]{${DESKTOP_WORKSPACE_FILE_OPEN_TOKEN_LENGTH}}$`, 'u')

export function isDesktopWorkspaceFileOpenToken(value) {
  return typeof value === 'string' && TOKEN_PATTERN.test(value)
}

const SAFE_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'mdx', 'rst', 'adoc', 'pdf', 'rtf', 'csv', 'tsv', 'json', 'jsonc',
  'yaml', 'yml', 'toml', 'xml', 'ini', 'conf', 'cfg', 'log', 'diff', 'patch', 'doc', 'docx',
  'odt', 'xls', 'xlsx', 'ods', 'ppt', 'pptx', 'odp', 'png', 'jpg', 'jpeg', 'gif', 'webp',
  'bmp', 'avif', 'ico', 'tif', 'tiff', 'heic', 'heif', 'mp3', 'wav', 'flac', 'ogg', 'oga',
  'opus', 'm4a', 'aac', 'aif', 'aiff', 'mp4', 'm4v', 'mov', 'webm', 'avi', 'mkv', 'mpeg',
  'mpg', 'wmv', '3gp', '3g2', 'ts', 'tsx', 'jsx', 'css', 'scss', 'less', 'c', 'h', 'cc',
  'cpp', 'cxx', 'hpp', 'java', 'cs', 'go', 'rs', 'swift', 'kt', 'kts', 'scala', 'sql',
  'graphql', 'proto', 'prisma', 'vue', 'svelte', 'astro', 'zig', 'dart',
])
const SAFE_NAMES = new Set([
  'license', 'licence', 'readme', 'changelog', 'contributing', 'authors', 'notice',
  'makefile', 'dockerfile', 'justfile', 'gemfile', 'rakefile', 'procfile',
])

function baseName(value) {
  const normalized = value.replaceAll('\\', '/')
  return normalized.slice(normalized.lastIndexOf('/') + 1).replace(/[ .]+$/u, '').toLowerCase()
}

export function isSafeDesktopWorkspaceFileOpenPath(value) {
  if (typeof value !== 'string' || value.length === 0 || /[\u0000-\u001f]/u.test(value)) return false
  const normalized = value.replaceAll('\\', '/')
  if (/^[a-z][a-z\d+.-]*:/iu.test(normalized) && !/^[a-z]:\//iu.test(normalized)) return false
  const base = baseName(value)
  if (base.length === 0 || base.includes(':')) return false
  if (SAFE_NAMES.has(base)) return true
  const dot = base.lastIndexOf('.')
  return dot > 0 && SAFE_EXTENSIONS.has(base.slice(dot + 1))
}
