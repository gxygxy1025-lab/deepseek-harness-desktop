export async function readWindowsShiftKey({ loadKoffi = () => import('koffi') } = {}) {
  const imported = await loadKoffi()
  const koffi = imported.default ?? imported
  const user32 = koffi.load('user32.dll')
  try {
    const getAsyncKeyState = user32.func('short __stdcall GetAsyncKeyState(int virtualKey)')
    return (getAsyncKeyState(0x10) & 0x8000) !== 0
  } finally {
    user32.unload?.()
  }
}

export async function launchRequestsSafeMode({
  argv = process.argv,
  environment = process.env,
  platform = process.platform,
  readShiftKey = readWindowsShiftKey,
} = {}) {
  if (environment.DSH_DESKTOP_SAFE_MODE === '1' || argv.includes('--safe-mode')) return true
  if (platform !== 'win32') return false
  try {
    return await readShiftKey()
  } catch {
    return false
  }
}
