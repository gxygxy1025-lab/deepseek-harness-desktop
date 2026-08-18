param(
  [Parameter(Mandatory = $true)]
  [string] $InstallDirectory,

  [string] $InstallRegistryKey = '',

  [string] $UninstallRegistryKey = ''
)

$ErrorActionPreference = 'Stop'
$mainExecutableName = 'DeepSeek Harness Desktop.exe'
$shutdownProtocolMarker = 'resources\update-shutdown-v1'
$gracefulShutdownTimeoutMs = 7000
$forceAttempts = 12
$retryDelayMs = 400

try {
  if (-not ('DshInstaller.ProcessPath' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

namespace DshInstaller
{
    public static class ProcessPath
    {
        private const uint PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr OpenProcess(
            uint processAccess,
            bool inheritHandle,
            uint processId);

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool QueryFullProcessImageName(
            IntPtr process,
            uint flags,
            StringBuilder executablePath,
            ref uint size);

        [DllImport("kernel32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool CloseHandle(IntPtr handle);

        [DllImport("kernel32.dll", EntryPoint = "GetLongPathNameW", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern uint GetLongPathName(
            string shortPath,
            StringBuilder longPath,
            uint bufferLength);

        public static string Canonicalize(string path)
        {
            if (String.IsNullOrWhiteSpace(path))
            {
                return path;
            }

            string fullPath;
            try
            {
                fullPath = System.IO.Path.GetFullPath(path);
            }
            catch
            {
                return path;
            }

            StringBuilder longPath = new StringBuilder(32768);
            uint size = GetLongPathName(fullPath, longPath, (uint) longPath.Capacity);
            if (size == 0 || size >= longPath.Capacity)
            {
                return fullPath;
            }
            return longPath.ToString();
        }

        public static string TryGet(uint processId)
        {
            IntPtr process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, processId);
            if (process == IntPtr.Zero)
            {
                return null;
            }

            try
            {
                StringBuilder executablePath = new StringBuilder(32768);
                uint size = (uint) executablePath.Capacity;
                if (!QueryFullProcessImageName(process, 0, executablePath, ref size))
                {
                    return null;
                }
                return executablePath.ToString();
            }
            finally
            {
                CloseHandle(process);
            }
        }
    }
}
'@
  }

  $comparison = [System.StringComparison]::OrdinalIgnoreCase
  $installRoots = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
  )

  function Add-InstallRoot([string] $path) {
    if ([string]::IsNullOrWhiteSpace($path)) {
      return
    }
    try {
      $fullPath = [System.IO.Path]::GetFullPath($path).TrimEnd([char[]]@('\', '/'))
      $volumeRoot = [System.IO.Path]::GetPathRoot($fullPath).TrimEnd([char[]]@('\', '/'))
      if (-not [string]::IsNullOrWhiteSpace($fullPath) -and $fullPath -ne $volumeRoot) {
        [void] $installRoots.Add($fullPath)
      }
    } catch {
      # A stale registry value must not turn into a false process warning.
    }
  }

  function Get-UninstallerDirectory([string] $uninstallString) {
    if ([string]::IsNullOrWhiteSpace($uninstallString)) {
      return $null
    }
    $match = [System.Text.RegularExpressions.Regex]::Match($uninstallString, '^\s*"([^"]+)"')
    $uninstallerPath = if ($match.Success) {
      $match.Groups[1].Value
    } else {
      ($uninstallString -split '\s+', 2)[0]
    }
    try {
      [System.IO.Path]::GetDirectoryName([System.IO.Path]::GetFullPath($uninstallerPath))
    } catch {
      $null
    }
  }

  Add-InstallRoot $InstallDirectory
  foreach ($hive in @('HKEY_CURRENT_USER', 'HKEY_LOCAL_MACHINE')) {
    if (-not [string]::IsNullOrWhiteSpace($InstallRegistryKey)) {
      $installState = Get-ItemProperty -LiteralPath "Registry::$hive\$InstallRegistryKey" -ErrorAction SilentlyContinue
      Add-InstallRoot $installState.InstallLocation
    }
    if (-not [string]::IsNullOrWhiteSpace($UninstallRegistryKey)) {
      $uninstallState = Get-ItemProperty -LiteralPath "Registry::$hive\$UninstallRegistryKey" -ErrorAction SilentlyContinue
      Add-InstallRoot (Get-UninstallerDirectory $uninstallState.UninstallString)
    }
  }

  $existingRoots = @($installRoots | Where-Object {
    Test-Path -LiteralPath $_ -PathType Container
  })
  if ($existingRoots.Count -eq 0) {
    exit 0
  }

  $rootVariants = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
  )
  foreach ($root in $existingRoots) {
    $installItem = Get-Item -LiteralPath $root -ErrorAction SilentlyContinue
    foreach ($variant in @(
      $root,
      $installItem.FullName,
      [DshInstaller.ProcessPath]::Canonicalize($root),
      [DshInstaller.ProcessPath]::Canonicalize($installItem.FullName)
    )) {
      if (-not [string]::IsNullOrWhiteSpace($variant)) {
        [void] $rootVariants.Add($variant.TrimEnd([char[]]@('\', '/')))
      }
    }
  }

  function Get-Ownership([string] $path) {
    if ([string]::IsNullOrWhiteSpace($path)) {
      return $null
    }
    $pathVariants = @($path, [DshInstaller.ProcessPath]::Canonicalize($path))
    foreach ($pathVariant in $pathVariants) {
      if ([string]::IsNullOrWhiteSpace($pathVariant)) {
        continue
      }
      foreach ($root in $rootVariants) {
        $mainExecutable = Join-Path $root $mainExecutableName
        if ($pathVariant.Equals($mainExecutable, $comparison)) {
          return [pscustomobject]@{ Kind = 'main'; Root = $root }
        }
        $resourcePrefix = "$(Join-Path $root 'resources')\"
        if ($pathVariant.StartsWith($resourcePrefix, $comparison)) {
          return [pscustomobject]@{ Kind = 'resource'; Root = $root }
        }
      }
    }
    $null
  }

  function Get-DirectInstallProcesses {
    @(foreach ($process in Get-Process -ErrorAction SilentlyContinue) {
      $path = [DshInstaller.ProcessPath]::TryGet([uint32] $process.Id)
      $ownership = Get-Ownership $path
      if (-not $ownership) {
        continue
      }
      [pscustomobject]@{
        ProcessId = [uint32] $process.Id
        ExecutablePath = $path
        Kind = $ownership.Kind
        Root = $ownership.Root
      }
    })
  }

  # Old runtimes may host descendants (hidden PowerShell/CMD/Node) outside the install
  # directory. They still block file replacement through working-directory handles or
  # loaded modules, so attribute them by an install-root reference on the command line.
  # 2.2 hosts its runtime through powershell -EncodedCommand, where the install path
  # only exists inside the Base64 payload, so decode those payloads before matching.
  # Path-only attribution keeps unrelated same-host processes (an official web runtime
  # using ~/.dsh, same-name apps elsewhere, this script) untouched.
  $selfPid = [uint32] $PID

  function Get-CommandLineVariants([string] $commandLine) {
    $variants = [System.Collections.Generic.List[string]]::new()
    if ([string]::IsNullOrWhiteSpace($commandLine)) {
      return , $variants
    }
    $variants.Add($commandLine)
    foreach ($match in [System.Text.RegularExpressions.Regex]::Matches(
      $commandLine,
      '(?i)-e(?:c|nc(?:odedcommand)?)?\s+"?([A-Za-z0-9+/=]{16,})"?'
    )) {
      try {
        $decoded = [System.Text.Encoding]::Unicode.GetString(
          [System.Convert]::FromBase64String($match.Groups[1].Value)
        )
        if (-not [string]::IsNullOrWhiteSpace($decoded)) {
          $variants.Add($decoded)
        }
      } catch {
        # Not a Base64 encoded command; the plaintext variant already covers it.
      }
    }
    return , $variants
  }

  function Get-AttributedInstallProcesses([System.Collections.Generic.HashSet[uint32]] $directProcessIds) {
    @(foreach ($cim in (Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)) {
      $processId = [uint32] $cim.ProcessId
      if ($processId -eq $selfPid -or $directProcessIds.Contains($processId)) {
        continue
      }
      # TryGet can fail on elevated processes; the WMI executable path is a fallback
      # so such processes are still reported instead of failing the file copy later.
      $ownership = Get-Ownership $cim.ExecutablePath
      if ($ownership) {
        [pscustomobject]@{
          ProcessId = $processId
          ExecutablePath = $cim.ExecutablePath
          Kind = $ownership.Kind
          Root = $ownership.Root
        }
        continue
      }
      foreach ($variant in (Get-CommandLineVariants $cim.CommandLine)) {
        $matchedRoot = $null
        foreach ($root in $rootVariants) {
          if ($variant.IndexOf($root, $comparison) -ge 0) {
            $matchedRoot = $root
            break
          }
        }
        if ($null -ne $matchedRoot) {
          [pscustomobject]@{
            ProcessId = $processId
            ExecutablePath = if ($cim.ExecutablePath) { $cim.ExecutablePath } else { $cim.Name }
            Kind = 'attributed'
            Root = $matchedRoot
          }
          break
        }
      }
    })
  }

  function Get-InstallProcesses {
    $direct = @(Get-DirectInstallProcesses)
    $directProcessIds = [System.Collections.Generic.HashSet[uint32]]::new()
    foreach ($target in $direct) {
      [void] $directProcessIds.Add($target.ProcessId)
    }
    $direct + @(Get-AttributedInstallProcesses $directProcessIds)
  }

  $targets = @(Get-InstallProcesses)
  if ($targets.Count -eq 0) {
    exit 0
  }

  $requestedGracefulShutdown = $false
  foreach ($root in $existingRoots) {
    $mainExecutable = Join-Path $root $mainExecutableName
    $marker = Join-Path $root $shutdownProtocolMarker
    $hasRunningMain = $targets | Where-Object {
      $_.Kind -eq 'main' -and $_.ExecutablePath.Equals($mainExecutable, $comparison)
    } | Select-Object -First 1
    if (-not $hasRunningMain -or -not (Test-Path -LiteralPath $marker -PathType Leaf)) {
      continue
    }
    try {
      [void] (Start-Process -FilePath $mainExecutable -ArgumentList '--shutdown-for-update' -WindowStyle Hidden -PassThru)
      $requestedGracefulShutdown = $true
    } catch {
      # The exact-path force fallback below remains available for legacy or damaged installs.
    }
  }

  if ($requestedGracefulShutdown) {
    $gracefulWait = [System.Diagnostics.Stopwatch]::StartNew()
    do {
      Start-Sleep -Milliseconds $retryDelayMs
      $targets = @(Get-InstallProcesses)
      if ($targets.Count -eq 0) {
        exit 0
      }
    } while ($gracefulWait.ElapsedMilliseconds -lt $gracefulShutdownTimeoutMs)
  }

  for ($attempt = 0; $attempt -lt $forceAttempts; $attempt += 1) {
    $targets = @(Get-InstallProcesses)
    if ($targets.Count -eq 0) {
      exit 0
    }

    # Stop the Desktop host first so it cannot recreate a runtime while cleanup is in progress.
    foreach ($target in ($targets | Sort-Object @{ Expression = { $_.Kind -eq 'main' }; Descending = $true })) {
      Stop-Process -Id $target.ProcessId -Force -ErrorAction SilentlyContinue
    }
    foreach ($target in $targets) {
      Wait-Process -Id $target.ProcessId -Timeout 1 -ErrorAction SilentlyContinue
    }
    if ($attempt + 1 -lt $forceAttempts) {
      Start-Sleep -Milliseconds $retryDelayMs
    }
  }

  $remaining = @(Get-InstallProcesses)
  foreach ($target in $remaining) {
    Write-Output "busy pid=$($target.ProcessId) path=$($target.ExecutablePath)"
  }
  exit 32
} catch {
  Write-Output "preflight-error: $($_.Exception.Message)"
  exit 33
}
