const socket = io();

// BASE DE DATOS CLASIFICADA POR CATEGORÍAS
const ELEMENT_DATABASE = [
  // Monovalentes (+1)
  { cat: 'mono_fixed', name: 'Hidrógeno', symbol: 'H', val: '+1' },
  { cat: 'mono_fixed', name: 'Litio', symbol: 'Li', val: '+1' },
  { cat: 'mono_fixed', name: 'Sodio', symbol: 'Na', val: '+1' },
  { cat: 'mono_fixed', name: 'Potasio', symbol: 'K', val: '+1' },
  { cat: 'mono_fixed', name: 'Plata', symbol: 'Ag', val: '+1' },

  // Divalentes (+2)
  { cat: 'di_fixed', name: 'Berilio', symbol: 'Be', val: '+2' },
  { cat: 'di_fixed', name: 'Magnesio', symbol: 'Mg', val: '+2' },
  { cat: 'di_fixed', name: 'Calcio', symbol: 'Ca', val: '+2' },
  { cat: 'di_fixed', name: 'Zinc', symbol: 'Zn', val: '+2' },

  // Trivalentes (+3)
  { cat: 'tri_fixed', name: 'Aluminio', symbol: 'Al', val: '+3' },
  { cat: 'tri_fixed', name: 'Bismuto', symbol: 'Bi', val: '+3' },

  // Valencia Variable
  { cat: 'variable', name: 'Cobre', symbol: 'Cu', val: '+1, +2' },
  { cat: 'variable', name: 'Oro', symbol: 'Au', val: '+1, +3' },
  { cat: 'variable', name: 'Hierro', symbol: 'Fe', val: '+2, +3' },
  { cat: 'variable', name: 'Plomo', symbol: 'Pb', val: '+2, +4' },

  // No Metales
  { cat: 'nometal', name: 'Cloro', symbol: 'Cl', val: '-1, +1, +3, +5, +7' },
  { cat: 'nometal', name: 'Oxígeno', symbol: 'O', val: '-2' },
  { cat: 'nometal', name: 'Azufre', symbol: 'S', val: '-2, +2, +4, +6' },
  { cat: 'nometal', name: 'Nitrógeno', symbol: 'N', val: '-3, +1, +2, +3, +4, +5' },

  // Anfóteros
  { cat: 'anfotero', name: 'Manganeso', symbol: 'Mn', val: '+2, +3, +4, +6, +7' }
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

// Extrae solo los números para comparar "3", "+3", "3+" por igual
function extractNumbers(str) {
  const matches = str.match(/\d+/g);
  return matches ? matches : [];
}

// CREAR SALA (HOST)
function crearConcurso() {
  const nombre = document.getElementById('nombreConcurso').value || 'Torneo Química';
  const tiempo = document.getElementById('tiempoConcurso').value || 60;
  
  // Obtener categorías seleccionadas
  const checkboxes = document.querySelectorAll('.cat-checkbox:checked');
  const categorias = Array.from(checkboxes).map(cb => cb.value);

  esHost = true;
  socket.emit('createRoom', { nombre, tiempo, categorias });
}

// UNIRSE A SALA (JUGADOR)
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
    lista.innerHTML = players.map(p => `<li>👤 ${p.name}</li>`).join('');
  }
  actualizarTablaRanking(players);
});

socket.on('gameStart', ({ deck, tiempo }) => {
  miPuntaje = 0;
  document.getElementById('mis-puntos').innerText = '0';
  document.getElementById('cronometro-jugador').innerText = `${tiempo}s`;
  document.getElementById('cronometro-host').innerText = `${tiempo}`;

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
  document.getElementById('titulo-ranking').innerText = "¡PARTIDA FINALIZADA!";
  mostrarSeccion('pantalla-ranking');
});

socket.on('errorMsg', (msg) => alert(msg));

// RENDER Y LOGICA DE CARTAS (Símbolo grande, Nombre abajo)
function renderBoard(deck) {
  const boardEl = document.getElementById('tablero');
  boardEl.innerHTML = '';

  deck.forEach((cardData, idx) => {
    const cardEl = document.createElement('div');
    cardEl.classList.add('card');
    cardEl.dataset.index = idx;

    cardEl.innerHTML = `
      <div class="symbol">?</div>
      <div class="type-tag">TAP</div>
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

// VALIDACIÓN FLEXIBLE DE PAREJAS (Al + 3)
function checkMatch() {
  const [c1, c2] = flippedCards;

  let isElement1 = c1.data.type === 'element';
  let isElement2 = c2.data.type === 'element';

  let matchSuccess = false;

  // Se necesita un Elemento y una Valencia
  if (isElement1 !== isElement2) {
    const elementCard = isElement1 ? c1 : c2;
    const valenceCard = isElement1 ? c2 : c1;

    const elementNumbers = extractNumbers(elementCard.data.valences);
    const selectedValenceNumbers = extractNumbers(valenceCard.data.content);

    // Comprueba si los números coinciden (ejemplo: '3' está dentro de '+3')
    matchSuccess = selectedValenceNumbers.some(num => elementNumbers.includes(num));
  }

  if (matchSuccess) {
    setTimeout(() => {
      c1.element.classList.add('matched');
      c2.element.classList.add('matched');

      miPuntaje += 100;
      document.getElementById('mis-puntos').innerText = miPuntaje;

      if (salaActual) {
        socket.emit('updateScore', { roomId: salaActual, points: miPuntaje });
      }

      flippedCards = [];
    }, 300);
  } else {
    setTimeout(() => {
      c1.element.classList.remove('flipped');
      c2.element.classList.remove('flipped');
      c1.element.querySelector('.symbol').innerText = '?';
      c1.element.querySelector('.type-tag').innerText = 'TAP';
      c2.element.querySelector('.symbol').innerText = '?';
      c2.element.querySelector('.type-tag').innerText = 'TAP';
      flippedCards = [];
    }, 700);
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
      <td><b>${p.name}</b></td>
      <td><span class="neon-green">${p.points} pts</span></td>
    `;
    tbody.appendChild(tr);
  });
}
