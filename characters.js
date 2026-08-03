// Elenco de personagens de "Heart Less OwO" — todos personagens originais,
// usando os cards já estilizados em assets/img/characters/ (recortados do
// layout de seleção oficial do jogo). Nenhum personagem, som ou vídeo do
// Dragon Ball é usado no jogo.

const CHARACTERS = [
  { id: 'heart',  name: 'Heart',   color: '#ff2d55', w: 355, h: 732 },
  { id: 'teddy',  name: 'Teddy',   color: '#e0a838', w: 196, h: 331 },
  { id: 'lolly',  name: 'Lolly',   color: '#ff3d9e', w: 204, h: 331 },
  { id: 'zuko',   name: 'Zuko',    color: '#2d8bff', w: 188, h: 331 },
  { id: 'miyu',   name: 'Miyu',    color: '#b95bff', w: 196, h: 331 },
  { id: 'razor',  name: 'Razor',   color: '#ff3b1f', w: 212, h: 331 },
  { id: 'shadow', name: 'Shadow',  color: '#9b5de5', w: 211, h: 331 },
  { id: 'blitz',  name: 'Blitz',   color: '#2fe0d0', w: 262, h: 284 },
  { id: 'toxin',  name: 'Toxin',   color: '#7ee034', w: 243, h: 284 },
  { id: 'nya',    name: 'Nya',     color: '#ffcc33', w: 190, h: 284 },
  { id: 'yuki',   name: 'Yuki',    color: '#3a7bff', w: 217, h: 284 },
  { id: 'star',   name: 'Star',    color: '#b98bff', w: 211, h: 284 },
  { id: 'void',   name: 'Void',    color: '#e0a838', w: 256, h: 297 },
  { id: 'king',   name: 'King',    color: '#b060ff', w: 237, h: 297 },
  { id: 'kai',    name: 'Kai',     color: '#ff3131', w: 259, h: 297 },
  { id: 'spark',  name: 'Spark',   color: '#ff8c1a', w: 287, h: 297 },
];

// Personagens com vídeo de especial próprio em assets/videos/specials/.
// Os demais usam o especial padrão (sem cinemática).
const CINEMATIC = ['heart', 'teddy', 'lolly', 'toxin', 'blitz'];
const hasCinematic = (id) => CINEMATIC.indexOf(id) >= 0;

const charImg = (id) => `./assets/img/characters/${id}.png`;
