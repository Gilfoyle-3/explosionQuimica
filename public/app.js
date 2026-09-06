const socket = io();

// BASE DE DATOS COMPLETA DE VALENCIAS QUÍMICAS
const ELEMENT_DATABASE = [
  // --- METALES DE VALENCIA FIJA ---
  { name: 'Hidrógeno', symbol: 'H', val: '+1' },
  { name: 'Litio', symbol: 'Li', val: '+1' },
  { name: 'Sodio', symbol: 'Na', val: '+1' },
  { name: 'Potasio', symbol: 'K', val: '+1' },
  { name: 'Rubidio', symbol: 'Rb', val: '+1' },
  { name: 'Cesio', symbol: 'Cs', val: '+1' },
  { name: 'Francio', symbol: 'Fr', val: '+1' },
  { name: 'Plata', symbol: 'Ag', val: '+1' },
  { name: 'Amonio', symbol: 'NH4', val: '+1' },
  { name: 'Berilio', symbol: 'Be', val: '+2' },
  { name: 'Magnesio', symbol: 'Mg', val: '+2' },
  { name: 'Calcio', symbol: 'Ca', val: '+2' },
  { name: 'Estroncio', symbol: 'Sr', val: '+2' },
  { name: 'Bario', symbol: 'Ba', val: '+2' },
  { name: 'Radio', symbol: 'Ra', val: '+2' },
  { name: 'Zinc', symbol: 'Zn', val: '+2' },
  { name: 'Cadmio', symbol: 'Cd', val: '+2' },
  { name: 'Aluminio', symbol: 'Al', val: '+3' },
  { name: 'Bismuto', symbol: 'Bi', val: '+3' },
  { name: 'Galio', symbol: 'Ga', val: '+3' },
  { name: 'Indio', symbol: 'In', val: '+3' },
  { name: 'Germanio', symbol: 'Ge', val: '+4' },
  { name: 'Osmio', symbol: 'Os', val: '+4' },
  { name: 'Iridio', symbol: 'Ir', val: '+4' },
  { name: 'Uranio', symbol: 'U', val: '+6' },

  // --- METALES DE VALENCIA VARIABLE ---
  { name: 'Cobre', symbol: 'Cu', val: '+1, +2' },
  { name: 'Mercurio', symbol: 'Hg', val: '+1, +2' },
  { name: 'Oro', symbol: 'Au', val: '+1, +3' },
  { name: 'Talio', symbol: 'Tl', val: '+1, +3' },
  { name: 'Hierro', symbol: 'Fe', val: '+2, +3' },
  { name: 'Cobalto', symbol: 'Co', val: '+2, +3' },
  { name: 'Níquel', symbol: 'Ni', val: '+2, +3' },
  { name: 'Plomo', symbol: 'Pb', val: '+2, +4' },
  { name: 'Estaño', symbol: 'Sn', val: '+2, +4' },
  { name: 'Platino', symbol: 'Pt', val: '+2, +4' },
  { name: 'Vanadio', symbol: 'V', val: '+3, +5' },

  // --- NO METALES ---
  { name: 'Flúor', symbol: 'F', val: '-1' },
  { name: 'Cloro', symbol: 'Cl', val: '-1, +1, +3, +5, +7' },
  { name: 'Bromo', symbol: 'Br', val: '-1, +1, +3, +5, +7' },
  { name: 'Yodo', symbol: 'I', val: '-1, +1, +3, +5, +7' },
  { name: 'Oxígeno', symbol: 'O', val: '-2' },
  { name: 'Azufre', symbol: 'S', val: '-2, +2, +4, +6' },
  { name: 'Selenio', symbol: 'Se', val: '-2, +2, +4, +6' },
  { name: 'Teluro', symbol: 'Te', val: '-2, +2, +4, +6' },
  { name: 'Nitrógeno', symbol: 'N', val: '-3, +1, +2, +3, +4, +5' },
  { name: 'Fósforo', symbol: 'P', val: '-3, +3, +5' },
  { name: 'Arsénico', symbol: 'As', val: '-3, +3, +5' },
  { name: 'Antimonio', symbol: 'Sb', val: '-3, +3, +5' },
  { name: 'Boro', symbol: 'B', val: '-3, +3' },
  { name: 'Carbono', symbol: 'C', val: '-4, +2, +4' },
  { name: 'Silicio', symbol: 'Si', val: '-4, +4' },

  // --- ANFÓTEROS ---
  { name: 'Manganeso', symbol: 'Mn', val: '+2, +3 (Base) / +4, +6, +7 (Ácido)' },
  { name: 'Cromo', symbol: 'Cr', val: '+2, +3 (Base) / +3, +6 (Ácido)' }
];

let salaActual = null;
let miPuntaje = 0;
let flippedCards = [];
let esHost = false;

function mostrarSeccion(idSeccion) {
  document.querySelectorAll('.seccion').forEach(sec => sec.classList.remove('activa'));
  const target = document.getElementById(idSeccion);
  if (target) target.classList.add('activa');
}

