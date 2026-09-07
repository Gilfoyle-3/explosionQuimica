const socket = io();

/**
 * Estado centralizado del cliente.
 * Antes eran variables sueltas; agruparlas evita variables globales
 * dispersas y hace más fácil resetear todo entre partidas.
 */
const state = {
  roomCode: null,
  socketId: null,
  isHost: false,
  score: 0,
  flippedCards: [],
  isProcessing: false,
  isSubmitting: false // evita doble-click / doble emit en create/join/start
};

const categoriesConfig = [
  { id: "mono", label: "🟢 Monovalentes (+1)", count: 8 },
  { id: "di", label: "🔵 Divalentes (+2)", count: 8 },
  { id: "tri", label: "🟣 Trivalentes (+3)", count: 9 },
  { id: "variable", label: "🟠 Valencia Variable", count: 9 },
  { id: "tetra", label: "🟡 Di-Tetravalentes (+2, +4)", count: 6 },
  { id: "polivalente", label: "🔴 Polivalentes", count: 14 }
];

/* ------------------------- Utilidades ------------------------- */

// Escapa cualquier texto que venga de otro usuario (nombres, títulos)
// antes de insertarlo con innerHTML, para evitar XSS.
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const secs = (totalSeconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

/* ------------------------- Inicialización ------------------------- */

window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('elements-selector-container');
  if (container) {
    container.innerHTML = categoriesConfig.map(cat => `
      <div class="element-card-checkbox selected" onclick="toggleCategoryCard(this, '${cat.id}')">
        <span>${cat.label}</span>
        <input type="checkbox" class="cat-checkbox" value="${cat.id}" checked onclick="event.stopPropagation()">
      </div>
    `).join('');
    updateMaxElementLimit();
  }

  // Delegación de eventos en el tablero: se registra UNA sola vez,
  // así renderBoard() puede llamarse varias veces (partidas nuevas)
  // sin ir acumulando listeners duplicados en cada carta.
  const grid = document.getElementById('board-grid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const cardEl = e.target.closest('.card');
      if (!cardEl || !grid.contains(cardEl)) return;
      const index = parseInt(cardEl.dataset.index, 10);
      handleCardClick(cardEl, index);
    });
  }
});

/* ------------------------- Selección de categorías ------------------------- */

function toggleCategoryCard(cardEl, catId) {
  const checkbox = cardEl.querySelector('.cat-checkbox');
  checkbox.checked = !checkbox.checked;
  cardEl.classList.toggle('selected', checkbox.checked);
  updateMaxElementLimit();
}

function updateMaxElementLimit() {
  const limitInput = document.getElementById('create-limit');
  if (!limitInput) return;

  let maxTotal = 0;
  document.querySelectorAll('.cat-checkbox:checked').forEach(cb => {
    const found = categoriesConfig.find(c => c.id === cb.value);
    if (found) maxTotal += found.count;
  });

  limitInput.max = maxTotal || 1;
  const current = parseInt(limitInput.value, 10) || 0;
  if (current > maxTotal) {
    limitInput.value = maxTotal;
  }
}

function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(viewId);
  if (target) target.classList.add('active');
}

/* ------------------------- Crear sala ------------------------- */

function handleCreateRoom() {
  if (state.isSubmitting) return; // evita doble submit por doble click
  const title = document.getElementById('create-title').value.trim() || "Nodo_Química";

  // Antes se enviaban duration/elementLimit como strings sin validar.
  const durationRaw = parseInt(document.getElementById('create-duration').value, 10);
  const duration = clamp(Number.isFinite(durationRaw) ? durationRaw : 5, 1, 60);

  const selectedCategories = [];
  document.querySelectorAll('.cat-checkbox:checked').forEach(cb => {
    selectedCategories.push(cb.value);
  });

  if (selectedCategories.length === 0) {
    return alert("⚠️ Debes seleccionar al menos una categoría de valencia.");
  }

  let maxTotal = 0;
  selectedCategories.forEach(id => {
    const found = categoriesConfig.find(c => c.id === id);
    if (found) maxTotal += found.count;
  });

  const limitInput = document.getElementById('create-limit');
  const limitRaw = limitInput ? parseInt(limitInput.value, 10) : 16;
  // Se necesita al menos un trío completo (3 cartas) para poder jugar.
  const elementLimit = clamp(Number.isFinite(limitRaw) ? limitRaw : maxTotal, 3, maxTotal || 3);

  state.isHost = true;
  state.isSubmitting = true;
  socket.emit('create_room', { title, duration, selectedCategories, elementLimit });
}

