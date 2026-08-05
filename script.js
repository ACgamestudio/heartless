// ==========================================================================
// Heart Less OwO Jokenpô — lógica principal
// ==========================================================================

// --------------------------------------------------------------------------
// --vw / --vh corrigidos: quando o hack de "forçar paisagem" (rotate 90deg
// em html) está ativo, window.innerWidth/innerHeight continuam sendo os
// valores FÍSICOS (não-rotacionados) da tela. Isso faz qualquer `vw`/`vh`
// usado no CSS calcular contra o eixo errado. Aqui a gente detecta se o
// hack está ativo (mesma condição do media query que dispara o rotate) e,
// nesse caso, troca width<->height antes de virar variável CSS. O resto do
// styles.css usa var(--vw)/var(--vh) no lugar de vw/vh cru.
// --------------------------------------------------------------------------
function updateViewportUnits() {
  const rotateHackActive = window.matchMedia(
    '(max-width: 900px) and (orientation: portrait)'
  ).matches;

  const visualWidth = rotateHackActive ? window.innerHeight : window.innerWidth;
  const visualHeight = rotateHackActive ? window.innerWidth : window.innerHeight;

  document.documentElement.style.setProperty('--vw', (visualWidth / 100) + 'px');
  document.documentElement.style.setProperty('--vh', (visualHeight / 100) + 'px');
}

updateViewportUnits();
window.addEventListener('resize', updateViewportUnits);
window.addEventListener('orientationchange', updateViewportUnits);

const screens = {
  start: document.getElementById('screen-start'),
  produtora: document.getElementById('screen-produtora'),
  intro: document.getElementById('screen-intro'),
  select: document.getElementById('screen-select'),
  game: document.getElementById('screen-game'),
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// --------------------------------------------------------------------------
// Áudio (sintetizado via Web Audio API — sem arquivos externos)
// --------------------------------------------------------------------------
const SFX = SoundEngine.SFX;
const BGM = SoundEngine.BGM;

// --------------------------------------------------------------------------
// Tela cheia + orientação paisagem (disparado no gesto do usuário)
// --------------------------------------------------------------------------
async function enterImmersiveMode() {
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) await el.mozRequestFullScreen();
    else if (el.msRequestFullscreen) await el.msRequestFullscreen();
  } catch (e) { /* navegador bloqueou tela cheia, segue sem ela */ }

  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock('landscape');
    }
  } catch (e) { /* navegador não suporta travar orientação (ex: iOS Safari) */ }
}

// --------------------------------------------------------------------------
// TELA 1 -> INICIAR: dispara vídeo da produtora com som (gesto do usuário
// libera o áudio no navegador), entra em tela cheia e trava paisagem
// --------------------------------------------------------------------------
document.getElementById('btn-start').addEventListener('click', () => {
  SoundEngine.unlock();
  enterImmersiveMode();
  goToVideo('produtora', screens.produtora, () => goToVideo('intro', screens.intro, goToSelect));
});

function goToVideo(key, screenEl, onFinish) {
  showScreen(key === 'produtora' ? 'produtora' : 'intro');
  const video = document.getElementById(`video-${key}`);
  const fallback = screenEl.querySelector('.video-fallback');
  let finished = false;

  const finish = (pulou) => {
    if (finished) return;
    finished = true;
    video.pause();
    // pause() NÃO interrompe o download: o navegador continua baixando o resto
    // do arquivo em segundo plano. Quem pula a intro no segundo 2 seguia
    // puxando o vídeo inteiro, roubando banda dos assets da próxima tela.
    // Zerar as fontes e chamar load() é o jeito de abortar a transferência.
    if (pulou) abortarDownload(video);
    onFinish();
  };

  video.muted = false;
  video.currentTime = 0;
  const playPromise = video.play();
  if (playPromise) {
    playPromise.catch(() => {
      // não conseguiu tocar (arquivo ausente ou bloqueado) -> mostra aviso e segue
      fallback.style.display = 'block';
      setTimeout(() => finish(true), 1800);
    });
  }

  video.onerror = () => {
    fallback.style.display = 'block';
    setTimeout(() => finish(true), 1800);
  };

  video.onended = () => finish(false);

  screenEl.querySelector('.btn-skip').onclick = () => finish(true);
}

// Interrompe de verdade o download de um <video>, sem perder a fonte original
// (guardada em data-src, caso você queira oferecer "rever a intro" no menu).
function abortarDownload(video) {
  try {
    const fonte = video.querySelector('source');
    if (fonte && !video.dataset.src) video.dataset.src = fonte.getAttribute('src');
    video.removeAttribute('src');
    while (video.firstChild) video.removeChild(video.firstChild);
    video.load();
  } catch (e) {
    console.warn('[video] não consegui abortar o download:', e);
  }
}

// Recoloca a fonte guardada, se um dia quiser um botão "rever intro"
function restaurarVideo(video) {
  if (!video.dataset.src || video.querySelector('source')) return;
  const s = document.createElement('source');
  s.setAttribute('src', video.dataset.src);
  s.setAttribute('type', 'video/mp4');
  video.appendChild(s);
  video.load();
}

function goToSelect() {
  showScreen('select');
  BGM.start();
}

