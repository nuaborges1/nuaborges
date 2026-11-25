param(
    [string]$SmokeTestPath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
if ($SmokeTestPath) { [Windows.Forms.Application]::SetUnhandledExceptionMode('ThrowException') }
[Windows.Forms.Application]::EnableVisualStyles()

$base = $PSScriptRoot
$logDirectory = Join-Path $base 'logs'
$preferencesPath = Join-Path $base 'preferencias.json'
$deploymentKeys = @('site', 'admin', 'admingeral')
$deploymentNames = @{ site = 'Site público'; admin = 'Painel da Nua'; admingeral = 'Central Dev' }
$defaultUrls = @{ site = 'https://nuaborges.com.br'; admin = 'https://admin.nuaborges.com.br'; admingeral = 'https://admingeral.pages.dev' }
$allowedDefaultModes = @{ deploy = 'Publicar'; build = 'Gerar pacotes'; tests = 'Rodar testes'; cloudflare = 'Conta Cloudflare'; http = 'Checar domínios'; plan = 'Plano de deploy' }

$colors = @{
    background = '#111014'; surface = '#1B1920'; field = '#24212A'; border = '#38323F'
    text = '#F8F4F8'; muted = '#C5B9C7'; accent = '#8A3152'; accentHover = '#A44468'
    success = '#8BE3B1'; warning = '#FFD383'; error = '#FF9AAE'; info = '#E7A8C0'; console = '#100E13'
}

function Get-Color([string]$name) {
    [Drawing.ColorTranslator]::FromHtml($colors[$name])
}

function New-Label([string]$text, [float]$size = 10, [string]$color = 'text', [bool]$bold = $false) {
    $label = New-Object Windows.Forms.Label
    $label.Text = $text
    $weight = if ($bold) { [Drawing.FontStyle]::Bold } else { [Drawing.FontStyle]::Regular }
    $label.Font = New-Object Drawing.Font('Segoe UI', $size, $weight)
    $label.ForeColor = Get-Color $color
    $label.TextAlign = 'MiddleLeft'
    $label.AutoEllipsis = $true
    $label.Dock = 'Fill'
    $label
}

function New-Button([string]$text, [bool]$primary = $false) {
    $button = New-Object Windows.Forms.Button
    $style = if ($primary) { 'accent' } else { 'field' }
    $hover = if ($primary) { 'accentHover' } else { 'border' }
    $button.Text = $text
    $button.Font = New-Object Drawing.Font('Segoe UI', 10, [Drawing.FontStyle]::Bold)
    $button.BackColor = Get-Color $style
    $button.ForeColor = Get-Color 'text'
    $button.FlatStyle = 'Flat'
    $button.FlatAppearance.BorderColor = Get-Color $style
    $button.FlatAppearance.BorderSize = 1
    $button.FlatAppearance.MouseOverBackColor = Get-Color $hover
    $button.UseVisualStyleBackColor = $false
    $button.Cursor = [Windows.Forms.Cursors]::Hand
    $button.Dock = 'Fill'
    $button.Add_Paint({
        param($sender, $eventArgs)
        if (-not $sender.Enabled) {
            $eventArgs.Graphics.Clear((Get-Color 'surface'))
            $rect = $sender.ClientRectangle
            $flags = [Windows.Forms.TextFormatFlags]'HorizontalCenter, VerticalCenter, EndEllipsis'
            [Windows.Forms.TextRenderer]::DrawText($eventArgs.Graphics, $sender.Text, $sender.Font, $rect, (Get-Color 'muted'), $flags)
        }
    })
    $button
}

function New-Check([string]$text, [bool]$checked = $false) {
    $check = New-Object Windows.Forms.CheckBox
    $check.Text = $text
    $check.Checked = $checked
    $check.ForeColor = Get-Color 'text'
    $check.Dock = 'Fill'
    $check.Cursor = [Windows.Forms.Cursors]::Hand
    $check
}

function New-Grid([int]$columns, [int]$rows, [string]$background = 'surface', [int]$padding = 0) {
    $grid = New-Object Windows.Forms.TableLayoutPanel
    $grid.Dock = 'Fill'
    $grid.ColumnCount = $columns
    $grid.RowCount = $rows
    $grid.Padding = New-Object Windows.Forms.Padding($padding)
    $grid.Margin = New-Object Windows.Forms.Padding(0)
    $grid.BackColor = Get-Color $background
    $grid
}

function Add-Row($grid, [float]$size, [string]$type = 'Absolute') {
    [void]$grid.RowStyles.Add((New-Object Windows.Forms.RowStyle($type, $size)))
}

function Add-Column($grid, [float]$size, [string]$type = 'Absolute') {
    [void]$grid.ColumnStyles.Add((New-Object Windows.Forms.ColumnStyle($type, $size)))
}

function Read-Settings([string]$file) {
    if (-not [IO.File]::Exists($file)) { return $null }
    [IO.File]::ReadAllText($file) | ConvertFrom-Json
}

function Open-Local([string]$path) {
    try { Start-Process -FilePath $path }
    catch { Set-Status $_.Exception.Message 'error' }
}

function Open-Web([string]$value) {
    $url = $null
    if ([Uri]::TryCreate($value, [UriKind]::Absolute, [ref]$url) -and $url.Scheme -eq 'https' -and -not $url.UserInfo) {
        Open-Local $url.AbsoluteUri
    }
}

function Format-Time([double]$milliseconds) {
    $span = [TimeSpan]::FromMilliseconds([Math]::Max(0, $milliseconds))
    '{0:D2}:{1:D2}' -f [int][Math]::Floor($span.TotalMinutes), $span.Seconds
}

$startupWarning = $null
try {
    $config = Read-Settings (Join-Path $base 'config.json')
    $preferences = Read-Settings $preferencesPath
} catch {
    $startupWarning = 'Não foi possível ler as preferências ou o config.json. ' + $_.Exception.Message
}

$mutex = $null
$ownsMutex = $false
if (-not $SmokeTestPath) {
    $mutex = New-Object Threading.Mutex($false, 'Local\NuaBorgesDeployV2')
    try { $ownsMutex = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $ownsMutex = $true }
    if (-not $ownsMutex) {
        [void][Windows.Forms.MessageBox]::Show('A Central de Deploy já está aberta.', 'NUA BORGES')
        $mutex.Dispose()
        exit
    }
}

$form = New-Object Windows.Forms.Form
$form.Text = 'NUA BORGES | Central de Deploy'
$form.StartPosition = 'CenterScreen'
$form.AutoScaleMode = 'Dpi'
$form.Size = New-Object Drawing.Size(1160, 780)
$form.MinimumSize = New-Object Drawing.Size(900, 700)
$form.Font = New-Object Drawing.Font('Segoe UI', 10)
$form.BackColor = Get-Color 'background'
$form.ForeColor = Get-Color 'text'
$form.KeyPreview = $true

$root = New-Grid 1 3 'background' 20
Add-Column $root 100 Percent
Add-Row $root 74
Add-Row $root 100 Percent
Add-Row $root 39
$form.Controls.Add($root)

$header = New-Grid 4 2 'background'
Add-Column $header 100 Percent
Add-Column $header 92
Add-Column $header 90
Add-Column $header 100
Add-Row $header 37
Add-Row $header 27
$root.Controls.Add($header, 0, 0)
$header.Controls.Add((New-Label 'NUA BORGES' 24 'text' $true), 0, 0)
$header.Controls.Add((New-Label 'Central de deploy  /  Cloudflare Pages' 10 'muted'), 0, 1)
$clock = New-Label '00:00' 16 'muted' $true
$clock.TextAlign = 'MiddleRight'
$header.Controls.Add($clock, 1, 0)
$browserButton = New-Button 'Cloudflare'
$historyButton = New-Button 'Histórico'
$header.Controls.Add($historyButton, 2, 0)
$header.Controls.Add($browserButton, 3, 0)

$body = New-Grid 3 1 'background'
Add-Column $body 294
Add-Column $body 14
Add-Column $body 100 Percent
Add-Row $body 100 Percent
$root.Controls.Add($body, 0, 1)

$left = New-Grid 1 17 'surface' 16
Add-Column $left 100 Percent
foreach ($height in @(29, 30, 30, 30, 37, 12, 29, 30, 30, 30, 18, 47, 37, 37, 37, 39)) {
    Add-Row $left $height
}
Add-Row $left 100 Percent
$body.Controls.Add($left, 0, 0)
$left.Controls.Add((New-Label 'Destinos de produção' 12 'text' $true), 0, 0)
$initialTargets = @($preferences.targets)
if (-not $preferences.targets) {
    $initialTargets = if ($config.default_options.target -in $deploymentKeys) { @($config.default_options.target) } else { $deploymentKeys }
}
$targetChecks = @{}
for ($index = 0; $index -lt $deploymentKeys.Count; $index++) {
    $key = $deploymentKeys[$index]
    $check = New-Check $deploymentNames[$key] ($key -in $initialTargets)
    $targetChecks[$key] = $check
    $left.Controls.Add($check, 0, 1 + $index)
}
$presets = New-Grid 2 1
Add-Column $presets 50 Percent
Add-Column $presets 50 Percent
$all = New-Button 'Todos'
$client = New-Button 'Site + painel'
$presets.Controls.Add($all, 0, 0)
$presets.Controls.Add($client, 1, 0)
$left.Controls.Add($presets, 0, 4)
$left.Controls.Add((New-Label 'Opções de publicação' 12 'text' $true), 0, 6)

$tests = New-Check 'Rodar testes antes' ([bool]$config.default_options.run_tests)
if ($null -ne $preferences.tests) { $tests.Checked = $preferences.tests }
$reuse = New-Check 'Reutilizar o último build'
$openBrowser = New-Check 'Abrir domínios após publicar' ([bool]$config.default_options.open_browser)
if ($null -ne $preferences.openBrowser) { $openBrowser.Checked = $preferences.openBrowser }
$left.Controls.Add($tests, 0, 7)
$left.Controls.Add($reuse, 0, 8)
$left.Controls.Add($openBrowser, 0, 9)
$publish = New-Button 'Publicar em produção' $true
$left.Controls.Add($publish, 0, 11)
$plan = New-Button 'Ver plano'
$cancel = New-Button 'Cancelar'
$cancel.Enabled = $false
$controlGroup = New-Grid 2 1
Add-Column $controlGroup 50 Percent
Add-Column $controlGroup 50 Percent
$controlGroup.Controls.Add($plan, 0, 0)
$controlGroup.Controls.Add($cancel, 1, 0)
$left.Controls.Add($controlGroup, 0, 12)
$build = New-Button 'Só gerar pacotes'
$test = New-Button 'Só rodar testes'
$utilityGroup = New-Grid 2 1
Add-Column $utilityGroup 50 Percent
Add-Column $utilityGroup 50 Percent
$utilityGroup.Controls.Add($build, 0, 0)
$utilityGroup.Controls.Add($test, 1, 0)
$left.Controls.Add($utilityGroup, 0, 13)
$http = New-Button 'Checar domínios'
$account = New-Button 'Conta Cloudflare'
$checkGroup = New-Grid 2 1
Add-Column $checkGroup 50 Percent
Add-Column $checkGroup 50 Percent
$checkGroup.Controls.Add($http, 0, 0)
$checkGroup.Controls.Add($account, 1, 0)
$left.Controls.Add($checkGroup, 0, 14)
$retry = New-Button 'Publicar destinos pendentes'
$retry.Enabled = $false
$left.Controls.Add($retry, 0, 15)

$right = New-Grid 1 8 'surface' 14
Add-Column $right 100 Percent
foreach ($height in @(34, 29, 6, 32, 32, 32, 36)) { Add-Row $right $height }
Add-Row $right 100 Percent
$body.Controls.Add($right, 2, 0)
$statusLabel = New-Label 'Pronto para publicar' 16 'text' $true
$stageLabel = New-Label 'Escolha os destinos e veja o plano antes de publicar.' 10 'muted'
$progress = New-Object Windows.Forms.Panel
$progress.Dock = 'Fill'
$progress.Margin = New-Object Windows.Forms.Padding(4, 0, 4, 1)
$progress.BackColor = Get-Color 'border'
$progressFill = New-Object Windows.Forms.Panel
$progressFill.BackColor = Get-Color 'accentHover'
$progressFill.Dock = 'Left'
$progressFill.Width = 0
$progress.Controls.Add($progressFill)

$right.Controls.Add($statusLabel, 0, 0)
$right.Controls.Add($stageLabel, 0, 1)
$right.Controls.Add($progress, 0, 2)

$targetViews = @{}
for ($index = 0; $index -lt $deploymentKeys.Count; $index++) {
    $key = $deploymentKeys[$index]
    $row = New-Grid 4 1
    Add-Column $row 128
    Add-Column $row 100 Percent
    Add-Column $row 92
    Add-Column $row 92
    $row.Controls.Add((New-Label $deploymentNames[$key] 10 'text' $true), 0, 0)
    $status = New-Label 'Aguardando seleção' 10 'muted'
    $domain = New-Button 'Domínio'
    $version = New-Button 'Versão'
    $domain.Tag = $defaultUrls[$key]
    $version.Enabled = $false
    $domain.Add_Click({ param($sender, $eventArgs) Open-Web $sender.Tag })
    $version.Add_Click({ param($sender, $eventArgs) Open-Web $sender.Tag })
    $row.Controls.Add($status, 1, 0)
    $row.Controls.Add($domain, 2, 0)
    $row.Controls.Add($version, 3, 0)
    $targetViews[$key] = @{ status = $status; domain = $domain; version = $version }
    $right.Controls.Add($row, 0, 3 + $index)
}

$consoleBar = New-Grid 4 1
Add-Column $consoleBar 100 Percent
Add-Column $consoleBar 110
Add-Column $consoleBar 76
Add-Column $consoleBar 110
$consoleBar.Controls.Add((New-Label 'Console' 12 'text' $true), 0, 0)
$details = New-Check 'Detalhado' ([bool]$preferences.details)
$copy = New-Button 'Copiar'
$logButton = New-Button 'Último log'
$logButton.Enabled = $false
$consoleBar.Controls.Add($details, 1, 0)
$consoleBar.Controls.Add($copy, 2, 0)
$consoleBar.Controls.Add($logButton, 3, 0)
$right.Controls.Add($consoleBar, 0, 6)

$console = New-Object Windows.Forms.RichTextBox
$console.Dock = 'Fill'
$console.BackColor = Get-Color 'console'
$console.ForeColor = Get-Color 'text'
$console.Font = New-Object Drawing.Font('Consolas', 10)
$console.BorderStyle = 'FixedSingle'
$console.ReadOnly = $true
$console.WordWrap = $false
$console.DetectUrls = $false
$console.HideSelection = $false
$console.ScrollBars = 'Both'
$right.Controls.Add($console, 0, 7)

$footer = New-Label 'Ctrl + Enter publica  ·  Ctrl + L abre o log  ·  Esc cancela uma execução' 9 'muted'
$root.Controls.Add($footer, 0, 2)
$hints = New-Object Windows.Forms.ToolTip
$hints.SetToolTip($reuse, 'Publica os arquivos do último build válido deste painel. Alterações feitas depois dele exigem um novo build.')
$hints.SetToolTip($plan, 'Confere o projeto, os destinos e os pacotes selecionados sem publicar.')
$hints.SetToolTip($retry, 'Reusa os pacotes validados e publica apenas os destinos que ainda não foram iniciados.')
$hints.SetToolTip($details, 'Exibe também as linhas de detalhe. O log em disco contém a saída dos comandos.')
$hints.SetToolTip($cancel, 'Encerra o comando atual e impede iniciar os próximos. Uma publicação recebida pela Cloudflare pode seguir ativa.')

$script:worker = $null
$script:runResult = $null
$script:latestLog = Get-ChildItem -LiteralPath $logDirectory -Filter '*.log' -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
$logButton.Enabled = [bool]$script:latestLog
$script:pendingTargets = @()
$script:closeWhenDone = $false
$script:finishedStages = 0
$script:totalStages = 0
$script:historyLines = New-Object 'System.Collections.Generic.Queue[object]'
$script:lineCounter = 0
$script:manualScrolling = $false
$consoleColors = @{ detail = 'muted'; info = 'info'; progress = 'text'; ok = 'success'; warn = 'warning'; error = 'error' }

function Set-Status([string]$label, [string]$color = 'text') {
    $statusLabel.Text = $label
    $statusLabel.ForeColor = Get-Color $color
}

function Write-Console($line) {
    if (-not $details.Checked -and $line.level -eq 'detail') { return }
    $previous = $console.SelectionStart
    $console.SelectionStart = $console.TextLength
    $console.SelectionLength = 0
    $console.SelectionColor = Get-Color $consoleColors[$line.level]
    $console.AppendText($line.ts + '  ' + $line.text + [Environment]::NewLine)
    if ($script:manualScrolling) { $console.SelectionStart = $previous }
}

function Reset-Console {
    $console.Clear()
    foreach ($line in $script:historyLines) { Write-Console $line }
}

function Add-Console([string]$level, [string]$message) {
    if (-not $consoleColors.ContainsKey($level)) { $level = 'detail' }
    $line = @{ ts = (Get-Date -Format 'HH:mm:ss'); text = $message; level = $level }
    $script:historyLines.Enqueue($line)
    if ($script:historyLines.Count -gt 1800) { [void]$script:historyLines.Dequeue() }
    Write-Console $line
    $script:lineCounter++
    if ($script:lineCounter -ge 300 -and $console.TextLength -gt 350000 -and -not $script:manualScrolling) {
        Reset-Console
        $script:lineCounter = 0
    }
}

function Get-Selected {
    foreach ($key in $deploymentKeys) {
        if ($targetChecks[$key].Checked) { $key }
    }
}

function Update-Selection {
    if ($script:worker) { return }
    $selected = @(Get-Selected)
    $publish.Enabled = $selected.Count -gt 0
    $plan.Enabled = $publish.Enabled
    $http.Enabled = $publish.Enabled
    if ($selected.Count) {
        $publish.Text = if ($selected.Count -eq 1) { 'Publicar ' + $deploymentNames[$selected[0]] } else { 'Publicar ' + $selected.Count + ' destinos' }
    } else {
        $publish.Text = 'Selecionar destinos'
    }
}

function Save-Preferences {
    try {
        $state = @{
            targets = @(Get-Selected)
            tests = $tests.Checked
            openBrowser = $openBrowser.Checked
            details = $details.Checked
        }
        [IO.File]::WriteAllText($preferencesPath, ($state | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))
    } catch { Add-Console 'warn' ('Falha ao guardar preferências: ' + $_.Exception.Message) }
}

function Update-Progress {
    $ratio = if ($script:totalStages) { [Math]::Min(1, $script:finishedStages / $script:totalStages) } else { 0 }
    $progressFill.Width = [int]($progress.Width * $ratio)
}

function Set-Running([bool]$running) {
    foreach ($control in @($publish, $all, $client, $tests, $reuse, $openBrowser, $plan, $build, $test, $http, $account) + @($targetChecks.Values)) {
        $control.Enabled = -not $running
    }
    $cancel.Enabled = $running
    $retry.Enabled = -not $running -and $script:pendingTargets.Count -gt 0
    if (-not $running) { Update-Selection }
    Update-Progress
}

function Update-Target($key, $item) {
    $view = $targetViews[$key]
    if (-not $view) { return }
    $labels = @{
        waiting = 'Aguardando'; excluded = 'Fora desta publicação'; uploading = 'Enviando…'; published = 'Publicado'
        verified = 'Publicado · HTTP OK'; warning = 'Publicado · verificar HTTP'; unconfirmed = 'Upload sem confirmação'
    }
    $tones = @{ verified = 'success'; published = 'info'; warning = 'warning'; unconfirmed = 'warning' }
    $tone = if ($tones[$item.state]) { $tones[$item.state] } else { 'muted' }
    $view.status.Text = $labels[$item.state]
    $view.status.ForeColor = Get-Color $tone
    if ($item.url) { $view.domain.Tag = $item.url }
    $view.version.Tag = $item.deploymentUrl
    $view.version.Enabled = [bool]$item.deploymentUrl
}

function Apply-Event($data) {
    switch ($data.event) {
        'line' { Add-Console $data.level $data.text }
        'begin' {
            $script:latestLog = $data.logPath
            $logButton.Enabled = $true
            if ($data.mode -eq 'deploy') {
                foreach ($key in $deploymentKeys) {
                    $entry = $data.targets.$key
                    if (-not $entry) { $entry = @{ state = 'excluded' } }
                    Update-Target $key $entry
                }
            } elseif ($data.mode -eq 'http') {
                foreach ($key in $data.selected) { $targetViews[$key].domain.Tag = $data.targets.$key.url }
            }
        }
        'stage' {
            if ($data.status -eq 'running') {
                $stageLabel.Text = $data.label
                if ($data.id -like 'deploy-*') {
                    Update-Target ($data.id.Substring(7)) @{ state = 'uploading' }
                }
            } elseif ($data.label) {
                $script:finishedStages++
                Update-Progress
                $marker = if ($data.status -eq 'ok') { 'Concluído' } else { 'Verificar' }
                Add-Console $(if ($data.status -eq 'ok') { 'ok' } else { 'warn' }) ($marker + ' · ' + $data.label + ' · ' + (Format-Time $data.ms))
            }
        }
        'target' { Update-Target $data.key $data }
        'done' { $script:runResult = $data }
    }
}

function Start-Action([string]$mode, [bool]$preview = $false, [string[]]$only = @()) {
    if ($script:worker) { return }
    $selected = @(Get-Selected)
    if ($only.Count) { $selected = $only }
    if (-not $selected.Count) {
        if ($mode -in @('deploy', 'http')) { return }
        $selected = $deploymentKeys
    }
    $node = Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $node) { Set-Status 'Node.js não encontrado no PATH' 'error'; return }
    if (-not $SmokeTestPath) { Save-Preferences }
    $script:runResult = $null
    $script:finishedStages = 0
    $script:totalStages = 0
    if (-not $preview) {
        $script:totalStages = switch ($mode) {
            'deploy' { (2 * $selected.Count) + [int](-not ($reuse.Checked -or $only.Count)) + (2 * [int]($tests.Checked -and -not $only.Count)) }
            'tests' { 2 }
            default { 1 }
        }
    }
    $script:historyLines.Clear()
    $script:lineCounter = 0
    $script:manualScrolling = $false
    $console.Clear()
    Add-Console 'info' ($allowedDefaultModes[$(if ($preview) { 'plan' } else { $mode })] + ' · ' + (($selected | ForEach-Object { $deploymentNames[$_] }) -join ', '))
    $script:runOpensBrowser = $mode -eq 'deploy' -and -not $preview -and $openBrowser.Checked
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = $node.Source
    $info.WorkingDirectory = $base
    $info.Arguments = '"' + (Join-Path $base 'orquestrador.mjs') + '" --managed --mode ' + $mode + ' --targets ' + ($selected -join ',')
    if ($preview) { $info.Arguments += ' --plan' }
    if ($mode -eq 'deploy' -and ($reuse.Checked -or $only.Count)) { $info.Arguments += ' --reuse' }
    if ($mode -eq 'deploy' -and $tests.Checked -and -not $only.Count) { $info.Arguments += ' --tests' }
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardInput = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.StandardOutputEncoding = [Text.Encoding]::UTF8
    $info.StandardErrorEncoding = [Text.Encoding]::UTF8
    try {
        $process = [Diagnostics.Process]::Start($info)
        $script:worker = @{
            process = $process
            output = $process.StandardOutput.ReadLineAsync()
            error = $process.StandardError.ReadLineAsync()
            clock = [Diagnostics.Stopwatch]::StartNew()
        }
        if ($mode -eq 'deploy' -and -not $preview) { $script:pendingTargets = @(); $reuse.Checked = $false }
        Set-Status $(if ($preview) { 'Preparando plano' } else { 'Em execução' }) 'info'
        $stageLabel.Text = 'Iniciando…'
        Set-Running $true
        $timer.Start()
    } catch {
        Add-Console 'error' $_.Exception.Message
        Set-Status 'Falha ao iniciar' 'error'
    }
}