socket.on('room_created', ({ roomCode }) => {
  state.isSubmitting = false;
  state.roomCode = roomCode;
  document.getElementById('host-code-display').innerText = roomCode;
  switchView('view-host-lobby');
});

socket.on('error_message', (msg) => {
  state.isSubmitting = false;
  alert(msg);
});

/* ------------------------- Unirse a sala ------------------------- */

function handleJoinRoom() {
  if (state.isSubmitting) return;

  const name = document.getElementById('join-name').value.trim().slice(0, 20);
  // Los códigos de sala normalmente son case-insensitive: normalizamos.
  const roomCode = document.getElementById('join-code').value.trim().toUpperCase();

  if (!name || !roomCode) return alert("⚠️ Ingresa tu nickname y código.");

  state.isHost = false;
  state.roomCode = roomCode;
  state.isSubmitting = true;
  socket.emit('join_room', { name, roomCode });
}

socket.on('joined_waiting_room', ({ id }) => {
  state.isSubmitting = false;
  state.socketId = id;
  switchView('view-player-waiting');

  const waitingView = document.getElementById('view-player-waiting');
  if (waitingView && !document.getElementById('game-rules-box')) {
    const rulesBox = document.createElement('div');
    rulesBox.id = 'game-rules-box';
    rulesBox.style.cssText = "margin-top: 20px; padding: 15px; background: rgba(0, 243, 255, 0.05); border: 1px dashed var(--cyber-cyan); text-align: left; font-size: 0.9rem; color: var(--text-muted);";
    rulesBox.innerHTML = `
      <h3 style="color: var(--cyber-cyan); margin-bottom: 8px;">📜 REGLAS Y MECÁNICAS DEL CONCURSO</h3>
      <p style="margin-bottom: 6px;">• <b>Cartas de Trío:</b> Cada elemento se divide en 3 cartas independientes: <b>Nombre</b>, <b>Símbolo</b> y <b>Valencia</b>.</p>
      <p style="margin-bottom: 6px;">• <b>Objetivo:</b> Voltea 3 cartas que correspondan al mismo elemento para ganar puntos (+15 PTS).</p>
      <p style="margin-bottom: 6px;">• <b>Cartas Especiales:</b> 🌪️ <b>Tornado</b> (mezcla el tablero) y 💣 <b>Bomba</b> (revela un sector 3x3 secuencialmente).</p>
      <p style="color: var(--cyber-yellow); margin-top: 8px; text-align: center;">⏳ Esperando a que el creador del concurso inicie la partida...</p>
    `;
    waitingView.appendChild(rulesBox);
  }
});

/* ------------------------- Leaderboard ------------------------- */

function renderLeaderboard(players, targetListId, targetCountId) {
  const list = document.getElementById(targetListId);
  const count = document.getElementById(targetCountId);

  if (count) count.innerText = players.length;
  if (!list) return;

  list.innerHTML = players.map((p, index) => {
    const rank = index + 1;
    let medal = `#${rank}`;
    let rankClass = '';

    if (rank === 1) { medal = '🥇'; rankClass = 'rank-1'; }
    else if (rank === 2) { medal = '🥈'; rankClass = 'rank-2'; }
    else if (rank === 3) { medal = '🥉'; rankClass = 'rank-3'; }

    const isMe = p.id === state.socketId ? 'is-me' : '';
    // p.name viene de otro jugador: SIEMPRE se escapa antes de insertarlo.
    const safeName = escapeHtml(p.name);
    const safeScore = Number.isFinite(p.score) ? p.score : 0;

    return `
      <li class="player-row ${rankClass} ${isMe}">
        <div class="player-info">
          <span class="player-rank">${medal}</span>
          <span class="player-name">${safeName} ${p.id === state.socketId ? '(TÚ)' : ''}</span>
        </div>
        <span class="player-score">${safeScore} PTS</span>
      </li>
    `;
  }).join('');
}

socket.on('update_player_list', (players) => {
  renderLeaderboard(players, 'host-player-list', 'player-count');
});

