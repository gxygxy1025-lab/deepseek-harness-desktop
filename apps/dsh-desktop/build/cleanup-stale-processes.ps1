param(
  [Parameter(Mandatory = $true)]
  [string] $InstallDirectory
)

$ErrorActionPreference = 'Stop'
$maxAttempts = 8
$retryDelayMs = 250

try {
  $installInputRoot = [System.IO.Path]::GetFullPath($InstallDirectory).TrimEnd([char[]]@('\', '/'))
  # Keep the provider-resolved spelling as well as the caller's spelling. The
  # native canonicalizer below expands every 8.3 segment before comparison.
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

  $canonicalResourceRoot = [DshInstaller.ProcessPath]::Canonicalize($resourceRoot).TrimEnd([char[]]@('\', '/'))
  $canonicalResourcePrefix = "$canonicalResourceRoot\"
  $candidatePathSet = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
  )
  foreach ($candidatePath in $candidatePaths) {
    $relativePath = $candidatePath.Substring($installRoot.Length).TrimStart([char[]]@('\', '/'))
    $inputCandidatePath = Join-Path $installInputRoot $relativePath
    foreach ($pathVariant in @(
      $candidatePath,
      $inputCandidatePath,
      [DshInstaller.ProcessPath]::Canonicalize($candidatePath),
      [DshInstaller.ProcessPath]::Canonicalize($inputCandidatePath)
    )) {
      if (-not [string]::IsNullOrWhiteSpace($pathVariant)) {
        [void] $candidatePathSet.Add($pathVariant)
      }
    }
  }

  function Get-OwnedProcesses {
    # QueryFullProcessImageName uses a bounded native call and avoids both WMI
    # enumeration and the blocking MainModule/Path property on protected tasks.
    @(foreach ($process in Get-Process -ErrorAction SilentlyContinue) {
      $path = [DshInstaller.ProcessPath]::TryGet([uint32] $process.Id)
      if (-not $path) {
        continue
      }
      $canonicalPath = [DshInstaller.ProcessPath]::Canonicalize($path)
      if ($candidatePathSet.Contains($path) -or $candidatePathSet.Contains($canonicalPath)) {
        $resourceChild = (
          $path.StartsWith($resourcePrefix, $comparison) -or
          $path.StartsWith($resourceInputPrefix, $comparison) -or
          $canonicalPath.StartsWith($canonicalResourcePrefix, $comparison)
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
