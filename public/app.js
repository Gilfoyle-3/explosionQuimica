const socket = io();

let currentRoomCode = null;
let myScore = 0;
let flippedCards = [];
let isBombMode = false;
let isProcessing = false;

function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
}

// CREADOR: Crear Sala
function handleCreateRoom() {
  const title = document.getElementById('create-title').value.trim() || "Concurso de Química";
  const category = document.getElementById('create-category').value;
  const duration = document.getElementById('create-duration').value;
  const elementCount = document.getElementById('create-elements').value;

  socket.emit('create_room', { title, duration, elementCount, category });
}

socket.on('room_created', ({ roomCode, title }) => {
  currentRoomCode = roomCode;
  document.getElementById('host-code-display').innerText = roomCode;
  switchView('view-host-lobby');
});

// JUGADOR: Unirse
function handleJoinRoom() {
  const name = document.getElementById('join-name').value.trim();
  const roomCode = document.getElementById('join-code').value.trim();

  if (!name || !roomCode) return alert("Ingresa tu nombre y código.");

  currentRoomCode = roomCode;
  socket.emit('join_room', { name, roomCode });
}

socket.on('joined_waiting_room', ({ title }) => {
  switchView('view-player-waiting');
});

socket.on('error_message', (msg) => alert(msg));

// Actualizar lista de jugadores
socket.on('update_player_list', (players) => {
  const list = document.getElementById('host-player-list');
  const count = document.getElementById('player-count');
  if (list && count) {
    count.innerText = players.length;
    list.innerHTML = players.map(p => `<li>${p.name}</li>`).join('');
  }
});

// CREADOR: Iniciar Juego
function handleStartGame() {
  socket.emit('start_game', currentRoomCode);
}

// Evento de Inicio Global
socket.on('game_started', ({ deck, duration }) => {
  if (document.getElementById('view-host-lobby').classList.contains('active')) {
    switchView('view-host-live');
  } else {
    switchView('view-player-game');
    renderBoard(deck);
  }
});

// Renderizar Tablero
function renderBoard(deck) {
  const grid = document.getElementById('board-grid');
  grid.innerHTML = '';

  deck.forEach((card, index) => {
    const el = document.createElement('div');
    el.classList.add('card');
    el.dataset.index = index;
    el.dataset.trioId = card.id;
    el.dataset.text = card.text;
    el.innerText = '?';
    el.onclick = () => handleCardClick(el, index);
    grid.appendChild(el);
  });
}

// Lógica de Selección y Bomba
function handleCardClick(cardEl, index) {
  if (isProcessing || cardEl.classList.contains('matched') || cardEl.classList.contains('flipped')) return;

  if (isBombMode) {
    executeBombEffect(index);
    isBombMode = false;
    document.getElementById('btn-bomba').style.background = 'var(--red)';
    return;
  }

  cardEl.classList.add('flipped');
  cardEl.innerText = cardEl.dataset.text;
  flippedCards.push(cardEl);

  if (flippedCards.length === 3) {
    checkTrio();
  }
}

function checkTrio() {
  isProcessing = true;
  const [c1, c2, c3] = flippedCards;

  if (c1.dataset.trioId === c2.dataset.trioId && c2.dataset.trioId === c3.dataset.trioId) {
    setTimeout(() => {
      c1.classList.add('matched');
      c2.classList.add('matched');
      c3.classList.add('matched');
      myScore += 15;
      document.getElementById('player-score').innerText = myScore;
      socket.emit('update_score', { roomCode: currentRoomCode, points: 15 });
      resetTurn();
    }, 400);
  } else {
    setTimeout(() => {
      flippedCards.forEach(c => {
        c.classList.remove('flipped');
        c.innerText = '?';
      });
      resetTurn();
    }, 1000);
  }
}

function resetTurn() {
  flippedCards = [];
  isProcessing = false;
}

// PODER: Tornado (Mezclar posiciones)
function triggerTornado() {
  socket.emit('use_tornado', currentRoomCode);
}

socket.on('apply_tornado', () => {
  const grid = document.getElementById('board-grid');
  if (!grid) return;

  const cards = Array.from(grid.children).filter(c => !c.classList.contains('matched'));
  cards.sort(() => 0.5 - Math.random());
  
  cards.forEach(c => grid.appendChild(c));
});

// PODER: Bomba (Revela 3x3 alrededor)
function armBombMode() {
  isBombMode = true;
  alert("💣 Modo Bomba Activado: Haz clic en cualquier casilla para ver las 9 cartas a su alrededor durante 2 segundos.");
  document.getElementById('btn-bomba').style.background = 'var(--gold)';
}

function executeBombEffect(centerIndex) {
  const allCards = Array.from(document.querySelectorAll('.card'));
  const columns = 4;

  const row = Math.floor(centerIndex / columns);
  const col = centerIndex % columns;

  allCards.forEach((c, idx) => {
    const r = Math.floor(idx / columns);
    const cCol = idx % columns;

    if (Math.abs(r - row) <= 1 && Math.abs(cCol - col) <= 1) {
      if (!c.classList.contains('matched')) {
        c.classList.add('bomb-highlight');
        c.innerText = c.dataset.text;
        
        setTimeout(() => {
          if (!c.classList.contains('flipped')) {
            c.innerText = '?';
          }
          c.classList.remove('bomb-highlight');
        }, 2000);
      }
    }
  });
}

// Temporizador y Leaderboard
socket.on('timer_tick', (seconds) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  const fmt = `${mins}:${secs}`;

  if (document.getElementById('host-timer')) document.getElementById('host-timer').innerText = fmt;
  if (document.getElementById('player-timer')) document.getElementById('player-timer').innerText = fmt;
});

socket.on('update_leaderboard', (players) => {
  const renderList = (elId) => {
    const el = document.getElementById(elId);
    if (el) {
      el.innerHTML = players.map((p, i) => `<li><span>#${i+1} ${p.name}</span><strong>${p.score} pts</strong></li>`).join('');
    }
  };
  renderList('host-live-leaderboard');
  renderList('player-live-leaderboard');
});

socket.on('game_over', (finalPlayers) => {
  alert("⌛ ¡Tiempo agotado! El concurso ha finalizado.");
});