function Finish-Run {
    $timer.Stop()
    $elapsed = $script:worker.clock.Elapsed.TotalMilliseconds
    $script:worker.process.Dispose()
    $script:worker = $null
    $clock.Text = Format-Time $elapsed
    $outcome = $script:runResult
    if (-not $outcome) {
        Set-Status 'O processo foi encerrado sem resumo' 'error'
        $stageLabel.Text = 'Confira a última saída do console e o histórico da Cloudflare se havia um upload.'
    } else {
        $labels = @{
            ok = $(if ($outcome.mode -eq 'deploy') { 'Publicação verificada' } elseif ($outcome.mode -eq 'plan') { 'Plano pronto' } else { 'Execução concluída' })
            warning = $(if ($outcome.mode -eq 'deploy') { 'Publicado com alerta HTTP' } else { 'Checagem com alerta HTTP' })
            failed = 'Execução falhou'; cancelled = 'Execução cancelada'
        }
        $tones = @{ ok = 'success'; warning = 'warning'; failed = 'error'; cancelled = 'warning' }
        Set-Status $labels[$outcome.status] $tones[$outcome.status]
        if ($outcome.error) {
            $stageLabel.Text = $outcome.error
        } elseif ($outcome.mode -eq 'plan') {
            $stageLabel.Text = 'Veja os destinos e comandos no console.'
        } else {
            $stageLabel.Text = 'Duração ' + (Format-Time $elapsed) + '  ·  Detalhes no console e no histórico.'
        }
        if ($outcome.mode -eq 'deploy' -and $outcome.targets) {
            $confirmed = @($outcome.selected | Where-Object { $outcome.targets.$_.state -in @('published', 'verified', 'warning') })
            $unconfirmed = @($outcome.selected | Where-Object { $outcome.targets.$_.state -eq 'unconfirmed' })
            $waiting = @($outcome.selected | Where-Object { $outcome.targets.$_.state -eq 'waiting' })
            if ($confirmed.Count -or $unconfirmed.Count) {
                $stageLabel.Text = $confirmed.Count.ToString() + ' publicado(s)  ·  ' + $waiting.Count + ' pendente(s)  ·  ' + $unconfirmed.Count + ' sem confirmação'
            }
            if ($confirmed.Count -and $waiting.Count -and $outcome.status -in @('failed', 'cancelled')) {
                $script:pendingTargets = $waiting
            }
            if ($script:runOpensBrowser -and $outcome.status -in @('ok', 'warning')) {
                foreach ($key in $confirmed) { Open-Web $outcome.targets.$key.url }
            }
        }
    }
    Set-Running $false
    if ($script:closeWhenDone) { $form.Close() }
}

