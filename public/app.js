const socket = io();

let currentRoomCode = null;
let mySocketId = null;
let isHostUser = false;
let myScore = 0;
let flippedCards = [];
let isProcessing = false;

const categoriesConfig = [
  { id: "mono", label: "🟢 Monovalentes (+1)", count: 8 },
  { id: "di", label: "🔵 Divalentes (+2)", count: 8 },
  { id: "tri", label: "🟣 Trivalentes (+3)", count: 9 },
  { id: "variable", label: "🟠 Valencia Variable", count: 9 },
  { id: "tetra", label: "🟡 Di-Tetravalentes (+2, +4)", count: 6 },
  { id: "polivalente", label: "🔴 Polivalentes", count: 14 }
];

window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('elements-selector-container');
  if (container) {
    container.innerHTML = categoriesConfig.map(cat => `
      <label class="element-checkbox-item">
        <input type="checkbox" class="cat-checkbox" value="${cat.id}" checked onchange="updateMaxElementLimit()"> ${cat.label}
      </label>
    `).join('');
    updateMaxElementLimit();
  }
});

function updateMaxElementLimit() {
  const limitInput = document.getElementById('create-limit');
  if (!limitInput) return;

  let maxTotal = 0;
  document.querySelectorAll('.cat-checkbox:checked').forEach(cb => {
    const found = categoriesConfig.find(c => c.id === cb.value);
    if (found) maxTotal += found.count;
  });

  limitInput.max = maxTotal || 1;
  if (parseInt(limitInput.value) > maxTotal) {
    limitInput.value = maxTotal;
  }
}

function toggleAllCategories(status) {
  document.querySelectorAll('.cat-checkbox').forEach(cb => cb.checked = status);
  updateMaxElementLimit();
}

function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
}

function handleCreateRoom() {
  const title = document.getElementById('create-title').value.trim() || "Nodo_Química";
  const duration = document.getElementById('create-duration').value;
  const elementLimit = document.getElementById('create-limit') ? document.getElementById('create-limit').value : 16;
  
  const selectedCategories = [];
  document.querySelectorAll('.cat-checkbox:checked').forEach(cb => {
    selectedCategories.push(cb.value);
  });

  if (selectedCategories.length === 0) {
    return alert("⚠️ Debes seleccionar al menos una categoría de valencia.");
  }

  isHostUser = true;
  socket.emit('create_room', { title, duration, selectedCategories, elementLimit });
}

socket.on('room_created', ({ roomCode }) => {
  currentRoomCode = roomCode;
  document.getElementById('host-code-display').innerText = roomCode;
  switchView('view-host-lobby');
});

function handleJoinRoom() {
  const name = document.getElementById('join-name').value.trim();
  const roomCode = document.getElementById('join-code').value.trim();

  if (!name || !roomCode) return alert("⚠️ Ingresa tu nickname y código.");

  isHostUser = false;
  currentRoomCode = roomCode;
  socket.emit('join_room', { name, roomCode });
}

socket.on('joined_waiting_room', ({ id }) => {
  mySocketId = id;
  switchView('view-player-waiting');
  
  const waitingView = document.getElementById('view-player-waiting');
  if (waitingView && !document.getElementById('game-rules-box')) {
    const rulesBox = document.createElement('div');
    rulesBox.id = 'game-rules-box';
    rulesBox.style.cssText = "margin-top: 20px; padding: 15px; background: rgba(0, 243, 255, 0.05); border: 1px dashed var(--cyber-cyan); text-align: left; font-size: 0.9rem; color: var(--text-muted);";
    rulesBox.innerHTML = `
      <h3 style="color: var(--cyber-cyan); margin-bottom: 8px;">📜 REGLAS Y MECÁNICAS DEL CONCURSO</h3>
      <p style="margin-bottom: 6px;">• <b>Cartas de Trío:</b> Cada elemento químico se divide en 3 cartas independientes: <b>Nombre</b>, <b>Símbolo</b> y <b>Valencia</b>.</p>
      <p style="margin-bottom: 6px;">• <b>Objetivo:</b> Voltea 3 cartas que correspondan exactamente al mismo elemento para ganar puntos (+15 PTS).</p>
      <p style="margin-bottom: 6px;">• <b>Cartas Especiales:</b> 🌪️ <b>Tornado</b> (reordena el tablero) y 💣 <b>Bomba</b> (revela un sector 3x3 por unos segundos).</p>
      <p style="color: var(--cyber-yellow); margin-top: 8px; text-align: center;">⏳ Esperando a que el creador del concurso inicie la partida...</p>
    `;
    waitingView.appendChild(rulesBox);
  }
});

