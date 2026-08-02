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
const grid = document.getElementById('character-grid');
const selectedNameEl = document.getElementById('selected-name');
const btnConfirm = document.getElementById('btn-confirm');
let selectedCharacter = null;

CHARACTERS.forEach(ch => {
  const card = document.createElement('div');
  card.className = 'char-card';
  card.style.setProperty('--card-color', ch.color);
  card.dataset.id = ch.id;
  card.innerHTML = `<img src="${charImg(ch.id)}" alt="${ch.name}"><span>${ch.name}</span>`;
  card.addEventListener('click', () => selectCharacter(ch, card));
  grid.appendChild(card);
});

function selectCharacter(ch, card) {
  document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
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
// TELA 5: JOGO — Jokenpô (pedra, papel, tesoura)
// --------------------------------------------------------------------------
const playerPortrait = document.getElementById('player-portrait');
const rivalPortrait = document.getElementById('rival-portrait');
const playerNameEl = document.getElementById('player-name');
const rivalNameEl = document.getElementById('rival-name');
const playerPipsEl = document.getElementById('player-pips');
const rivalPipsEl = document.getElementById('rival-pips');
const rivalChoiceText = document.getElementById('rival-choice-text');
const roundResult = document.getElementById('round-result');
const btnMenu = document.getElementById('btn-menu');

const overlayEnd = document.getElementById('overlay-end');
const overlayTitle = document.getElementById('overlay-title');
const overlaySubtitle = document.getElementById('overlay-subtitle');
const btnRestart = document.getElementById('btn-restart');
const btnBackMenu = document.getElementById('btn-back-menu');

const WINS_NEEDED = 5;
let player = null;
let rival = null;
let playerScore = 0;
let rivalScore = 0;
let gameOver = false;

function pickRival(excludeId) {
  const pool = CHARACTERS.filter(c => c.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildPips(container, color) {
  container.innerHTML = '';
  for (let i = 0; i < WINS_NEEDED; i++) {
    const pip = document.createElement('div');
    pip.className = 'pip';
    container.appendChild(pip);
  }
}

function updatePips(container, score) {
  const pips = container.querySelectorAll('.pip');
  pips.forEach((pip, i) => pip.classList.toggle('filled', i < score));
}

function startGame(chosen) {
  player = chosen;
  rival = pickRival(chosen.id);
  playerScore = 0;
  rivalScore = 0;
  gameOver = false;

  playerPortrait.src = charImg(player.id);
  rivalPortrait.src = charImg(rival.id);
  playerNameEl.textContent = player.name;
  rivalNameEl.textContent = rival.name;

  buildPips(playerPipsEl, player.color);
  buildPips(rivalPipsEl, rival.color);
  updatePips(playerPipsEl, 0);
  updatePips(rivalPipsEl, 0);

  rivalChoiceText.innerHTML = '&nbsp;';
  roundResult.innerHTML = '&nbsp;';
  overlayEnd.classList.add('hidden');

  showScreen('game');
  safePlay(audio.music);
}

const CHOICE_ICON = { pedra: '✊', papel: '✋', tesoura: '✌️' };

document.querySelectorAll('.choice-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (gameOver) return;
    playRound(btn.dataset.choice);
  });
});

function randomMachineChoice() {
  const options = ['pedra', 'papel', 'tesoura'];
  return options[Math.floor(Math.random() * 3)];
}

function playRound(humanChoice) {
  const machineChoice = randomMachineChoice();

  rivalChoiceText.textContent = `${rival.name} escolheu ${CHOICE_ICON[machineChoice]}`;

  if (humanChoice === machineChoice) {
    roundResult.textContent = 'Empate!';
  } else if (
    (humanChoice === 'papel' && machineChoice === 'pedra') ||
    (humanChoice === 'pedra' && machineChoice === 'tesoura') ||
    (humanChoice === 'tesoura' && machineChoice === 'papel')
  ) {
    playerScore++;
    updatePips(playerPipsEl, playerScore);
    roundResult.textContent = `${player.name} venceu a rodada!`;
    bump(playerPortrait);
    safePlay(audio.winRound);
  } else {
    rivalScore++;
    updatePips(rivalPipsEl, rivalScore);
    roundResult.textContent = `${rival.name} venceu a rodada!`;
    bump(rivalPortrait);
    safePlay(audio.loseRound);
  }

  if (playerScore === WINS_NEEDED) {
    endGame(true);
  } else if (rivalScore === WINS_NEEDED) {
    endGame(false);
  }
}

function bump(el) {
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 220);
}

function endGame(playerWon) {
  gameOver = true;
  overlayTitle.textContent = playerWon ? 'VITÓRIA!' : 'DERROTA';
  overlayTitle.style.color = playerWon ? 'var(--red)' : 'var(--muted)';
  overlaySubtitle.textContent = playerWon
    ? `${player.name} derrotou ${rival.name} por ${playerScore} a ${rivalScore}!`
    : `${rival.name} derrotou ${player.name} por ${rivalScore} a ${playerScore}.`;

  overlayEnd.classList.remove('hidden');
  audio.music.pause();
  audio.music.currentTime = 0;
  safePlay(playerWon ? audio.victory : audio.defeat);

  if (playerWon) launchConfetti();
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
