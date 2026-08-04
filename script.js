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

  const finish = () => {
    if (finished) return;
    finished = true;
    video.pause();
    onFinish();
  };

  video.muted = false;
  video.currentTime = 0;
  const playPromise = video.play();
  if (playPromise) {
    playPromise.catch(() => {
      // não conseguiu tocar (arquivo ausente ou bloqueado) -> mostra aviso e segue
      fallback.style.display = 'block';
      setTimeout(finish, 1800);
    });
  }

  video.onerror = () => {
    fallback.style.display = 'block';
    setTimeout(finish, 1800);
  };

  video.onended = finish;

  screenEl.querySelector('.btn-skip').onclick = finish;
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
  card.style.setProperty('--card-color', ch.color);
  card.style.animationDelay = (i * 28) + 'ms';
  card.setAttribute('aria-label', ch.name);
  const el = elementoDe(ch.id);
  card.style.setProperty('--el-color', el.cor);
  card.innerHTML =
    `<img src="${charImg(ch.id)}" alt="${ch.name}" loading="lazy">` +
    (hasCinematic(ch.id) ? '<span class="char-cine" title="especial cinematográfico">&#9733;</span>' : '') +
    `<span class="char-el" title="${el.nome} — ${el.passiva.nome}">${el.icone}</span>` +
    `<div class="char-name-plate">` +
      `<span>${ch.name}</span>` +
      `<em class="char-kit">${el.passiva.curto}</em>` +
      `<em class="char-ult">${el.ultimate.icone || '★'} ${el.ultimate.nome}</em>` +
    `</div>`;

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
    limparKit();
    rosterIndexEl.textContent = '--';
    selectScreenEl.style.removeProperty('--sel');
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
  const cine = hasCinematic(ch.id);
  heroBadge.textContent = cine ? '\u2605 especial cinematográfico' : 'especial padrão';
  heroBadge.className = 'hero-badge' + (cine ? '' : ' padrao');
  mostrarKit(ch);
  rosterIndexEl.textContent = String(CHARACTERS.indexOf(ch) + 1).padStart(2, '0');
  selectScreenEl.style.setProperty('--sel', ch.color);
}

const kitEls = {
  box: document.getElementById('hero-kit'),
  icone: document.getElementById('kit-icone'),
  nome: document.getElementById('kit-nome'),
  lema: document.getElementById('kit-lema'),
  forte: document.getElementById('kit-forte'),
  fraco: document.getElementById('kit-fraco'),
  passivaNome: document.getElementById('kit-passiva-nome'),
  passiva: document.getElementById('kit-passiva'),
  ultNome: document.getElementById('kit-ult-nome'),
  ult: document.getElementById('kit-ult'),
};

function mostrarKit(ch) {
  const k = chaveElemento(ch.id);
  const el = ELEMENTS[k];
  const f = ELEMENTS[forteContra(k)], w = ELEMENTS[fracoContra(k)];
  kitEls.box.style.setProperty('--el-color', el.cor);
  kitEls.box.classList.add('on');
  kitEls.icone.textContent = el.icone;
  kitEls.nome.textContent = el.nome.toUpperCase();
  kitEls.lema.textContent = el.lema;
  kitEls.forte.textContent = `${f.icone} ${f.nome}`;
  kitEls.fraco.textContent = `${w.icone} ${w.nome}`;
  kitEls.passivaNome.textContent = el.passiva.nome;
  kitEls.passiva.textContent = el.passiva.texto;
  kitEls.ultNome.textContent = el.ultimate.nome;
  kitEls.ult.textContent = el.ultimate.texto;
}

