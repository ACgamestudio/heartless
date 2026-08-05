#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# JokenPo — recompressão dos vídeos
#
# Os arquivos originais estão em 1920x1080 a 12,5 Mbps. O jogo roda numa tela
# lógica de 960x540, então esse bitrate é desperdício puro: ninguém vê a
# diferença, e é ele que faz o clipe travar em celular.
#
# Uso:
#   bash comprimir-videos.sh            # perfil 720p (recomendado)
#   bash comprimir-videos.sh 960        # perfil 960p (mais agressivo)
#
# Precisa do ffmpeg:
#   Windows: winget install Gyan.FFmpeg      (ou baixe em ffmpeg.org)
#   Mac:     brew install ffmpeg
#   Linux:   sudo apt install ffmpeg
# ─────────────────────────────────────────────────────────────────────────────
set -e

PERFIL="${1:-720}"

if [ "$PERFIL" = "960" ]; then
  LARGURA=960; CRF_CLIPE=27; CRF_INTRO=28
else
  LARGURA=1280; CRF_CLIPE=26; CRF_INTRO=27
fi

ORIGEM="assets/videos"
BACKUP="assets/videos-originais"

if [ ! -d "$ORIGEM" ]; then
  echo "ERRO: rode este script na raiz do projeto (a pasta que tem index.html)."
  exit 1
fi

mkdir -p "$BACKUP/specials" "$BACKUP/victory"

# -crf         qualidade (menor = melhor/maior). 26 é imperceptível nesse tamanho.
# -preset slow demora mais pra comprimir, gera arquivo menor. Roda uma vez só.
# +faststart   move o índice do MP4 pro começo: o vídeo começa a tocar antes de
#              terminar o download. Seus arquivos já têm isso, mantemos.
# -movflags    também remove metadados inúteis de edição.
comprimir () {
  local entrada="$1" saida="$2" crf="$3"
  echo "  → $(basename "$entrada")  ($(du -m "$entrada" | cut -f1) MB)"
  ffmpeg -v error -y -i "$entrada" \
    -vf "scale=${LARGURA}:-2:flags=lanczos" \
    -c:v libx264 -profile:v high -level 4.0 -preset slow -crf "$crf" \
    -pix_fmt yuv420p \
    -c:a aac -b:a 96k -ac 2 \
    -movflags +faststart \
    "$saida"
  echo "     virou $(du -m "$saida" | cut -f1) MB"
}

echo "Perfil: ${LARGURA}px de largura (CRF $CRF_CLIPE)"
echo ""
echo "== ESPECIAIS =="
for f in "$ORIGEM"/specials/*.mp4; do
  [ -e "$f" ] || continue
  nome=$(basename "$f")
  cp -n "$f" "$BACKUP/specials/$nome"
  comprimir "$BACKUP/specials/$nome" "$ORIGEM/specials/$nome" "$CRF_CLIPE"
done

echo ""
echo "== VITÓRIA =="
for f in "$ORIGEM"/victory/*.mp4; do
  [ -e "$f" ] || continue
  nome=$(basename "$f")
  cp -n "$f" "$BACKUP/victory/$nome"
  comprimir "$BACKUP/victory/$nome" "$ORIGEM/victory/$nome" "$CRF_CLIPE"
done

echo ""
echo "== INTRO E PRODUTORA =="
for nome in intro.mp4 produtora.mp4; do
  [ -e "$ORIGEM/$nome" ] || continue
  cp -n "$ORIGEM/$nome" "$BACKUP/$nome"
  comprimir "$BACKUP/$nome" "$ORIGEM/$nome" "$CRF_INTRO"
done

echo ""
echo "─────────────────────────────────────────────"
echo "Total agora:      $(du -sh "$ORIGEM" | cut -f1)"
echo "Originais salvos: $BACKUP  (NÃO suba essa pasta pro GitHub)"
echo ""
echo "Adicione ao .gitignore:"
echo "  assets/videos-originais/"
echo "─────────────────────────────────────────────"