function Receive-Output([string]$stream) {
    for ($index = 0; $index -lt 80; $index++) {
        $task = $script:worker[$stream]
        if (-not $task -or -not $task.IsCompleted) { return }
        if ($task.IsFaulted) {
            Add-Console 'error' $task.Exception.GetBaseException().Message
            $script:worker[$stream] = $null
            return
        }
        $line = $task.Result
        if ($null -eq $line) {
            $script:worker[$stream] = $null
            return
        }
        $reader = if ($stream -eq 'output') { $script:worker.process.StandardOutput } else { $script:worker.process.StandardError }
        $script:worker[$stream] = $reader.ReadLineAsync()
        if ($stream -eq 'error') {
            Add-Console 'error' $line
        } else {
            try { Apply-Event ($line | ConvertFrom-Json) }
            catch { Add-Console 'error' ('Falha ao ler evento: ' + $_.Exception.Message) }
        }
    }
}

function Request-Cancel {
    if (-not $script:worker -or -not $cancel.Enabled) { return }
    $cancel.Enabled = $false
    Set-Status 'Cancelando execução…' 'warning'
    try {
        $script:worker.process.StandardInput.WriteLine('cancel')
        $script:worker.process.StandardInput.Flush()
    } catch { Add-Console 'warn' ('O processo já estava encerrando: ' + $_.Exception.Message) }
}