// --------------------------------------------------------------------------
// TELA 4: SELEÇÃO DE PERSONAGEM (grid de cards já estilizados)
// --------------------------------------------------------------------------
const characterGrid = document.getElementById('character-grid');
const selectedNameEl = document.getElementById('selected-name');
const btnConfirm = document.getElementById('btn-confirm');
const selectScreenEl = document.getElementById('screen-select');
const heroImg = document.getElementById('hero-img');
const heroName = document.getElementById('hero-name');
const heroCode = document.getElementById('hero-code');
const heroBadge = document.getElementById('hero-badge');
const rosterIndexEl = document.getElementById('roster-index');
const btnRandom = document.getElementById('btn-random');
let selectedCharacter = null;
let focusIndex = -1;
const cards = [];

document.getElementById('roster-total').textContent = String(CHARACTERS.length).padStart(2, '0');

CHARACTERS.forEach((ch, i) => {
  const card = document.createElement('button');
  card.className = 'char-card-img';
  card.type = 'button';
  card.dataset.id = ch.id;
  card.dataset.index = i;
  const el = elementoDe(ch.id);
  card.style.setProperty('--card-color', ch.color);
  card.style.setProperty('--el', el.cor);
  card.style.animationDelay = (i * 28) + 'ms';
  card.setAttribute('aria-label', ch.name);
  card.innerHTML =
    `<img src="${charImg(ch.id)}" alt="${ch.name}" loading="lazy">` +
    `<span class="el-chip" title="${el.nome} — ${el.passiva.nome}: ${el.passiva.texto}">${el.icone}</span>` +
    (hasCinematic(ch.id) ? '' : '<span class="char-cine sem" title="especial sem cinemática">&#9679;</span>') +
    `<div class="el-passiva">${el.passiva.curto}</div>` +
    `<div class="char-name-plate"><span>${ch.name}</span></div>`;

  // no PC, passar o mouse já mostra o lutador no painel; sair volta ao escolhido
  card.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') preview(ch); });
  card.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') preview(selectedCharacter); });
  card.addEventListener('focus', () => preview(ch));
  // toque/clique: 1º escolhe, 2º no mesmo card confirma
  card.addEventListener('click', () => {
    if (selectedCharacter && selectedCharacter.id === ch.id) return confirmSelection();
    selectCharacter(ch, card);
  });
  cards.push(card);
  characterGrid.appendChild(card);
});

/** Atualiza só o painel de destaque, sem mexer na escolha. */
function preview(ch) {
  if (!ch) {
    heroImg.classList.add('empty');
    heroImg.src = './assets/img/poster.png';
    heroName.textContent = 'SELECIONE';
    heroCode.textContent = 'aguardando';
    heroBadge.textContent = '— — —';
    heroBadge.className = 'hero-badge padrao';
    rosterIndexEl.textContent = '--';
    selectScreenEl.style.removeProperty('--sel');
    if (painelHab) painelHab.style.display = 'none';
    return;
  }
  heroImg.classList.remove('empty');
  if (!heroImg.src.endsWith(ch.id + '.png')) {
    heroImg.src = charImg(ch.id);
    heroImg.style.animation = 'none';
    void heroImg.offsetWidth;
    heroImg.style.animation = '';
  }
  heroName.textContent = ch.name.toUpperCase();
  heroCode.textContent = 'unid. ' + ch.id;
  pintarHabilidades(ch);
  // Com os 16 clipes prontos, anunciar "tem cinemática" em todos é ruído.
  // O selo agora só aparece na exceção: personagem sem vídeo próprio.
  const cine = hasCinematic(ch.id);
  heroBadge.textContent = cine ? '' : 'especial sem cinemática';
  heroBadge.className = 'hero-badge padrao';
  heroBadge.style.display = cine ? 'none' : 'inline-flex';
  heroBadge.style.marginBottom = cine ? '0' : '6px';
  rosterIndexEl.textContent = String(CHARACTERS.indexOf(ch) + 1).padStart(2, '0');
  selectScreenEl.style.setProperty('--sel', ch.color);
}

// Monta no painel de destaque: elemento, lema, passiva, ultimate e o ciclo
// de forte/fraco. É a informação que faz a escolha do lutador virar decisão.
let painelHab = null;
function pintarHabilidades(ch) {
  const chave = chaveElemento(ch.id);
  const el = ELEMENTS[chave];
  const forte = ELEMENTS[forteContra(chave)];
  const fraco = ELEMENTS[fracoContra(chave)];

  if (!painelHab) {
    painelHab = document.createElement('div');
    document.querySelector('.hero-info').appendChild(painelHab);
  }
  painelHab.style.setProperty('--el', el.cor);
  painelHab.innerHTML = `
    <div class="hero-el">${el.icone} ${el.nome}</div>
    <div class="hero-lema">"${el.lema}"</div>
    <div class="hero-hab">
      <div><b>Passiva · ${el.passiva.nome}</b><span>${el.passiva.texto}</span></div>
      <div><b>Ultimate · ${el.ultimate.nome}</b><span>${el.ultimate.texto}</span></div>
    </div>
    <div class="hero-ciclo">
      <i class="f">forte vs ${forte.icone} ${forte.nome}</i>
      <i class="w">fraco vs ${fraco.icone} ${fraco.nome}</i>
    </div>`;
  painelHab.style.display = 'block';
}

