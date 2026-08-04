// ==========================================================================
// Heart Less OwO — Sistema de Elementos
//
// Camada de identidade em cima do jokenpô. Cada lutador tem um elemento, e o
// elemento carrega quatro coisas: afinidade (contra quem é forte), fraqueza
// (contra quem é fraco), uma passiva condicional e uma ultimate que substitui
// o Especial genérico.
//
// Regra de projeto: nada aqui é aleatório. Passiva de dado (esquiva, crítico
// por sorte) arruína jokenpô, porque o jogo é leitura do adversário — se um
// número secreto decide o turno, ganhar não ensina nada e perder parece roubo.
// Toda passiva abaixo dispara por uma CONDIÇÃO que o jogador controla.
//
// Todos os números de balanceamento estão em BALANCE, num lugar só.
// ==========================================================================

const BALANCE = {
  forte: 1.25,          // dano quando o elemento é forte contra o do rival
  fraco: 0.80,          // dano quando é fraco
  combustaoPasso: 3,    // Chama: dano somado por acerto em sequência
  combustaoTeto: 9,
  pulsoCura: 3,         // Coração: % do HP máximo curado ao PERDER a troca
  geloGuarda: 0.6,      // Gelo: dano recebido enquanto está em bloqueio
  reflexoCorte: 0.5,    // Trovão: dano recebido em choque de golpes iguais
  geloDreno: 18,        // Gelo: medidor drenado do rival ao bloquear
  geloGanho: 6,         // Gelo: medidor que o próprio ganha ao bloquear
  venenoPorPilha: 2,    // Toxina: dano por turno por pilha
  venenoTeto: 3,
  queimaduraDano: 4,    // Chama: dano por turno da queimadura
  queimaduraTurnos: 2,
};

// O ciclo: cada elemento é forte contra o SEGUINTE e fraco contra o ANTERIOR.
const CICLO = ['coracao', 'sombra', 'toxina', 'trovao', 'gelo', 'chama'];

const ELEMENTS = {
  coracao: {
    nome: 'Coração', icone: '❤️', cor: '#ff2d55',
    lema: 'Quanto mais apanha, mais volta',
    passiva: {
      nome: 'Pulso Vital',
      texto: 'Ao perder a troca, recupera 3% da vida máxima.',
      curto: 'cura ao perder a troca',
    },
    ultimate: {
      nome: 'Onda Afetiva',
      texto: 'Dano em área de 20 e cura 11 de vida.',
      curto: 'dano em área + cura',
      dano: 20, cura: 11,
    },
  },
  chama: {
    nome: 'Chama', icone: '🔥', cor: '#ff6a1f',
    lema: 'Pressão que não deixa respirar',
    passiva: {
      nome: 'Combustão',
      texto: 'Cada acerto seguido soma +3 de dano ao próximo golpe, até +9. Tomar dano zera.',
      curto: 'dano cresce a cada acerto',
    },
    ultimate: {
      nome: 'Erupção',
      texto: 'Dano de 26 e incendeia: 4 de dano por 2 turnos, ignorando bloqueio.',
      curto: 'dano alto + queimadura',
      dano: 26,
    },
  },
  trovao: {
    nome: 'Trovão', icone: '⚡', cor: '#ffd23f',
    lema: 'Reage antes do outro terminar',
    passiva: {
      nome: 'Reflexo',
      texto: 'Em choque de golpes iguais, toma metade do dano.',
      curto: 'metade do dano em choque',
    },
    ultimate: {
      nome: 'Descarga',
      texto: 'Dano de 24 e rouba 25% do medidor do rival.',
      curto: 'dano + rouba medidor',
      dano: 24, rouba: 25,
    },
  },
  gelo: {
    nome: 'Gelo', icone: '❄️', cor: '#3a7bff',
    lema: 'Sufoca o especial do adversário',
    passiva: {
      nome: 'Frio Cortante',
      texto: 'Bloqueio drena 18 do medidor do rival, ganha 6, e apara 40% do dano mesmo quebrado.',
      curto: 'bloqueio rouba medidor',
    },
    ultimate: {
      nome: 'Nevasca',
      texto: 'Dano de 25 e congela: o rival não usa Especial no próximo turno.',
      curto: 'dano + trava o especial',
      dano: 25,
    },
  },
  toxina: {
    nome: 'Toxina', icone: '☠️', cor: '#7ee034',
    lema: 'Ganha no cansaço, não no estouro',
    passiva: {
      nome: 'Corrosão',
      texto: 'Todo dano causado envenena. O veneno cobra 2 por dose e perde uma dose por turno.',
      curto: 'envenena a cada acerto',
    },
    ultimate: {
      nome: 'Miasma',
      texto: 'Dano de 18 e aplica as 3 doses de veneno de uma vez.',
      curto: 'dano + veneno máximo',
      dano: 18,
    },
  },
  sombra: {
    nome: 'Sombra', icone: '🌑', cor: '#9b5de5',
    lema: 'Um erro perdoado por partida',
    passiva: {
      nome: 'Espelho',
      texto: 'Anula o primeiro dano da partida e ganha um novo escudo ao cair abaixo de 30 de vida.',
      curto: 'anula dano, 2x por luta',
    },
    ultimate: {
      nome: 'Eclipse',
      texto: 'Dano de 25 e revela o próximo golpe do rival antes de você escolher.',
      curto: 'dano + revela o próximo golpe',
      dano: 25,
    },
  },
};

