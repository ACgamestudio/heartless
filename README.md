# Heart Less OwO Jokenpô

Jogo de pedra-papel-tesoura com o elenco original de **Heart Less OwO** (16
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
4. **Seleção de personagem** — grade com os 16 lutadores.
5. **Jogo** — pedra/papel/tesoura contra um rival sorteado entre os outros
   personagens. Primeiro a 5 vitórias ganha.

Se um vídeo ainda não existir, o jogo detecta o erro automaticamente e pula
para a próxima tela sozinho (ou use o botão "Pular"), então você pode testar
tudo agora mesmo e ir adicionando os arquivos depois.

## Arquivos que você ainda precisa adicionar

Coloque os arquivos com **exatamente** esses nomes nas pastas indicadas:

| Arquivo | Pasta | Obrigatório? |
|---|---|---|
| `produtora.mp4` | `assets/videos/` | Opcional (pula automaticamente se faltar) |
| `intro.mp4` | `assets/videos/` | Opcional (pula automaticamente se faltar) |
| `music.mp3` | `assets/audio/` | Opcional — música de fundo do menu/jogo |
| `select.mp3` | `assets/audio/` | Opcional — som ao escolher personagem |
| `win_round.mp3` | `assets/audio/` | Opcional — som ao vencer uma rodada |
| `lose_round.mp3` | `assets/audio/` | Opcional — som ao perder uma rodada |
| `victory.mp3` | `assets/audio/` | Opcional — som da vitória final |
| `defeat.mp3` | `assets/audio/` | Opcional — som da derrota final |

Todos os sons/vídeos são opcionais: o jogo funciona 100% sem eles, só fica
mais chamativo com eles. Use apenas arquivos que você mesmo criou ou tenha
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
  videos/                -> coloque produtora.mp4 e intro.mp4 aqui
  audio/                 -> coloque os .mp3 opcionais aqui
```

## Personalizar

- **Nomes/cores dos personagens**: edite `characters.js`.
- **Pontos para vencer**: constante `WINS_NEEDED` em `script.js` (padrão 5).
- **Recortes dos personagens**: se algum recorte ficar cortando o rosto,
  troque o PNG correspondente em `assets/img/characters/` por um recorte
  mais preciso do seu pôster (mesmo nome de arquivo).