function selectCharacter(ch, card) {
  cards.forEach(c => { c.classList.remove('selected'); c.removeAttribute('aria-pressed'); });
  card.classList.add('selected');
  card.setAttribute('aria-pressed', 'true');
  selectedCharacter = ch;
  focusIndex = CHARACTERS.indexOf(ch);
  preview(ch);
  selectedNameEl.innerHTML = 'lutador: <b>' + ch.name.toUpperCase() + '</b>';
  btnConfirm.disabled = false;
  selectScreenEl.classList.add('ready');
  card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  SFX.select();
}

function confirmSelection() {
  if (!selectedCharacter) return;
  SFX.confirm();
  startGame(selectedCharacter);
}

btnConfirm.addEventListener('click', confirmSelection);

/** Sorteia um lutador diferente do atual. */
function randomPick() {
  let i = Math.floor(Math.random() * CHARACTERS.length);
  if (CHARACTERS.length > 1 && selectedCharacter && CHARACTERS[i].id === selectedCharacter.id) {
    i = (i + 1) % CHARACTERS.length;
  }
  selectCharacter(CHARACTERS[i], cards[i]);
}
btnRandom.addEventListener('click', randomPick);

/** Navegação por teclado no roster (colunas lidas do grid renderizado). */
function colunas() {
  const cs = getComputedStyle(characterGrid).gridTemplateColumns;
  return Math.max(1, cs.split(' ').filter(Boolean).length);
}

document.addEventListener('keydown', (e) => {
  if (!selectScreenEl.classList.contains('active')) return;
  const n = CHARACTERS.length;
  const col = colunas();
  let alvo = focusIndex;

  switch (e.key) {
    case 'ArrowRight': alvo = focusIndex < 0 ? 0 : (focusIndex + 1) % n; break;
    case 'ArrowLeft':  alvo = focusIndex < 0 ? 0 : (focusIndex - 1 + n) % n; break;
    case 'ArrowDown':  alvo = focusIndex < 0 ? 0 : Math.min(n - 1, focusIndex + col); break;
    case 'ArrowUp':    alvo = focusIndex < 0 ? 0 : Math.max(0, focusIndex - col); break;
    case 'Enter': case ' ':
      if (selectedCharacter) { e.preventDefault(); confirmSelection(); }
      return;
    case 'r': case 'R': randomPick(); return;
    default: return;
  }
  e.preventDefault();
  selectCharacter(CHARACTERS[alvo], cards[alvo]);
});

// --------------------------------------------------------------------------
// TELA 5: JOGO — Duelo estilo fighting game (vida + medidor de especial)
// --------------------------------------------------------------------------
const gameScreenEl = document.getElementById('screen-game');
const playerPortrait = document.getElementById('player-portrait');
const rivalPortrait = document.getElementById('rival-portrait');
const playerNameEl = document.getElementById('player-name');
const rivalNameEl = document.getElementById('rival-name');
const playerHpFill = document.getElementById('player-hp-fill');
const rivalHpFill = document.getElementById('rival-hp-fill');
const playerMeterFill = document.getElementById('player-meter-fill');
const rivalMeterFill = document.getElementById('rival-meter-fill');
const playerDmgEl = document.getElementById('player-dmg');
const rivalDmgEl = document.getElementById('rival-dmg');
const playerHpGhost = document.getElementById('player-hp-ghost');
const rivalHpGhost = document.getElementById('rival-hp-ghost');
const playerHpNum = document.getElementById('player-hp-num');
const rivalHpNum = document.getElementById('rival-hp-num');
const playerHpOuter = document.getElementById('player-hp-outer');
const rivalHpOuter = document.getElementById('rival-hp-outer');
const playerMeterOuter = document.getElementById('player-meter-outer');
const rivalMeterOuter = document.getElementById('rival-meter-outer');
const clashEl = document.getElementById('clash');
const comboEl = document.getElementById('combo');
const roundResult = document.getElementById('round-result');
const btnSpecial = document.getElementById('btn-special');
const btnMenu = document.getElementById('btn-menu');

const overlayEnd = document.getElementById('overlay-end');
const overlayTitle = document.getElementById('overlay-title');
const overlaySubtitle = document.getElementById('overlay-subtitle');
const btnRestart = document.getElementById('btn-restart');
const victoryVideoEl = document.getElementById('victory-video');

const specialOverlay = document.getElementById('special-overlay');
const specialVideoEl = document.getElementById('special-video');

// ---------- pré-carregamento dos clipes de especial ----------
// Antes, o download do vídeo começava no instante em que o especial era usado:
// o clipe entrava travando porque estava sendo baixado enquanto tocava.
// Agora, assim que a luta começa, os clipes dos DOIS lutadores são baixados
// inteiros em segundo plano e guardados em memória (blob). Quando o especial
// sai, o vídeo já está local — toca instantâneo, sem depender da rede.
const CLIPES = new Map();
const CLIPES_BAIXANDO = new Set();

