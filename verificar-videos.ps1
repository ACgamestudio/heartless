# =============================================================================
# JokenPo - verificacao de integridade dos videos
#
# Compara a duracao que o arquivo DECLARA com a quantidade de quadros que
# realmente da pra decodificar. Exportacao truncada (que foi o caso do
# toxin.mp4) declara 15s no cabecalho mas so tem 2s de video de verdade -
# e isso nao aparece de olho, so testando.
#
# COMO RODAR (na raiz do JokenPo):
#   powershell -ExecutionPolicy Bypass -File verificar-videos.ps1
#
# Rode ANTES de comprimir, e de novo DEPOIS, pra comparar.
# =============================================================================

$ErrorActionPreference = "Continue"

if (-not (Get-Command ffprobe -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: ffprobe nao encontrado (vem junto com o ffmpeg)." -ForegroundColor Red
    Write-Host "Instale com: winget install Gyan.FFmpeg  e reabra o terminal."
    exit 1
}

$arquivos = Get-ChildItem -Path "assets\videos" -Filter *.mp4 -Recurse |
            Where-Object { $_.FullName -notmatch "videos-originais" } |
            Sort-Object FullName

if (-not $arquivos) {
    Write-Host "Nenhum .mp4 encontrado em assets\videos" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host ("{0,-26} {1,8} {2,14} {3}" -f "ARQUIVO", "DURACAO", "QUADROS", "ESTADO") -ForegroundColor Cyan
Write-Host ("-" * 72)

$problemas = @()

foreach ($f in $arquivos) {
    $caminho = $f.FullName

    $dur = & ffprobe -v error -show_entries format=duration -of csv=p=0 $caminho
    $fps = & ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 $caminho
    $reais = & ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 $caminho

    # r_frame_rate vem como "30/1"
    $fpsNum = 30
    if ($fps -match "^(\d+)/(\d+)$") {
        $d = [double]$Matches[2]
        if ($d -ne 0) { $fpsNum = [double]$Matches[1] / $d }
    }

    $durNum = 0.0
    if ($dur -match "^[\d\.]+$") { $durNum = [double]$dur }
    $esperados = [math]::Round($durNum * $fpsNum)

    $reaisNum = 0
    if ($reais -match "^\d+$") { $reaisNum = [int]$reais }

    # quantas linhas de erro o decodificador cospe ao ler o arquivo inteiro
    $erros = (& ffmpeg -v error -i $caminho -f null - 2>&1 | Measure-Object -Line).Lines

    $nome = $f.Name
    $pasta = Split-Path (Split-Path $caminho -Parent) -Leaf
    if ($pasta -ne "videos") { $nome = "$pasta/$nome" }

    $razao = if ($esperados -gt 0) { $reaisNum / $esperados } else { 1 }

    if ($erros -gt 0 -or $razao -lt 0.95) {
        $estado = "CORROMPIDO"
        $cor = "Red"
        $problemas += $nome
    } else {
        $estado = "ok"
        $cor = "Green"
    }

    Write-Host ("{0,-26} {1,7:N1}s {2,7}/{3,-6} {4}" -f `
        $nome, $durNum, $reaisNum, $esperados, $estado) -ForegroundColor $cor
}

Write-Host ("-" * 72)
Write-Host ""

if ($problemas.Count -eq 0) {
    Write-Host "Todos os videos estao inteiros." -ForegroundColor Green
} else {
    Write-Host "PRECISAM SER REEXPORTADOS DO PROJETO DE EDICAO:" -ForegroundColor Red
    $problemas | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "Recomprimir nao resolve: o dano esta no arquivo de origem."
    Write-Host "Enquanto nao reexportar, adicione o id do personagem em"
    Write-Host "SEM_CINEMATICA no characters.js pra ele usar o especial padrao."
}
Write-Host ""
