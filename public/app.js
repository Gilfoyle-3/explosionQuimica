const socket = io();

// ==========================================
// REFERENCIAS AL DOM
// ==========================================
const seccionLogin = document.getElementById('seccion-login');
const seccionLobby = document.getElementById('seccion-lobby');
const seccionJuego = document.getElementById('seccion-juego');

// Controles Login / Creación
const btnCrearSala = document.getElementById('btn-crear-sala');
const numElementosSelect = document.getElementById('num-elementos');
const btnUnirse = document.getElementById('btn-unirse');
const inputNickname = document.getElementById('input-nickname');
const inputCodigo = document.getElementById('input-codigo');
const mensajeError = document.getElementById('mensaje-error');

// Controles Lobby (Sala de Espera)
const lobbyCodigoDisplay = document.getElementById('lobby-codigo-display');
const listaJugadores = document.getElementById('lista-jugadores');
const panelAnfitrionControles = document.getElementById('panel-anfitrion-controles');
const esperandoMensaje = document.getElementById('esperando-mensaje');
const btnIniciarConcurso = document.getElementById('btn-iniciar-concurso');

// Controles Juego
const juegoCodigoDisplay = document.getElementById('juego-codigo-display');
const leaderboard = document.getElementById('leaderboard');
const tableroCartas = document.getElementById('tablero-cartas');

// Estado local
let miCodigoSala = null;
let esAnfitrion = false;
let cartasSeleccionadas = [];
let bloqueado = false;

// ==========================================
// 1. CREAR SALA (ANFITRIÓN)
// ==========================================
btnCrearSala.addEventListener('click', () => {
  const numElementos = numElementosSelect.value;
  socket.emit('crear_sala', { numElementos });
});

socket.on('sala_creada', ({ codigoSala, numElementos }) => {
  miCodigoSala = codigoSala;
  esAnfitrion = true;

  lobbyCodigoDisplay.textContent = codigoSala;
  seccionLogin.classList.add('hidden');
  seccionLobby.classList.remove('hidden');

  panelAnfitrionControles.classList.remove('hidden');
  esperandoMensaje.classList.add('hidden');
  mensajeError.textContent = '';
});

// ==========================================
// 2. UNIRSE A SALA (CONCURSANTE)
// ==========================================
btnUnirse.addEventListener('click', () => {
  const nickname = inputNickname.value.trim();
  const codigoSala = inputCodigo.value.trim();

  if (!nickname || !codigoSala) {
    mensajeError.textContent = 'Por favor ingresa tu apodo y el código de la sala.';
    return;
  }

  socket.emit('unirse_sala', { codigoSala, nickname });
});

socket.on('unido_exitosamente', ({ codigoSala, nickname }) => {
  miCodigoSala = codigoSala;
  esAnfitrion = false;

  lobbyCodigoDisplay.textContent = codigoSala;
  seccionLogin.classList.add('hidden');
  seccionLobby.classList.remove('hidden');

  panelAnfitrionControles.classList.add('hidden');
  esperandoMensaje.classList.remove('hidden');
  mensajeError.textContent = '';
});

socket.on('error_login', (msg) => {
  mensajeError.textContent = msg;
});

// ==========================================
// 3. ACTUALIZAR SALA DE ESPERA (LOBBY)
// ==========================================
socket.on('actualizar_lista_espera', ({ jugadores }) => {
  listaJugadores.innerHTML = '';
  jugadores.forEach((j) => {
    const li = document.createElement('li');
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
// 5. LÓGICA DEL TABLERO Y JUEGO
// ==========================================

// Renderiza todas las cartas en el grid
function renderizarTablero(cartas) {
  tableroCartas.innerHTML = '';
  
  cartas.forEach((carta) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'carta';
    if (carta.revelada) cardEl.classList.add('revelada');
    if (carta.emparejada) cardEl.classList.add('emparejada');

    cardEl.dataset.id = carta.id;

    // Visualización del contenido
    if (carta.revelada || carta.emparejada) {
      cardEl.innerHTML = `
        <div class="contenido-carta ${carta.tipo}">
          <span class="tipo-tag">${carta.tipo.toUpperCase()}</span>
          <span class="texto-principal">${carta.contenido}</span>
        </div>
      `;
    } else {
      cardEl.innerHTML = `<div class="reverso">❓</div>`;
    }

    // Evento de clic en la carta
    cardEl.addEventListener('click', () => {
      if (bloqueado || carta.revelada || carta.emparejada) return;
      socket.emit('seleccionar_carta', { codigoSala: miCodigoSala, cartaId: carta.id });
    });

    tableroCartas.appendChild(cardEl);
  });
}

// Escuchar actualizaciones del servidor sobre las cartas
socket.on('actualizar_tablero', ({ tablero, seleccionadas, estadoJugada }) => {
  renderizarTablero(tablero);

  if (estadoJugada === 'evaluando') {
    bloqueado = true;
  } else if (estadoJugada === 'exito') {
    bloqueado = false;
    cartasSeleccionadas = [];
  } else if (estadoJugada === 'fallo') {
    bloqueado = true;
    setTimeout(() => {
      bloqueado = false;
      cartasSeleccionadas = [];
      socket.emit('ocultar_no_coincidentes', { codigoSala: miCodigoSala });
    }, 1500);
  } else {
    bloqueado = false;
  }
});

// Escuchar eventos especiales (Poderes: Bomba y Tornado)
socket.on('efecto_poder', ({ tipoPoder, mensaje }) => {
  const alerta = document.createElement('div');
  alerta.className = `alerta-poder ${tipoPoder}`;
  alerta.textContent = mensaje;
  document.body.appendChild(alerta);

  setTimeout(() => {
    alerta.remove();
  }, 3000);
});

// Actualización del Ranking en tiempo real
socket.on('actualizar_puntuaciones', ({ puntuaciones }) => {
  actualizarLeaderboard(puntuaciones);
});

function actualizarLeaderboard(puntuaciones) {
  leaderboard.innerHTML = '<strong>Clasificación:</strong> ';
  
  // Ordenar jugadores por puntos descendentes
  const listaOrdenada = Object.values(puntuaciones).sort((a, b) => b.puntos - a.puntos);

  listaOrdenada.forEach((p, idx) => {
    const item = document.createElement('span');
    item.className = 'jugador-score';
    item.textContent = `#${idx + 1} ${p.nickname}: ${p.puntos} pts | `;
    leaderboard.appendChild(item);
  });
}

// Escuchar fin del juego
socket.on('fin_juego', ({ ganador, puntuaciones }) => {
  alert(`🏆 ¡FIN DEL CONCURSO! 🏆\nEl ganador es: ${ganador.nickname} con ${ganador.puntos} puntos.`);
});
