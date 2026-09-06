const socket = io();

// ==========================================
// REFERENCIAS AL DOM
// ==========================================
const seccionLogin = document.getElementById('seccion-login');
const seccionLobby = document.getElementById('seccion-lobby');
const seccionJuego = document.getElementById('seccion-juego');

// Controles de Login y Selección de Elementos
const btnElementOpts = document.querySelectorAll('.btn-element-opt');
const inputNumElementos = document.getElementById('select-num-elementos');
const btnCrearSala = document.getElementById('btn-crear-sala');
const btnUnirse = document.getElementById('btn-unirse');
const inputNickname = document.getElementById('input-nickname');
const inputCodigo = document.getElementById('input-codigo');
const mensajeError = document.getElementById('mensaje-error');

// Controles del Lobby
const lobbyCodigoDisplay = document.getElementById('lobby-codigo-display');
const listaJugadores = document.getElementById('lista-jugadores');
const panelAnfitrionControles = document.getElementById('panel-anfitrion-controles');
const pantallaEsperaConcursante = document.getElementById('pantalla-espera-concursante');
const btnIniciarConcurso = document.getElementById('btn-iniciar-concurso');

// Controles del Juego
const juegoCodigoDisplay = document.getElementById('juego-codigo-display');
const leaderboard = document.getElementById('leaderboard');
const tableroCartas = document.getElementById('tablero-cartas');

// Estado local
let miCodigoSala = null;
let esAnfitrion = false;
let bloqueado = false;

// ==========================================
// SELECCIÓN VISUAL DE ELEMENTOS (4, 8, 12, 16)
// ==========================================
btnElementOpts.forEach(btn => {
  btn.addEventListener('click', () => {
    btnElementOpts.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    inputNumElementos.value = btn.dataset.val;
  });
});

// ==========================================
// 1. CREAR SALA (ANFITRIÓN)
// ==========================================
btnCrearSala.addEventListener('click', () => {
  const numElementos = parseInt(inputNumElementos.value, 10) || 8;
  socket.emit('crear_sala', { numElementos });
});

socket.on('sala_creada', ({ codigoSala }) => {
  miCodigoSala = codigoSala;
  esAnfitrion = true;

  seccionLogin.classList.add('hidden');
  seccionLobby.classList.remove('hidden');
  lobbyCodigoDisplay.textContent = codigoSala;

  panelAnfitrionControles.classList.remove('hidden');
  pantallaEsperaConcursante.classList.add('hidden');
  mensajeError.textContent = '';
});

// ==========================================
// 2. UNIRSE A SALA (CONCURSANTE)
// ==========================================
btnUnirse.addEventListener('click', () => {
  const nickname = inputNickname.value.trim();
  const codigoSala = inputCodigo.value.trim().toUpperCase();

  if (!nickname || !codigoSala) {
    mensajeError.textContent = 'Ingresa apodo y código de sala.';
    return;
  }

  socket.emit('unirse_sala', { codigoSala, nickname });
});

socket.on('unido_exitosamente', ({ codigoSala }) => {
  miCodigoSala = codigoSala;
  esAnfitrion = false;

  seccionLogin.classList.add('hidden');
  seccionLobby.classList.remove('hidden');
  lobbyCodigoDisplay.textContent = codigoSala;

  panelAnfitrionControles.classList.add('hidden');
  pantallaEsperaConcursante.classList.remove('hidden');
  mensajeError.textContent = '';
});

socket.on('error_login', (msg) => {
  mensajeError.textContent = msg;
});

// ==========================================
// 3. ACTUALIZACIÓN DE LOBBY EN TIEMPO REAL
// ==========================================
socket.on('actualizar_lista_espera', ({ jugadores }) => {
  listaJugadores.innerHTML = '';
  jugadores.forEach((j) => {
    const li = document.createElement('li');
    li.className = 'jugador-item';
    li.textContent = `🎮 ${j.nickname}`;
    listaJugadores.appendChild(li);
  });
});

// ==========================================
// 4. INICIAR CONCURSO
// ==========================================
btnIniciarConcurso.addEventListener('click', () => {
  if (miCodigoSala && esAnfitrion) {
    socket.emit('iniciar_concurso', { codigoSala: miCodigoSala });
  }
});

socket.on('concurso_iniciado', ({ tablero, puntuaciones }) => {
  seccionLobby.classList.add('hidden');
  seccionJuego.classList.remove('hidden');
  juegoCodigoDisplay.textContent = miCodigoSala;

  renderizarTablero(tablero);
  actualizarLeaderboard(puntuaciones);
});

socket.on('error_inicio', (msg) => {
  alert(msg);
});

// ==========================================
// 5. RENDERIZADO DEL TABLERO
// ==========================================
function renderizarTablero(cartas) {
  tableroCartas.innerHTML = '';
  
  cartas.forEach((carta) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'carta';
    if (carta.revelada) cardEl.classList.add('revelada');
    if (carta.emparejada) cardEl.classList.add('emparejada');

    if (carta.revelada || carta.emparejada) {
      cardEl.innerHTML = `
        <div class="contenido-carta ${carta.tipo}">
          <span class="tipo-tag">${carta.tipo.toUpperCase()}</span>
          <span class="texto-principal">${carta.contenido}</span>
        </div>
      `;
    } else {
      cardEl.innerHTML = `<div class="reverso">🧪</div>`;
    }

    cardEl.addEventListener('click', () => {
      if (bloqueado || carta.revelada || carta.emparejada) return;
      socket.emit('seleccionar_carta', { codigoSala: miCodigoSala, cartaId: carta.id });
    });

    tableroCartas.appendChild(cardEl);
  });
}

socket.on('actualizar_tablero', ({ tablero }) => {
  renderizarTablero(tablero);
});

socket.on('actualizar_puntuaciones', ({ puntuaciones }) => {
  actualizarLeaderboard(puntuaciones);
});

function actualizarLeaderboard(puntuaciones) {
  leaderboard.innerHTML = '<strong>Clasificación:</strong> ';
  const listaOrdenada = Object.values(puntuaciones).sort((a, b) => b.puntos - a.puntos);

  listaOrdenada.forEach((p, idx) => {
    const item = document.createElement('span');
    item.className = 'jugador-score';
    item.textContent = `#${idx + 1} ${p.nickname}: ${p.puntos} pts | `;
    leaderboard.appendChild(item);
  });
}
