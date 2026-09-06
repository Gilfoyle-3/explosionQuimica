const socket = io();

// BASE DE DATOS COMPLETA DE ELEMENTOS QUÍMICOS Y SUS VALENCIAS
const ELEMENT_DATABASE = [
  // --- METALES DE VALENCIA FIJA ---
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
  { cat: 'tri_fixed', name: 'Bismuto', symbol: 'Bi', val: '+3' },
  { cat: 'tri_fixed', name: 'Galio', symbol: 'Ga', val: '+3' },
  { cat: 'tri_fixed', name: 'Indio', symbol: 'In', val: '+3' },

  { cat: 'tri_fixed', name: 'Circonio', symbol: 'Zr', val: '+4' },
  { cat: 'tri_fixed', name: 'Titanio', symbol: 'Ti', val: '+4' },
  { cat: 'tri_fixed', name: 'Uranio', symbol: 'U', val: '+6' },

  // --- METALES DE VALENCIA VARIABLE ---
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
  { cat: 'variable', name: 'Antimonio', symbol: 'Sb', val: '+3, +5' },

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
  { cat: 'nometal', name: 'Fósforo', symbol: 'P', val: '-3, +1, +3, +5' },
  { cat: 'nometal', name: 'Arsénico', symbol: 'As', val: '-3, +3, +5' },
  { cat: 'nometal', name: 'Carbono', symbol: 'C', val: '-4, +2, +4' },
  { cat: 'nometal', name: 'Silicio', symbol: 'Si', val: '-4, +4' },
  { cat: 'nometal', name: 'Boro', symbol: 'B', val: '-3, +3' },

  // --- ANFÓTEROS ---
  { cat: 'anfotero', name: 'Manganeso', symbol: 'Mn', val: '+2, +3, +4, +6, +7' },
  { cat: 'anfotero', name: 'Cromo', symbol: 'Cr', val: '+2, +3, +6' },
  { cat: 'anfotero', name: 'Vanadio', symbol: 'V', val: '+2, +3, +4, +5' }
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

// EVENTOS DE SOCKET
socket.on('roomCreated', ({ roomId }) => {
  salaActual = roomId;
  document.getElementById('codigo-display').innerText = roomId;
  mostrarSeccion('pantalla-sala-host');
});

// NUEVO LOBBY DE ESPERA EN VIVO (HOST)
socket.on('playerJoined', ({ players }) => {
  const lista = document.getElementById('lista-jugadores-host');
  if (lista) {
    lista.className = 'players-waiting-grid';
    lista.innerHTML = players.map(p => {
      const initial = p.name ? p.name.charAt(0).toUpperCase() : '?';
      return `
        <div class="player-card-lobby">
          <div class="player-avatar">${initial}</div>
          <div class="player-name-lobby">${p.name}</div>
          <span class="player-status-badge">Conectado</span>
        </div>
      `;
    }).join('');
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
  document.getElementById('titulo-ranking').innerText = "¡PARTIDA FINALIZADA!";
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
    if (cardData.matched) cardEl.classList.add('matched');

    cardEl.innerHTML = `
      <div class="symbol">?</div>
      <div class="type-tag">TAP</div>
    `;

    cardEl.addEventListener('click', () => handleCardClick(cardEl, cardData, idx));
    boardEl.appendChild(cardEl);
  });
}

function handleCardClick(cardEl, cardData, idx) {
  if (cardEl.classList.contains('flipped') || cardEl.classList.contains('matched') || flippedCards.length >= 3) return;

  if (cardData.type === 'power_bomb') {
    activarBomba(idx);
    return;
  }

  if (cardData.type === 'power_tornado') {
    activarTornado();
    return;
  }

  cardEl.classList.add('flipped');
  cardEl.querySelector('.symbol').innerText = cardData.content;
  cardEl.querySelector('.type-tag').innerText = cardData.sub;

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
        c.element.querySelector('.type-tag').innerText = 'TAP';
      });
      flippedCards = [];
    }, 800);
  }
}

function activarBomba(index) {
  const allCards = document.querySelectorAll('.card');
  const cols = Math.floor(Math.sqrt(allCards.length)) || 4;
  
  const radioIndexes = [
    index, index - 1, index + 1,
    index - cols, index - cols - 1, index - cols + 1,
    index + cols, index + cols - 1, index + cols + 1
  ];

  radioIndexes.forEach(i => {
    if (allCards[i] && !allCards[i].classList.contains('matched')) {
      const data = currentDeck[i];
      if (data) {
        allCards[i].classList.add('flipped');
        allCards[i].querySelector('.symbol').innerText = data.content;
        allCards[i].querySelector('.type-tag').innerText = data.sub;
      }
    }
  });

  setTimeout(() => {
    radioIndexes.forEach(i => {
      if (allCards[i] && !allCards[i].classList.contains('matched')) {
        allCards[i].classList.remove('flipped');
        allCards[i].querySelector('.symbol').innerText = '?';
        allCards[i].querySelector('.type-tag').innerText = 'TAP';
      }
    });
  }, 3000);
}

function activarTornado() {
  flippedCards.forEach(c => {
    c.element.classList.remove('flipped');
    c.element.querySelector('.symbol').innerText = '?';
    c.element.querySelector('.type-tag').innerText = 'TAP';
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
}

// NUEVO RENDERIZADO DEL RANKING PRO
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
          <div class="rank-name">${p.name}</div>
        </div>
        <div class="rank-score">${p.points} <span style="font-size:0.75rem; color:var(--text-muted)">pts</span></div>
      </div>
    `;
  }).join('');
}