socket.on('update_leaderboard', (players) => {
  renderLeaderboard(players, 'host-live-leaderboard', 'host-live-count');
});

/* ------------------------- Inicio de partida ------------------------- */

function handleStartGame() {
  if (state.isSubmitting) return;
  state.isSubmitting = true;
  socket.emit('start_game', state.roomCode);
}

socket.on('game_started', ({ deck }) => {
  state.isSubmitting = false;
  state.score = 0;
  state.flippedCards = [];
  state.isProcessing = false;

  // Antes se comprobaba si la vista de lobby de host seguía activa,
  // lo cual es frágil (depende del DOM). Basta con el flag isHost.
  if (state.isHost) {
    switchView('view-host-live');
  } else {
    switchView('view-player-game');
    renderBoard(deck);
  }
});

function renderBoard(deck) {
  const grid = document.getElementById('board-grid');
  if (!grid) return;
  grid.innerHTML = '';

  deck.forEach((card, index) => {
    const el = document.createElement('div');
    el.classList.add('card');
    el.dataset.index = index;
    el.dataset.trioId = card.id;
    el.dataset.text = card.text;
    el.dataset.isPower = card.isPower ? "true" : "false";
    if (card.isPower) el.dataset.powerType = card.powerType;

    // Accesibilidad básica: las cartas ahora son enfocables/anunciables.
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', 'Carta oculta');

    el.innerText = '[ ? ]';
    grid.appendChild(el);
  });
  // El click ya se maneja por delegación de eventos (ver DOMContentLoaded).
}

/* ------------------------- Lógica de cartas ------------------------- */

function handleCardClick(cardEl, index) {
  if (state.isProcessing || cardEl.classList.contains('matched') || cardEl.classList.contains('flipped')) {
    return;
  }

  const isPower = cardEl.dataset.isPower === "true";

  if (isPower) {
    // FIX: antes se podía activar una carta especial en medio de un intento
    // de trío (con 1 o 2 cartas normales ya volteadas), dejando esas cartas
    // "colgadas" en pantalla y rompiendo el conteo de checkTrio(). Ahora se
    // bloquea mientras haya un intento de trío en curso.
    if (state.flippedCards.length > 0) return;

    cardEl.classList.add('flipped', 'power-card');
    cardEl.innerText = cardEl.dataset.text;
    cardEl.setAttribute('aria-label', cardEl.dataset.text);

    // FIX: antes no había isProcessing durante la animación de la carta
    // especial, permitiendo voltear otras cartas a mitad de la resolución.
    state.isProcessing = true;

    setTimeout(() => {
      if (cardEl.dataset.powerType === 'tornado') {
        socket.emit('trigger_global_tornado', state.roomCode);
      } else if (cardEl.dataset.powerType === 'bomba') {
        socket.emit('trigger_global_bomb', { roomCode: state.roomCode, centerIndex: index });
      }
      cardEl.classList.add('matched');
      state.isProcessing = false;
    }, 200);

    return;
  }

  cardEl.classList.add('flipped');
  cardEl.innerText = cardEl.dataset.text;
  cardEl.setAttribute('aria-label', cardEl.dataset.text);
  state.flippedCards.push(cardEl);

  if (state.flippedCards.length === 3) {
    checkTrio();
  }
}

function checkTrio() {
  state.isProcessing = true;
  const [c1, c2, c3] = state.flippedCards;

  const isMatch = c1.dataset.trioId === c2.dataset.trioId && c2.dataset.trioId === c3.dataset.trioId;

  if (isMatch) {
    setTimeout(() => {
      [c1, c2, c3].forEach(c => c.classList.add('matched'));
      state.score += 15;
      const scoreEl = document.getElementById('player-score');
      if (scoreEl) scoreEl.innerText = state.score;
      socket.emit('update_score', { roomCode: state.roomCode, points: 15 });
      resetTurn();
    }, 200);
  } else {
    setTimeout(() => {
      state.flippedCards.forEach(c => {
        c.classList.remove('flipped');
        c.innerText = '[ ? ]';
        c.setAttribute('aria-label', 'Carta oculta');
      });
      resetTurn();
    }, 450);
  }
}

function resetTurn() {
  state.flippedCards = [];
  state.isProcessing = false;
}

/* ------------------------- Poderes globales ------------------------- */

