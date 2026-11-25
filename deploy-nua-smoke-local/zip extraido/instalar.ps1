param(
    [string]$Destination = (Join-Path ([Environment]::GetFolderPath('DesktopDirectory')) 'Deploy_NuaBorges')
)

$ErrorActionPreference = 'Stop'
$files = @('orquestrador.mjs', 'painel.ps1', 'LEIA-ME.md', 'iniciar.bat')
$mutex = New-Object Threading.Mutex($false, 'Local\NuaBorgesDeployV2')
$ownsMutex = $false
$updated = New-Object 'System.Collections.Generic.List[object]'
$backup = $null
try {
    try { $ownsMutex = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $ownsMutex = $true }
    if (-not $ownsMutex) { throw 'Feche a Central de Deploy e execute o instalador novamente.' }
    $node = Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $node) { throw 'Node.js não encontrado no PATH.' }
    $version = & $node.Source --version
    if ($LASTEXITCODE -ne 0 -or $version -notmatch '^v(\d+)\.' -or [int]$Matches[1] -lt 22) {
        throw 'A Central de Deploy precisa de Node.js 22 ou superior.'
    }
    $Destination = [IO.Path]::GetFullPath($Destination)
    if ($Destination.TrimEnd('\') -eq $PSScriptRoot.TrimEnd('\')) {
        throw 'Baixe e extraia o pacote em uma pasta diferente da Central antes de instalar.'
    }
    foreach ($name in $files) {
        if (-not [IO.File]::Exists((Join-Path $PSScriptRoot $name))) {
            throw ('Arquivo ausente no pacote: ' + $name + '. Extraia todos os arquivos do ZIP.')
        }
    }
    [void][IO.Directory]::CreateDirectory($Destination)
    $existing = @($files | Where-Object { [IO.File]::Exists((Join-Path $Destination $_)) })
    if ($existing.Count) {
        $backup = Join-Path $Destination ('backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
        [void][IO.Directory]::CreateDirectory($backup)
    }
    foreach ($name in $files) {
        $target = Join-Path $Destination $name
        $temporary = $target + '.' + [guid]::NewGuid().ToString('N') + '.tmp'
        $previous = if ($name -in $existing) { Join-Path $backup $name } else { $null }
        try {
            [IO.File]::Copy((Join-Path $PSScriptRoot $name), $temporary)
            if ($previous) {
                [IO.File]::Replace($temporary, $target, $previous)
            } else {
                [IO.File]::Move($temporary, $target)
            }
            $updated.Add(@{ target = $target; previous = $previous })
        } finally {
            if ([IO.File]::Exists($temporary)) { [IO.File]::Delete($temporary) }
        }
    }
    Write-Host ('Central atualizada em ' + $Destination) -ForegroundColor Green
    if ($backup) { Write-Host ('Cópia da versão anterior em ' + $backup) }
} catch {
    $failure = $_.Exception.Message
    for ($index = $updated.Count - 1; $index -ge 0; $index--) {
        $entry = $updated[$index]
        try {
            if ($entry.previous) {
                [IO.File]::Copy($entry.previous, $entry.target, $true)
            } else {
                [IO.File]::Delete($entry.target)
            }
        } catch { Write-Host ('Falha ao restaurar ' + $entry.target + ': ' + $_.Exception.Message) -ForegroundColor Yellow }
    }
    Write-Host $failure -ForegroundColor Red
    exit 1
} finally {
    if ($ownsMutex) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
