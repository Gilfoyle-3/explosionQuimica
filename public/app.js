const socket = io();

// AUDIO SINTETIZADO WEB AUDIO API (EFECTOS DE SONIDO SIN MP3)
const AudioFX = {
  ctx: null,
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },
  playFlip() {
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
  },
  playMatch() {
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
  },
  playBomb() {
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
  }
};

// BASE DE DATOS DE ELEMENTOS Y VALENCIAS
const ELEMENT_DATABASE = [
  { cat: 'mono_fixed', name: 'Hidrógeno', symbol: 'H', val: '+1' },
  { cat: 'mono_fixed', name: 'Litio', symbol: 'Li', val: '+1' },
  { cat: 'mono_fixed', name: 'Sodio', symbol: 'Na', val: '+1' },
  { cat: 'mono_fixed', name: 'Potasio', symbol: 'K', val: '+1' },
  { cat: 'mono_fixed', name: 'Plata', symbol: 'Ag', val: '+1' },
  { cat: 'di_fixed', name: 'Calcio', symbol: 'Ca', val: '+2' },
  { cat: 'di_fixed', name: 'Magnesio', symbol: 'Mg', val: '+2' },
  { cat: 'di_fixed', name: 'Zinc', symbol: 'Zn', val: '+2' },
  { cat: 'tri_fixed', name: 'Aluminio', symbol: 'Al', val: '+3' },
  { cat: 'variable', name: 'Cobre', symbol: 'Cu', val: '+1, +2' },
  { cat: 'variable', name: 'Hierro', symbol: 'Fe', val: '+2, +3' },
  { cat: 'variable', name: 'Oro', symbol: 'Au', val: '+1, +3' },
  { cat: 'nometal', name: 'Flúor', symbol: 'F', val: '-1' },
  { cat: 'nometal', name: 'Cloro', symbol: 'Cl', val: '-1, +1, +3, +5, +7' },
  { cat: 'nometal', name: 'Oxígeno', symbol: 'O', val: '-2' }
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
  const checkboxes = document.querySelectorAll('.cat-checkbox:checked');
  const categorias = Array.from(checkboxes).map(cb => cb.value);

  esHost = true;
  socket.emit('createRoom', { nombre, tiempo, categorias });
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
    socket.emit('startGameHost', { roomId: salaActual, elements: ELEMENT_DATABASE });
  }
}

// EVENTOS SOCKET
socket.on('roomCreated', ({ roomId }) => {
  salaActual = roomId;
  document.getElementById('codigo-display').innerText = roomId;
  mostrarSeccion('pantalla-sala-host');
});

socket.on('playerJoined', ({ players }) => {
  const lista = document.getElementById('lista-jugadores-host');
  if (lista) {
    lista.innerHTML = players.map(p => `
      <div style="background:rgba(255,255,255,0.05); padding:10px 16px; border-radius:12px; font-weight:800; border:1px solid rgba(255,255,255,0.1)">
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
    activarBomba(idx);
    return;
  }

  if (cardData.type === 'power_tornado') {
    activarTornado(idx);
    return;
  }

  cardEl.classList.add('flipped');
  
  // ETIQUETAS CLARAS PARA QUE NO ESTÉ AL REVÉS
  let tagTexto = 'CARTA';
  let textoMostrado = cardData.content;

  if (cardData.type === 'symbol') tagTexto = 'SÍMBOLO';
  if (cardData.type === 'name') tagTexto = 'NOMBRE';
  if (cardData.type === 'valence') {
    tagTexto = 'VALENCIA';
    textoMostrado = `VAL: ${cardData.content}`; // Muestra claramente la valencia
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

function activarBomba(index) {
  AudioFX.playBomb();
  const allCards = document.querySelectorAll('.card');
  const cols = 4;
  
  const bombCardEl = allCards[index];
  if (bombCardEl) {
    bombCardEl.classList.add('power-used');
    currentDeck[index].matched = true;
  }

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
        allCards[i].querySelector('.symbol').innerText = data.type === 'valence' ? `VAL: ${data.content}` : data.content;
        allCards[i].querySelector('.type-tag').innerText = data.type.toUpperCase();
      }
    }
  });

  setTimeout(() => {
    radioIndexes.forEach(i => {
      if (allCards[i] && !currentDeck[i]?.matched && !allCards[i].classList.contains('power-used')) {
        allCards[i].classList.remove('flipped');
        allCards[i].querySelector('.symbol').innerText = '?';
        allCards[i].querySelector('.type-tag').innerText = 'TOCAR';
      }
    });
  }, 2500);
}

function activarTornado(index) {
  AudioFX.playBomb();
  const allCards = document.querySelectorAll('.card');
  if (allCards[index]) {
    allCards[index].classList.add('power-used');
    currentDeck[index].matched = true;
  }

  flippedCards.forEach(c => {
    c.element.classList.remove('flipped');
    c.element.querySelector('.symbol').innerText = '?';
    c.element.querySelector('.type-tag').innerText = 'TOCAR';
  });
  flippedCards = [];

  setTimeout(() => {
    const unmatched = currentDeck.filter(c => !c.matched);
    unmatched.sort(() => Math.random() - 0.5);

    let umIdx = 0;
    for (let i = 0; i < currentDeck.length; i++) {
      if (!currentDeck[i].matched) {
        currentDeck[i] = unmatched[umIdx++];
      }
    }
    renderBoard(currentDeck);
  }, 400);
}

// RANKING LEADERBOARD PRO
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
