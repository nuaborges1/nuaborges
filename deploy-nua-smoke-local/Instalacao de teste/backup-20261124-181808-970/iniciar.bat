@echo off
setlocal
if /i "%~1"=="--debug" (
    powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0painel.ps1"
    exit /b
)
start "" powershell.exe -NoProfile -STA -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0painel.ps1"