function Show-History {
    $dialog = New-Object Windows.Forms.Form
    $dialog.Text = 'Histórico de deploy'
    $dialog.StartPosition = 'CenterParent'
    $dialog.Size = New-Object Drawing.Size(850, 510)
    $dialog.MinimumSize = New-Object Drawing.Size(650, 350)
    $dialog.BackColor = Get-Color 'background'
    $dialog.ForeColor = Get-Color 'text'
    $dialog.Font = $form.Font
    $layout = New-Grid 3 3 'background' 18
    Add-Column $layout 100 Percent
    Add-Column $layout 120
    Add-Column $layout 120
    Add-Row $layout 34
    Add-Row $layout 100 Percent
    Add-Row $layout 41
    $dialog.Controls.Add($layout)
    $title = New-Label 'Execuções recentes' 14 'text' $true
    $layout.Controls.Add($title, 0, 0)
    $layout.SetColumnSpan($title, 3)
    $list = New-Object Windows.Forms.ListBox
    $list.Dock = 'Fill'
    $list.BackColor = Get-Color 'console'
    $list.ForeColor = Get-Color 'text'
    $list.HorizontalScrollbar = $true
    $list.ItemHeight = 24
    $list.IntegralHeight = $false
    $list.DisplayMember = 'label'
    $layout.Controls.Add($list, 0, 1)
    $layout.SetColumnSpan($list, 3)
    $statuses = @{ ok = 'Concluído'; warning = 'Alerta HTTP'; cancelled = 'Cancelado'; failed = 'Falhou' }
    $files = @(Get-ChildItem -LiteralPath $logDirectory -Filter '*.log' -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 80)
    foreach ($file in $files) {
        $label = $file.LastWriteTime.ToString('dd/MM/yyyy HH:mm') + '  |  ' + $file.Name
        try {
            $summary = Read-Settings ([IO.Path]::ChangeExtension($file.FullName, '.json'))
            if ($summary.status) {
                $names = ($summary.selected | ForEach-Object { $deploymentNames[$_] }) -join ', '
                $label = $file.LastWriteTime.ToString('dd/MM/yyyy HH:mm') + '  |  ' + $statuses[$summary.status] +
                    '  |  ' + $allowedDefaultModes[$summary.mode] + '  |  ' + $names + '  |  ' + (Format-Time $summary.ms)
            }
        } catch { }
        [void]$list.Items.Add([pscustomobject]@{ label = $label; path = $file.FullName })
    }
    if ($list.Items.Count) { $list.SelectedIndex = 0 } else { $title.Text = 'Nenhuma execução registrada' }
    $openLog = New-Button 'Abrir log' $true
    $openLog.Enabled = $list.Items.Count -gt 0
    $openLog.Add_Click({ if ($list.SelectedItem) { Open-Local $list.SelectedItem.path } })
    $list.Add_DoubleClick({ if ($list.SelectedItem) { Open-Local $list.SelectedItem.path } })
    $openFolder = New-Button 'Abrir pasta'
    $openFolder.Enabled = [IO.Directory]::Exists($logDirectory)
    $openFolder.Add_Click({ Open-Local $logDirectory })
    $layout.Controls.Add($openFolder, 1, 2)
    $layout.Controls.Add($openLog, 2, 2)
    [void]$dialog.ShowDialog($form)
    $dialog.Dispose()
}

