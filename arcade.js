// ==========================================================================
// Heart Less OwO — Arenas em vídeo + Modo Arcade
//
// Dois sistemas num arquivo, porque compartilham a mesma ideia: dar contexto
// à luta. A arena diz QUEM você é (o elemento vira lugar), o arcade diz PRA
// QUE você está lutando (subir a escada até o chefão).
//
// Este arquivo é opcional: se ele não carregar, o jogo continua funcionando
// exatamente como antes. Todo hook no script.js checa a existência antes.
//
// Carregar ANTES do script.js:
//   <script src="./arcade.js"></script>
//   <script src="./script.js"></script>
// ==========================================================================

// ==========================================================================
// ARENAS
//
// Uma arena por ELEMENTO, não por personagem. Os 6 elementos já agrupam os 16
// lutadores, então 6 vídeos cobrem o elenco todo: 62% menos arquivo, e a arena
// passa a ensinar o elemento — que agora decide dano no combate.
//
// Para dar arena própria a um personagem específico, é só pôr o id em
// STAGE_POR_PERSONAGEM. O resto continua caindo no elemento.
// ==========================================================================
const StageFX = {
  PASTA: './assets/videos/stages/',
  POR_PERSONAGEM: {
    // 'heart': 'heart',   // exemplo: arena exclusiva do chefão
  },

  video: null,
  veu: null,
  atual: null,
  travadas: 0,        // engasgos REAIS nesta sessão (não conta buffer inicial)
  jaTocou: false,     // o vídeo já começou a tocar pelo menos uma vez?
  _timerTravou: null,
  desligada: false,   // desliga sozinho em aparelho que não dá conta

  init() {
    const tela = document.getElementById('screen-game');
    if (!tela || this.video) return;

    // desligada por escolha do jogador (fica salvo entre sessões)
    if (localStorage.getItem('hl-arena') === 'off') this.desligada = true;

    const estilo = document.createElement('style');
    estilo.textContent = `
      #stage-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
        z-index:0;opacity:0;transition:opacity .7s ease;pointer-events:none}
      #stage-video.on{opacity:1}
      #stage-veu{position:absolute;inset:0;z-index:0;pointer-events:none;
        background:
          radial-gradient(120% 80% at 50% 15%,transparent,rgba(9,5,15,.55) 70%),
          linear-gradient(180deg,rgba(9,5,15,.72),rgba(9,5,15,.5) 45%,rgba(9,5,15,.88))}
      #screen-game.com-arena .arena-lines{opacity:.35}
      #screen-game.com-arena .glow-bg{opacity:.22}
      #screen-game.com-arena{background:#09050F}
      .btn-arena{position:absolute;top:10px;right:12px;z-index:1400;
        font-family:'Rubik',sans-serif;font-weight:700;font-size:10px;letter-spacing:.12em;
        text-transform:uppercase;padding:5px 9px;border-radius:99px;cursor:pointer;
        color:var(--muted);background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.14)}
      .btn-arena:hover{color:#fff;border-color:var(--cyan)}
    `;
    document.head.appendChild(estilo);

    this.video = document.createElement('video');
    this.video.id = 'stage-video';
    // muted é obrigatório: navegador nenhum deixa tocar vídeo com som sozinho
    this.video.muted = true;
    this.video.loop = true;
    this.video.playsInline = true;
    this.video.preload = 'auto';
    this.video.setAttribute('aria-hidden', 'true');

    this.veu = document.createElement('div');
    this.veu.id = 'stage-veu';

    tela.prepend(this.veu);
    tela.prepend(this.video);

    // Detecção de engasgo — versão que não dá falso positivo.
    //
    // O evento 'waiting' dispara em duas situações COMPLETAMENTE normais:
    // enquanto o vídeo enche o buffer no início, e a cada volta do loop.
    // Contar isso como travamento desligava a arena logo na primeira luta.
    //
    // Agora só conta como engasgo de verdade quando: (a) o vídeo já estava
    // tocando, e (b) ficou parado esperando por mais de 1,8s de fato.
    this.video.addEventListener('playing', () => {
      this.jaTocou = true;
      clearTimeout(this._timerTravou);
      this._timerTravou = null;
    });

    this.video.addEventListener('waiting', () => {
      if (!this.jaTocou) return;             // ainda enchendo buffer: normal
      clearTimeout(this._timerTravou);
      this._timerTravou = setTimeout(() => {
        this.travadas++;
        console.warn('[arena] travou de verdade (' + this.travadas + '/3)');
        if (this.travadas >= 3) {
          console.warn('[arena] aparelho não dá conta do fundo, desligando nesta sessão');
          this.desligada = true;
          this.marcarEstado('off (travava)');
          this.esconder();
        }
      }, 1800);
    });
    this.video.addEventListener('error', () => {
      const e = this.video.error;
      console.warn('[arena] falhou:', this.video.currentSrc || this.video.src,
        e ? 'código ' + e.code : '',
        (e && e.code === 4) ? '→ o arquivo provavelmente não existe nesse caminho' : '');
      this.marcarEstado('sem vídeo');
      this.esconder();
    });

    const botao = document.createElement('button');
    botao.className = 'btn-arena';
    botao.type = 'button';
    botao.textContent = this.desligada ? 'arena: off' : (this._estado || 'arena: ...').replace('arena: ','arena: ');
    if (!this.desligada) botao.textContent = 'arena: ...';
    botao.addEventListener('click', () => {
      this.desligada = !this.desligada;
      localStorage.setItem('hl-arena', this.desligada ? 'off' : 'on');
      if (this.desligada) { this.marcarEstado('off'); this.esconder(); }
      else if (this.ultimaChave) { this.atual = null; this.mostrar(this.ultimaChave); }
    });
    tela.appendChild(botao);
  },

  /** Troca a arena. `chave` é o elemento (ou um id em POR_PERSONAGEM). */
  mostrar(chave) {
    this.init();
    if (!this.video || this.desligada || !chave) return this.esconder();
    this.ultimaChave = chave;
    if (this.atual === chave) { this.retomar(); return; }
    this.atual = chave;

    this.jaTocou = false;
    clearTimeout(this._timerTravou);
    this.video.classList.remove('on');
    this.video.src = this.PASTA + chave + '.mp4';
    this.video.load();
    this._tentar(0);
  },

  // O play() é recusado quando a tela do jogo ainda está em display:none.
  // Em vez de desistir na primeira negativa, tenta nos quadros seguintes.
  _tentar(n) {
    this.video.play()
      .then(() => {
        this.video.classList.add('on');
        const tela = document.getElementById('screen-game');
        if (tela) tela.classList.add('com-arena');
        this.marcarEstado('on');
        console.info('[arena] tocando', this.atual + '.mp4');
      })
      .catch(err => {
        if (n < 4) {
          requestAnimationFrame(() => setTimeout(() => this._tentar(n + 1), 140));
          return;
        }
        console.warn('[arena] não consegui tocar', this.video.src, err && err.name);
        this.marcarEstado('sem vídeo');
        this.esconder();
      });
  },

  /** Atualiza o rótulo do botão de canto: on / off / sem vídeo. */
  marcarEstado(texto) {
    this._estado = texto;
    const b = document.querySelector('.btn-arena');
    if (b) b.textContent = 'arena: ' + texto;
  },

  esconder() {
    if (!this.video) return;
    clearTimeout(this._timerTravou);
    this._timerTravou = null;
    this.video.classList.remove('on');
    this.video.pause();
    this.atual = null;   // libera pra poder tentar de novo na próxima luta
    const tela = document.getElementById('screen-game');
    if (tela) tela.classList.remove('com-arena');
  },

  // Durante o clipe do especial, para a arena: dois vídeos em tela cheia
  // decodificando juntos é o que faz celular travar.
  pausar() { if (this.video && !this.video.paused) this.video.pause(); },
  retomar() {
    if (this.video && this.video.classList.contains('on') && !this.desligada) {
      this.video.play().catch(() => {});
    }
  }
};