// Elemento de cada lutador do elenco.
const CHAR_ELEMENT = {
  heart: 'coracao', lolly: 'coracao', teddy: 'coracao',
  kai: 'chama', razor: 'chama', spark: 'chama',
  blitz: 'trovao', nya: 'trovao',
  zuko: 'gelo', yuki: 'gelo',
  toxin: 'toxina', void: 'toxina',
  shadow: 'sombra', miyu: 'sombra', king: 'sombra', star: 'sombra',
};

const elementoDe = (id) => ELEMENTS[CHAR_ELEMENT[id] || 'coracao'];
const chaveElemento = (id) => CHAR_ELEMENT[id] || 'coracao';
const forteContra = (k) => CICLO[(CICLO.indexOf(k) + 1) % CICLO.length];
const fracoContra = (k) => CICLO[(CICLO.indexOf(k) - 1 + CICLO.length) % CICLO.length];

/** Multiplicador de dano de um elemento atacando outro. */
function multiplicadorAfinidade(atk, def) {
  if (forteContra(atk) === def) return BALANCE.forte;
  if (fracoContra(atk) === def) return BALANCE.fraco;
  return 1;
}

/** Estado de efeitos de um lutador no início da partida. */
function novoEstadoFX() {
  return { veneno: 0, queimadura: 0, congelado: 0, escudo: true,
           segundoEscudo: true, sequencia: 0, revelar: false };
}

/** Sombra recupera o escudo uma vez, quando a vida entra em estado crítico. */
function checarSegundoEscudo(fx, hp, elemento) {
  if (elemento !== 'sombra' || !fx.segundoEscudo || hp > 30 || hp <= 0) return false;
  fx.segundoEscudo = false;
  fx.escudo = true;
  return true;
}

