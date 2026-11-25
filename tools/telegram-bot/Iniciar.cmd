@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; $guard=New-Object Threading.Mutex($false,'Local\NuaBorgesTelegramBot'); try { try { $locked=$guard.WaitOne(0) } catch [Threading.AbandonedMutexException] { $locked=$true }; if (-not $locked) { Write-Host 'O bot ja esta em execucao.'; exit 0 }; $s=Get-Content -LiteralPath '.env.local' -Raw; $c=New-Object System.Net.NetworkCredential('',(ConvertTo-SecureString $s.Trim())); $env:TELEGRAM_BOT_TOKEN=$c.Password; node.exe bot.mjs; exit $LASTEXITCODE } finally { if ($locked) { $guard.ReleaseMutex() }; $guard.Dispose() }"
if errorlevel 1 pause