function urlEspecial(id) { return `./assets/videos/specials/${id}.mp4`; }
function urlVitoria(id) { return `./assets/videos/victory/${id}.mp4`; }

async function precarregarClipe(chave, url) {
  if (CLIPES.has(chave) || CLIPES_BAIXANDO.has(chave)) return;
  CLIPES_BAIXANDO.add(chave);
  try {
    const r = await fetch(url, { cache: 'force-cache' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    CLIPES.set(chave, URL.createObjectURL(await r.blob()));
  } catch (e) {
    // 404 é normal: só 5 personagens têm clipe próprio
    console.info('[clipe] sem pré-carga para', chave);
  } finally {
    CLIPES_BAIXANDO.delete(chave);
  }
}

function fonteDoClipe(chave, url) {
  return CLIPES.get(chave) || url;
}

// --------------------------------------------------------------------------
// Toca um clipe de vídeo específico de personagem (especial ou vitória).
// Se o arquivo ainda não existir, ou falhar por qualquer motivo, chama o
// callback imediatamente — o jogo nunca trava esperando um vídeo ausente.
// --------------------------------------------------------------------------
function playClip(videoEl, overlayEl, src, maxDurationMs, callback) {
  let done = false;
  let safety;
  let travouEm = null;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(safety);
    if (overlayEl) overlayEl.classList.add('hidden');
    videoEl.pause();
    videoEl.onended = null;
    videoEl.onerror = null;
    videoEl.oncanplay = null;
    videoEl.onwaiting = null;
    videoEl.onplaying = null;
    clearTimeout(travouEm);
    if (callback) callback();
  };
  const finishWithError = () => {
    if (!overlayEl) videoEl.style.display = 'none';
    finish();
  };

  const armSafety = (ms) => {
    clearTimeout(safety);
    safety = setTimeout(finish, ms);
  };

  // Trava de segurança inicial: se o vídeo nem carregar, o jogo segue em
  // frente depois desse tempo em vez de travar esperando um arquivo ausente.
  armSafety(maxDurationMs);

  videoEl.src = src;
  videoEl.currentTime = 0;
  videoEl.muted = false;
  if (overlayEl) overlayEl.classList.remove('hidden');
  else videoEl.style.display = 'block';

  // Assim que soubermos a duração real do clipe, a trava passa a valer a
  // duração inteira do vídeo (+ folga) em vez do valor inicial curto —
  // então o vídeo sempre toca até o fim, e a trava só é um fallback real.
  // Só estende a trava quando o vídeo REALMENTE pode tocar ('canplay').
  // Usar 'loadedmetadata' era um bug: os metadados chegam em milissegundos,
  // a trava ia pra 15s, e o clipe ficava esse tempo todo engasgando no buffer.
  videoEl.oncanplay = () => {
    if (isFinite(videoEl.duration) && videoEl.duration > 0) {
      armSafety(videoEl.duration * 1000 + 800);
    }
  };

  // Se a reprodução parar pra esperar download por mais de 1,2s, desiste do
  // clipe e segue a luta. Melhor perder a cinemática do que travar o jogo.
  videoEl.onwaiting = () => {
    travouEm = setTimeout(() => {
      console.warn('[clipe] buffer travado, seguindo sem a cinemática');
      finishWithError();
    }, 1200);
  };
  videoEl.onplaying = () => { clearTimeout(travouEm); travouEm = null; };

  const playPromise = videoEl.play();
  if (playPromise) playPromise.catch(finishWithError);
  videoEl.onended = finish;
  videoEl.onerror = finishWithError;
}

const MAX_HP = 100;
const MOVE_LABEL = { punch: 'Soco', kick: 'Chute', block: 'Bloqueio', special: 'Especial' };

let player = null;
let rival = null;
let playerHP = MAX_HP;
let rivalHP = MAX_HP;
let playerMeter = 0;
let rivalMeter = 0;
let gameOver = false;
let locked = false;
let combo = 0;

const NOME_GOLPE = { punch: 'Soco', kick: 'Chute', block: 'Bloqueio', special: 'Ultimate' };

// Todo o CSS do sistema de elementos é injetado daqui. Assim o index.html e o
// styles.css não precisam ser tocados — um arquivo só pra atualizar.
(function injetarEstiloElementos() {
  const css = `
  .el-chip{position:absolute;top:5px;left:5px;z-index:2;display:flex;align-items:center;
    justify-content:center;width:20px;height:20px;border-radius:6px;font-size:11px;
    background:rgba(0,0,0,.72);border:1px solid var(--el);box-shadow:0 0 8px -2px var(--el)}
  .el-passiva{position:absolute;left:0;right:0;bottom:24%;z-index:2;padding:2px 4px;
    font-family:'Rubik',sans-serif;font-weight:600;font-size:8px;line-height:1.15;
    letter-spacing:.02em;text-align:center;color:#fff;text-transform:uppercase;
    background:linear-gradient(to top,rgba(0,0,0,.9),rgba(0,0,0,.45));
    text-shadow:0 1px 2px #000}
  .char-card-img.selected .el-passiva{color:var(--el)}

  .hero-el{display:flex;align-items:center;justify-content:center;gap:6px;margin:2px 0 4px;
    font-family:'Bungee',sans-serif;font-size:11px;letter-spacing:.14em;text-transform:uppercase;
    color:var(--el);text-shadow:0 0 10px var(--el)}
  .hero-lema{font-size:12px;font-style:italic;color:var(--muted);margin-bottom:8px}
  .hero-hab{display:grid;gap:5px;text-align:left;margin-top:4px}
  .hero-hab div{border-left:2px solid var(--el);padding:3px 0 3px 8px;
    background:linear-gradient(90deg,rgba(255,255,255,.05),transparent)}
  .hero-hab b{display:block;font-family:'Bungee',sans-serif;font-size:9px;letter-spacing:.1em;
    text-transform:uppercase;color:var(--el)}
  .hero-hab span{font-size:11px;line-height:1.25;color:var(--text)}
  .hero-ciclo{display:flex;gap:10px;justify-content:center;margin-top:8px;font-size:10px;
    letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
  .hero-ciclo i{font-style:normal}
  .hero-ciclo .f{color:#6ee7b7} .hero-ciclo .w{color:#ff9a9d}

  .avisos{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:5px}
  .avisos span{padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;
    letter-spacing:.02em;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);
    color:#fff;animation:aviso-in .28s ease}
  @keyframes aviso-in{from{opacity:0;transform:translateY(5px) scale(.9)}to{opacity:1}}

  .choice-special.congelado{--tint:#3a7bff}
  .choice-special.congelado .charge{background:linear-gradient(to top,rgba(58,123,255,.45),rgba(58,123,255,.1))}
  `;
  const tag = document.createElement('style');
  tag.textContent = css;
  document.head.appendChild(tag);
})();

// faixa de avisos logo abaixo da narração do turno
let avisosEl = null;
function mostrarAvisos(lista) {
  if (!avisosEl) {
    avisosEl = document.createElement('div');
    avisosEl.className = 'avisos';
    roundResult.parentElement.appendChild(avisosEl);
  }
  avisosEl.innerHTML = (lista || []).map(a => `<span>${a}</span>`).join('');
}

// ---------- estado do sistema de elementos (elements.js) ----------
let pEl = 'coracao', rEl = 'coracao';
let pFX = novoEstadoFX(), rFX = novoEstadoFX();
// Eclipse (Sombra) revela o próximo golpe do rival. Pra isso o golpe precisa
// ser sorteado ANTES do jogador escolher — fica guardado aqui.
let golpeRivalPreDefinido = null;

function pickRival(excludeId) {
  const pool = CHARACTERS.filter(c => c.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)];
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function startGame(chosen) {
  player = chosen;
  rival = pickRival(chosen.id);
  playerHP = MAX_HP;
  rivalHP = MAX_HP;
  playerMeter = 0;
  rivalMeter = 0;
  gameOver = false;
  locked = false;

  combo = 0;
  pEl = chaveElemento(player.id);
  rEl = chaveElemento(rival.id);
  pFX = novoEstadoFX();
  rFX = novoEstadoFX();
  golpeRivalPreDefinido = null;
  aplicarUltimateNoBotao();
  comboEl.classList.remove('on');
  gameScreenEl.classList.remove('critical');
  // a arena assume as cores dos dois lutadores
  gameScreenEl.style.setProperty('--p', player.color);
  gameScreenEl.style.setProperty('--r', rival.color);

  // baixa em segundo plano os clipes que podem aparecer nesta luta
  if (hasCinematic(player.id)) precarregarClipe('sp:' + player.id, urlEspecial(player.id));
  if (hasCinematic(rival.id)) precarregarClipe('sp:' + rival.id, urlEspecial(rival.id));
  precarregarClipe('vt:' + player.id, urlVitoria(player.id));

  playerPortrait.src = charImg(player.id);
  rivalPortrait.src = charImg(rival.id);
  playerNameEl.textContent = ELEMENTS[pEl].icone + ' ' + player.name;
  rivalNameEl.textContent = rival.name + ' ' + ELEMENTS[rEl].icone;

  updateBars();
  mostrarAvisos([]);
  const mult = multiplicadorAfinidade(pEl, rEl);
  roundResult.textContent = mult > 1
    ? `${ELEMENTS[pEl].nome} leva vantagem contra ${ELEMENTS[rEl].nome}. Ataque!`
    : mult < 1
      ? `${ELEMENTS[pEl].nome} é fraco contra ${ELEMENTS[rEl].nome}. Jogue na defensiva.`
      : 'Faça sua jogada!';
  overlayEnd.classList.add('hidden');
  victoryVideoEl.style.display = 'none';
  victoryVideoEl.removeAttribute('src');

  showScreen('game');
  BGM.start();
}

// O botão de Especial passa a mostrar o nome da ultimate do lutador escolhido.
function aplicarUltimateNoBotao() {
  const ult = ELEMENTS[pEl].ultimate;
  const lbl = btnSpecial.querySelector('.lbl');
  if (lbl) lbl.textContent = ult.nome;
  btnSpecial.title = ult.texto;
}

function updateBars() {
  const pHp = clamp(playerHP, 0, MAX_HP);
  const rHp = clamp(rivalHP, 0, MAX_HP);
  const pMe = clamp(playerMeter, 0, 100);
  const rMe = clamp(rivalMeter, 0, 100);

  // a barra branca (fantasma) tem delay no CSS: ela fica atrás mostrando
  // por um instante a vida que existia antes do golpe — o "chip damage"
  // clássico de jogo de luta. Não precisa guardar o valor anterior aqui.
  playerHpFill.style.width = pHp + '%';
  rivalHpFill.style.width = rHp + '%';
  playerHpGhost.style.width = pHp + '%';
  rivalHpGhost.style.width = rHp + '%';

  playerHpNum.textContent = pHp;
  rivalHpNum.textContent = rHp;
  playerHpOuter.classList.toggle('low', pHp <= 25 && pHp > 0);
  rivalHpOuter.classList.toggle('low', rHp <= 25 && rHp > 0);
  gameScreenEl.classList.toggle('critical', pHp <= 25 && pHp > 0 && !gameOver);

  playerMeterFill.style.width = pMe + '%';
  rivalMeterFill.style.width = rMe + '%';
  playerMeterOuter.classList.toggle('full', pMe >= 100);
  rivalMeterOuter.classList.toggle('full', rMe >= 100);

  // o próprio botão de especial é o medidor: a altura do preenchimento e o
  // rótulo em % vêm direto do meter do jogador.
  btnSpecial.style.setProperty('--charge', pMe + '%');
  const chg = btnSpecial.querySelector('.chg');
  const congelado = pFX.congelado > 0;
  if (chg) chg.textContent = congelado ? 'CONGELADO' : (pMe >= 100 ? 'PRONTO' : pMe + '%');
  btnSpecial.classList.toggle('armed', pMe >= 100 && !congelado);
  btnSpecial.classList.toggle('congelado', congelado);
  btnSpecial.disabled = playerMeter < 100 || gameOver || locked || congelado;
}

/** Estouro visual no centro da arena de acordo com o resultado do turno. */
function flashClash(pDmg, cDmg) {
  let texto, classe;
  if (pDmg > 0 && cDmg > 0) { texto = 'CHOQUE!'; classe = 'crit'; }
  else if (cDmg >= 14)      { texto = 'CRÍTICO!'; classe = 'crit'; }
  else if (cDmg > 0)        { texto = 'ACERTOU!'; classe = ''; }
  else if (pDmg > 0)        { texto = 'TOMOU DANO'; classe = ''; }
  else                      { texto = 'BLOQUEADO'; classe = 'block'; }

  clashEl.className = 'clash ' + classe;
  clashEl.textContent = texto;
  void clashEl.offsetWidth;
  clashEl.classList.add('go');
}

/** Sequência de turnos em que o jogador acertou sem tomar dano. */
function updateCombo(pDmg, cDmg) {
  if (cDmg > 0 && pDmg === 0) combo += 1; else combo = 0;
  if (combo >= 2) {
    comboEl.textContent = combo + ' EM SEQUÊNCIA';
    comboEl.classList.remove('on');
    void comboEl.offsetWidth;
    comboEl.classList.add('on');
  } else {
    comboEl.classList.remove('on');
  }
}

// --------------------------------------------------------------------------
// Escolha da CPU: golpe aleatório ponderado, usa especial se o medidor
// estiver cheio.
// --------------------------------------------------------------------------
function cpuChoice() {
  if (rivalMeter >= 100 && rFX.congelado === 0 && Math.random() < 0.55) return 'special';
  const roll = Math.random();
  if (roll < 0.38) return 'punch';
  if (roll < 0.76) return 'kick';
  return 'block';
}

// --------------------------------------------------------------------------
// Resolve um turno: retorna dano e ganho de medidor para os dois lados,
// além do texto descrevendo o que aconteceu.
// --------------------------------------------------------------------------
function resolveTurn(p, c) {
  let pDmg = 0, cDmg = 0, pMeterGain = 10, cMeterGain = 10, text = '';

  if (p === c) {
    switch (p) {
      case 'punch':
        pDmg = 6; cDmg = 6;
        text = `Os dois socaram ao mesmo tempo!`;
        break;
      case 'kick':
        pDmg = 10; cDmg = 10;
        text = `Chutes trocados na mesma hora!`;
        break;
      case 'block':
        pMeterGain = 8; cMeterGain = 8;
        text = `Os dois ficaram na defesa.`;
        break;
      case 'special':
        pDmg = 22; cDmg = 22;
        pMeterGain = -playerMeter; cMeterGain = -rivalMeter;
        text = `OS ESPECIAIS SE CHOCARAM!`;
        break;
    }
  } else if (p === 'punch' && c === 'kick') {
    cDmg = 12;
    text = `${player.name} socou antes do chute de ${rival.name}!`;
  } else if (c === 'punch' && p === 'kick') {
    pDmg = 12;
    text = `${rival.name} socou antes do seu chute!`;
  } else if (p === 'kick' && c === 'block') {
    cDmg = 14;
    text = `Seu chute quebrou a defesa de ${rival.name}!`;
  } else if (c === 'kick' && p === 'block') {
    pDmg = 14;
    pMeterGain += 4;
    text = `${rival.name} quebrou sua defesa com um chute!`;
  } else if (p === 'block' && c === 'punch') {
    cDmg = 3; pMeterGain += 6;
    text = `Você bloqueou o soco e revidou!`;
  } else if (c === 'block' && p === 'punch') {
    pDmg = 3; cMeterGain += 6;
    text = `${rival.name} bloqueou seu soco e revidou!`;
  } else if (p === 'special') {
    if (c === 'block') {
      cDmg = 10;
      text = `Você usou o ESPECIAL! ${rival.name} bloqueou parte do golpe.`;
    } else {
      cDmg = 28;
      text = `Você acertou um ESPECIAL devastador!`;
    }
    pMeterGain = -playerMeter;
  } else if (c === 'special') {
    if (p === 'block') {
      pDmg = 10;
      text = `${rival.name} usou o ESPECIAL! Você bloqueou parte do golpe.`;
    } else {
      pDmg = 28;
      text = `${rival.name} acertou um ESPECIAL devastador!`;
    }
    cMeterGain = -rivalMeter;
  }

  return { pDmg, cDmg, pMeterGain, cMeterGain, text };
}

document.querySelectorAll('.choice-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (gameOver || locked) return;
    if (btn.dataset.choice === 'special' && playerMeter < 100) return;
    playTurn(btn.dataset.choice);
  });
});

