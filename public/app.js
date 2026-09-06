const socket = io();

// DOM
const seccionLogin = document.getElementById('seccion-login');
const seccionLobby = document.getElementById('seccion-lobby');
const seccionJuego = document.getElementById('seccion-juego');

// Login
const btnCrearSala = document.getElementById('btn-crear-sala');
const btnUnirse = document.getElementById('btn-unirse');
const inputNickname = document.getElementById('input-nickname');
const inputCodigo = document.getElementById('input-codigo');
const mensajeError = document.getElementById('mensaje-error');

// Lobby
const lobbyCodigoDisplay = document.getElementById('lobby-codigo-display');
const panelAnfitrionConfig = document.getElementById('panel-anfitrion-config');
const panelAnfitrionControles = document.getElementById('panel-anfitrion-controles');
const inputNombreConcurso = document.getElementById('input-nombre-concurso');
const inputDuracion = document.getElementById('input-duracion');
const inputNumElementos = document.getElementById('input-num-elementos');
const displayNumElementos = document.getElementById('display-num-elementos');
const btnIniciarConcurso = document.getElementById('btn-iniciar-concurso');
const pantallaEsperaConcursante = document.getElementById('pantalla-espera-concursante');
const listaJugadores = document.getElementById('lista-jugadores');

// Juego
const juegoTituloDisplay = document.getElementById('juego-titulo-display');
const cronometro = document.getElementById('cronometro');
const leaderboard = document.getElementById('leaderboard');
const tableroCartas = document.getElementById('tablero-cartas');

let miCodigoSala = null;
let esAnfitrion = false;

// Actualizar slider dinámicamente
inputNumElementos.addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  const totalCartas = (val * 3) + 2;
  displayNumElementos.textContent = `${val} Elementos (${totalCartas} Cartas)`;
});

// Crear Sala
btnCrearSala.addEventListener('click', () => {
  socket.emit('crear_sala');
});

socket.on('sala_creada', ({ codigoSala, maxElementos }) => {
  miCodigoSala = codigoSala;
  esAnfitrion = true;

  inputNumElementos.max = maxElementos;

  seccionLogin.classList.add('hidden');
  seccionLobby.classList.remove('hidden');
  lobbyCodigoDisplay.textContent = codigoSala;

  panelAnfitrionConfig.classList.remove('hidden');
  panelAnfitrionControles.classList.remove('hidden');
  pantallaEsperaConcursante.classList.add('hidden');
  mensajeError.textContent = '';
});

// Unirse
btnUnirse.addEventListener('click', () => {
  const nickname = inputNickname.value.trim();
  const codigoSala = inputCodigo.value.trim().toUpperCase();

  if (!nickname || !codigoSala) {
    mensajeError.textContent = 'Ingresa tu apodo y el código de sala.';
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

  panelAnfitrionConfig.classList.add('hidden');
  panelAnfitrionControles.classList.add('hidden');
  pantallaEsperaConcursante.classList.remove('hidden');
  mensajeError.textContent = '';
});

socket.on('error_login', (msg) => { mensajeError.textContent = msg; });

socket.on('actualizar_lista_espera', ({ jugadores }) => {
  listaJugadores.innerHTML = '';
  jugadores.forEach((j) => {
    const li = document.createElement('li');
    li.className = 'jugador-item';
    li.textContent = `🎮 ${j.nickname}`;
    listaJugadores.appendChild(li);
  });
});

// Iniciar Concurso
btnIniciarConcurso.addEventListener('click', () => {
  if (miCodigoSala && esAnfitrion) {
    socket.emit('iniciar_concurso', {
      codigoSala: miCodigoSala,
      nombreConcurso: inputNombreConcurso.value.trim() || 'Torneo de Valencias Química',
      duracionSegundos: parseInt(inputDuracion.value, 10) || 120,
      numElementos: parseInt(inputNumElementos.value, 10) || 8
    });
  }
});

socket.on('concurso_iniciado', ({ tablero, puntuaciones, nombreConcurso, duracionSegundos }) => {
  seccionLobby.classList.add('hidden');
  seccionJuego.classList.remove('hidden');
  
  juegoTituloDisplay.textContent = nombreConcurso;
  iniciarCronometroVisual(duracionSegundos);

  renderizarTablero(tablero);
  actualizarLeaderboard(puntuaciones);
});

function iniciarCronometroVisual(segundos) {
  let tiempoRestante = segundos;
  
  const timer = setInterval(() => {
    const min = Math.floor(tiempoRestante / 60);
    const seg = tiempoRestante % 60;
    cronometro.textContent = `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;

    if (tiempoRestante <= 0) {
      clearInterval(timer);
      cronometro.textContent = "00:00 - ¡TIEMPO FINALIZADO!";
    }
    tiempoRestante--;
  }, 1000);
}

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
      if (carta.revelada || carta.emparejada) return;
      socket.emit('seleccionar_carta', { codigoSala: miCodigoSala, cartaId: carta.id });
    });

    tableroCartas.appendChild(cardEl);
  });
}

socket.on('actualizar_tablero', ({ tablero }) => { renderizarTablero(tablero); });
socket.on('actualizar_puntuaciones', ({ puntuaciones }) => { actualizarLeaderboard(puntuaciones); });

function actualizarLeaderboard(puntuaciones) {
  leaderboard.innerHTML = '<strong>Leaderboard:</strong> ';
  const listaOrdenada = Object.values(puntuaciones).sort((a, b) => b.puntos - a.puntos);
  listaOrdenada.forEach((p, idx) => {
    const item = document.createElement('span');
    item.className = 'jugador-score';
    item.textContent = `#${idx + 1} ${p.nickname}: ${p.puntos} pts | `;
    leaderboard.appendChild(item);
  });
}
