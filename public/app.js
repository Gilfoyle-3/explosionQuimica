const socket = io();

// AUDIO SINTETIZADO CON WEB AUDIO API
const AudioFX = {
  ctx: null,
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },
  playFlip() {
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {}
  },
  playMatch() {
    try {
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.35);
    } catch (e) {}
  },
  playBomb() {
    try {
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.4);
    } catch (e) {}
  }
};

// BASE DE DATOS EXTENSA Y DETALLADA POR CATEGORÍAS
const ELEMENT_DATABASE = [
  // --- METALES VALENCIA FIJA ---
  { cat: 'mono_fixed', name: 'Hidrógeno', symbol: 'H', val: '+1' },
  { cat: 'mono_fixed', name: 'Litio', symbol: 'Li', val: '+1' },
  { cat: 'mono_fixed', name: 'Sodio', symbol: 'Na', val: '+1' },
  { cat: 'mono_fixed', name: 'Potasio', symbol: 'K', val: '+1' },
  { cat: 'mono_fixed', name: 'Rubidio', symbol: 'Rb', val: '+1' },
  { cat: 'mono_fixed', name: 'Cesio', symbol: 'Cs', val: '+1' },
  { cat: 'mono_fixed', name: 'Francio', symbol: 'Fr', val: '+1' },
  { cat: 'mono_fixed', name: 'Plata', symbol: 'Ag', val: '+1' },
  { cat: 'mono_fixed', name: 'Amonio', symbol: 'NH4', val: '+1' },

  { cat: 'di_fixed', name: 'Berilio', symbol: 'Be', val: '+2' },
  { cat: 'di_fixed', name: 'Magnesio', symbol: 'Mg', val: '+2' },
  { cat: 'di_fixed', name: 'Calcio', symbol: 'Ca', val: '+2' },
  { cat: 'di_fixed', name: 'Estroncio', symbol: 'Sr', val: '+2' },
  { cat: 'di_fixed', name: 'Bario', symbol: 'Ba', val: '+2' },
  { cat: 'di_fixed', name: 'Radio', symbol: 'Ra', val: '+2' },
  { cat: 'di_fixed', name: 'Zinc', symbol: 'Zn', val: '+2' },
  { cat: 'di_fixed', name: 'Cadmio', symbol: 'Cd', val: '+2' },

  { cat: 'tri_fixed', name: 'Aluminio', symbol: 'Al', val: '+3' },
  { cat: 'tri_fixed', name: 'Galio', symbol: 'Ga', val: '+3' },
  { cat: 'tri_fixed', name: 'Indio', symbol: 'In', val: '+3' },
  { cat: 'tri_fixed', name: 'Bismuto', symbol: 'Bi', val: '+3' },

  { cat: 'poly_fixed', name: 'Circonio', symbol: 'Zr', val: '+4' },
  { cat: 'poly_fixed', name: 'Titanio', symbol: 'Ti', val: '+4' },
  { cat: 'poly_fixed', name: 'Uranio', symbol: 'U', val: '+6' },
  { cat: 'poly_fixed', name: 'Wolframio', symbol: 'W', val: '+6' },

  // --- METALES VALENCIA VARIABLE ---
  { cat: 'variable', name: 'Cobre', symbol: 'Cu', val: '+1, +2' },
  { cat: 'variable', name: 'Mercurio', symbol: 'Hg', val: '+1, +2' },
  { cat: 'variable', name: 'Oro', symbol: 'Au', val: '+1, +3' },
  { cat: 'variable', name: 'Talio', symbol: 'Tl', val: '+1, +3' },
  { cat: 'variable', name: 'Hierro', symbol: 'Fe', val: '+2, +3' },
  { cat: 'variable', name: 'Cobalto', symbol: 'Co', val: '+2, +3' },
  { cat: 'variable', name: 'Níquel', symbol: 'Ni', val: '+2, +3' },
  { cat: 'variable', name: 'Plomo', symbol: 'Pb', val: '+2, +4' },
  { cat: 'variable', name: 'Estaño', symbol: 'Sn', val: '+2, +4' },
  { cat: 'variable', name: 'Platino', symbol: 'Pt', val: '+2, +4' },
  { cat: 'variable', name: 'Cerio', symbol: 'Ce', val: '+3, +4' },
  { cat: 'variable', name: 'Vanadio', symbol: 'V', val: '+3, +5' },

  // --- NO METALES ---
  { cat: 'nometal', name: 'Flúor', symbol: 'F', val: '-1' },
  { cat: 'nometal', name: 'Cloro', symbol: 'Cl', val: '-1, +1, +3, +5, +7' },
  { cat: 'nometal', name: 'Bromo', symbol: 'Br', val: '-1, +1, +3, +5, +7' },
  { cat: 'nometal', name: 'Yodo', symbol: 'I', val: '-1, +1, +3, +5, +7' },
  { cat: 'nometal', name: 'Oxígeno', symbol: 'O', val: '-2' },
  { cat: 'nometal', name: 'Azufre', symbol: 'S', val: '-2, +2, +4, +6' },
  { cat: 'nometal', name: 'Selenio', symbol: 'Se', val: '-2, +2, +4, +6' },
  { cat: 'nometal', name: 'Teluro', symbol: 'Te', val: '-2, +2, +4, +6' },
  { cat: 'nometal', name: 'Nitrógeno', symbol: 'N', val: '-3, +1, +2, +3, +4, +5' },
  { cat: 'nometal', name: 'Fósforo', symbol: 'P', val: '-3, +3, +5' },
  { cat: 'nometal', name: 'Arsénico', symbol: 'As', val: '-3, +3, +5' },
  { cat: 'nometal', name: 'Antimonio', symbol: 'Sb', val: '-3, +3, +5' },
  { cat: 'nometal', name: 'Boro', symbol: 'B', val: '-3, +3' },
  { cat: 'nometal', name: 'Carbono', symbol: 'C', val: '-4, +2, +4' },
  { cat: 'nometal', name: 'Silicio', symbol: 'Si', val: '-4, +4' },
  { cat: 'nometal', name: 'Germanio', symbol: 'Ge', val: '-4, +4' }
];

