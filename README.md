# Heart Less OwO Jokenpô

Jogo de luta (fighting game) com o elenco original de **Heart Less OwO** (16
personagens: Jokenpô, Teddy, Lolly, Zuko, Miyu, Razor, Shadow, Blitz, Toxin,
Nya, Yuki, Star, Void, King, Kai e Spark). Nenhum personagem, imagem, som ou
vídeo do Dragon Ball é usado — todo o visual vem da sua própria arte, e os
sons são gerados por código (Web Audio API), sem depender de nenhum arquivo
externo.

## Como abrir

Abra `index.html` no navegador (ou suba a pasta inteira num servidor
estático). Não precisa de instalação nem build.

## Fluxo do jogo

1. **Tela inicial** — mostra o pôster do jogo com o botão **INICIAR**. Esse
   clique libera o áudio do navegador, tenta abrir o jogo em **tela cheia**
   e travar a **orientação paisagem** (funciona na maioria dos navegadores
   mobile; no desktop a tela cheia funciona, o travamento de orientação é
   ignorado silenciosamente por não fazer sentido). Se o navegador não
   suportar travar a orientação (ex: iOS Safari), aparece um aviso pedindo
   pra girar o aparelho sempre que a tela estiver em modo retrato.
2. **Vídeo da produtora** — `assets/videos/produtora.mp4` (incluído).
3. **Vídeo de intro** — `assets/videos/intro.mp4` (incluído).
4. **Seleção de personagem** — grade com os 16 lutadores, cada card já vem
   com a cor e o nome estilizados. Clique pra selecionar e depois em
   CONFIRMAR.
5. **Jogo** — duelo estilo fighting game contra um rival sorteado entre os
   outros personagens. Cada um tem uma barra de vida e um medidor de
   especial. A cada rodada você escolhe **Soco**, **Chute**, **Bloqueio** ou
   **Especial** (só disponível com o medidor cheio):
   - Soco vence Chute (é mais rápido)
   - Chute quebra Bloqueio
   - Bloqueio anula Soco (e ainda revida um pouco)
   - Especial causa dano pesado (reduzido se bloqueado)

   Quem zerar a vida primeiro perde. Ao final (vitória, derrota ou
   nocaute duplo), o jogo sempre volta para a **tela de seleção de
   personagens** — nunca para a tela inicial/vídeos de novo.

## Vídeos de golpe especial e vitória (opcionais)

O jogo já está preparado para tocar um vídeo próprio de cada personagem:

- **Ao usar o Especial** — toca em tela cheia por cima da luta, depois volta
  pro combate sozinho.
- **Ao vencer a partida** — toca dentro da tela de nocaute, junto com o
  confete.

Basta salvar os arquivos com o **id** do personagem (não o nome exibido) em:

```
assets/videos/specials/<id>.mp4   -> toca quando ESSE personagem usa o Especial
assets/videos/victory/<id>.mp4    -> toca quando ESSE personagem vence
```

Os ids usados internamente (podem ser diferentes do nome mostrado na tela):

| Nome exibido | id (nome do arquivo) |
|---|---|
| Heart | `heart` |
| Teddy | `teddy` |
| Lolly | `lolly` |
| Zuko | `zuko` |
| Miyu | `miyu` |
| Razor | `razor` |
| Shadow | `shadow` |
| Blitz | `blitz` |
| Toxin | `toxin` |
| Nya | `nya` |
| Yuki | `yuki` |
| Star | `star` |
| Void | `void` |
| King | `king` |
| Kai | `kai` |
| Spark | `spark` |

Nenhum desses vídeos é obrigatório — o jogo funciona normalmente sem eles
(o Especial só não mostra o clipe, e a vitória só mostra o confete). Vá
soltando os arquivos nessas pastas conforme forem ficando prontos, não
precisa mexer em nenhum código. Recomendado: clipes curtos (1–3s) e bem
comprimidos, pra não pesar o jogo.

## Sons

Todos os efeitos (socos, chutes, bloqueios, especial, seleção, vitória,
derrota) e a musiquinha de fundo são **gerados por código** em
`sound.js`, usando osciladores e ruído filtrado da Web Audio API. Não é
necessário adicionar nenhum arquivo `.mp3`. Se quiser trocar por sons/
músicas reais no futuro, é só editar `sound.js` e tocar arquivos de áudio
próprios ali dentro.

## Estrutura de pastas

```
index.html
styles.css
script.js
sound.js                 -> motor de som sintetizado (SFX + música de fundo)
characters.js             -> lista dos 16 personagens (nome/cor/id)
assets/
  img/
    poster.png             -> pôster completo (usado na tela inicial)
    characters/*.png        -> cada card de personagem já estilizado
  videos/
    produtora.mp4            -> vídeo da produtora (já incluído)
    intro.mp4                 -> vídeo de intro (já incluído)
```

## Personalizar

- **Nomes/cores dos personagens**: edite `characters.js`.
- **Vida máxima / dano de cada golpe**: constantes no topo de `script.js`
  (`MAX_HP`) e dentro da função `resolveTurn`.
- **Sons**: edite `sound.js` (frequências, duração, tipo de onda).
- **Cards de personagem**: se algum card precisar de ajuste, troque o PNG
  correspondente em `assets/img/characters/` (mesmo nome de arquivo).

---

## Sistema de Elementos

Cada lutador pertence a um dos seis elementos. O elemento define quatro coisas: contra quem é forte, contra quem é fraco, uma passiva permanente e a ultimate que substitui o Especial genérico.

Toda a configuração vive em `elements.js`. Os números de balanceamento estão no objeto `BALANCE`, no topo do arquivo — dá para ajustar o jogo inteiro sem tocar em `script.js`.

