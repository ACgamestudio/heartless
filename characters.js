// Elenco de personagens de "Heart Less OwO" — todos personagens originais,
// recortados do pôster oficial do jogo (assets/img/poster.png).
// Nenhum personagem, som ou vídeo do Dragon Ball é usado no jogo.

const CHARACTERS = [
  { id: 'heart',  name: 'Heart',  color: '#ff2d55', rect: { left: 37.20, top: 0.00, width: 23.68, height: 74.41 } },
  { id: 'teddy',  name: 'Teddy',  color: '#c9a876', rect: { left: 0.00,  top: 0.00, width: 10.99, height: 51.86 } },
  { id: 'lolly',  name: 'Lolly',  color: '#ff5fa8', rect: { left: 10.99, top: 0.00, width: 11.56, height: 51.86 } },
  { id: 'zuko',   name: 'Zuko',   color: '#3aa0ff', rect: { left: 21.98, top: 0.00, width: 14.09, height: 54.11 } },
  { id: 'miyu',   name: 'Miyu',   color: '#b95bff', rect: { left: 55.24, top: 0.00, width: 14.09, height: 51.86 } },
  { id: 'razor',  name: 'Razor',  color: '#ff4b3b', rect: { left: 68.21, top: 0.00, width: 13.53, height: 51.86 } },
  { id: 'shadow', name: 'Shadow', color: '#9b5de5', rect: { left: 81.17, top: 0.00, width: 18.83, height: 51.86 } },
  { id: 'blitz',  name: 'Blitz',  color: '#33e0ff', rect: { left: 0.00,  top: 28.18, width: 12.97, height: 45.10 } },
  { id: 'toxin',  name: 'Toxin',  color: '#7ee034', rect: { left: 20.86, top: 28.18, width: 14.66, height: 45.10 } },
  { id: 'nya',    name: 'Nya',    color: '#ffd23f', rect: { left: 54.11, top: 29.31, width: 14.66, height: 43.97 } },
  { id: 'yuki',   name: 'Yuki',   color: '#4d7cff', rect: { left: 70.46, top: 28.18, width: 12.40, height: 45.10 } },
  { id: 'star',   name: 'Star',   color: '#e5e5f5', rect: { left: 82.86, top: 28.18, width: 12.40, height: 45.10 } },
  { id: 'void',   name: 'Void',   color: '#f4c430', rect: { left: 0.00,  top: 51.86, width: 15.22, height: 48.14 } },
  { id: 'king',   name: 'King',   color: '#b78bff', rect: { left: 14.09, top: 47.35, width: 14.09, height: 52.65 } },
  { id: 'kai',    name: 'Kai',    color: '#ff4141', rect: { left: 60.32, top: 54.11, width: 14.09, height: 45.89 } },
  { id: 'spark',  name: 'Spark',  color: '#ff8c1a', rect: { left: 82.30, top: 51.86, width: 17.70, height: 48.14 } },
];

const charImg = (id) => `./assets/img/characters/${id}.png`;
