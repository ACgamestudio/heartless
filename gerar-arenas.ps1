# =============================================================================
# Heart Less OwO - gerador de arenas em loop
#
# Arena de fundo NAO e video de especial. Ela fica atras de um veu escuro, em
# loop, o tempo todo. Entao aceita bitrate baixissimo - e PRECISA aceitar, senao
# voce recria o problema dos 12 Mbps que travava o jogo.
#
# O que este script faz com cada arquivo:
#   - corta para 8 segundos (loop curto engana melhor que loop longo)
#   - reduz para 960px de largura (a tela do jogo tem 960 logicos)
#   - CRF 32 (fundo desfocado por veu: ninguem ve a diferenca)
#   - REMOVE o audio (a arena e silenciosa, a trilha vem do jogo)
#   - faststart, pra comecar a tocar antes de baixar tudo
#
# Resultado esperado: 400 a 700 KB por arena. Seis arenas = ~3 MB.
#
# COMO USAR
#   1. Crie a pasta:      assets\videos\stages-brutos\
#   2. Jogue seus videos lá com os nomes dos ELEMENTOS:
#        coracao.mp4  chama.mp4  trovao.mp4  gelo.mp4  toxina.mp4  sombra.mp4
#   3. Rode:  powershell -ExecutionPolicy Bypass -File gerar-arenas.ps1
#
# Os finais vao para assets\videos\stages\ , que e onde o arcade.js procura.
# =============================================================================

param(
    [int]$Largura = 960,
    [int]$Crf = 32,
    [int]$Segundos = 8,
    [string]$Inicio = "00:00:00"
)

$ErrorActionPreference = "Continue"

$Bruto = "assets\videos\stages-brutos"
$Saida = "assets\videos\stages"

$ELEMENTOS = @("coracao", "chama", "trovao", "gelo", "toxina", "sombra")

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: ffmpeg nao encontrado. Rode: winget install Gyan.FFmpeg" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $Bruto)) {
    New-Item -ItemType Directory -Force -Path $Bruto | Out-Null
    Write-Host ""
    Write-Host "Criei a pasta $Bruto" -ForegroundColor Yellow
    Write-Host "Coloque os videos lá com estes nomes e rode de novo:"
    $ELEMENTOS | ForEach-Object { Write-Host "  $_.mp4" }
    Write-Host ""
    exit 0
}

New-Item -ItemType Directory -Force -Path $Saida | Out-Null

Write-Host ""
Write-Host "Arenas: $Largura px, CRF $Crf, $Segundos s, sem audio" -ForegroundColor Cyan
Write-Host ""

$feitos = 0
$faltando = @()

foreach ($el in $ELEMENTOS) {
    $entrada = Join-Path $Bruto "$el.mp4"
    if (-not (Test-Path $entrada)) { $faltando += $el; continue }

    $destino = Join-Path $Saida "$el.mp4"
    $antes = [math]::Round((Get-Item $entrada).Length / 1MB, 1)
    Write-Host ("  -> {0}.mp4  ({1} MB)" -f $el, $antes)

    # -an remove o audio. Arena com som brigaria com a trilha do jogo.
    # -t corta a duracao; -ss escolhe de onde comecar o corte.
    & ffmpeg -v error -y -ss $Inicio -t $Segundos -i $entrada `
        -vf "scale=$($Largura):-2:flags=lanczos,fps=30" `
        -c:v libx264 -profile:v high -preset slow -crf $Crf `
        -pix_fmt yuv420p -an `
        -movflags +faststart `
        $destino

    if ($LASTEXITCODE -ne 0) {
        Write-Host "     FALHOU" -ForegroundColor Red
        continue
    }

    $kb = [math]::Round((Get-Item $destino).Length / 1KB)
    $cor = if ($kb -gt 1500) { "Yellow" } else { "Green" }
    Write-Host ("     virou {0} KB" -f $kb) -ForegroundColor $cor
    if ($kb -gt 1500) {
        Write-Host "     (acima de 1,5 MB - considere -Crf 34 ou -Segundos 6)" -ForegroundColor Yellow
    }
    $feitos++
}

Write-Host ""
Write-Host "-------------------------------------------------" -ForegroundColor Cyan
Write-Host "$feitos arena(s) geradas em $Saida"

if ($faltando.Count -gt 0) {
    Write-Host ""
    Write-Host "Sem video bruto (essas caem no fundo em degrade, sem quebrar nada):" -ForegroundColor Yellow
    $faltando | ForEach-Object { Write-Host "  - $_" }
}

if ($feitos -gt 0) {
    $total = [math]::Round((Get-ChildItem $Saida -Filter *.mp4 |
        Measure-Object -Property Length -Sum).Sum / 1MB, 1)
    Write-Host ""
    Write-Host "Total das arenas: $total MB"
    Write-Host ""
    Write-Host "Adicione ao .gitignore:" -ForegroundColor Yellow
    Write-Host "  assets/videos/stages-brutos/"
    Write-Host ""
    Write-Host "E suba a versao no sw.js (jokenpo-v3)."
}
Write-Host "-------------------------------------------------" -ForegroundColor Cyan
Write-Host ""
