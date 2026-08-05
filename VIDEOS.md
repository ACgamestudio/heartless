# Vídeos travando — diagnóstico e correção

## O diagnóstico (medido no seu arquivo)

| Arquivo | Resolução | Bitrate | Tamanho |
|---|---|---|---|
| `specials/blitz.mp4` | 1920×1080 | **12,5 Mbps** | 22,6 MB |
| `specials/heart.mp4` | 1920×1080 | 12,5 Mbps | 21 MB |
| `specials/lolly.mp4` | 1920×1080 | 12,5 Mbps | 23 MB |
| `specials/teddy.mp4` | 1920×1080 | 12,5 Mbps | 21 MB |
| `specials/toxin.mp4` | 1920×1080 | 2,2 Mbps | 4 MB |
| `victory/heart.mp4` | 1920×1080 | 12,5 Mbps | 23 MB |
| `intro.mp4` | 1920×1080 | 12 Mbps | **78 MB** |

**Total: 191 MB de vídeo.**

O problema não é o GitHub Pages. São **três problemas somados**, e o principal é o
bitrate: 12,5 Mbps é taxa de Blu-ray. Para tocar sem engasgar, o aparelho precisa
baixar 12,5 megabits por segundo sustentados. 4G comum entrega 8–15 Mbps oscilando,
wifi doméstico brasileiro fica em 20–50 Mbps. **Não existe conexão móvel que
segure isso em tempo real.**

E note: o jogo roda numa tela lógica de **960×540**. Você está entregando 1080p
com bitrate de cinema para uma janela que tem pouco mais da metade dessa altura.
O excesso é 100% desperdício — não aparece na tela.

`toxin.mp4` é a prova: mesmo 1080p, mas 2,2 Mbps e 4 MB. Provavelmente é o único
que não trava.

## Os três problemas

**1. Bitrate 6× maior que o necessário** → arquivo não cabe na banda disponível.

**2. Download começava no instante do especial.** O código fazia
`videoEl.src = './assets/videos/specials/heart.mp4'` só quando o golpe saía. Ou seja:
o vídeo era baixado *enquanto* tentava tocar. Não tinha chance de dar certo.

**3. A trava de segurança media a coisa errada.** O `playClip` estendia o tempo
limite no evento `loadedmetadata`, que dispara em milissegundos (só o cabeçalho do
MP4 chegou). O jogo então esperava os 15 segundos inteiros enquanto o vídeo
engasgava no buffer. Era isso que travava a luta.

## A correção

### Passo 1 — recomprimir (resolve 90%)

```bash
bash comprimir-videos.sh
```

Resultado medido no `blitz.mp4`:

| | Tamanho | Bitrate |
|---|---|---|
| Original | 22,6 MB | 12,5 Mbps |
| **720p CRF 26** | **4,0 MB** | 2,2 Mbps |
| 960p CRF 27 | 2,4 MB | 1,4 Mbps |

**191 MB → cerca de 32 MB.** Sem diferença visível numa tela de 960×540.

O script guarda os originais em `assets/videos-originais/`. Adicione essa pasta ao
`.gitignore` — se subir, o repositório dobra de tamanho.

Se quiser o máximo de leveza: `bash comprimir-videos.sh 960`.

### Passo 2 — pré-carregamento (já aplicado no `script.js`)

Agora, quando a luta começa, os clipes dos **dois** lutadores são baixados inteiros
em segundo plano e guardados em memória como blob. Quando o especial sai, o vídeo
já está no aparelho — toca instantâneo.

O jogador tem no mínimo 2 ou 3 turnos antes de encher o medidor. Com 4 MB, isso é
tempo mais que suficiente até em 4G ruim.

### Passo 3 — abortar se travar (já aplicado)

Se a reprodução parar para esperar buffer por mais de 1,2s, o jogo desiste da
cinemática e continua a luta. Perder o vídeo é melhor que travar o combate.
A trava agora só estende no evento `canplay`, não no `loadedmetadata`.

### Passo 4 — virar app de verdade (`sw.js` + `manifest.json`)

Isso é exatamente o que você descreveu: "se fosse um app eu teria baixado todos os
vídeos". Com o service worker, é o que acontece — na primeira partida os arquivos
ficam guardados no aparelho, e a partir daí carregam do disco. Funciona **offline**.

E com o `manifest.json`, o jogo fica **instalável**: no Chrome do Android aparece
"Adicionar à tela inicial", no iPhone é Compartilhar → Adicionar à Tela de Início.
Abre em tela cheia, sem barra de navegador, em paisagem.

**Arquivos novos na raiz:** `sw.js`, `manifest.json`
**Arquivos alterados:** `index.html` (registro do SW + manifest), `script.js` (pré-carga)

## Regra que você não pode esquecer

Toda vez que mudar qualquer arquivo do jogo, **suba a versão no `sw.js`**:

```javascript
const VERSAO = 'jokenpo-v1';   // → 'jokenpo-v2', 'v3'...
```

Sem isso o navegador continua servindo a versão em cache e você vai jurar que sua
alteração não subiu. É a pegadinha número um de service worker.

Para testar sem esse problema: DevTools → Application → Service Workers → marque
**"Update on reload"**.

## Detalhe técnico: iPhone

O service worker **não** intercepta requisições com header `Range` — é o que o
`<video>` manda ao tocar direto. O Cache API não entende Range e o Safari rejeita
a resposta, o que quebraria o vídeo no iOS. Como o jogo baixa os clipes por
`fetch()` completo antes de tocar, essa rota nem é usada. Está tratado no `sw.js`,
mas vale saber por que a regra existe antes de "otimizar" ela fora.

## Os limites do GitHub Pages, agora que sobra folga

| Limite | Antes | Depois |
|---|---|---|
| Repositório (recomendado < 1 GB) | 434 MB | ~50 MB |
| Arquivo único (máx. 100 MB) | intro com 78 MB | ~14 MB |
| Banda (soft limit 100 GB/mês) | ~520 partidas | ~3.000 partidas |

Aquele número de banda é o que mais importa se o jogo circular. Com 191 MB por
jogador novo, 500 pessoas estouram a cota do mês. Depois de comprimir e com o
service worker guardando local, o mesmo jogador consome os assets **uma vez** —
mesmo que jogue cem partidas.

## Uma coisa que eu cortaria

`intro.mp4` tem **53 segundos**. Mesmo comprimido para 14 MB, é meio minuto de
espera antes de jogar — e na segunda vez, ninguém quer ver. Duas opções:

1. Botão **"pular"** visível desde o primeiro segundo (não depois de 3s).
2. Guardar em `localStorage` que a intro já foi vista e pular automático a partir
   da segunda visita, com opção de rever no menu.

A segunda é o que jogo bom faz. Cinemática de abertura é lembrança, não pedágio.
