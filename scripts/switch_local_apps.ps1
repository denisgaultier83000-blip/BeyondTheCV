param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("switch","start","stop","status")]
  [string]$Command,

  [ValidateSet("btcv","bty")]
  [string]$App
)

$scriptPath = "/home/pimpampoum/BeyondTheCV/scripts/switch_local_apps.sh"

if ($Command -ne "status" -and [string]::IsNullOrWhiteSpace($App)) {
  Write-Error "You must provide -App btcv or -App bty for switch/start/stop"
  exit 1
}

if ($Command -eq "status") {
  wsl -e bash -lc "$scriptPath status"
} else {
  wsl -e bash -lc "$scriptPath $Command $App"
}
