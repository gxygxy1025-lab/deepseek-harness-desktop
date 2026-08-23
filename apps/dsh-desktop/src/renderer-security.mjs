const LOOPBACK_RESPONSE_FILTER = Object.freeze({
  urls: ['http://127.0.0.1:*/*', 'http://localhost:*/*', 'http://[::1]:*/*'],
})

// The official Web Surface currently uses inline bootstrap scripts/styles. Keep
// this policy report-only until the upstream injection points support nonces.
export const RENDERER_CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
].join('; ')

function setResponseHeader(headers, name, value) {
  const existingName = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase())
  headers[existingName ?? name] = [value]
}

export function installRendererSecurityHeaders({ session, getActiveOrigin }) {
  if (!session?.webRequest || typeof getActiveOrigin !== 'function') {
    throw new TypeError('renderer security headers require an Electron session and active-origin getter')
  }
  const onHeadersReceived = (details, callback) => {
    const responseHeaders = { ...(details.responseHeaders ?? {}) }
    let sameOrigin = false
    try {
      sameOrigin = new URL(details.url).origin === getActiveOrigin()
    } catch {}
    if (sameOrigin) {
      setResponseHeader(responseHeaders, 'Content-Security-Policy-Report-Only', RENDERER_CSP_REPORT_ONLY)
      if (!Object.keys(responseHeaders).some((key) => key.toLowerCase() === 'x-content-type-options')) {
        setResponseHeader(responseHeaders, 'X-Content-Type-Options', 'nosniff')
      }
    }
    callback({ responseHeaders })
  }
  session.webRequest.onHeadersReceived(LOOPBACK_RESPONSE_FILTER, onHeadersReceived)
  return () => session.webRequest.onHeadersReceived(LOOPBACK_RESPONSE_FILTER, null)
}
