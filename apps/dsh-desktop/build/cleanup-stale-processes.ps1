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
    @(Get-CimInstance -ClassName Win32_Process -ErrorAction Stop | Where-Object {
      $path = $_.ExecutablePath
      $path -and (
        $path.Equals($mainExecutable, $comparison) -or
        $path.StartsWith($resourcePrefix, $comparison)
      )
    })
  }

  function Get-OwnedProcessDepth($process, $byId) {
    $depth = 0
    $cursor = $process
    $visited = @{}
    while ($byId.ContainsKey([int] $cursor.ParentProcessId) -and -not $visited.ContainsKey([int] $cursor.ProcessId)) {
      $visited[[int] $cursor.ProcessId] = $true
      $cursor = $byId[[int] $cursor.ParentProcessId]
      $depth += 1
    }
    $depth
  }

  for ($attempt = 0; $attempt -lt $maxAttempts; $attempt += 1) {
    $targets = @(Get-OwnedProcesses)
    if ($targets.Count -eq 0) {
      exit 0
    }

    $byId = @{}
    foreach ($target in $targets) {
      $byId[[int] $target.ProcessId] = $target
    }
    $ordered = $targets | Sort-Object @{
      Expression = { Get-OwnedProcessDepth $_ $byId }
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
