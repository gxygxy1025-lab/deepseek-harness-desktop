export function createRetryableLazyLoader(load) {
  if (typeof load !== 'function') throw new TypeError('optional integration loader must be a function')
  let pending
  return () => {
    if (!pending) {
      pending = Promise.resolve()
        .then(load)
        .catch((error) => {
          pending = undefined
          throw error
        })
    }
    return pending
  }
}

const loadQrCode = createRetryableLazyLoader(() => import('qrcode'))
const loadQqBotConnector = createRetryableLazyLoader(() => import('@tencent-connect/qqbot-connector'))

export async function renderQrDataUrl(value, options) {
  const module = await loadQrCode()
  const qrcode = module.default ?? module
  if (typeof qrcode?.toDataURL !== 'function') throw new TypeError('qrcode module has no toDataURL export')
  return qrcode.toDataURL(value, options)
}

export async function startQqBotConnector(...args) {
  const module = await loadQqBotConnector()
  const start = module.startQrConnect ?? module.default?.startQrConnect
  if (typeof start !== 'function') throw new TypeError('QQ Bot connector has no startQrConnect export')
  return start(...args)
}