// ==========================================================================
// Aplica elementos, passivas e ultimates sobre o resultado cru do turno.
//
// ctx = { base, pMove, rMove, pEl, rEl, pFX, rFX, pHP, rHP, maxHP,
//         pMeter, rMeter, pNome, rNome }
// Devolve o mesmo formato do resolveTurn + cura, avisos e revelação.
// ==========================================================================
function aplicarElementos(ctx) {
  const { base, pMove, rMove, pEl, rEl, pFX, rFX, maxHP } = ctx;
  const r = {
    pDmg: base.pDmg, cDmg: base.cDmg,
    pMeterGain: base.pMeterGain, cMeterGain: base.cMeterGain,
    pCura: 0, cCura: 0, text: base.text, avisos: [],
  };

  const P = ELEMENTS[pEl], R = ELEMENTS[rEl];
  const usouUltP = pMove === 'special';
  const usouUltR = rMove === 'special';

  // ---------- ultimates substituem o dano genérico do especial ----------
  if (usouUltP && !usouUltR) {
    r.cDmg = rMove === 'block' ? Math.round(P.ultimate.dano * 0.45) : P.ultimate.dano;
    r.text = `${ctx.pNome} usou ${P.ultimate.nome.toUpperCase()}!`;
    if (rMove === 'block') r.text += ` ${ctx.rNome} aparou parte do golpe.`;
  }
  if (usouUltR && !usouUltP) {
    r.pDmg = pMove === 'block' ? Math.round(R.ultimate.dano * 0.45) : R.ultimate.dano;
    r.text = `${ctx.rNome} usou ${R.ultimate.nome.toUpperCase()}!`;
    if (pMove === 'block') r.text += ' Você aparou parte do golpe.';
  }

  // ---------- afinidade elemental ----------
  const mP = multiplicadorAfinidade(pEl, rEl);
  const mR = multiplicadorAfinidade(rEl, pEl);
  if (r.cDmg > 0 && mP !== 1) {
    r.cDmg = Math.round(r.cDmg * mP);
    r.avisos.push(mP > 1 ? `${P.icone} vantagem elemental` : `${P.icone} desvantagem elemental`);
  }
  if (r.pDmg > 0 && mR !== 1) r.pDmg = Math.round(r.pDmg * mR);

  // ---------- passivas ofensivas ----------
  // Chama: combustão soma dano enquanto a sequência de acertos continua
  if (pEl === 'chama' && r.cDmg > 0 && pFX.sequencia > 0) {
    const bonus = Math.min(BALANCE.combustaoTeto, pFX.sequencia * BALANCE.combustaoPasso);
    r.cDmg += bonus;
    r.avisos.push(`🔥 Combustão +${bonus}`);
  }
  if (rEl === 'chama' && r.pDmg > 0 && rFX.sequencia > 0) {
    r.pDmg += Math.min(BALANCE.combustaoTeto, rFX.sequencia * BALANCE.combustaoPasso);
  }

  // Trovão: choque de golpes iguais dói menos
  const choque = pMove === rMove && (pMove === 'punch' || pMove === 'kick' || pMove === 'special');
  if (choque && pEl === 'trovao' && r.pDmg > 0) {
    r.pDmg = Math.round(r.pDmg * BALANCE.reflexoCorte);
    r.avisos.push('⚡ Reflexo cortou o dano');
  }
  if (choque && rEl === 'trovao' && r.cDmg > 0) r.cDmg = Math.round(r.cDmg * BALANCE.reflexoCorte);

  // Gelo: guarda reforçada — apara parte do dano mesmo quando a defesa é quebrada
  if (pEl === 'gelo' && pMove === 'block' && r.pDmg > 0) {
    r.pDmg = Math.round(r.pDmg * BALANCE.geloGuarda);
    r.avisos.push('❄️ guarda de gelo aparou');
  }
  if (rEl === 'gelo' && rMove === 'block' && r.cDmg > 0) r.cDmg = Math.round(r.cDmg * BALANCE.geloGuarda);

  // Sombra: escudo único anula o primeiro dano da partida
  if (pEl === 'sombra' && r.pDmg > 0 && pFX.escudo) {
    pFX.escudo = false; r.pDmg = 0;
    r.avisos.push('🌑 Espelho anulou o golpe');
  }
  if (rEl === 'sombra' && r.cDmg > 0 && rFX.escudo) { rFX.escudo = false; r.cDmg = 0; }

  // Coração: apanhar devolve vida
  // dispara só ao PERDER a troca: é passiva de virada, não desconto em toda briga
  if (pEl === 'coracao' && r.pDmg > 0 && r.cDmg === 0) {
    r.pCura += Math.round(maxHP * BALANCE.pulsoCura / 100);
    r.avisos.push(`❤️ Pulso Vital +${r.pCura}`);
  }
  if (rEl === 'coracao' && r.cDmg > 0 && r.pDmg === 0) r.cCura += Math.round(maxHP * BALANCE.pulsoCura / 100);

  // Gelo: bloqueio que segurou o golpe drena o medidor do rival
  if (pEl === 'gelo' && pMove === 'block' && r.pDmg === 0) {
    r.cMeterGain -= BALANCE.geloDreno;
    r.pMeterGain += BALANCE.geloGanho;
    r.avisos.push('❄️ Frio Cortante drenou o medidor');
  }
  if (rEl === 'gelo' && rMove === 'block' && r.cDmg === 0) {
    r.pMeterGain -= BALANCE.geloDreno;
    r.cMeterGain += BALANCE.geloGanho;
  }

  // Toxina: qualquer acerto envenena
  if (pEl === 'toxina' && r.cDmg > 0 && rFX.veneno < BALANCE.venenoTeto) {
    rFX.veneno++;
    r.avisos.push(`☠️ Veneno ${rFX.veneno}/${BALANCE.venenoTeto}`);
  }
  if (rEl === 'toxina' && r.pDmg > 0 && pFX.veneno < BALANCE.venenoTeto) pFX.veneno++;

  // ---------- efeitos das ultimates ----------
  if (usouUltP) {
    if (pEl === 'coracao') { r.pCura += P.ultimate.cura; r.avisos.push(`❤️ curou ${P.ultimate.cura}`); }
    if (pEl === 'chama')   { rFX.queimadura = BALANCE.queimaduraTurnos; r.avisos.push('🔥 rival em chamas'); }
    if (pEl === 'trovao')  { const rouba = Math.round(ctx.rMeter * P.ultimate.rouba / 100);
                             r.cMeterGain -= rouba; r.pMeterGain += rouba;
                             r.avisos.push(`⚡ roubou ${rouba} de medidor`); }
    if (pEl === 'gelo')    { rFX.congelado = 1; r.avisos.push('❄️ especial do rival travado'); }
    if (pEl === 'toxina')  { rFX.veneno = BALANCE.venenoTeto; r.avisos.push('☠️ veneno no máximo'); }
    if (pEl === 'sombra')  { pFX.revelar = true; r.avisos.push('🌑 próximo golpe será revelado'); }
  }
  if (usouUltR) {
    if (rEl === 'coracao') r.cCura += R.ultimate.cura;
    if (rEl === 'chama')   pFX.queimadura = BALANCE.queimaduraTurnos;
    if (rEl === 'trovao')  { const rouba = Math.round(ctx.pMeter * R.ultimate.rouba / 100);
                             r.pMeterGain -= rouba; r.cMeterGain += rouba; }
    if (rEl === 'gelo')    { pFX.congelado = 1; r.avisos.push('❄️ seu especial foi congelado'); }
    if (rEl === 'toxina')  pFX.veneno = BALANCE.venenoTeto;
  }

  // ---------- sequência da Chama ----------
  if (pEl === 'chama') pFX.sequencia = (r.cDmg > 0 && r.pDmg === 0) ? pFX.sequencia + 1 : 0;
  if (rEl === 'chama') rFX.sequencia = (r.pDmg > 0 && r.cDmg === 0) ? rFX.sequencia + 1 : 0;

  return r;
}

/** Dano de veneno e queimadura no fim do turno. Consome os contadores. */
function danoContinuo(fx) {
  let dano = 0;
  const partes = [];
  if (fx.veneno > 0) {
    const d = fx.veneno * BALANCE.venenoPorPilha;
    dano += d; partes.push(`☠️ ${d}`);
    fx.veneno--;                     // decai: veneno é desgaste, não dano eterno
  }
  if (fx.queimadura > 0) {
    dano += BALANCE.queimaduraDano;
    partes.push(`🔥 ${BALANCE.queimaduraDano}`);
    fx.queimadura--;
  }
  return { dano, partes };
}