$timer = New-Object Windows.Forms.Timer
$timer.Interval = 85
$timer.Add_Tick({
    if (-not $script:worker) { return }
    Receive-Output 'output'
    Receive-Output 'error'
    $clock.Text = Format-Time $script:worker.clock.Elapsed.TotalMilliseconds
    if ($script:worker.process.HasExited -and -not $script:worker.output -and -not $script:worker.error) { Finish-Run }
})
$progress.Add_Resize({ Update-Progress })
$all.Add_Click({ foreach ($key in $deploymentKeys) { $targetChecks[$key].Checked = $true } })
$client.Add_Click({ foreach ($key in $deploymentKeys) { $targetChecks[$key].Checked = $key -ne 'admingeral' } })
foreach ($check in $targetChecks.Values) { $check.Add_CheckedChanged({ Update-Selection }) }
$publish.Add_Click({ Start-Action 'deploy' })
$plan.Add_Click({ Start-Action 'deploy' $true })
$build.Add_Click({ Start-Action 'build' })
$test.Add_Click({ Start-Action 'tests' })
$http.Add_Click({ Start-Action 'http' })
$account.Add_Click({ Start-Action 'cloudflare' })
$retry.Add_Click({ Start-Action 'deploy' $false $script:pendingTargets })
$cancel.Add_Click({ Request-Cancel })
$details.Add_CheckedChanged({ Reset-Console })
$copy.Add_Click({ if ($console.TextLength) { [Windows.Forms.Clipboard]::SetText($console.Text) } })
$browserButton.Add_Click({ Open-Web 'https://dash.cloudflare.com' })
$historyButton.Add_Click({ Show-History })
$logButton.Add_Click({ if ($script:latestLog) { Open-Local $script:latestLog } })
$console.Add_MouseWheel({
    param($sender, $eventArgs)
    if ($eventArgs.Delta -gt 0) { $script:manualScrolling = $true }
})
$console.Add_KeyDown({
    param($sender, $eventArgs)
    if ($eventArgs.Control -and $eventArgs.KeyCode -eq 'End') { $script:manualScrolling = $false }
})
$form.Add_KeyDown({
    param($sender, $eventArgs)
    if ($eventArgs.Control -and $eventArgs.KeyCode -eq 'Return' -and $publish.Enabled) { $publish.PerformClick(); $eventArgs.SuppressKeyPress = $true }
    if ($eventArgs.Control -and $eventArgs.KeyCode -eq 'L' -and $logButton.Enabled) { $logButton.PerformClick(); $eventArgs.SuppressKeyPress = $true }
    if ($eventArgs.KeyCode -eq 'Escape' -and $cancel.Enabled) { Request-Cancel; $eventArgs.SuppressKeyPress = $true }
})
$form.Add_FormClosing({
    param($sender, $eventArgs)
    if ($script:worker) {
        $eventArgs.Cancel = $true
        $answer = [Windows.Forms.MessageBox]::Show($form, 'Cancelar a execução e fechar quando o processo parar?', 'Deploy em execução', 'YesNo', 'Question')
        if ($answer -eq 'Yes') { $script:closeWhenDone = $true; Request-Cancel }
    } elseif (-not $SmokeTestPath) {
        Save-Preferences
    }
})

