/**
 * Shared Desktop authority policy for the native workspace-file opener.
 *
 * The Electron main process and its always-mounted host route use this exact
 * allowlist. `shell.openPath()` follows operating-system associations, so a
 * denylist would leave future executable/shortcut extensions exposed.
 */

/**
 * Process-private Desktop-to-Host capability transport. These identifiers are
 * deliberately public constants; only the per-runtime random value is
 * secret. It must never cross a renderer/preload/SDK boundary.
 */
export const DESKTOP_WORKSPACE_FILE_OPEN_TOKEN_ENV = 'DSH_DESKTOP_WORKSPACE_FILE_OPEN_TOKEN'
export const DESKTOP_WORKSPACE_FILE_OPEN_TOKEN_HEADER = 'x-dsh-desktop-workspace-file-open-token'
export const DESKTOP_WORKSPACE_FILE_OPEN_TOKEN_LENGTH = 43

const DESKTOP_WORKSPACE_FILE_OPEN_TOKEN_PATTERN = new RegExp(
  `^[A-Za-z0-9_-]{${DESKTOP_WORKSPACE_FILE_OPEN_TOKEN_LENGTH}}$`,
  'u',
)

/** True only for the base64url encoding of Desktop's 32-byte launch secret. */
export function isDesktopWorkspaceFileOpenToken(value: unknown): value is string {
  return typeof value === 'string' && DESKTOP_WORKSPACE_FILE_OPEN_TOKEN_PATTERN.test(value)
}

const SAFE_EXTERNAL_OPEN_EXTENSIONS = new Set([
  // Documents and ordinary text.
  'txt', 'md', 'markdown', 'mdx', 'rst', 'adoc', 'pdf', 'rtf', 'csv', 'tsv',
  'json', 'jsonc', 'yaml', 'yml', 'toml', 'xml', 'ini', 'conf', 'cfg', 'log', 'diff', 'patch',
  // Office documents without macro-enabled variants.
  'doc', 'docx', 'odt', 'xls', 'xlsx', 'ods', 'ppt', 'pptx', 'odp',
  // Raster images. SVG and HTML are excluded because their system handlers
  // can execute embedded script.
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'avif', 'ico', 'tif', 'tiff', 'heic', 'heif',
  // Audio and video.
  'mp3', 'wav', 'flac', 'ogg', 'oga', 'opus', 'm4a', 'aac', 'aif', 'aiff',
  'mp4', 'm4v', 'mov', 'webm', 'avi', 'mkv', 'mpeg', 'mpg', 'wmv', '3gp', '3g2',
  // Source forms that do not have a native script handler on supported hosts.
  'ts', 'tsx', 'jsx', 'css', 'scss', 'less', 'c', 'h', 'cc', 'cpp', 'cxx', 'hpp',
  'java', 'cs', 'go', 'rs', 'swift', 'kt', 'kts', 'scala', 'sql', 'graphql', 'proto',
  'prisma', 'vue', 'svelte', 'astro', 'zig', 'dart',
])
const SAFE_EXTERNAL_OPEN_NAMES = new Set([
  'license', 'licence', 'readme', 'changelog', 'contributing', 'authors', 'notice',
  'makefile', 'dockerfile', 'justfile', 'gemfile', 'rakefile', 'procfile',
])

function normalizedOpenBaseName(value: string): string {
  const normalized = value.replaceAll('\\', '/')
  const base = normalized.slice(normalized.lastIndexOf('/') + 1)
  // Windows discards trailing spaces and dots while resolving a path. Strip
  // them before the extension check so `payload.cmd.` cannot bypass it.
  return base.replace(/[ .]+$/u, '').toLowerCase()
}

/**
 * True only for a non-shell-dispatched file type allowed by Desktop's native
 * opener. It rejects Windows alternate data streams as well as script,
 * shortcut, executable, and URL-shaped names by construction.
 */
export function isSafeDesktopWorkspaceFileOpenPath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || /[\u0000-\u001f]/u.test(value)) return false
  const normalized = value.replaceAll('\\', '/')
  // This policy is also applied to the absolute path returned by the host, so
  // retain ordinary Windows drive paths while rejecting URL schemes such as
  // `file:`, `https:`, and `shell:` before a filename suffix can match.
  if (/^[a-z][a-z\d+.-]*:/iu.test(normalized) && !/^[a-z]:\//iu.test(normalized)) return false
  const base = normalizedOpenBaseName(value)
  if (base.length === 0 || base.includes(':')) return false
  if (SAFE_EXTERNAL_OPEN_NAMES.has(base)) return true
  const dot = base.lastIndexOf('.')
  return dot > 0 && SAFE_EXTERNAL_OPEN_EXTENSIONS.has(base.slice(dot + 1))
}
