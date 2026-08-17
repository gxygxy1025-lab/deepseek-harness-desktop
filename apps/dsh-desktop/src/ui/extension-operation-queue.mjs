export function createExtensionOperationQueue({ onBusyChange = () => {} } = {}) {
  if (typeof onBusyChange !== 'function') throw new TypeError('onBusyChange must be a function')
  let tail = Promise.resolve()
  let pending = 0

  const run = (operation) => {
    if (typeof operation !== 'function') throw new TypeError('extension operation must be a function')
    pending += 1
    if (pending === 1) onBusyChange(true)
    const result = tail.then(operation, operation)
    const settled = result.finally(() => {
      pending -= 1
      if (pending === 0) onBusyChange(false)
    })
    tail = settled.catch(() => {})
    return settled
  }

  return Object.freeze({
    run,
    get busy() { return pending > 0 },
  })
}