// ==========================================================================
// MODO ARCADE
//
// Escada de 5 lutas + Heart como chefão. Regras:
//  - vida reinicia em cada luta (o desafio é a escada, não a maratona)
//  - perder encerra a corrida: é isso que dá peso a cada luta
//  - a dificuldade sobe a cada degrau (IA mais esperta, dano maior)
//  - Heart não aparece nas 5 primeiras: chefão precisa de estreia
// ==========================================================================
const Arcade = {
  TOTAL_NORMAIS: 5,
  ID_CHEFAO: 'heart',
  ID_CHEFAO_ALT: 'king',   // se o jogador escolher Heart, o chefão é outro

  ativo: false,
  escada: [],
  indice: 0,
  dificuldade: 0,          // 0 a 1 — lido pelo script.js
  chefeAgora: false,

  recorde() { return parseInt(localStorage.getItem('hl-arcade-recorde') || '0', 10); },
  salvarRecorde(n) {
    if (n > this.recorde()) localStorage.setItem('hl-arcade-recorde', String(n));
  },

  /** Monta a escada e devolve o primeiro rival. */
  iniciar(personagemJogador) {
    const idChefao = personagemJogador.id === this.ID_CHEFAO ? this.ID_CHEFAO_ALT : this.ID_CHEFAO;

    const pool = CHARACTERS.filter(c =>
      c.id !== personagemJogador.id && c.id !== idChefao);

    // embaralha (Fisher-Yates) e pega os 5 primeiros
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    this.escada = pool.slice(0, this.TOTAL_NORMAIS);
    this.escada.push(CHARACTERS.find(c => c.id === idChefao));
    this.indice = 0;
    this.ativo = true;
    this.atualizarDificuldade();
    return this.escada[0];
  },

  rivalAtual() { return this.escada[this.indice] || null; },
  ehUltima() { return this.indice === this.escada.length - 1; },

  atualizarDificuldade() {
    const passo = this.indice / Math.max(1, this.escada.length - 1);
    this.chefeAgora = this.ehUltima();
    // o chefão joga no talo; os degraus normais sobem de 0,15 até ~0,85
    this.dificuldade = this.chefeAgora ? 1 : 0.15 + passo * 0.7;
  },

  avancar() {
    this.indice++;
    this.atualizarDificuldade();
    return this.indice < this.escada.length;
  },

  encerrar() {
    this.ativo = false;
    this.indice = 0;
    this.escada = [];
    this.dificuldade = 0;
    this.chefeAgora = false;
    StageFX.esconder();
  },

  // ---------- tela da escada ----------
  _tela: null,

  garantirTela() {
    if (this._tela) return this._tela;

    const estilo = document.createElement('style');
    estilo.textContent = `
      #arcade-tela{position:fixed;inset:0;z-index:2000;display:none;
        flex-direction:column;align-items:center;justify-content:center;gap:3vh;
        padding:4vh 4vw;background:rgba(9,5,15,.94);backdrop-filter:blur(8px);
        text-align:center}
      #arcade-tela.on{display:flex}
      #arcade-tela h2{font-family:'Bungee',sans-serif;font-size:clamp(1.1rem,3.4vw,2rem);
        margin:0;letter-spacing:2px;color:#fff}
      #arcade-tela .sub{font-size:clamp(.7rem,1.6vw,1rem);color:var(--muted);max-width:44ch}
      .escada{display:flex;gap:clamp(6px,1.2vw,14px);flex-wrap:nowrap;justify-content:center}
      .degrau{position:relative;width:clamp(46px,7.5vw,84px);aspect-ratio:4/5;
        border:1px solid rgba(255,255,255,.16);border-radius:2px;overflow:hidden;
        clip-path:polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,8px 100%,0 calc(100% - 8px));
        filter:grayscale(1) brightness(.4);transition:filter .3s,transform .3s}
      .degrau img{width:100%;height:100%;object-fit:cover;object-position:top center}
      .degrau .n{position:absolute;top:2px;left:4px;font-family:'Bungee',sans-serif;
        font-size:9px;color:#fff;text-shadow:0 1px 3px #000}
      .degrau.venceu{filter:none;border-color:#6ee7b7}
      .degrau.venceu::after{content:'✓';position:absolute;inset:0;display:grid;place-items:center;
        font-size:clamp(18px,3vw,30px);color:#6ee7b7;background:rgba(0,0,0,.45);font-weight:700}
      .degrau.agora{filter:none;transform:translateY(-6px) scale(1.08);
        border-color:var(--pink);box-shadow:0 0 18px -2px var(--pink);z-index:2}
      .degrau.chefe{border-color:#ffd23f}
      .degrau.chefe.agora{box-shadow:0 0 26px -2px #ffd23f;border-color:#ffd23f}
      .degrau .coroa{position:absolute;bottom:2px;right:4px;font-size:11px}
      #arcade-tela .rec{font-size:clamp(.6rem,1.3vw,.8rem);letter-spacing:.14em;
        text-transform:uppercase;color:var(--muted)}
      #arcade-tela .botoes{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
    `;
    document.head.appendChild(estilo);

    const div = document.createElement('div');
    div.id = 'arcade-tela';
    div.innerHTML = `
      <h2 id="arcade-titulo">MODO ARCADE</h2>
      <p class="sub" id="arcade-sub"></p>
      <div class="escada" id="arcade-escada"></div>
      <p class="rec" id="arcade-rec"></p>
      <div class="botoes">
        <button id="arcade-seguir" class="btn-glow">CONTINUAR</button>
        <button id="arcade-sair" class="btn-ghost">Sair do arcade</button>
      </div>`;
    document.body.appendChild(div);
    this._tela = div;
    return div;
  },

  desenharEscada() {
    const alvo = document.getElementById('arcade-escada');
    alvo.innerHTML = this.escada.map((c, i) => {
      const chefe = i === this.escada.length - 1;
      const cls = i < this.indice ? 'venceu' : (i === this.indice ? 'agora' : '');
      return `<div class="degrau ${cls} ${chefe ? 'chefe' : ''}" title="${c.name}">
        <img src="${charImg(c.id)}" alt="${c.name}">
        <span class="n">${i + 1}</span>
        ${chefe ? '<span class="coroa">👑</span>' : ''}
      </div>`;
    }).join('');
  },

  /** Mostra a escada entre lutas. `modo`: 'proxima' | 'derrota' | 'campeao'. */
  mostrarTela(modo) {
    this.garantirTela();
    this.desenharEscada();

    const titulo = document.getElementById('arcade-titulo');
    const sub = document.getElementById('arcade-sub');
    const rec = document.getElementById('arcade-rec');
    const seguir = document.getElementById('arcade-seguir');

    const venceu = this.indice;
    rec.textContent = `Recorde: ${this.recorde()} de ${this.escada.length} lutas`;

    if (modo === 'campeao') {
      titulo.textContent = 'CAMPEÃO';
      titulo.style.color = '#ffd23f';
      sub.textContent = 'Você subiu a escada inteira e derrubou o chefão. Isso não é sorte.';
      seguir.textContent = 'NOVA CORRIDA';
    } else if (modo === 'derrota') {
      titulo.textContent = 'FIM DA CORRIDA';
      titulo.style.color = 'var(--muted)';
      sub.textContent = `Você chegou até a luta ${venceu + 1} de ${this.escada.length}.` +
        (this.chefeAgora ? ' O chefão te parou.' : '');
      seguir.textContent = 'TENTAR DE NOVO';
    } else {
      const prox = this.rivalAtual();
      const chefe = this.ehUltima();
      titulo.textContent = chefe ? 'CHEFÃO' : `LUTA ${this.indice + 1}`;
      titulo.style.color = chefe ? '#ffd23f' : '#fff';
      const el = ELEMENTS[chaveElemento(prox.id)];
      sub.textContent = chefe
        ? `${prox.name} espera no topo. ${el.icone} ${el.nome} — ${el.ultimate.nome} sai forte.`
        : `Próximo: ${prox.name} · ${el.icone} ${el.nome} (${el.passiva.curto})`;
      seguir.textContent = chefe ? 'ENCARAR O CHEFÃO' : 'PRÓXIMA LUTA';
    }

    this._tela.classList.add('on');
    this._modo = modo;
  },

  esconderTela() { if (this._tela) this._tela.classList.remove('on'); }
};
