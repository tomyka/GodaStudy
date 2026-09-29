# Shows what TAMO sends (subjects, assessment types, values), to check config.json. See tamo-probe.mjs.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
. "$PSScriptRoot\tamo-env.ps1"
node scripts/tamo-probe.mjs