const TECLAS = { '1': 'punch', '2': 'kick', '3': 'block', '4': 'special',
                 a: 'punch', s: 'kick', d: 'block', ' ': 'special' };

document.addEventListener('keydown', (e) => {
  if (!gameScreenEl.classList.contains('active')) return;
  const golpe = TECLAS[e.key] || TECLAS[String(e.key).toLowerCase()];
  if (!golpe) return;
  e.preventDefault();
  if (gameOver || locked) return;
  if (golpe === 'special' && playerMeter < 100) return;
  const btn = document.querySelector(`.choice-btn[data-choice="${golpe}"]`);
  if (btn) { btn.style.transform = 'translateY(-1px) scale(.97)'; setTimeout(() => btn.style.removeProperty('transform'), 130); }
  playTurn(golpe);
});

function playTurn(playerMove) {
  locked = true;
  SFX[playerMove]();
  // se o Eclipse revelou o golpe, é ELE que tem que sair — senão a revelação mentiria
  let rivalMove = golpeRivalPreDefinido || cpuChoice();
  golpeRivalPreDefinido = null;
  if (rivalMove === 'special' && (rFX.congelado > 0 || rivalMeter < 100)) rivalMove = 'kick';

  // Se alguém usou o Especial, toca o clipe daquele personagem antes de
  // aplicar o resultado (se o arquivo ainda não existir, segue direto).
  const specialUserId = playerMove === 'special' ? player.id : (rivalMove === 'special' ? rival.id : null);

  if (specialUserId) {
    const fonte = fonteDoClipe('sp:' + specialUserId, urlEspecial(specialUserId));
    playClip(specialVideoEl, specialOverlay, fonte, 2500, () => {
      resolveAndApply(playerMove, rivalMove);
    });
  } else {
    resolveAndApply(playerMove, rivalMove);
  }
}

