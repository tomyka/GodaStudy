# Dot-sourced by the TAMO scripts: puts the saved login (see save-tamo-login.ps1) into the environment.
$loginFile = "$env:APPDATA\GodaStudy\tamo-login.xml"
if (-not (Test-Path $loginFile)) { throw "No saved TAMO login. Run: pwsh scripts/save-tamo-login.ps1" }
$login = Import-Clixml $loginFile
$env:TAMO_USERNAME = $login.UserName
$env:TAMO_PASSWORD = $login.GetNetworkCredential().Password
