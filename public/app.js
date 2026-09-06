const socket = io();

// ==========================================
// REFERENCIAS AL DOM
// ==========================================
const seccionLogin = document.getElementById('seccion-login');
const seccionLobby = document.getElementById('seccion-lobby');
const seccionJuego = document.getElementById('seccion-juego');

// Controles de Login y Creación
const btnCrearSala = document.getElementById('btn-crear-sala');
const selectNumElementos = document.getElementById('select-num-elementos');
const btnUnirse = document.getElementById('btn-unirse');
const inputNickname = document.getElementById('input-nickname');
const inputCodigo = document.getElementById('input-codigo');
const mensajeError = document.getElementById('mensaje-error');

// Controles de Sala de Espera (Lobby)
const lobbyCodigoDisplay = document.getElementById('lobby-codigo-display');
const listaJugadores = document.getElementById('lista-jugadores');
const panelAnfitrionControles = document.getElementById('panel-anfitrion-controles');
const pantallaEsperaConcursante = document.getElementById('pantalla-espera-concursante');
const btnIniciarConcurso = document.getElementById('btn-iniciar-concurso');

// Controles del Juego en Vivo
const juegoCodigoDisplay = document.getElementById('juego-codigo-display');
const leaderboard = document.getElementById('leaderboard');
const tableroCartas = document.getElementById('tablero-cartas');

// Estado local
let miCodigoSala = null;
let esAnfitrion = false;
let bloqueado = false;

// ==========================================
// 1. CREAR SALA (ANFITRIÓN CON SELECCIÓN)
// ==========================================
btnCrearSala.addEventListener('click', () => {
  // Captura la cantidad de elementos seleccionada por el anfitrión
  const numElementos = parseInt(selectNumElementos.value, 10) || 8;
  socket.emit('crear_sala', { numElementos });
});

socket.on('sala_creada', ({ codigoSala, numElementos }) => {
  miCodigoSala = codigoSala;
  esAnfitrion = true;

  // Transición a la Sala de Espera
  seccionLogin.classList.add('hidden');
  seccionLobby.classList.remove('hidden');
  lobbyCodigoDisplay.textContent = codigoSala;

  // Mostrar panel de control del anfitrión y ocultar mensaje de espera de alumno
  panelAnfitrionControles.classList.remove('hidden');
  pantallaEsperaConcursante.classList.add('hidden');
  mensajeError.textContent = '';
});

// ==========================================
// 2. UNIRSE A SALA Y PANTALLA DE ESPERA (CONCURSANTE)
// ==========================================
btnUnirse.addEventListener('click', () => {
  const nickname = inputNickname.value.trim();
  const codigoSala = inputCodigo.value.trim().toUpperCase();

  if (!nickname || !codigoSala) {
    mensajeError.textContent = 'Por favor ingresa tu apodo y el código de la sala.';
    return;
  }

  socket.emit('unirse_sala', { codigoSala, nickname });
});

socket.on('unido_exitosamente', ({ codigoSala, nickname }) => {
  miCodigoSala = codigoSala;
  esAnfitrion = false;

  // Transición a la Sala de Espera del Concursante
  seccionLogin.classList.add('hidden');
  seccionLobby.classList.remove('hidden');
  lobbyCodigoDisplay.textContent = codigoSala;

  // Ocultar controles de anfitrión y mostrar pantalla de espera del concursante
  panelAnfitrionControles.classList.add('hidden');
  pantallaEsperaConcursante.classList.remove('hidden');
  mensajeError.textContent = '';
});

socket.on('error_login', (msg) => {
  mensajeError.textContent = msg;
});

// ==========================================
// 3. LISTA DE ESPERA EN TIEMPO REAL
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
// 4. INICIAR CONCURSO (SOLO ANFITRIÓN)
// ==========================================
btnIniciarConcurso.addEventListener('click', () => {
  if (miCodigoSala && esAnfitrion) {
    socket.emit('iniciar_concurso', { codigoSala: miCodigoSala });
  }
});

socket.on('concurso_iniciado', ({ tablero, puntuaciones }) => {
  // Transición de la Sala de Espera al Tablero de Juego
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
// 5. TABLERO DE CARTAS Y PODERES
// ==========================================
function renderizarTablero(cartas) {
  tableroCartas.innerHTML = '';
  
  cartas.forEach((carta) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'carta';
    if (carta.revelada) cardEl.classList.add('revelada');
    if (carta.emparejada) cardEl.classList.add('emparejada');

    cardEl.dataset.id = carta.id;

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

socket.on('actualizar_tablero', ({ tablero, estadoJugada }) => {
  renderizarTablero(tablero);

  if (estadoJugada === 'evaluando') {
    bloqueado = true;
  } else if (estadoJugada === 'exito') {
    bloqueado = false;
  } else if (estadoJugada === 'fallo') {
    bloqueado = true;
    setTimeout(() => {
      bloqueado = false;
      socket.emit('ocultar_no_coincidentes', { codigoSala: miCodigoSala });
    }, 1500);
  } else {
    bloqueado = false;
  }
});

socket.on('efecto_poder', ({ tipoPoder, mensaje }) => {
  const alerta = document.createElement('div');
  alerta.className = `alerta-poder ${tipoPoder}`;
  alerta.textContent = mensaje;
  document.body.appendChild(alerta);

  setTimeout(() => {
    alerta.remove();
  }, 3000);
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

socket.on('fin_juego', ({ ganador }) => {
  alert(`🏆 ¡FIN DEL CONCURSO! 🏆\nEl ganador es: ${ganador.nickname} con ${ganador.puntos} puntos.`);
});
