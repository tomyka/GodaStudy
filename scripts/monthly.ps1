# Monthly job, run by Windows Task Scheduler on the 1st (see README).
# The TAMO login lives only on this PC, so the fetch runs here; the push then triggers
# the GitHub workflow that tests and republishes the page.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
Start-Transcript -Path "$PSScriptRoot\monthly.log" -Append | Out-Null
try {
  . "$PSScriptRoot\tamo-env.ps1"
  git pull --ff-only
  if ($LASTEXITCODE) { throw "git pull failed" }
  node scripts/update.mjs
  if ($LASTEXITCODE) { throw "update failed" }
  git add site/marks.json site/data.json
  git diff --cached --quiet
  if ($LASTEXITCODE) {
    git commit -m "data: TAMO marks $(Get-Date -Format yyyy-MM-dd)"
    git push
    if ($LASTEXITCODE) { throw "git push failed" }
  } else {
    'No new marks'
  }
} finally {
  Remove-Item Env:TAMO_PASSWORD -ErrorAction SilentlyContinue
  Stop-Transcript | Out-Null
}
