// ==========================================================================
// Motor de som 100% sintetizado via Web Audio API — nenhum arquivo de áudio
// externo é necessário. Isso evita qualquer risco de direitos autorais com
// trilhas/efeitos de terceiros e já funciona assim que o jogo é aberto.
// ==========================================================================

const SoundEngine = (() => {
  let ctx = null;

  function ensureCtx() {
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      ctx = new Ctx();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Desbloqueia o áudio no primeiro toque do usuário (necessário nos
  // navegadores que bloqueiam áudio automático).
  function unlock() { ensureCtx(); }

  function tone({ freq, dur = 0.15, type = 'sine', gain = 0.2, delay = 0, freqEnd = null }) {
    const c = ensureCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    const t0 = c.currentTime + delay;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  function noiseBurst({ dur = 0.12, gain = 0.2, delay = 0, filterFreq = 1200 }) {
    const c = ensureCtx();
    if (!c) return;
    const bufferSize = Math.max(1, Math.floor(c.sampleRate * dur));
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = c.createGain();
    const t0 = c.currentTime + delay;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(c.destination);
    src.start(t0);
  }

  // Sorteia grave ("masculina") ou aguda ("feminina") pra reação de voz.
  // Sempre uma OU outra — hurt()/taunt() chamam isso uma vez só e usam o
  // resultado pra montar o som inteiro, nunca as duas juntas.
  function randomVoice() {
    const isMale = Math.random() < 0.5;
    return { isMale, base: isMale ? 105 + Math.random() * 45 : 200 + Math.random() * 90 };
  }

  // -------------------- efeitos das jogadas --------------------
  const SFX = {
    punch() {
      tone({ freq: 150, dur: 0.1, type: 'square', gain: 0.22 });
      noiseBurst({ dur: 0.08, gain: 0.18, filterFreq: 900 });
    },
    kick() {
      tone({ freq: 95, dur: 0.22, type: 'sawtooth', gain: 0.25, freqEnd: 45 });
      noiseBurst({ dur: 0.14, gain: 0.2, filterFreq: 700 });
    },
    block() {
      tone({ freq: 700, dur: 0.06, type: 'square', gain: 0.16 });
      tone({ freq: 1000, dur: 0.08, type: 'square', gain: 0.14, delay: 0.05 });
    },
    special() {
      tone({ freq: 180, dur: 0.45, type: 'sawtooth', gain: 0.28, freqEnd: 900 });
      noiseBurst({ dur: 0.3, gain: 0.22, filterFreq: 2200, delay: 0.05 });
    },
    hit() {
      noiseBurst({ dur: 0.1, gain: 0.2, filterFreq: 500 });
      tone({ freq: 120, dur: 0.12, type: 'triangle', gain: 0.18 });
    },
    // Reação de dor de quem apanhou: pitch cai (gemido). Grave ou aguda por sorteio.
    //
    // hit() e hurt() são chamados no MESMO instante (resolveAndApply chama os
    // dois seguidos, sem esperar nada entre eles). Sem atraso, os dois
    // começavam exatamente em t=0 com frequências parecidas (~120-200Hz) e
    // se fundiam num "thud" só — a queda de tom que faz o som soar como
    // gemido ficava mascarada pelo impacto seco do hit(). Um atraso curto
    // (70ms) deixa o impacto tocar sozinho primeiro e o gemido nascer logo
    // depois, já audível por cima da cauda do impacto — não junto com ele.
    hurt() {
      const v = randomVoice();
      const dur = v.isMale ? 0.22 : 0.18;
      const atraso = 0.07;
      tone({ freq: v.base, freqEnd: v.base * 0.6, dur, type: v.isMale ? 'sawtooth' : 'triangle', gain: 0.22, delay: atraso });
      noiseBurst({ dur: dur * 0.5, gain: 0.13, filterFreq: v.isMale ? 500 : 850, delay: atraso });
    },
    // Reação de quem acertou: pitch sobe (confiante). Nasce depois do gemido
    // do outro lutador (que termina por volta de ~250-290ms) — antes disso
    // as duas "vozes" tocavam quase juntas e nenhuma das duas se distinguia.
    taunt() {
      const v = randomVoice();
      const base = v.base * (v.isMale ? 1.05 : 1.02);
      const atraso = 0.3;
      tone({ freq: base, freqEnd: base * 1.3, dur: v.isMale ? 0.13 : 0.11,
             type: v.isMale ? 'triangle' : 'sine', gain: 0.18, delay: atraso });
      tone({ freq: base * 1.25, dur: 0.08, type: v.isMale ? 'triangle' : 'sine',
             gain: 0.11, delay: atraso + (v.isMale ? 0.1 : 0.08) });
    },
    select() {
      tone({ freq: 660, dur: 0.07, type: 'sine', gain: 0.18 });
      tone({ freq: 990, dur: 0.09, type: 'sine', gain: 0.14, delay: 0.05 });
    },
    confirm() {
      tone({ freq: 520, dur: 0.09, type: 'triangle', gain: 0.2 });
      tone({ freq: 780, dur: 0.12, type: 'triangle', gain: 0.16, delay: 0.06 });
    },
    click() {
      tone({ freq: 500, dur: 0.05, type: 'sine', gain: 0.12 });
    },
    victory() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone({ freq: f, dur: 0.3, type: 'triangle', gain: 0.22, delay: i * 0.13 })
      );
    },
    defeat() {
      tone({ freq: 260, dur: 0.5, type: 'sawtooth', gain: 0.22, freqEnd: 70 });
    },
  };

  // -------------------- música de fundo (arquivo real, em loop) --------------------
  //
  // Antes: quando o navegador bloqueava o autoplay (.play() rejeitado), o
  // código marcava "playing = true" mesmo assim e nunca mais tentava de novo
  // — a música simplesmente nunca começava. Diferente do vídeo de arena
  // (StageFX, em arcade.js), que tenta tocar em várias tentativas seguidas,
  // aqui não existia rede de segurança nenhuma.
  //
  // Agora: guardamos a CHAVE pedida (não a URL resolvida — comparar com
  // `audioEl.src` nunca batia, porque o navegador devolve o caminho absoluto,
  // não o relativo que a gente monta) e, se o play() falhar, registramos um
  // listener de UMA VEZ SÓ no próximo toque/clique/tecla pra tentar de novo.
  // Isso resolve o caso comum de o navegador liberar vídeo (que já rodou com
  // som na intro) mas ainda não ter "certeza" de que pode tocar este <audio>.
  const BGM = (() => {
    const TRACKS = {
      coracao: './assets/audio/musica coracao.mp3',
      chama: './assets/audio/musica chama.mp3',
      trovao: './assets/audio/musica trovao.mp3',
      gelo: './assets/audio/musica gelo.mp3',
      toxina: './assets/audio/musica toxina.mp3',
      sombra: './assets/audio/musica sombra.mp3',
      default: './assets/audio/arena.mp3',
    };

    let audioEl = null;
    let chaveAtual = null;      // chave lógica ('chama', 'gelo'...), não a URL
    let pendente = null;        // chave que ficou tentando tocar e foi bloqueada
    let retryArmado = false;

    function srcDaChave(chave) {
      return TRACKS[chave] || `./assets/audio/musica ${chave}.mp3` || TRACKS.default;
    }

    function ensureAudio(chave) {
      if (!audioEl || chaveAtual !== chave) {
        if (audioEl) {
          audioEl.pause();
          audioEl.currentTime = 0;
        }
        audioEl = new Audio(srcDaChave(chave));
        audioEl.loop = true;
        audioEl.volume = 0.45;
        audioEl.preload = 'auto';
        chaveAtual = chave;
      }
      return audioEl;
    }

    function tentarTocar(chave) {
      const a = ensureAudio(chave);
      // já tocando de fato esta faixa: nada a fazer (evita reiniciar à toa)
      if (chaveAtual === chave && !a.paused) return;
      const p = a.play();
      if (p && p.catch) {
        p.catch(() => {
          // autoplay bloqueado: guarda o pedido e arma UM retry no próximo
          // gesto do usuário em qualquer lugar da página.
          pendente = chave;
          armarRetryNoProximoGesto();
        });
      }
    }

    function armarRetryNoProximoGesto() {
      if (retryArmado) return;
      retryArmado = true;
      const eventos = ['pointerdown', 'keydown', 'touchstart'];
      const handler = () => {
        retryArmado = false;
        eventos.forEach(ev => document.removeEventListener(ev, handler));
        if (pendente) {
          const chave = pendente;
          pendente = null;
          tentarTocar(chave);
        }
      };
      eventos.forEach(ev => document.addEventListener(ev, handler, { once: true, passive: true }));
    }

    return {
      start(track) {
        tentarTocar(track || 'default');
      },
      stop() {
        pendente = null;
        if (audioEl) {
          audioEl.pause();
          audioEl.currentTime = 0;
        }
      },
      get isPlaying() { return !!(audioEl && !audioEl.paused); },
    };
  })();

  return { unlock, SFX, BGM };
})();
