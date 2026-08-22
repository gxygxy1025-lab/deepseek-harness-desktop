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

