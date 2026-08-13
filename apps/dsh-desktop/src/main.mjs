export const DESKTOP_METADATA = Object.freeze({
  appId: 'ai.deepseek.harness.desktop',
  productName: 'DeepSeek Harness Desktop',
  profile: 'desktop',
  protocol: 'dsh',
})

export async function bootstrapDesktopApp() {
  const { startElectronApp } = await import('./electron-app.mjs')
  return startElectronApp(DESKTOP_METADATA)
}

if (process.versions.electron) {
  bootstrapDesktopApp().catch((error) => {
    console.error('desktop bootstrap failed', error)
    process.exitCode = 1
  })
}