### Ciclo de afinidade

```
❤️ Coração → 🌑 Sombra → ☠️ Toxina → ⚡ Trovão → ❄️ Gelo → 🔥 Chama → ❤️ Coração
```

Cada elemento causa **+25%** de dano contra o seguinte e **−20%** contra o anterior. O card e o HUD mostram a relação, então ninguém precisa decorar.

### Elenco

| Elemento | Lutadores | Passiva | Ultimate |
|---|---|---|---|
| ❤️ Coração | Heart, Lolly, Teddy | Pulso Vital — ao perder a troca, cura 3% da vida | Onda Afetiva — 20 de dano em área e cura 11 |
| 🔥 Chama | Kai, Razor, Spark | Combustão — cada acerto seguido soma +3 de dano, até +9 | Erupção — 26 de dano e queima 4 por 2 turnos |
| ⚡ Trovão | Blitz, Nya | Reflexo — metade do dano em choque de golpes iguais | Descarga — 24 de dano e rouba 25% do medidor |
| ❄️ Gelo | Zuko, Yuki | Frio Cortante — bloqueio drena 18 do medidor, ganha 6 e apara 40% do dano mesmo quebrado | Nevasca — 25 de dano e trava o Especial do rival |
| ☠️ Toxina | Toxin, Void | Corrosão — todo acerto envenena; 2 por dose, perde uma dose por turno | Miasma — 18 de dano e aplica as 3 doses de uma vez |
| 🌑 Sombra | Shadow, Miyu, King, Star | Espelho — anula o primeiro dano da partida e ganha outro escudo abaixo de 30 de vida | Eclipse — 25 de dano e revela o próximo golpe do rival |

### Por que nenhuma passiva usa sorte

Jokenpô é um jogo de leitura. Se um número aleatório decide o turno, ganhar não ensina nada e perder parece roubo. Toda passiva acima dispara por uma condição que o jogador controla: acertar em sequência, perder a troca, bloquear, entrar em vida crítica. "Chance de esquiva" virou escudo determinístico — o jogador sabe que tem e escolhe quando gastar.

### Ordem de resolução do turno

1. Veneno e queimadura das rodadas anteriores cobram o dano
2. `resolveTurn()` calcula o resultado cru do jokenpô
3. Ultimate substitui o dano genérico do Especial, se houver
4. Multiplicador de afinidade
5. Passivas ofensivas (Combustão)
6. Passivas defensivas (Reflexo, guarda de Gelo, Espelho)
7. Passivas de reação (Pulso Vital, Frio Cortante, Corrosão)
8. Efeitos da ultimate (queimadura, congelamento, roubo de medidor, revelação)
9. Atualiza sequência da Chama e checa o segundo Espelho

Doses novas aplicadas no turno só doem no turno seguinte — o jogador vê o efeito chegando antes de sentir.

### Balanceamento

Rodei 3.600 duelos automatizados (todos os 240 confrontos possíveis, 15 partidas cada). Taxa de vitória por elemento:

| Elemento | Vitórias |
|---|---|
| ❤️ Coração | 55,1% |
| ⚡ Trovão | 51,3% |
| 🔥 Chama | 50,6% |
| ❄️ Gelo | 45,9% |
| ☠️ Toxina | 45,1% |
| 🌑 Sombra | 44,6% |

Duração média de 15 turnos, nenhuma partida travada. A simulação usa CPU aleatória nos dois lados, então ela mede o piso mecânico, não o teto de habilidade: Sombra, Chama e Gelo dependem de leitura e ganham em jogo real acima do que aparece aqui. Buscar 50% exato nessa tabela seria otimizar para um robô que joga dado.


---

## Feedback visual do turno

O resultado do turno não é mais só texto. Ao resolver, os **mesmos glifos SVG dos botões de golpe** entram voando — o do jogador pela esquerda, o do rival pela direita — colidem no centro e o desfecho é lido pela animação:

| Situação | O que aparece |
|---|---|
| Você venceu o turno | seu glifo atravessa o centro e cresce; o do rival é rebatido, gira e se desfaz em blur |
| Rival venceu | o inverso |
| Troca de golpes | os dois brilham no impacto e recuam iguais |
| Ninguém tomou dano | encostam de leve e somem, com anel tracejado ciano |
| Especial ou dano ≥ 18 | estouro reforçado, com raios em cruz dupla |

Cada glifo herda o `--tint` do próprio golpe, que já existia no CSS: soco laranja, chute rosa, bloqueio ciano, especial âmbar. Nenhuma arte nova foi criada — o `MOVE_GLYPH` lê os SVG direto dos botões no carregamento, então mudar o ícone de um golpe muda o choque automaticamente.

O texto de veredito ("CRÍTICO!", "BLOQUEADO") desceu para 66% da altura para não colidir com os glifos.

## Ritmo da cinemática do especial

Botão **🎬 CINEMÁTICA** na barra inferior da arena, com três estados que ciclam a cada clique e ficam salvos no navegador (`localStorage`, chave `hlowo-cine`):

| Estado | Comportamento |
|---|---|
| COMPLETA | velocidade normal |
| RÁPIDA 1,75× | `playbackRate = 1.75` |
| DESLIGADA | o vídeo nem abre; o turno resolve na hora |

Durante a cinemática, dá para pular de quatro formas: botão **Pular ▶**, clique ou toque em qualquer lugar da tela, `Esc` ou `Enter`. Um aviso discreto aparece por 2 segundos na primeira vez e some sozinho.

A trava de segurança do `playClip` continua valendo — se o arquivo de vídeo não existir, o jogo segue em frente sem travar.
