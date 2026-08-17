param(
  [Parameter(Mandatory = $true)]
  [string] $InstallDirectory
)

$ErrorActionPreference = 'Stop'
$maxAttempts = 8
$retryDelayMs = 250

try {
  $installRoot = [System.IO.Path]::GetFullPath($InstallDirectory).TrimEnd([char[]]@('\', '/'))
  $volumeRoot = [System.IO.Path]::GetPathRoot($installRoot).TrimEnd([char[]]@('\', '/'))
  if ([string]::IsNullOrWhiteSpace($installRoot) -or $installRoot -eq $volumeRoot) {
    exit 0
  }

  $mainExecutable = Join-Path $installRoot 'DeepSeek Harness Desktop.exe'
  $resourceRoot = Join-Path $installRoot 'resources'
  if (-not (Test-Path -LiteralPath $mainExecutable -PathType Leaf)) {
    exit 0
  }

  $resourcePrefix = "$resourceRoot\"
  $comparison = [System.StringComparison]::OrdinalIgnoreCase
  function Get-OwnedProcesses {
    @(foreach ($process in Get-Process -ErrorAction Stop) {
      try {
        $path = $process.Path
      } catch {
        continue
      }
      if ($path -and (
        $path.Equals($mainExecutable, $comparison) -or
        $path.StartsWith($resourcePrefix, $comparison)
      )) {
        [pscustomobject]@{
          ProcessId = $process.Id
          ExecutablePath = $path
          ResourceChild = $path.StartsWith($resourcePrefix, $comparison)
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
