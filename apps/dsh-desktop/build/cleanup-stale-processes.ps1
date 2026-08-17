param(
  [Parameter(Mandatory = $true)]
  [string] $InstallDirectory
)

$ErrorActionPreference = 'Stop'
$maxAttempts = 8
$retryDelayMs = 250

try {
  # Get-Item expands an 8.3 path such as RUNNER~1 before it is compared with
  # Win32_Process.ExecutablePath, which reports the canonical long path.
  $installRoot = (Get-Item -LiteralPath $InstallDirectory -ErrorAction Stop).FullName.TrimEnd([char[]]@('\', '/'))
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
  $candidatePaths = @($mainExecutable)
  if (Test-Path -LiteralPath $resourceRoot -PathType Container) {
    $candidatePaths += @(Get-ChildItem -LiteralPath $resourceRoot -Recurse -File -Filter '*.exe' -ErrorAction SilentlyContinue | ForEach-Object {
      [System.IO.Path]::GetFullPath($_.FullName)
    })
  }
  $candidatePaths = @($candidatePaths | Sort-Object -Unique)
  $wqlClauses = @(foreach ($candidatePath in $candidatePaths) {
    $wqlPath = $candidatePath.Replace('\', '\\').Replace("'", "\'")
    "ExecutablePath = '$wqlPath'"
  })
  function Get-OwnedProcesses {
    # Keep every WMI query path-filtered. Broad process enumeration can stall on
    # protected processes or endpoint-security hooks during an installer update.
    $processes = @()
    $chunkSize = 16
    for ($offset = 0; $offset -lt $wqlClauses.Count; $offset += $chunkSize) {
      $last = [Math]::Min($offset + $chunkSize - 1, $wqlClauses.Count - 1)
      $filter = @($wqlClauses[$offset..$last]) -join ' OR '
      $processes += @(Get-CimInstance Win32_Process -Filter $filter -ErrorAction Stop)
    }
    @(foreach ($process in $processes) {
      $path = $process.ExecutablePath
      if (-not $path) {
        continue
      }
      if ($path -and (
        $path.Equals($mainExecutable, $comparison) -or
        $path.StartsWith($resourcePrefix, $comparison)
      )) {
        [pscustomobject]@{
          ProcessId = $process.ProcessId
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