function resolveAndApply(playerMove, rivalMove) {
  // guarda se o congelamento já valia ANTES deste turno: assim o efeito
  // aplicado agora sobrevive pro turno seguinte antes de expirar
  const congelavaP = pFX.congelado > 0;
  const congelavaR = rFX.congelado > 0;

  const base = resolveTurn(playerMove, rivalMove);

  // elements.js reescreve o resultado: afinidade, passivas e ultimates
  const res = aplicarElementos({
    base, pMove: playerMove, rMove: rivalMove,
    pEl, rEl, pFX, rFX,
    pHP: playerHP, rHP: rivalHP, maxHP: MAX_HP,
    pMeter: playerMeter, rMeter: rivalMeter,
    pNome: player.name, rNome: rival.name
  });

  const pDmg = res.pDmg, cDmg = res.cDmg, text = res.text;
  const avisos = res.avisos.slice();

  playerHP = clamp(playerHP - pDmg + res.pCura, 0, MAX_HP);
  rivalHP = clamp(rivalHP - cDmg + res.cCura, 0, MAX_HP);
  playerMeter = clamp(playerMeter + res.pMeterGain, 0, 100);
  rivalMeter = clamp(rivalMeter + res.cMeterGain, 0, 100);

  // veneno e queimadura cobram no fim do turno
  const contP = danoContinuo(pFX);
  const contR = danoContinuo(rFX);
  if (contP.dano > 0) {
    playerHP = clamp(playerHP - contP.dano, 0, MAX_HP);
    avisos.push('você sofre ' + contP.partes.join(' '));
    showDamage(playerDmgEl, contP.dano);
  }
  if (contR.dano > 0) {
    rivalHP = clamp(rivalHP - contR.dano, 0, MAX_HP);
    avisos.push(rival.name + ' sofre ' + contR.partes.join(' '));
    showDamage(rivalDmgEl, contR.dano);
  }

  // Sombra ganha o segundo escudo quando a vida entra no vermelho
  if (checarSegundoEscudo(pFX, playerHP, pEl)) avisos.push('🌑 Espelho recarregou');
  checarSegundoEscudo(rFX, rivalHP, rEl);

  // expira o congelamento que já valia antes deste turno
  if (congelavaP && pFX.congelado > 0) pFX.congelado--;
  if (congelavaR && rFX.congelado > 0) rFX.congelado--;

  // Eclipse: sorteia agora o golpe do rival e mostra pro jogador
  if (pFX.revelar) {
    pFX.revelar = false;
    golpeRivalPreDefinido = cpuChoice();
    avisos.push('🌑 próximo golpe do rival: ' + NOME_GOLPE[golpeRivalPreDefinido]);
  }

  updateBars();
  mostrarAvisos(avisos);
  roundResult.textContent = text;
  roundResult.classList.remove('flash');
  void roundResult.offsetWidth;
  roundResult.classList.add('flash');

  flashClash(pDmg, cDmg);
  updateCombo(pDmg, cDmg);

  if (pDmg > 0) { showDamage(playerDmgEl, pDmg); hit(playerPortrait); SFX.hit(); }
  if (cDmg > 0) { showDamage(rivalDmgEl, cDmg); hit(rivalPortrait); SFX.hit(); }
  if (playerMove === 'block' && pDmg === 0) guard(playerPortrait);
  if (rivalMove === 'block' && cDmg === 0) guard(rivalPortrait);
  if (pDmg > 0 || cDmg > 0) shakeScreen();

  setTimeout(() => {
    if (playerHP <= 0 && rivalHP <= 0) {
      endGame('draw');
    } else if (rivalHP <= 0) {
      endGame('win');
    } else if (playerHP <= 0) {
      endGame('lose');
    } else {
      locked = false;
      btnSpecial.disabled = playerMeter < 100;
    }
  }, 450);
}