let salaActual = null;
let miPuntaje = 0;
let flippedCards = [];
let esHost = false;
let currentDeck = [];

function mostrarSeccion(idSeccion) {
  document.querySelectorAll('.seccion').forEach(sec => sec.classList.remove('activa'));
  const target = document.getElementById(idSeccion);
  if (target) target.classList.add('activa');
}

function extractNumbers(str) {
  const matches = str.match(/\d+/g);
  return matches ? matches : [];
}

function crearConcurso() {
  const nombre = document.getElementById('nombreConcurso').value || 'Torneo Química';
  const tiempo = document.getElementById('tiempoConcurso').value || 60;
  
  const checkboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked');
  const selectedCategories = Array.from(checkboxes).map(cb => cb.value);

  if (selectedCategories.length === 0) {
    alert('Debes seleccionar al menos una categoría de la tabla.');
    return;
  }

  // Filtrado flexible por categorías específicas
  const elementosFiltrados = ELEMENT_DATABASE.filter(elem => selectedCategories.includes(elem.cat));

  if (elementosFiltrados.length === 0) {
    alert('No hay elementos para la combinación seleccionada.');
    return;
  }

  esHost = true;
  window.elementosPartida = elementosFiltrados;
  socket.emit('createRoom', { nombre, tiempo });
}

function unirseConcurso() {
  const alias = document.getElementById('nombreJugador').value;
  const codigo = document.getElementById('codigoIngreso').value;

  if (!alias || !codigo) {
    alert('Ingresa tu alias y el código de sala.');
    return;
  }
  esHost = false;
  salaActual = codigo;
  socket.emit('joinRoom', { roomId: codigo, playerName: alias });
}

function iniciarConcurso() {
  if (salaActual) {
    const elementosEnviar = window.elementosPartida || ELEMENT_DATABASE;
    socket.emit('startGameHost', { roomId: salaActual, elements: elementosEnviar });
  }
}

// SOCKET LISTENERS
socket.on('roomCreated', ({ roomId }) => {
  salaActual = roomId;
  document.getElementById('codigo-display').innerText = roomId;
  mostrarSeccion('pantalla-sala-host');
});

socket.on('playerJoined', ({ players }) => {
  const lista = document.getElementById('lista-jugadores-host');
  if (lista) {
    lista.innerHTML = players.map(p => `
      <div style="background:rgba(255,255,255,0.05); padding:10px 14px; border-radius:12px; font-weight:800; border:1px solid rgba(255,255,255,0.1); font-size:0.9rem;">
        👤 ${p.name}
      </div>
    `).join('');
  }
  actualizarTablaRanking(players);
});