// CREAR SALA (HOST)
function crearConcurso() {
  const nombre = document.getElementById('nombreConcurso').value || 'Torneo Química';
  const tiempo = document.getElementById('tiempoConcurso').value || 60;
  esHost = true;
  socket.emit('createRoom', { nombre, tiempo });
}

// UNIRSE A SALA (JUGADOR)
function unirseConcurso() {
  const alias = document.getElementById('nombreJugador').value;
  const codigo = document.getElementById('codigoIngreso').value;

  if (!alias || !codigo) {
    alert('Ingresa tu alias y el código de la sala.');
    return;
  }
  esHost = false;
  socket.emit('joinRoom', { roomId: codigo, playerName: alias });
}

function iniciarConcurso() {
  if (salaActual) {
    socket.emit('startGameHost', { roomId: salaActual, elements: ELEMENT_DATABASE });
  }
}

// RECEPCIÓN DE EVENTOS DE SOCKET
socket.on('roomCreated', ({ roomId }) => {
  salaActual = roomId;
  document.getElementById('codigo-display').innerText = roomId;
  mostrarSeccion('pantalla-sala-host');
});

socket.on('playerJoined', ({ players }) => {
  const lista = document.getElementById('lista-jugadores-host');
  if (lista) {
    lista.innerHTML = players.map(p => `<li>> ${p.name}</li>`).join('');
  }
  actualizarTablaRanking(players);
});

socket.on('gameStart', ({ deck, tiempo }) => {
  miPuntaje = 0;
  document.getElementById('mis-puntos').innerText = '0';
  document.getElementById('cronometro-jugador').innerText = `${tiempo}s`;
  document.getElementById('cronometro-host').innerText = `${tiempo}`;
  document.getElementById('titulo-ranking').innerText = "RANKING EN TIEMPO REAL";

  if (esHost) {
    mostrarSeccion('pantalla-ranking');
  } else {
    renderBoard(deck);
    mostrarSeccion('pantalla-juego');
  }
});

socket.on('timerUpdate', ({ tiempoRestante }) => {
  document.getElementById('cronometro-jugador').innerText = `${tiempoRestante}s`;
  document.getElementById('cronometro-host').innerText = `${tiempoRestante}`;
});

socket.on('rankingUpdate', ({ players }) => {
  actualizarTablaRanking(players);
});

socket.on('gameOver', ({ players }) => {
  actualizarTablaRanking(players);
  document.getElementById('titulo-ranking').innerText = "¡CONCURSO FINALIZADO!";
  mostrarSeccion('pantalla-ranking');
});

socket.on('errorMsg', (msg) => {
  alert(msg);
});

// LÓGICA DEL TABLERO DE JUEGO
function renderBoard(deck) {
  const boardEl = document.getElementById('tablero');
  boardEl.innerHTML = '';

  deck.forEach((cardData, idx) => {
    const cardEl = document.createElement('div');
    cardEl.classList.add('card');
    cardEl.dataset.index = idx;
    cardEl.innerHTML = `
      <div class="symbol">?</div>
      <div class="type-tag">CYBER_CARD</div>
    `;

    cardEl.addEventListener('click', () => {
      if (cardEl.classList.contains('flipped') || cardEl.classList.contains('matched') || flippedCards.length >= 2) return;

      cardEl.classList.add('flipped');
      cardEl.querySelector('.symbol').innerText = cardData.content;
      cardEl.querySelector('.type-tag').innerText = cardData.sub;
      flippedCards.push({ element: cardEl, data: cardData });

      if (flippedCards.length === 2) {
        checkMatch();
      }
    });

    boardEl.appendChild(cardEl);
  });
}

function checkMatch() {
  const [c1, c2] = flippedCards;

  if (c1.data.matchId === c2.data.matchId) {
    setTimeout(() => {
      c1.element.classList.add('matched');
      c2.element.classList.add('matched');
      miPuntaje += 100;
      document.getElementById('mis-puntos').innerText = miPuntaje;
      socket.emit('updateScore', { roomId: salaActual, points: miPuntaje });
      flippedCards = [];
    }, 400);
  } else {
    setTimeout(() => {
      c1.element.classList.remove('flipped');
      c2.element.classList.remove('flipped');
      c1.element.querySelector('.symbol').innerText = '?';
      c1.element.querySelector('.type-tag').innerText = 'CYBER_CARD';
      c2.element.querySelector('.symbol').innerText = '?';
      c2.element.querySelector('.type-tag').innerText = 'CYBER_CARD';
      flippedCards = [];
    }, 800);
  }
}

function actualizarTablaRanking(players) {
  const tbody = document.getElementById('tabla-ranking');
  if (!tbody) return;
  tbody.innerHTML = '';

  players.forEach((p, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${index + 1}</td>
      <td>${p.name}</td>
      <td><span class="neon-green">${p.points}</span></td>
    `;
    tbody.appendChild(tr);
  });
}
