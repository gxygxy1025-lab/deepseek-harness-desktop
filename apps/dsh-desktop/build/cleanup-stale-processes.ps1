param(
  [Parameter(Mandatory = $true)]
  [string] $InstallDirectory
)

$ErrorActionPreference = 'Stop'
$maxAttempts = 8
$retryDelayMs = 250

try {
  $installInputRoot = [System.IO.Path]::GetFullPath($InstallDirectory).TrimEnd([char[]]@('\', '/'))
  # Get-Item expands an 8.3 path such as RUNNER~1 before it is compared with
  # Win32_Process.ExecutablePath, which reports the canonical long path.
  $installRoot = (Get-Item -LiteralPath $InstallDirectory -ErrorAction Stop).FullName.TrimEnd([char[]]@('\', '/'))
  $volumeRoot = [System.IO.Path]::GetPathRoot($installRoot).TrimEnd([char[]]@('\', '/'))
  if ([string]::IsNullOrWhiteSpace($installRoot) -or $installRoot -eq $volumeRoot) {
    exit 0
  }

  $mainExecutable = Join-Path $installRoot 'DeepSeek Harness Desktop.exe'
  $resourceRoot = Join-Path $installRoot 'resources'
  $resourceInputRoot = Join-Path $installInputRoot 'resources'
  if (-not (Test-Path -LiteralPath $mainExecutable -PathType Leaf)) {
    exit 0
  }

  $resourcePrefix = "$resourceRoot\"
  $resourceInputPrefix = "$resourceInputRoot\"
  $comparison = [System.StringComparison]::OrdinalIgnoreCase
  $candidatePaths = @($mainExecutable)
  if (Test-Path -LiteralPath $resourceRoot -PathType Container) {
    $candidatePaths += @(Get-ChildItem -LiteralPath $resourceRoot -Recurse -File -Filter '*.exe' -ErrorAction SilentlyContinue | ForEach-Object {
      [System.IO.Path]::GetFullPath($_.FullName)
    })
  }
  $candidatePaths = @($candidatePaths | Sort-Object -Unique)
  $candidatePathSet = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
  )
  foreach ($candidatePath in $candidatePaths) {
    [void] $candidatePathSet.Add($candidatePath)
    $relativePath = $candidatePath.Substring($installRoot.Length).TrimStart([char[]]@('\', '/'))
    [void] $candidatePathSet.Add((Join-Path $installInputRoot $relativePath))
  }

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

  function Get-OwnedProcesses {
    # QueryFullProcessImageName uses a bounded native call and avoids both WMI
    # enumeration and the blocking MainModule/Path property on protected tasks.
    @(foreach ($process in Get-Process -ErrorAction SilentlyContinue) {
      $path = [DshInstaller.ProcessPath]::TryGet([uint32] $process.Id)
      if ($path -and $candidatePathSet.Contains($path)) {
        $resourceChild = (
          $path.StartsWith($resourcePrefix, $comparison) -or
          $path.StartsWith($resourceInputPrefix, $comparison)
        )
        [pscustomobject]@{
          ProcessId = $process.Id
          ExecutablePath = $path
          ResourceChild = $resourceChild
        }
      }
    })
  }

  function Get-OwnedProcessPriority($process) {
    if ($process.ResourceChild) {
      return 1
    }
    0
  }

  for ($attempt = 0; $attempt -lt $maxAttempts; $attempt += 1) {
    $targets = @(Get-OwnedProcesses)
    if ($targets.Count -eq 0) {
      exit 0
    }

    $ordered = $targets | Sort-Object @{
      Expression = { Get-OwnedProcessPriority $_ }
      Descending = $true
    }
    foreach ($target in $ordered) {
      Stop-Process -Id $target.ProcessId -Force -ErrorAction SilentlyContinue
    }
    if ($attempt + 1 -lt $maxAttempts) {
      Start-Sleep -Milliseconds $retryDelayMs
    }
  }
} catch {
  exit 32
}

exit 32
