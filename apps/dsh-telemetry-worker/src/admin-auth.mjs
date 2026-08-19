const COOKIE_NAME = '__Secure-dsh_admin_session'
const SESSION_SECONDS = 8 * 60 * 60
const MAX_LOGIN_BYTES = 512
const BASE64URL_256_PATTERN = /^[A-Za-z0-9_-]{43}$/u
const encoder = new TextEncoder()

function bytesEqual(left, right) {
  if (left.byteLength !== right.byteLength) return false
  let difference = 0
  for (let index = 0; index < left.byteLength; index += 1) {
    difference |= left[index] ^ right[index]
  }
  return difference === 0
}

function base64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

function base64UrlBytes(value) {
  if (!BASE64URL_256_PATTERN.test(value)) return null
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/') + '='
  try {
    const binary = atob(normalized)
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0))
    return bytes.byteLength === 32 ? bytes : null
  } catch {
    return null
  }
}

function randomBase64Url(byteLength) {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)))
}

async function digest(value) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))
}

async function sign(secret, value) {
  const secretBytes = base64UrlBytes(secret)
  if (secretBytes === null) throw new Error('invalid session secret')
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))))
}

function currentDate(seams) {
  return typeof seams.now === 'function' ? seams.now() : new Date()
}

function cookieValue(request) {
  const cookies = request.headers.get('cookie')?.split(';') ?? []
  for (const item of cookies) {
    const [name, ...value] = item.trim().split('=')
    if (name === COOKIE_NAME) return value.join('=')
  }
  return null
}

export function adminConfigured(env) {
  return typeof env?.ADMIN_PASSWORD_SHA256 === 'string'
    && base64UrlBytes(env.ADMIN_PASSWORD_SHA256) !== null
    && typeof env?.ADMIN_SESSION_SECRET === 'string'
    && base64UrlBytes(env.ADMIN_SESSION_SECRET) !== null
}

export async function parseLoginPassword(request) {
  const length = Number.parseInt(request.headers.get('content-length') ?? '', 10)
  if (Number.isFinite(length) && length > MAX_LOGIN_BYTES) return null
  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
  if (contentType !== 'application/x-www-form-urlencoded') return null
  const text = await request.text()
  if (encoder.encode(text).byteLength > MAX_LOGIN_BYTES) return null
  const params = new URLSearchParams(text)
  const entries = [...params.entries()]
  if (entries.length !== 1 || entries[0][0] !== 'password') return null
  const password = entries[0][1]
  return password.length >= 1 && password.length <= 256 ? password : null
}

export async function passwordMatches(candidate, expectedVerifier) {
  if (typeof candidate !== 'string' || typeof expectedVerifier !== 'string') return false
  const expectedDigest = base64UrlBytes(expectedVerifier)
  if (expectedDigest === null) return false
  return bytesEqual(await digest(candidate), expectedDigest)
}

export async function createSession(env, seams = {}) {
  const expiresAt = Math.floor(currentDate(seams).getTime() / 1000) + SESSION_SECONDS
  const payload = 'v1.' + expiresAt + '.' + randomBase64Url(16)
  const signature = await sign(env.ADMIN_SESSION_SECRET, payload)
  return payload + '.' + signature
}

export async function hasValidSession(request, env, seams = {}) {
  if (!adminConfigured(env)) return false
  const token = cookieValue(request)
  if (typeof token !== 'string') return false
  const parts = token.split('.')
  if (
    parts.length !== 4
    || parts[0] !== 'v1'
    || !/^\d{10}$/u.test(parts[1])
    || !/^[A-Za-z0-9_-]{22}$/u.test(parts[2])
    || !BASE64URL_256_PATTERN.test(parts[3])
  ) return false
  const expiresAt = Number.parseInt(parts[1], 10)
  const now = Math.floor(currentDate(seams).getTime() / 1000)
  if (!Number.isSafeInteger(expiresAt) || expiresAt < now || expiresAt > now + SESSION_SECONDS) return false
  const expected = await sign(env.ADMIN_SESSION_SECRET, parts.slice(0, 3).join('.'))
  return bytesEqual(encoder.encode(parts[3]), encoder.encode(expected))
}

export function sessionCookie(token) {
  return COOKIE_NAME + '=' + token
    + '; Path=/admin; Max-Age=' + SESSION_SECONDS
    + '; HttpOnly; Secure; SameSite=Strict'
}

export function clearedSessionCookie() {
  return COOKIE_NAME + '=; Path=/admin; Max-Age=0; HttpOnly; Secure; SameSite=Strict'
}

export const __test = Object.freeze({
  COOKIE_NAME,
  BASE64URL_256_PATTERN,
  MAX_LOGIN_BYTES,
  SESSION_SECONDS,
})