socket.on('gameStart', ({ deck, tiempo }) => {
  miPuntaje = 0;
  currentDeck = deck;
  document.getElementById('mis-puntos').innerText = '0';
  document.getElementById('cronometro-jugador').innerText = `${tiempo}s`;
  document.getElementById('cronometro-host').innerText = `${tiempo}`;

  if (esHost) {
    mostrarSeccion('pantalla-ranking');
  } else {
    renderBoard(currentDeck);
    mostrarSeccion('pantalla-juego');
  }
});

socket.on('timerUpdate', ({ tiempoRestante }) => {
  document.getElementById('cronometro-jugador').innerText = `${tiempoRestante}s`;
  document.getElementById('cronometro-host').innerText = `${tiempoRestante}`;
});

socket.on('rankingUpdate', ({ players }) => actualizarTablaRanking(players));

socket.on('gameOver', ({ players }) => {
  actualizarTablaRanking(players);
  document.getElementById('titulo-ranking').innerText = "🏆 RESULTADOS FINALES 🏆";
  mostrarSeccion('pantalla-ranking');
});

socket.on('errorMsg', (msg) => alert(msg));

// RENDERIZADO DEL TABLERO
function renderBoard(deck) {
  const boardEl = document.getElementById('tablero');
  boardEl.innerHTML = '';

  deck.forEach((cardData, idx) => {
    const cardEl = document.createElement('div');
    cardEl.classList.add('card');
    cardEl.dataset.index = idx;
    
    if (cardData.matched) {
      if (cardData.type === 'power_bomb' || cardData.type === 'power_tornado') {
        cardEl.classList.add('power-used');
      } else {
        cardEl.classList.add('matched');
      }
    }

    cardEl.innerHTML = `
      <div class="symbol">?</div>
      <div class="type-tag">TOCAR</div>
    `;

    cardEl.addEventListener('click', () => handleCardClick(cardEl, cardData, idx));
    boardEl.appendChild(cardEl);
  });
}

function handleCardClick(cardEl, cardData, idx) {
  if (cardEl.classList.contains('flipped') || cardEl.classList.contains('matched') || cardEl.classList.contains('power-used') || flippedCards.length >= 3) return;

  AudioFX.playFlip();

  if (cardData.type === 'power_bomb') {
    activarBomba(cardEl, idx);
    return;
  }

  if (cardData.type === 'power_tornado') {
    activarTornado(cardEl, idx);
    return;
  }

  cardEl.classList.add('flipped');
  
  let tagTexto = 'CARTA';
  let textoMostrado = cardData.content;

  if (cardData.type === 'symbol') tagTexto = 'SÍMBOLO';
  if (cardData.type === 'name') tagTexto = 'NOMBRE';
  if (cardData.type === 'valence') {
    tagTexto = 'VALENCIA';
    textoMostrado = cardData.content; // MUESTRA SÓLO NÚMEROS Y SIGNOS
  }

  cardEl.querySelector('.symbol').innerText = textoMostrado;
  cardEl.querySelector('.type-tag').innerText = tagTexto;

  flippedCards.push({ element: cardEl, data: cardData });

  if (flippedCards.length === 3) {
    checkTrioMatch();
  }
}

function checkTrioMatch() {
  const [c1, c2, c3] = flippedCards;

  const types = [c1.data.type, c2.data.type, c3.data.type];
  const hasSymbol = types.includes('symbol');
  const hasName = types.includes('name');
  const hasValence = types.includes('valence');

  let isMatch = false;

  if (hasSymbol && hasName && hasValence) {
    const symbolCard = flippedCards.find(c => c.data.type === 'symbol');
    const nameCard = flippedCards.find(c => c.data.type === 'name');
    const valenceCard = flippedCards.find(c => c.data.type === 'valence');

    if (symbolCard.data.idElem === nameCard.data.idElem) {
      const elementValenceNumbers = extractNumbers(symbolCard.data.valences);
      const selectedValenceNumbers = extractNumbers(valenceCard.data.content);

      if (selectedValenceNumbers.some(num => elementValenceNumbers.includes(num))) {
        isMatch = true;
      }
    }
  }

  if (isMatch) {
    AudioFX.playMatch();
    setTimeout(() => {
      flippedCards.forEach(c => {
        c.element.classList.add('matched');
        c.data.matched = true;
      });

      miPuntaje += 100;
      document.getElementById('mis-puntos').innerText = miPuntaje;

      if (salaActual) {
        socket.emit('updateScore', { roomId: salaActual, points: miPuntaje });
      }

      flippedCards = [];
    }, 300);
  } else {
    setTimeout(() => {
      flippedCards.forEach(c => {
        c.element.classList.remove('flipped');
        c.element.querySelector('.symbol').innerText = '?';
        c.element.querySelector('.type-tag').innerText = 'TOCAR';
      });
      flippedCards = [];
    }, 800);
  }
}

