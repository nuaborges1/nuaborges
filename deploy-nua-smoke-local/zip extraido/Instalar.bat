@echo off
setlocal
title NUA BORGES - Atualizar Central de Deploy
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1"
if errorlevel 1 (
    echo.
    echo A atualizacao nao foi instalada. Consulte o erro acima.
    pause
    exit /b 1
)
echo.
echo Atualizado. Use o atalho Deploy Nua Borges na Area de Trabalho.
pause