socket.on('error_message', (msg) => alert(msg));

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

    const isMe = p.id === mySocketId ? 'is-me' : '';

    return `
      <li class="player-row ${rankClass} ${isMe}">
        <div class="player-info">
          <span class="player-rank">${medal}</span>
          <span class="player-name">${p.name} ${p.id === mySocketId ? '(TÚ)' : ''}</span>
        </div>
        <span class="player-score">${p.score} PTS</span>
      </li>
    `;
  }).join('');
}

socket.on('update_player_list', (players) => {
  renderLeaderboard(players, 'host-player-list', 'player-count');
});

socket.on('update_leaderboard', (players) => {
  renderLeaderboard(players, 'host-live-leaderboard', 'player-count');
  renderLeaderboard(players, 'player-live-leaderboard', 'game-player-count');
});

function handleStartGame() {
  socket.emit('start_game', currentRoomCode);
}

socket.on('game_started', ({ deck }) => {
  myScore = 0;
  if (isHostUser || document.getElementById('view-host-lobby').classList.contains('active')) {
    switchView('view-host-live');
  } else {
    switchView('view-player-game');
    renderBoard(deck);
  }
});

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

    el.innerText = '[ ? ]';
    el.onclick = () => handleCardClick(el, index);
    grid.appendChild(el);
  });
}

function handleCardClick(cardEl, index) {
  if (isProcessing || cardEl.classList.contains('matched') || cardEl.classList.contains('flipped')) return;

  if (cardEl.dataset.isPower === "true") {
    cardEl.classList.add('flipped', 'power-card');
    cardEl.innerText = cardEl.dataset.text;

    setTimeout(() => {
      if (cardEl.dataset.powerType === 'tornado') {
        socket.emit('trigger_global_tornado', currentRoomCode);
      } else if (cardEl.dataset.powerType === 'bomba') {
        executeBombEffect(index);
      }
      cardEl.classList.add('matched');
    }, 200);

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
    }, 200);
  } else {
    setTimeout(() => {
      flippedCards.forEach(c => {
        c.classList.remove('flipped');
        c.innerText = '[ ? ]';
      });
      resetTurn();
    }, 450);
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
          if (!c.classList.contains('flipped')) c.innerText = '[ ? ]';
          c.classList.remove('bomb-highlight');
        }, 1200);
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

socket.on('game_over', (players) => {
  if (isHostUser) {
    const hostLive = document.getElementById('view-host-live');
    if (hostLive) {
      hostLive.innerHTML = `
        <div style="text-align: center; padding: 50px; background: #030712; border: 1px solid var(--cyber-cyan); max-width: 600px; margin: 40px auto;">
          <h2 style="color: var(--cyber-yellow); font-size: 2rem; margin-bottom: 15px;">🏆 ¡CONCURSO FINALIZADO!</h2>
          <p style="color: var(--text-muted); margin-bottom: 25px;">El tiempo ha terminado. Gracias por organizar la partida.</p>
          <button class="btn btn-cyan btn-large" onclick="window.location.reload()">◀ VOLVER AL INICIO</button>
        </div>
      `;
    }
  } else {
    const playerGame = document.getElementById('view-player-game');
    if (playerGame) {
      const myRankData = players.find(p => p.id === mySocketId);
      const myRankIndex = players.findIndex(p => p.id === mySocketId) + 1;
      
      playerGame.innerHTML = `
        <div style="text-align: center; padding: 30px; background: #030712; border: 1px solid var(--cyber-cyan); max-width: 600px; margin: 20px auto;">
          <h2 style="color: var(--cyber-yellow); font-size: 1.8rem; margin-bottom: 10px;">🏁 ¡PARTIDA TERMINADA!</h2>
          <p style="color: var(--text-muted); font-size: 1.1rem; margin-bottom: 15px;">Tu posición final: <b style="color: var(--cyber-cyan);">#${myRankIndex}</b> con <b style="color: var(--cyber-yellow);">${myRankData ? myRankData.score : 0} PTS</b></p>
          
          <div style="margin: 20px 0; max-height: 250px; overflow-y: auto; text-align: left; background: rgba(0,0,0,0.3); padding: 10px; border: 1px solid rgba(0,243,255,0.2);">
            <h4 style="color: var(--cyber-cyan); margin-bottom: 10px; text-align: center;">🏆 PODIO Y RANKING FINAL</h4>
            <ul id="final-ranking-list" style="list-style: none; padding: 0;">
              ${players.map((p, idx) => `
                <li style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); color: ${p.id === mySocketId ? 'var(--cyber-yellow)' : 'var(--text-main)'};">
                  <span>#${idx + 1} - ${p.name}</span>
                  <span><b>${p.score} PTS</b></span>
                </li>
              `).join('')}
            </ul>
          </div>
          
          <button class="btn btn-cyan btn-large" onclick="window.location.reload()" style="margin-top: 15px;">◀ SALIR AL INICIO</button>
        </div>
      `;
    }
  }
});
