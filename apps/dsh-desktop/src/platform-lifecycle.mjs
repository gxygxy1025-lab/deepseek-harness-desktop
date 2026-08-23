export function supportsPackagedUpdater({ isPackaged, platform, disabled = false } = {}) {
  return isPackaged === true
    && disabled !== true
    && (platform === 'win32' || platform === 'darwin')
}

export function keepsApplicationActiveWithoutWindows(platform) {
  return platform === 'darwin'
}

export function shouldHideMainWindowOnClose({
  platform,
  explicitQuit = false,
  shutdownRequested = false,
} = {}) {
  return platform === 'darwin'
    && explicitQuit !== true
    && shutdownRequested !== true
}
