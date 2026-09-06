const socket = io();

let currentRoomCode = null;
let mySocketId = null;
let myScore = 0;
let flippedCards = [];
let isProcessing = false;

function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
}

function toggleSelectAll(master) {
  document.querySelectorAll('.cat-item').forEach(cb => cb.checked = master.checked);
}

// CREADOR: Crear sala
function handleCreateRoom() {
  const title = document.getElementById('create-title').value.trim() || "Concurso Química";
  const duration = document.getElementById('create-duration').value;
  const elementCount = document.getElementById('create-elements').value;

  const categories = [];
  if (document.getElementById('cat-todos').checked) {
    categories.push('todos');
  } else {
    document.querySelectorAll('.cat-item:checked').forEach(cb => categories.push(cb.value));
  }

  if (categories.length === 0) return alert("Selecciona al menos una familia.");

  socket.emit('create_room', { title, duration, elementCount, categories });
}

socket.on('room_created', ({ roomCode }) => {
  currentRoomCode = roomCode;
  document.getElementById('host-code-display').innerText = roomCode;
  switchView('view-host-lobby');
});

// JUGADOR: Unirse
function handleJoinRoom() {
  const name = document.getElementById('join-name').value.trim();
  const roomCode = document.getElementById('join-code').value.trim();

  if (!name || !roomCode) return alert("Ingresa tu nombre y el código.");

  currentRoomCode = roomCode;
  socket.emit('join_room', { name, roomCode });
}

socket.on('joined_waiting_room', ({ id }) => {
  mySocketId = id;
  switchView('view-player-waiting');
});

socket.on('error_message', (msg) => alert(msg));

// FUNCION CORE PARA DIBUJAR EL RANKING
function renderLeaderboard(players, targetListId, targetCountId) {
  const list = document.getElementById(targetListId);
  const count = document.getElementById(targetCountId);

  if (count) count.innerText = `${players.length} Jugadores`;
  if (!list) return;

  list.innerHTML = players.map((p, index) => {
    const rank = index + 1;
    let medal = `#${rank}`;
    let rankClass = '';

    if (rank === 1) { medal = '🥇'; rankClass = 'rank-1'; }
    else if (rank === 2) { medal = '🥈'; rankClass = 'rank-2'; }
    else if (rank === 3) { medal = '🥉'; rankClass = 'rank-3'; }

    const isMe = p.id === mySocketId ? 'is-me' : '';

    return `
      <li class="player-row ${rankClass} ${isMe}">
        <div class="player-info">
          <span class="player-rank">${medal}</span>
          <span class="player-name">${p.name} ${p.id === mySocketId ? '(Tú)' : ''}</span>
        </div>
        <span class="player-score">${p.score} pts</span>
      </li>
    `;
  }).join('');
}

socket.on('update_player_list', (players) => {
  renderLeaderboard(players, 'host-player-list', 'player-count');
});

socket.on('update_leaderboard', (players) => {
  renderLeaderboard(players, 'host-live-leaderboard', 'host-count');
  renderLeaderboard(players, 'player-live-leaderboard', 'game-player-count');
});

function handleStartGame() {
  socket.emit('start_game', currentRoomCode);
}

socket.on('game_started', ({ deck }) => {
  if (document.getElementById('view-host-lobby').classList.contains('active')) {
    switchView('view-host-live');
  } else {
    switchView('view-player-game');
    renderBoard(deck);
  }
});

// TABLERO Y PODERES
function renderBoard(deck) {
  const grid = document.getElementById('board-grid');
  grid.innerHTML = '';

  deck.forEach((card, index) => {
    const el = document.createElement('div');
    el.classList.add('card');
    el.dataset.index = index;
    el.dataset.trioId = card.id;
    el.dataset.text = card.text;
    el.dataset.isPower = card.isPower ? "true" : "false";
    if (card.isPower) el.dataset.powerType = card.powerType;

    el.innerText = '?';
    el.onclick = () => handleCardClick(el, index);
    grid.appendChild(el);
  });
}

function handleCardClick(cardEl, index) {
  if (isProcessing || cardEl.classList.contains('matched') || cardEl.classList.contains('flipped')) return;

  // CARTA ESPECIAL DE PODER
  if (cardEl.dataset.isPower === "true") {
    cardEl.classList.add('flipped', 'power-card');
    cardEl.innerText = cardEl.dataset.text;

    setTimeout(() => {
      if (cardEl.dataset.powerType === 'tornado') {
        alert("🌪️ ¡TORNADO! Se reordenan todas las cartas no resueltas.");
        socket.emit('trigger_global_tornado', currentRoomCode);
      } else if (cardEl.dataset.powerType === 'bomba') {
        alert("💣 ¡BOMBA! Revelando área 3x3 por 2 segundos.");
        executeBombEffect(index);
      }
      cardEl.classList.add('matched');
    }, 400);

    return;
  }

  // TRIOS REGULARES
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
    }, 900);
  }
}

function resetTurn() {
  flippedCards = [];
  isProcessing = false;
}

socket.on('apply_tornado', () => {
  const grid = document.getElementById('board-grid');
  if (!grid) return;

  const cards = Array.from(grid.children).filter(c => !c.classList.contains('matched'));
  cards.sort(() => 0.5 - Math.random());
  cards.forEach(c => grid.appendChild(c));
});

function executeBombEffect(centerIndex) {
  const allCards = Array.from(document.querySelectorAll('.card'));
  const columns = window.innerWidth <= 768 ? 3 : 4;

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

socket.on('timer_tick', (seconds) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  const fmt = `${mins}:${secs}`;

  if (document.getElementById('host-timer')) document.getElementById('host-timer').innerText = fmt;
  if (document.getElementById('player-timer')) document.getElementById('player-timer').innerText = fmt;
});

socket.on('game_over', (finalPlayers) => {
  alert("⌛ ¡El tiempo del concurso ha terminado!");
});
