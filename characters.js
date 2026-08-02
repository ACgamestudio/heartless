// Elenco de personagens de "Heart Less OwO" — todos personagens originais,
// recortados do pôster oficial do jogo (assets/img/poster.png).
// Nenhum personagem, som ou vídeo do Dragon Ball é usado no jogo.

const CHARACTERS = [
  { id: 'heart',  name: 'Heart',  color: '#ff2d55' },
  { id: 'teddy',  name: 'Teddy',  color: '#c9a876' },
  { id: 'lolly',  name: 'Lolly',  color: '#ff5fa8' },
  { id: 'zuko',   name: 'Zuko',   color: '#3aa0ff' },
  { id: 'miyu',   name: 'Miyu',   color: '#b95bff' },
  { id: 'razor',  name: 'Razor',  color: '#ff4b3b' },
  { id: 'shadow', name: 'Shadow', color: '#9b5de5' },
  { id: 'blitz',  name: 'Blitz',  color: '#33e0ff' },
  { id: 'toxin',  name: 'Toxin',  color: '#7ee034' },
  { id: 'nya',    name: 'Nya',    color: '#ffd23f' },
  { id: 'yuki',   name: 'Yuki',   color: '#4d7cff' },
  { id: 'star',   name: 'Star',   color: '#e5e5f5' },
  { id: 'void',   name: 'Void',   color: '#f4c430' },
  { id: 'king',   name: 'King',   color: '#b78bff' },
  { id: 'kai',    name: 'Kai',    color: '#ff4141' },
  { id: 'spark',  name: 'Spark',  color: '#ff8c1a' },
];

const charImg = (id) => `./assets/img/characters/${id}.png`;