function limparKit() {
  kitEls.box.classList.remove('on');
  kitEls.box.style.removeProperty('--el-color');
  kitEls.icone.textContent = '\u00b7';
  kitEls.nome.textContent = 'ELEMENTO';
  kitEls.lema.textContent = 'escolha um lutador';
  kitEls.forte.textContent = '—';
  kitEls.fraco.textContent = '—';
  kitEls.passivaNome.textContent = '—';
  kitEls.passiva.textContent = '—';
  kitEls.ultNome.textContent = '—';
  kitEls.ult.textContent = '—';
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

// --------------------------------------------------------------------------
// Toca um clipe de vídeo específico de personagem (especial ou vitória).
// Se o arquivo ainda não existir, ou falhar por qualquer motivo, chama o
// callback imediatamente — o jogo nunca trava esperando um vídeo ausente.
// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// Ritmo da cinemática do especial. Três estados, guardados no navegador:
//   completa  -> velocidade normal
//   rapida    -> 1.75x
//   off       -> nem abre o vídeo, o turno resolve na hora
// --------------------------------------------------------------------------
const CINE_MODOS = ['completa', 'rapida', 'off'];
const CINE_ROTULO = { completa: 'COMPLETA', rapida: 'RÁPIDA 1,75×', off: 'DESLIGADA' };
const CINE_RATE = { completa: 1, rapida: 1.75, off: 0 };

let cineModo = 'completa';
try { const g = localStorage.getItem('hlowo-cine'); if (CINE_MODOS.includes(g)) cineModo = g; } catch (e) {}

const btnCine = document.getElementById('btn-cine');
const btnSkipSpecial = document.getElementById('btn-skip-special');
const skipHint = document.getElementById('skip-hint');
let pularClipe = null;   // função de skip do clipe em execução

function pintarCine() {
  btnCine.textContent = '🎬 CINEMÁTICA: ' + CINE_ROTULO[cineModo];
  btnCine.classList.toggle('cine-off', cineModo === 'off');
}
btnCine.addEventListener('click', () => {
  cineModo = CINE_MODOS[(CINE_MODOS.indexOf(cineModo) + 1) % CINE_MODOS.length];
  try { localStorage.setItem('hlowo-cine', cineModo); } catch (e) {}
  pintarCine();
  SFX.select();
});
pintarCine();

// pular: botão, clique em qualquer lugar do overlay, Esc ou Enter
btnSkipSpecial.addEventListener('click', (e) => { e.stopPropagation(); if (pularClipe) pularClipe(); });
specialOverlay.addEventListener('click', () => { if (pularClipe) pularClipe(); });
document.addEventListener('keydown', (e) => {
  if (!pularClipe) return;
  if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pularClipe(); }
});

function playClip(videoEl, overlayEl, src, maxDurationMs, callback) {
  let done = false;
  let safety;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(safety);
    if (overlayEl) overlayEl.classList.add('hidden');
    if (overlayEl === specialOverlay) pularClipe = null;
    videoEl.pause();
    videoEl.onended = null;
    videoEl.onerror = null;
    videoEl.onloadedmetadata = null;
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

  if (overlayEl === specialOverlay) {
    pularClipe = finish;
    skipHint.classList.remove('sumiu');
    setTimeout(() => skipHint.classList.add('sumiu'), 2200);
  }

  videoEl.src = src;
  videoEl.currentTime = 0;
  videoEl.muted = false;
  videoEl.playbackRate = CINE_RATE[cineModo] || 1;
  if (overlayEl) overlayEl.classList.remove('hidden');
  else videoEl.style.display = 'block';

  // Assim que soubermos a duração real do clipe, a trava passa a valer a
  // duração inteira do vídeo (+ folga) em vez do valor inicial curto —
  // então o vídeo sempre toca até o fim, e a trava só é um fallback real.
  videoEl.onloadedmetadata = () => {
    if (isFinite(videoEl.duration) && videoEl.duration > 0) {
      armSafety(videoEl.duration * 1000 + 800);
    }
  };

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
let pFX = novoEstadoFX();
let rFX = novoEstadoFX();
let golpeRevelado = null;   // golpe do rival já sorteado, revelado pelo Eclipse

const playerElChip = document.getElementById('player-el');
const rivalElChip  = document.getElementById('rival-el');
const playerFxRow  = document.getElementById('player-fx');
const rivalFxRow   = document.getElementById('rival-fx');
const roundMods    = document.getElementById('round-mods');
const revealEl     = document.getElementById('reveal');

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
  pFX = novoEstadoFX();
  rFX = novoEstadoFX();
  golpeRevelado = null;
  revealEl.classList.add('hidden');
  roundMods.textContent = '';

  combo = 0;
  comboEl.classList.remove('on');
  gameScreenEl.classList.remove('critical');
  // a arena assume as cores dos dois lutadores
  gameScreenEl.style.setProperty('--p', player.color);
  gameScreenEl.style.setProperty('--r', rival.color);

  playerPortrait.src = charImg(player.id);
  rivalPortrait.src = charImg(rival.id);
  playerNameEl.textContent = player.name;
  rivalNameEl.textContent = rival.name;

  const pEl = elementoDe(player.id), rEl = elementoDe(rival.id);
  const mult = multiplicadorAfinidade(chaveElemento(player.id), chaveElemento(rival.id));
  playerElChip.textContent = pEl.icone + ' ' + pEl.nome;
  rivalElChip.textContent  = rEl.icone + ' ' + rEl.nome;
  playerElChip.style.setProperty('--el-color', pEl.cor);
  rivalElChip.style.setProperty('--el-color', rEl.cor);
  playerElChip.className = 'el-chip ' + (mult > 1 ? 'vantagem' : mult < 1 ? 'desvantagem' : '');
  rivalElChip.className   = 'el-chip ' + (mult > 1 ? 'desvantagem' : mult < 1 ? 'vantagem' : '');

  btnSpecial.querySelector('.lbl').textContent = pEl.ultimate.nome;
  desenharFX();
  updateBars();
  roundResult.textContent = 'Faça sua jogada!';
  overlayEnd.classList.add('hidden');
  victoryVideoEl.style.display = 'none';
  victoryVideoEl.removeAttribute('src');

  showScreen('game');
  BGM.start();
}

