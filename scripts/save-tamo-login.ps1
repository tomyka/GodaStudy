# Saves your TAMO parent login for the monthly job. The file is encrypted with Windows DPAPI:
# only your Windows user on this PC can read it, and it never goes into the repo.
$ErrorActionPreference = 'Stop'
$file = "$env:APPDATA\GodaStudy\tamo-login.xml"
New-Item -ItemType Directory -Force (Split-Path $file) | Out-Null
Get-Credential -Message 'TAMO parent login (dienynas.tamo.lt)' | Export-Clixml $file
"Saved to $file"