socket.on('apply_tornado', () => {
  const grid = document.getElementById('board-grid');
  if (!grid) return;
  const cards = Array.from(grid.children).filter(c => !c.classList.contains('matched'));
  cards.sort(() => 0.5 - Math.random());
  cards.forEach(c => grid.appendChild(c));
});

// Antes el número de columnas se adivinaba con window.innerWidth <= 600,
// que se desincroniza fácilmente si cambia el CSS. Ahora se lee la
// cuadrícula real, con ese cálculo como respaldo por si acaso.
function getGridColumns(grid) {
  const template = window.getComputedStyle(grid).getPropertyValue('grid-template-columns');
  if (template && template !== 'none') {
    const columns = template.trim().split(/\s+/).filter(Boolean).length;
    if (columns > 0) return columns;
  }
  return window.innerWidth <= 600 ? 3 : 4;
}

socket.on('apply_bomb', (centerIndex) => {
  const grid = document.getElementById('board-grid');
  if (!grid) return;

  const allCards = Array.from(grid.querySelectorAll('.card'));
  const columns = getGridColumns(grid);
  const row = Math.floor(centerIndex / columns);
  const col = centerIndex % columns;

  const targetCards = allCards.filter((c, idx) => {
    const r = Math.floor(idx / columns);
    const cCol = idx % columns;
    return Math.abs(r - row) <= 1 && Math.abs(cCol - col) <= 1 && !c.classList.contains('matched');
  });

  targetCards.forEach((c, index) => {
    setTimeout(() => {
      c.classList.add('bomb-highlight');
      c.innerText = c.dataset.text;

      setTimeout(() => {
        if (!c.classList.contains('flipped')) {
          c.innerText = '[ ? ]';
        }
        c.classList.remove('bomb-highlight');
      }, 2000);
    }, index * 250);
  });
});

/* ------------------------- Temporizador ------------------------- */

socket.on('timer_tick', (seconds) => {
  const fmt = formatTime(seconds);
  const hostTimer = document.getElementById('host-timer');
  const playerTimer = document.getElementById('player-timer');
  if (hostTimer) hostTimer.innerText = fmt;
  if (playerTimer) playerTimer.innerText = fmt;
});

/* ------------------------- Fin de partida ------------------------- */

socket.on('game_over', (players) => {
  // Transicionar tanto host como jugadores al panel de resultados final
  // con el ranking y botón de salida.
  switchView('view-host-live');

  const titleEl = document.getElementById('host-panel-title');
  const timerEl = document.getElementById('host-timer');
  const actionsEl = document.getElementById('host-game-over-actions');
  if (titleEl) titleEl.innerText = "🏆 ¡CONCURSO FINALIZADO!";
  if (timerEl) timerEl.innerText = "00:00";
  if (actionsEl) actionsEl.style.display = 'block';

  renderLeaderboard(players, 'host-live-leaderboard', 'host-live-count');

  if (!state.isHost) {
    const myRankData = players.find(p => p.id === state.socketId);
    const myRankIndex = players.findIndex(p => p.id === state.socketId) + 1;

    const hostLiveBox = document.querySelector('#view-host-live .card-box');
    if (hostLiveBox && !document.getElementById('player-final-notice')) {
      const notice = document.createElement('div');
      notice.id = 'player-final-notice';
      notice.style.cssText = "margin-bottom: 15px; padding: 10px; background: rgba(0, 243, 255, 0.08); border: 1px solid var(--cyber-cyan); text-align: center; border-radius: 6px;";
      const safeScore = myRankData ? myRankData.score : 0;
      notice.innerHTML = `Tu posición final: <b style="color: var(--cyber-cyan);">#${myRankIndex}</b> con <b style="color: var(--cyber-yellow);">${safeScore} PTS</b>`;
      const playersContainer = hostLiveBox.querySelector('.players-container');
      if (playersContainer) {
        hostLiveBox.insertBefore(notice, playersContainer);
      } else {
        hostLiveBox.appendChild(notice);
      }
    }
  }
});

/* ------------------------- Conexión ------------------------- */

socket.on('connect_error', () => {
  console.error('No se pudo conectar al servidor.');
});

socket.on('disconnect', (reason) => {
  console.warn('Desconectado del servidor:', reason);
});