/** Pastilhas de veneno, queimadura, congelamento e escudo. */
function desenharFX() {
  const pinta = (row, fx, el) => {
    const p = [];
    if (fx.escudo && el === 'sombra') p.push(['🌑', 'Espelho pronto']);
    if (fx.veneno > 0)      p.push(['☠️ ' + fx.veneno, 'Veneno: ' + (fx.veneno * BALANCE.venenoPorPilha) + ' por turno']);
    if (fx.queimadura > 0)  p.push(['🔥 ' + fx.queimadura, 'Queimando por ' + fx.queimadura + ' turno(s)']);
    if (fx.congelado > 0)   p.push(['❄️', 'Especial travado']);
    if (fx.sequencia > 0 && el === 'chama') p.push(['🔥+' + Math.min(BALANCE.combustaoTeto, fx.sequencia * BALANCE.combustaoPasso), 'Combustão']);
    row.innerHTML = p.map(([t, d]) => `<span class="fx" title="${d}">${t}</span>`).join('');
  };
  pinta(playerFxRow, pFX, chaveElemento(player.id));
  pinta(rivalFxRow,  rFX, chaveElemento(rival.id));
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
  if (chg) chg.textContent = pMe >= 100 ? 'PRONTO' : pMe + '%';
  btnSpecial.classList.toggle('armed', pMe >= 100);
  btnSpecial.disabled = playerMeter < 100 || gameOver || locked || pFX.congelado > 0;
  btnSpecial.classList.toggle('frozen', pFX.congelado > 0);
}

// --------------------------------------------------------------------------
// Choque de glifos: reaproveita os mesmos SVG dos botões de golpe. O glifo do
// jogador entra pela esquerda, o do rival pela direita, colidem no centro e
// quem perdeu o turno recua e se desfaz. Zero arte nova.
// --------------------------------------------------------------------------
const MOVE_TINT = { punch: '#ff7a4d', kick: 'var(--pink)', block: 'var(--cyan)', special: '#ffd23f' };
const MOVE_GLYPH = {};
document.querySelectorAll('.choice-btn').forEach(b => {
  const g = b.querySelector('.glyph');
  if (g) MOVE_GLYPH[b.dataset.choice] = g.innerHTML;
});

const cfxP = document.getElementById('cfx-p');
const cfxR = document.getElementById('cfx-r');
const cfxBurst = document.getElementById('cfx-burst');

function clashFx(pMove, rMove, pDmg, cDmg) {
  const pVence = cDmg > 0 && pDmg === 0;
  const rVence = pDmg > 0 && cDmg === 0;
  const troca   = pDmg > 0 && cDmg > 0;
  const nada    = pDmg === 0 && cDmg === 0;

  const pEstado = pVence ? 'vence' : rVence ? 'perde' : troca ? 'troca' : 'neutro';
  const rEstado = rVence ? 'vence' : pVence ? 'perde' : troca ? 'troca' : 'neutro';

  const pinta = (el, move, estado) => {
    el.innerHTML = MOVE_GLYPH[move] || '';
    el.style.setProperty('--tint', MOVE_TINT[move] || 'var(--text)');
    el.className = 'cfx ' + (el === cfxP ? 'cfx-p ' : 'cfx-r ') + estado;
    void el.offsetWidth;
    el.classList.add('go');
  };
  pinta(cfxP, pMove, pEstado);
  pinta(cfxR, rMove, rEstado);

  const forte = Math.max(pDmg, cDmg) >= 18 || pMove === 'special' || rMove === 'special';
  cfxBurst.className = 'cfx-burst ' + (nada ? 'guarda' : forte ? 'forte' : 'normal');
  cfxBurst.style.setProperty('--tint',
    nada ? 'var(--cyan)' : MOVE_TINT[pVence ? pMove : rVence ? rMove : pMove] || '#fff');
  void cfxBurst.offsetWidth;
  cfxBurst.classList.add('go');
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
  const rivalMove = golpeRevelado || cpuChoice();
  golpeRevelado = null;
  revealEl.classList.add('hidden');

  // Se alguém usou o Especial, toca o clipe daquele personagem antes de
  // aplicar o resultado (se o arquivo ainda não existir, segue direto).
  const specialUserId = playerMove === 'special' ? player.id : (rivalMove === 'special' ? rival.id : null);

  if (specialUserId && cineModo !== 'off') {
    playClip(specialVideoEl, specialOverlay, `./assets/videos/specials/${specialUserId}.mp4`, 2500, () => {
      resolveAndApply(playerMove, rivalMove);
    });
  } else {
    resolveAndApply(playerMove, rivalMove);
  }
}