function activarBomba(cardEl, index) {
  AudioFX.playBomb();
  
  cardEl.classList.add('flipped');
  cardEl.querySelector('.symbol').innerText = '💣';
  cardEl.querySelector('.type-tag').innerText = 'POWER-UP';

  const allCards = document.querySelectorAll('.card');
  const cols = 5;

  const radioIndexes = [
    index - 1, index + 1,
    index - cols, index - cols - 1, index - cols + 1,
    index + cols, index + cols - 1, index + cols + 1
  ];

  radioIndexes.forEach(i => {
    if (allCards[i] && !currentDeck[i]?.matched && !allCards[i].classList.contains('power-used')) {
      const data = currentDeck[i];
      if (data) {
        allCards[i].classList.add('flipped');
        allCards[i].querySelector('.symbol').innerText = data.content;
        allCards[i].querySelector('.type-tag').innerText = data.type.toUpperCase();
      }
    }
  });

  setTimeout(() => {
    cardEl.classList.add('power-used');
    currentDeck[index].matched = true;

    radioIndexes.forEach(i => {
      if (allCards[i] && !currentDeck[i]?.matched && !allCards[i].classList.contains('power-used')) {
        allCards[i].classList.remove('flipped');
        allCards[i].querySelector('.symbol').innerText = '?';
        allCards[i].querySelector('.type-tag').innerText = 'TOCAR';
      }
    });
  }, 1500);
}

function activarTornado(cardEl, index) {
  AudioFX.playBomb();

  cardEl.classList.add('flipped');
  cardEl.querySelector('.symbol').innerText = '🌪️';
  cardEl.querySelector('.type-tag').innerText = 'POWER-UP';

  setTimeout(() => {
    cardEl.classList.add('power-used');
    currentDeck[index].matched = true;

    flippedCards.forEach(c => {
      c.element.classList.remove('flipped');
      c.element.querySelector('.symbol').innerText = '?';
      c.element.querySelector('.type-tag').innerText = 'TOCAR';
    });
    flippedCards = [];

    const unmatched = currentDeck.filter(c => !c.matched);
    unmatched.sort(() => Math.random() - 0.5);

    let umIdx = 0;
    for (let i = 0; i < currentDeck.length; i++) {
      if (!currentDeck[i].matched) {
        currentDeck[i] = unmatched[umIdx++];
      }
    }
    renderBoard(currentDeck);
  }, 1500);
}

function actualizarTablaRanking(players) {
  const container = document.getElementById('tabla-ranking');
  if (!container) return;

  container.className = 'ranking-list';
  container.innerHTML = players.map((p, index) => {
    const pos = index + 1;
    let topClass = '';
    let medal = `#${pos}`;

    if (pos === 1) { topClass = 'top-1'; medal = '🥇'; }
    else if (pos === 2) { topClass = 'top-2'; medal = '🥈'; }
    else if (pos === 3) { topClass = 'top-3'; medal = '🥉'; }

    return `
      <div class="ranking-card ${topClass}">
        <div class="rank-left">
          <div class="rank-badge">${medal}</div>
          <div>
            <div class="rank-name">${p.name}</div>
            <div class="rank-sub">PUESTO ${pos}</div>
          </div>
        </div>
        <div class="rank-score-pill">${p.points} PTS</div>
      </div>
    `;
  }).join('');
}

// EXPOSICIÓN GLOBAL
window.crearConcurso = crearConcurso;
window.unirseConcurso = unirseConcurso;
window.iniciarConcurso = iniciarConcurso;
window.mostrarSeccion = mostrarSeccion;
