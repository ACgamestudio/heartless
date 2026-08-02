# Heart Less OwO Jokenpô

Jogo de luta (fighting game) com o elenco original de **Heart Less OwO** (16
personagens: Heart, Teddy, Lolly, Zuko, Miyu, Razor, Shadow, Blitz, Toxin,
Nya, Yuki, Star, Void, King, Kai e Spark). Nenhum personagem, imagem, som ou
vídeo do Dragon Ball é usado — todo o visual vem do seu pôster
`Heart_Less_Wow.png`, e as imagens de cada personagem foram recortadas dele.

## Como abrir

Abra `index.html` no navegador (ou suba a pasta inteira num servidor
estático). Não precisa de instalação nem build.

## Fluxo do jogo

1. **Tela inicial** — mostra o pôster do jogo com o botão **INICIAR**. É
   nesse clique que o navegador libera o áudio, então os vídeos seguintes já
   tocam com som.
2. **Vídeo da produtora** — `assets/videos/produtora.mp4`.
3. **Vídeo de intro** — `assets/videos/intro.mp4`.
4. **Seleção de personagem** — pôster inteiro com áreas clicáveis por cima de
   cada um dos 16 lutadores.
5. **Jogo** — duelo estilo fighting game contra um rival sorteado entre os
   outros personagens. Cada um tem uma barra de vida e um medidor de
   especial. A cada rodada você escolhe **Soco**, **Chute**, **Bloqueio** ou
   **Especial** (só disponível com o medidor cheio). Soco vence Chute, Chute
   quebra Bloqueio, Bloqueio anula Soco, e o Especial causa dano pesado
   (reduzido se bloqueado). Quem zerar a vida primeiro perde.

`produtora.mp4` e `intro.mp4` já estão incluídos em `assets/videos/`. Se um
vídeo não carregar por algum motivo (arquivo corrompido, codec não suportado
etc.), o jogo detecta o erro automaticamente e pula para a próxima tela
sozinho (ou use o botão "Pular"), então o fluxo nunca trava.

## Arquivos que você ainda pode adicionar (opcionais)

Coloque os arquivos com **exatamente** esses nomes em `assets/audio/`:

| Arquivo | Uso |
|---|---|
| `music.mp3` | Música de fundo do menu/jogo |
| `select.mp3` | Som ao escolher personagem |
| `win_round.mp3` | Som ao vencer uma rodada |
| `lose_round.mp3` | Som ao perder uma rodada |
| `victory.mp3` | Som da vitória final |
| `defeat.mp3` | Som da derrota final |

Todos os sons são opcionais: o jogo funciona 100% sem eles, só fica mais
chamativo com eles. Use apenas arquivos que você mesmo criou ou tenha
licença/direito de uso — evite trilhas, efeitos ou clipes de outras obras
registradas para não correr risco de direitos autorais de novo.

## Estrutura de pastas

```
index.html
styles.css
script.js
characters.js          -> lista dos 16 personagens (nome/cor/id)
assets/
  img/
    poster.png          -> seu pôster completo
    characters/*.png     -> cada personagem já recortado do pôster
  videos/
    produtora.mp4         -> vídeo da produtora (já incluído)
    intro.mp4              -> vídeo de intro (já incluído)
  audio/                 -> coloque os .mp3 opcionais aqui (veja tabela acima)
```

## Personalizar

- **Nomes/cores dos personagens**: edite `characters.js`.
- **Pontos para vencer**: constante `WINS_NEEDED` em `script.js` (padrão 5).
- **Recortes dos personagens**: se algum recorte ficar cortando o rosto,
  troque o PNG correspondente em `assets/img/characters/` por um recorte
  mais preciso do seu pôster (mesmo nome de arquivo).