function resolveAndApply(playerMove, rivalMove) {
  // veneno e queimadura das rodadas anteriores cobram primeiro; doses novas
  // aplicadas neste turno só passam a doer no turno seguinte
  const dcP = danoContinuo(pFX), dcR = danoContinuo(rFX);

  const base = resolveTurn(playerMove, rivalMove);

  const pk = chaveElemento(player.id), rk = chaveElemento(rival.id);
  const res = aplicarElementos({
    base, pMove: playerMove, rMove: rivalMove, pEl: pk, rEl: rk,
    pFX, rFX, pHP: playerHP, rHP: rivalHP, maxHP: MAX_HP,
    pMeter: playerMeter, rMeter: rivalMeter,
    pNome: player.name, rNome: rival.name,
  });
  const { pDmg, cDmg, pMeterGain, cMeterGain, text } = res;

  playerHP = clamp(playerHP - pDmg + res.pCura, 0, MAX_HP);
  rivalHP  = clamp(rivalHP  - cDmg + res.cCura, 0, MAX_HP);
  playerMeter = clamp(playerMeter + pMeterGain, 0, 100);
  rivalMeter  = clamp(rivalMeter  + cMeterGain, 0, 100);

  if (dcP.dano) playerHP = clamp(playerHP - dcP.dano, 0, MAX_HP);
  if (dcR.dano) rivalHP  = clamp(rivalHP  - dcR.dano, 0, MAX_HP);
  if (dcP.partes.length) res.avisos.push('você: ' + dcP.partes.join(' '));
  if (dcR.partes.length) res.avisos.push(rival.name + ': ' + dcR.partes.join(' '));

  if (pFX.congelado > 0) pFX.congelado--;
  if (rFX.congelado > 0) rFX.congelado--;

  if (checarSegundoEscudo(pFX, playerHP, pk)) res.avisos.push('🌑 novo Espelho formado');
  checarSegundoEscudo(rFX, rivalHP, rk);

  // Eclipse: sorteia e mostra o próximo golpe do rival
  if (pFX.revelar) {
    pFX.revelar = false;
    golpeRevelado = cpuChoice();
    revealEl.textContent = '🌑 ECLIPSE — o próximo golpe do rival: ' + MOVE_LABEL[golpeRevelado].toUpperCase();
    revealEl.classList.remove('hidden');
  }

  desenharFX();
  updateBars();
  roundMods.textContent = res.avisos.join('  ·  ');
  roundResult.textContent = text;
  roundResult.classList.remove('flash');
  void roundResult.offsetWidth;
  roundResult.classList.add('flash');

  clashFx(playerMove, rivalMove, pDmg, cDmg);
  flashClash(pDmg, cDmg);
  updateCombo(pDmg, cDmg);

  if (pDmg > 0) { showDamage(playerDmgEl, pDmg); hit(playerPortrait); SFX.hit(); }
  else if (res.pCura > 0) showHeal(playerDmgEl, res.pCura);
  if (cDmg > 0) { showDamage(rivalDmgEl, cDmg); hit(rivalPortrait); SFX.hit(); }
  else if (res.cCura > 0) showHeal(rivalDmgEl, res.cCura);
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

function showHeal(el, amount) {
  el.textContent = '+' + amount;
  el.classList.remove('show', 'heal');
  void el.offsetWidth;
  el.classList.add('show', 'heal');
}

function showDamage(el, amount) {
  el.classList.remove('heal');
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
