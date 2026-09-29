# Saves your TAMO parent login for the monthly job. The file is encrypted with Windows DPAPI:
# only your Windows user on this PC can read it, and it never goes into the repo.
# Run it in a normal PowerShell window: it needs to prompt for the username and password.
$ErrorActionPreference = 'Stop'
$file = "$env:APPDATA\GodaStudy\tamo-login.xml"
$login = Get-Credential -Message 'TAMO parent login (dienynas.tamo.lt)'
if (-not $login -or -not $login.UserName -or -not $login.GetNetworkCredential().Password) {
  throw "No login entered, nothing saved. Run this in a normal PowerShell window so it can prompt."
}
New-Item -ItemType Directory -Force (Split-Path $file) | Out-Null
$login | Export-Clixml $file
"Saved to $file"
