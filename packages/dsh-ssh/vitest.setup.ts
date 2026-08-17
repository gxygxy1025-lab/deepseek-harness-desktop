// jsdom reports an implementation error when libraries feature-detect Canvas.
// Returning null is the browser contract for an unavailable rendering context
// and lets xterm use its built-in non-Canvas color parser during unit tests.
if (typeof HTMLCanvasElement !== 'undefined') {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => null,
  })
}