Update-Selection
if ($startupWarning) { Add-Console 'warn' $startupWarning }
if ($config.default_options.run_build -eq $false -and -not $preferences) {
    Add-Console 'info' 'Reutilize pacotes após gerar o primeiro build nesta versão.'
}
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
    Add-Console 'error' 'Instale ou abra o painel com o Node.js 22 ou superior disponível no PATH.'
}
try {
    if ($SmokeTestPath) {
        $form.Show()
        Start-Action 'deploy' $true
        $smokeClock = [Diagnostics.Stopwatch]::StartNew()
        while ($script:worker -and $smokeClock.Elapsed.TotalSeconds -lt 12) {
            [Windows.Forms.Application]::DoEvents()
            Start-Sleep -Milliseconds 50
        }
        if ($script:worker -or $script:runResult.status -ne 'ok' -or $console.Text -notmatch 'pages deploy') {
            throw ('O plano não foi concluído na interface. ' + $console.Text)
        }
        [Windows.Forms.Application]::DoEvents()
        $bitmap = New-Object Drawing.Bitmap($form.Width, $form.Height)
        $form.DrawToBitmap($bitmap, (New-Object Drawing.Rectangle(0, 0, $form.Width, $form.Height)))
        $bitmap.Save($SmokeTestPath, [Drawing.Imaging.ImageFormat]::Png)
        $bitmap.Dispose()
        $form.Close()
    } else {
        [Windows.Forms.Application]::Run($form)
    }
} finally {
    $timer.Dispose()
    $form.Dispose()
    if ($ownsMutex) { $mutex.ReleaseMutex() }
    if ($mutex) { $mutex.Dispose() }
}