function showDamage(el, amount) {
  el.textContent = '-' + amount;
  el.classList.remove('show');
  void el.offsetWidth; // reinicia a animação
  el.classList.add('show');
}

function hit(el) {
  el.classList.remove('hit');
  void el.offsetWidth;
  el.classList.add('hit');
  setTimeout(() => el.classList.remove('hit'), 300);
}

function guard(el) {
  el.classList.add('guard');
  setTimeout(() => el.classList.remove('guard'), 320);
}

function shakeScreen() {
  gameScreenEl.classList.remove('shake');
  void gameScreenEl.offsetWidth;
  gameScreenEl.classList.add('shake');
}

function endGame(result) {
  gameOver = true;
  locked = true;

  if (result === 'win') {
    overlayTitle.textContent = 'VITÓRIA!';
    overlayTitle.style.color = 'var(--red)';
    overlaySubtitle.textContent = `${player.name} nocauteou ${rival.name}!`;
  } else if (result === 'lose') {
    overlayTitle.textContent = 'DERROTA';
    overlayTitle.style.color = 'var(--muted)';
    overlaySubtitle.textContent = `${rival.name} nocauteou ${player.name}.`;
  } else {
    overlayTitle.textContent = 'EMPATE';
    overlayTitle.style.color = 'var(--cyan)';
    overlaySubtitle.textContent = `Os dois caíram ao mesmo tempo!`;
  }

  overlayEnd.classList.remove('hidden');
  result === 'win' ? SFX.victory() : SFX.defeat();

  if (result === 'win') {
    launchConfetti();
    playClip(victoryVideoEl, null, `./assets/videos/victory/${player.id}.mp4`, 8000, () => {});
  }
}

