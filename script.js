// ==========================================================================
// Heart Less OwO Jokenpô — lógica principal
// ==========================================================================

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
// Áudio
// --------------------------------------------------------------------------
const audio = {
  music: document.getElementById('audio-music'),
  select: document.getElementById('audio-select'),
  winRound: document.getElementById('audio-win-round'),
  loseRound: document.getElementById('audio-lose-round'),
  victory: document.getElementById('audio-victory'),
  defeat: document.getElementById('audio-defeat'),
};

function safePlay(el) {
  if (!el) return;
  el.currentTime = 0;
  el.play().catch(() => { /* arquivo ausente ou bloqueado, ignora */ });
}

// --------------------------------------------------------------------------
// TELA 1 -> INICIAR: dispara vídeo da produtora com som (gesto do usuário
// libera o áudio no navegador)
// --------------------------------------------------------------------------
document.getElementById('btn-start').addEventListener('click', () => {
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
  safePlay(audio.music);
}

// --------------------------------------------------------------------------
// TELA 4: SELEÇÃO DE PERSONAGEM
// --------------------------------------------------------------------------
const hotspotLayer = document.getElementById('hotspot-layer');
const selectedNameEl = document.getElementById('selected-name');
const btnConfirm = document.getElementById('btn-confirm');
let selectedCharacter = null;

CHARACTERS.forEach(ch => {
  const spot = document.createElement('div');
  spot.className = 'hotspot';
  spot.dataset.id = ch.id;
  spot.style.setProperty('--spot-color', ch.color);
  spot.style.left = ch.rect.left + '%';
  spot.style.top = ch.rect.top + '%';
  spot.style.width = ch.rect.width + '%';
  spot.style.height = ch.rect.height + '%';

  const label = document.createElement('span');
  label.className = 'hotspot-label';
  label.textContent = ch.name;
  spot.appendChild(label);

  spot.addEventListener('click', () => selectCharacter(ch, spot));
  hotspotLayer.appendChild(spot);
});

function selectCharacter(ch, spot) {
  document.querySelectorAll('.hotspot').forEach(s => s.classList.remove('selected'));
  spot.classList.add('selected');
  selectedCharacter = ch;
  selectedNameEl.textContent = `Selecionado: ${ch.name}`;
  btnConfirm.disabled = false;
  safePlay(audio.select);
}

btnConfirm.addEventListener('click', () => {
  if (!selectedCharacter) return;
  startGame(selectedCharacter);
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
const roundResult = document.getElementById('round-result');
const btnSpecial = document.getElementById('btn-special');
const btnMenu = document.getElementById('btn-menu');

const overlayEnd = document.getElementById('overlay-end');
const overlayTitle = document.getElementById('overlay-title');
const overlaySubtitle = document.getElementById('overlay-subtitle');
const btnRestart = document.getElementById('btn-restart');
const btnBackMenu = document.getElementById('btn-back-menu');

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

  playerPortrait.src = charImg(player.id);
  rivalPortrait.src = charImg(rival.id);
  playerNameEl.textContent = player.name;
  rivalNameEl.textContent = rival.name;

  updateBars();
  roundResult.textContent = 'Faça sua jogada!';
  overlayEnd.classList.add('hidden');

  showScreen('game');
  safePlay(audio.music);
}

function updateBars() {
  playerHpFill.style.width = clamp(playerHP, 0, MAX_HP) + '%';
  rivalHpFill.style.width = clamp(rivalHP, 0, MAX_HP) + '%';
  playerMeterFill.style.width = clamp(playerMeter, 0, 100) + '%';
  rivalMeterFill.style.width = clamp(rivalMeter, 0, 100) + '%';
  btnSpecial.disabled = playerMeter < 100 || gameOver || locked;
}

// --------------------------------------------------------------------------
// Escolha da CPU: golpe aleatório ponderado, usa especial se o medidor
// estiver cheio.
// --------------------------------------------------------------------------
function cpuChoice() {
  if (rivalMeter >= 100 && Math.random() < 0.55) return 'special';
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

function playTurn(playerMove) {
  locked = true;
  const rivalMove = cpuChoice();
  const { pDmg, cDmg, pMeterGain, cMeterGain, text } = resolveTurn(playerMove, rivalMove);

  playerHP = clamp(playerHP - pDmg, 0, MAX_HP);
  rivalHP = clamp(rivalHP - cDmg, 0, MAX_HP);
  playerMeter = clamp(playerMeter + pMeterGain, 0, 100);
  rivalMeter = clamp(rivalMeter + cMeterGain, 0, 100);

  updateBars();
  roundResult.textContent = text;

  if (pDmg > 0) { showDamage(playerDmgEl, pDmg); hit(playerPortrait); safePlay(audio.loseRound); }
  if (cDmg > 0) { showDamage(rivalDmgEl, cDmg); hit(rivalPortrait); safePlay(audio.winRound); }
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
  el.classList.add('hit');
  setTimeout(() => el.classList.remove('hit'), 200);
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
  audio.music.pause();
  audio.music.currentTime = 0;
  safePlay(result === 'win' ? audio.victory : audio.defeat);

  if (result === 'win') launchConfetti();
}

btnRestart.addEventListener('click', () => {
  overlayEnd.classList.add('hidden');
  showScreen('select');
  safePlay(audio.music);
});

btnBackMenu.addEventListener('click', () => {
  overlayEnd.classList.add('hidden');
  audio.music.pause();
  audio.music.currentTime = 0;
  showScreen('start');
});

btnMenu.addEventListener('click', () => {
  audio.music.pause();
  audio.music.currentTime = 0;
  showScreen('start');
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
