!macro customCheckAppRunning
  InitPluginsDir
  File /oname=$PLUGINSDIR\cleanup-stale-processes.ps1 "${BUILD_RESOURCES_DIR}\cleanup-stale-processes.ps1"
cleanup_retry:
  nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\cleanup-stale-processes.ps1" -InstallDirectory "$INSTDIR" -InstallRegistryKey "${INSTALL_REGISTRY_KEY}" -UninstallRegistryKey "${UNINSTALL_REGISTRY_KEY}"'
  Pop $0
  Pop $1
  StrCmp $0 "0" cleanup_done
  StrCmp $0 "32" cleanup_busy
  MessageBox MB_ICONSTOP|MB_OK "DeepSeek Harness Desktop 安装检查执行失败（错误码 $0）。安装程序尚未替换文件，请重新下载安装包后重试。$\r$\n$\r$\n$1 / The installation check failed (code $0) before replacing files. Download the installer again and retry."
  Abort
cleanup_busy:
  MessageBox MB_ICONEXCLAMATION|MB_RETRYCANCEL "DeepSeek Harness Desktop 的旧安装进程无法关闭。请重试；如果问题持续，请关闭以管理员身份运行的旧程序后再继续。$\r$\n$\r$\n$1 / A process from the previous installation could not be closed. Retry, or close an elevated old instance before continuing." IDRETRY cleanup_retry
  Abort
cleanup_done:
!macroend
