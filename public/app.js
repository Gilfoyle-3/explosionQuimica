const socket = io();

// BASE DE DATOS COMPLETA DE VALENCIAS QUÍMICAS (METALES Y NO METALES)
const ELEMENT_DATABASE = [
  // --- METALES DE VALENCIA FIJA ---
  // Monovalentes (+1)
  { name: 'Hidrógeno', symbol: 'H', val: '+1' },
  { name: 'Litio', symbol: 'Li', val: '+1' },
  { name: 'Sodio', symbol: 'Na', val: '+1' },
  { name: 'Potasio', symbol: 'K', val: '+1' },
  { name: 'Rubidio', symbol: 'Rb', val: '+1' },
  { name: 'Cesio', symbol: 'Cs', val: '+1' },
  { name: 'Francio', symbol: 'Fr', val: '+1' },
  { name: 'Plata', symbol: 'Ag', val: '+1' },
  { name: 'Amonio', symbol: 'NH4', val: '+1' },

  // Divalentes (+2)
  { name: 'Berilio', symbol: 'Be', val: '+2' },
  { name: 'Magnesio', symbol: 'Mg', val: '+2' },
  { name: 'Calcio', symbol: 'Ca', val: '+2' },
  { name: 'Estroncio', symbol: 'Sr', val: '+2' },
  { name: 'Bario', symbol: 'Ba', val: '+2' },
  { name: 'Radio', symbol: 'Ra', val: '+2' },
  { name: 'Zinc', symbol: 'Zn', val: '+2' },
  { name: 'Cadmio', symbol: 'Cd', val: '+2' },

  // Trivalentes (+3)
  { name: 'Aluminio', symbol: 'Al', val: '+3' },
  { name: 'Bismuto', symbol: 'Bi', val: '+3' },
  { name: 'Galio', symbol: 'Ga', val: '+3' },
  { name: 'Indio', symbol: 'In', val: '+3' },

  // Tetravalentes (+4) y Hexavalentes (+6)
  { name: 'Germanio', symbol: 'Ge', val: '+4' },
  { name: 'Osmio', symbol: 'Os', val: '+4' },
  { name: 'Iridio', symbol: 'Ir', val: '+4' },
  { name: 'Uranio', symbol: 'U', val: '+6' },

  // --- METALES DE VALENCIA VARIABLE ---
  // Mono y Divalentes (+1, +2)
  { name: 'Cobre', symbol: 'Cu', val: '+1, +2' },
  { name: 'Mercurio', symbol: 'Hg', val: '+1, +2' },

  // Mono y Trivalentes (+1, +3)
  { name: 'Oro', symbol: 'Au', val: '+1, +3' },
  { name: 'Talio', symbol: 'Tl', val: '+1, +3' },

  // Di y Trivalentes (+2, +3)
  { name: 'Hierro', symbol: 'Fe', val: '+2, +3' },
  { name: 'Cobalto', symbol: 'Co', val: '+2, +3' },
  { name: 'Níquel', symbol: 'Ni', val: '+2, +3' },

  // Di y Tetravalentes (+2, +4)
  { name: 'Plomo', symbol: 'Pb', val: '+2, +4' },
  { name: 'Estaño', symbol: 'Sn', val: '+2, +4' },
  { name: 'Platino', symbol: 'Pt', val: '+2, +4' },

  // Tri y Pentavalentes (+3, +5)
  { name: 'Vanadio', symbol: 'V', val: '+3, +5' },

  // --- NO METALES ---
  // Halógenos (-1, +1, +3, +5, +7)
  { name: 'Flúor', symbol: 'F', val: '-1' },
  { name: 'Cloro', symbol: 'Cl', val: '-1, +1, +3, +5, +7' },
  { name: 'Bromo', symbol: 'Br', val: '-1, +1, +3, +5, +7' },
  { name: 'Yodo', symbol: 'I', val: '-1, +1, +3, +5, +7' },

  // Anfígenos / Calcógenos (-2, +2, +4, +6)
  { name: 'Oxígeno', symbol: 'O', val: '-2' },
  { name: 'Azufre', symbol: 'S', val: '-2, +2, +4, +6' },
  { name: 'Selenio', symbol: 'Se', val: '-2, +2, +4, +6' },
  { name: 'Teluro', symbol: 'Te', val: '-2, +2, +4, +6' },

  // Nitrogenoides (-3, +3, +5)
  { name: 'Nitrógeno', symbol: 'N', val: '-3, +1, +2, +3, +4, +5' },
  { name: 'Fósforo', symbol: 'P', val: '-3, +3, +5' },
  { name: 'Arsénico', symbol: 'As', val: '-3, +3, +5' },
  { name: 'Antimonio', symbol: 'Sb', val: '-3, +3, +5' },
  { name: 'Boro', symbol: 'B', val: '-3, +3' },

  // Carbonoides (-4, +2, +4)
  { name: 'Carbono', symbol: 'C', val: '-4, +2, +4' },
  { name: 'Silicio', symbol: 'Si', val: '-4, +4' },

  // --- ANFÓTEROS ---
  { name: 'Manganeso', symbol: 'Mn', val: '+2, +3 (Base) / +4, +6, +7 (Ácido)' },
  { name: 'Cromo', symbol: 'Cr', val: '+2, +3 (Base) / +3, +6 (Ácido)' }
];

let salaActual = null;
let miPuntaje = 0;
let flippedCards = [];

function mostrarSeccion(idSeccion) {
  document.querySelectorAll('.seccion').forEach(sec => sec.classList.remove('activa'));
  const target = document.getElementById(idSeccion);
  if (target) target.classList.add('activa');
}

// CREAR SALA (HOST)
function crearConcurso() {
  const nombre = document.getElementById('nombreConcurso').value || 'Torneo Química';
  const tiempo = document.getElementById('tiempoConcurso').value || 60;
  
  socket.emit('createRoom', { nombre, tiempo });
}

// UNIRSE A SALA (JUGADOR)
function unirseConcurso() {
  const alias = document.getElementById('nombreJugador').value;
  const codigo = document.getElementById('codigoIngreso').value;

  if (!alias || !codigo) {
    alert('Por favor ingresa tu alias y el código de sala.');
    return;
  }

  socket.emit('joinRoom', { roomId: codigo, playerName: alias });
}

// EVENTOS DE SOCKET
socket.on('roomCreated', ({ roomId }) => {
  salaActual = roomId;
  document.getElementById('codigo-display').innerText = roomId;
  mostrarSeccion('pantalla-sala-host');
});

socket.on('playerJoined', ({ players }) => {
  const lista = document.getElementById('lista-jugadores-host');
  lista.innerHTML = players.map(p => `<li>> ${p.name}</li>`).join('');
});

socket.on('gameStart', ({ deck }) => {
  miPuntaje = 0;
  document.getElementById('mis-puntos').innerText = '0';
  renderBoard(deck);
  mostrarSeccion('pantalla-juego');
});

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

function iniciarConcurso() {
  if (salaActual) {
    socket.emit('startGameHost', { roomId: salaActual, elements: ELEMENT_DATABASE });
  }
}

function verRanking() {
  mostrarSeccion('pantalla-ranking');
}