btnRestart.addEventListener('click', () => {
  overlayEnd.classList.add('hidden');
  showScreen('select');
});

btnMenu.addEventListener('click', () => {
  showScreen('select');
});

// --------------------------------------------------------------------------
// Confete de vitória (efeito 100% em código, sem depender de gif externo)
// --------------------------------------------------------------------------
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas.getContext('2d');
let confettiParticles = [];
let confettiRunning = false;

function resizeCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const CONFETTI_COLORS = ['#ff2d55', '#ff4fd1', '#38e8ff', '#f5eef8', '#ffd23f'];

function launchConfetti() {
  confettiParticles = Array.from({ length: 140 }, () => ({
    x: Math.random() * confettiCanvas.width,
    y: -20 - Math.random() * confettiCanvas.height * 0.5,
    size: 4 + Math.random() * 6,
    speedY: 2 + Math.random() * 3,
    speedX: (Math.random() - 0.5) * 2,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: Math.random() * 360,
    spin: (Math.random() - 0.5) * 10,
  }));

  if (!confettiRunning) {
    confettiRunning = true;
    requestAnimationFrame(animateConfetti);
  }
}

function animateConfetti() {
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  let anyAlive = false;
  confettiParticles.forEach(p => {
    p.y += p.speedY;
    p.x += p.speedX;
    p.rotation += p.spin;
    if (p.y < confettiCanvas.height + 20) anyAlive = true;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    ctx.restore();
  });

  if (anyAlive && overlayEnd.classList.contains('hidden') === false) {
    requestAnimationFrame(animateConfetti);
  } else {
    confettiRunning = false;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}
