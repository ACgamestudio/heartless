# =============================================================================
# JokenPo - recompressao dos videos (versao Windows / PowerShell)
#
# Os originais estao em 1920x1080 a 12,5 Mbps. O jogo roda numa tela logica de
# 960x540, entao esse bitrate nao aparece na tela - so faz o clipe travar.
#
# COMO RODAR (no terminal do VS Code, na pasta do JokenPo):
#
#   powershell -ExecutionPolicy Bypass -File comprimir-videos.ps1
#
# Para a versao mais leve (960px de largura):
#
#   powershell -ExecutionPolicy Bypass -File comprimir-videos.ps1 -Largura 960
#
# PRECISA DO FFMPEG. Se nao tiver:
#   winget install Gyan.FFmpeg
#   ...e depois FECHE e ABRA o terminal de novo (pra atualizar o PATH).
# =============================================================================

param(
    [int]$Largura = 1280,
    [string]$Preset = "slow"
)

$ErrorActionPreference = "Stop"

# --- CRF: qualidade. Menor = melhor e mais pesado. 26 e imperceptivel aqui.
if ($Largura -le 960) { $CrfClipe = 27; $CrfIntro = 28 }
else                  { $CrfClipe = 26; $CrfIntro = 27 }

$Origem = "assets\videos"
$Backup = "assets\videos-originais"

# --- checagens antes de comecar -----------------------------------------------
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "ERRO: ffmpeg nao encontrado." -ForegroundColor Red
    Write-Host "Instale com:  winget install Gyan.FFmpeg"
    Write-Host "Depois FECHE e ABRA o terminal de novo, e rode este script outra vez."
    Write-Host ""
    exit 1
}

if (-not (Test-Path $Origem)) {
    Write-Host ""
    Write-Host "ERRO: nao achei a pasta $Origem." -ForegroundColor Red
    Write-Host "Rode este script na raiz do projeto (a pasta que tem o index.html)."
    Write-Host "Pasta atual: $(Get-Location)"
    Write-Host ""
    exit 1
}

New-Item -ItemType Directory -Force -Path "$Backup\specials" | Out-Null
New-Item -ItemType Directory -Force -Path "$Backup\victory"  | Out-Null

# --- funcao que comprime um arquivo ------------------------------------------
function Comprimir {
    param([string]$Entrada, [string]$Saida, [int]$Crf)

    $antes = [math]::Round((Get-Item $Entrada).Length / 1MB, 1)
    Write-Host ("  -> {0}  ({1} MB)" -f (Split-Path $Entrada -Leaf), $antes)

    # -movflags +faststart: poe o indice do MP4 no comeco, pro video comecar a
    # tocar antes de terminar o download.
    & ffmpeg -v error -y -i $Entrada `
        -vf "scale=$($Largura):-2:flags=lanczos" `
        -c:v libx264 -profile:v high -level 4.0 -preset $Preset -crf $Crf `
        -pix_fmt yuv420p `
        -c:a aac -b:a 96k -ac 2 `
        -movflags +faststart `
        $Saida

    if ($LASTEXITCODE -ne 0) {
        Write-Host "     FALHOU (pulando este arquivo)" -ForegroundColor Red
        return
    }

    $depois = [math]::Round((Get-Item $Saida).Length / 1MB, 1)
    $ganho = if ($antes -gt 0) { [math]::Round(100 - ($depois / $antes * 100)) } else { 0 }
    Write-Host ("     virou {0} MB  (-{1}%)" -f $depois, $ganho) -ForegroundColor Green
}

# --- processa uma pasta -------------------------------------------------------
function ProcessarPasta {
    param([string]$SubPasta, [int]$Crf)

    $caminho = Join-Path $Origem $SubPasta
    if (-not (Test-Path $caminho)) { return }

    Get-ChildItem -Path $caminho -Filter *.mp4 | ForEach-Object {
        $destinoBackup = Join-Path (Join-Path $Backup $SubPasta) $_.Name
        if (-not (Test-Path $destinoBackup)) {
            Copy-Item $_.FullName $destinoBackup
        }
        Comprimir $destinoBackup $_.FullName $Crf
    }
}

# --- execucao ----------------------------------------------------------------
$inicio = Get-Date
$tamanhoAntes = [math]::Round((Get-ChildItem $Origem -Recurse -File |
    Measure-Object -Property Length -Sum).Sum / 1MB, 1)

Write-Host ""
Write-Host "Perfil: $Largura px de largura (CRF $CrfClipe, preset $Preset)" -ForegroundColor Cyan
Write-Host "Total agora: $tamanhoAntes MB"
Write-Host "Isso pode levar de 10 a 30 minutos com 16 clipes. Deixe rodando."
Write-Host ""

Write-Host "== ESPECIAIS ==" -ForegroundColor Yellow
ProcessarPasta "specials" $CrfClipe

Write-Host ""
Write-Host "== VITORIA ==" -ForegroundColor Yellow
ProcessarPasta "victory" $CrfClipe

Write-Host ""
Write-Host "== INTRO E PRODUTORA ==" -ForegroundColor Yellow
foreach ($nome in @("intro.mp4", "produtora.mp4")) {
    $arquivo = Join-Path $Origem $nome
    if (-not (Test-Path $arquivo)) { continue }
    $destinoBackup = Join-Path $Backup $nome
    if (-not (Test-Path $destinoBackup)) { Copy-Item $arquivo $destinoBackup }
    Comprimir $destinoBackup $arquivo $CrfIntro
}

$tamanhoDepois = [math]::Round((Get-ChildItem $Origem -Recurse -File |
    Measure-Object -Property Length -Sum).Sum / 1MB, 1)
$minutos = [math]::Round(((Get-Date) - $inicio).TotalMinutes, 1)

Write-Host ""
Write-Host "-------------------------------------------------" -ForegroundColor Cyan
Write-Host ("Antes:  {0} MB" -f $tamanhoAntes)
Write-Host ("Depois: {0} MB" -f $tamanhoDepois) -ForegroundColor Green
Write-Host ("Tempo:  {0} min" -f $minutos)
Write-Host ""
Write-Host "Originais salvos em: $Backup"
Write-Host "NAO suba essa pasta pro GitHub. Adicione ao .gitignore:"
Write-Host "  assets/videos-originais/" -ForegroundColor Yellow
Write-Host "-------------------------------------------------" -ForegroundColor Cyan
Write-Host ""
