!macro customInit
  InitPluginsDir
  File /oname=$PLUGINSDIR\cleanup-stale-processes.ps1 "${BUILD_RESOURCES_DIR}\cleanup-stale-processes.ps1"
cleanup_retry:
  nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\cleanup-stale-processes.ps1" -InstallDirectory "$INSTDIR"'
  Pop $0
  Pop $1
  StrCmp $0 "0" cleanup_done
  MessageBox MB_ICONEXCLAMATION|MB_RETRYCANCEL "DeepSeek Harness Desktop 仍有后台进程，安装程序暂时无法安全替换文件。请重试，或取消后结束相关进程。 / DeepSeek Harness Desktop still has background processes. Retry, or cancel and close them before installing." IDRETRY cleanup_retry
  Abort
cleanup_done:
!macroend
