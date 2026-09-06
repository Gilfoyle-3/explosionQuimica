const socket = io();

// Referencias DOM - Navegación
const seccionLogin = document.getElementById('seccion-login');
const seccionLobby = document.getElementById('seccion-lobby');
const seccionJuego = document.getElementById('seccion-juego');

// Controles Login
const btnCrearSala = document.getElementById('btn-crear-sala');
const btnUnirse = document.getElementById('btn-unirse');
const inputNickname = document.getElementById('input-nickname');
const inputCodigo = document.getElementById('input-codigo');
const mensajeError = document.getElementById('mensaje-error');

// Controles Lobby (Anfitrión)
const lobbyCodigoDisplay = document.getElementById('lobby-codigo-display');
const panelAnfitrionConfig = document.getElementById('panel-anfitrion-config');
const panelAnfitrionControles = document.getElementById('panel-anfitrion-controles');
const inputNombreConcurso = document.getElementById('input-nombre-concurso');
const inputDuracion = document.getElementById('input-duracion');
const inputReglas = document.getElementById('input-reglas');
const inputNumElementos = document.getElementById('select-num-elementos');
const btnElementOpts = document.querySelectorAll('.btn-element-opt');
const btnIniciarConcurso = document.getElementById('btn-iniciar-concurso');

// Controles Lobby (Concursantes)
const panelReglasConcursante = document.getElementById('panel-reglas-concursante');
const displayNombreConcurso = document.getElementById('display-nombre-concurso');
const displayReglasTexto = document.getElementById('display-reglas-texto');
const pantallaEsperaConcursante = document.getElementById('pantalla-espera-concursante');
const listaJugadores = document.getElementById('lista-jugadores');

// Controles Juego
const juegoTituloDisplay = document.getElementById('juego-titulo-display');
const cronometro = document.getElementById('cronometro');
const leaderboard = document.getElementById('leaderboard');
const tableroCartas = document.getElementById('tablero-cartas');

let miCodigoSala = null;
let esAnfitrion = false;

// Selector visual de cartas
btnElementOpts.forEach(btn => {
  btn.addEventListener('click', () => {
    btnElementOpts.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    inputNumElementos.value = btn.dataset.val;
  });
});

// 1. CREAR SALA (ANFITRIÓN)
btnCrearSala.addEventListener('click', () => {
  socket.emit('crear_sala');
});

socket.on('sala_creada', ({ codigoSala }) => {
  miCodigoSala = codigoSala;
  esAnfitrion = true;

  seccionLogin.classList.add('hidden');
  seccionLobby.classList.remove('hidden');
  lobbyCodigoDisplay.textContent = codigoSala;

  panelAnfitrionConfig.classList.remove('hidden');
  panelAnfitrionControles.classList.remove('hidden');
  panelReglasConcursante.classList.add('hidden');
  pantallaEsperaConcursante.classList.add('hidden');
  mensajeError.textContent = '';
});

// 2. UNIRSE A SALA (CONCURSANTE)
btnUnirse.addEventListener('click', () => {
  const nickname = inputNickname.value.trim();
  const codigoSala = inputCodigo.value.trim().toUpperCase();

  if (!nickname || !codigoSala) {
    mensajeError.textContent = 'Ingresa apodo y código de sala.';
    return;
  }

  socket.emit('unirse_sala', { codigoSala, nickname });
});

socket.on('unido_exitosamente', ({ codigoSala, configuracion }) => {
  miCodigoSala = codigoSala;
  esAnfitrion = false;

  seccionLogin.classList.add('hidden');
  seccionLobby.classList.remove('hidden');
  lobbyCodigoDisplay.textContent = codigoSala;

  panelAnfitrionConfig.classList.add('hidden');
  panelAnfitrionControles.classList.add('hidden');
  panelReglasConcursante.classList.remove('hidden');
  pantallaEsperaConcursante.classList.remove('hidden');

  if (configuracion) {
    displayNombreConcurso.textContent = configuracion.nombreConcurso;
    displayReglasTexto.textContent = configuracion.reglas;
  }
  mensajeError.textContent = '';
});

socket.on('error_login', (msg) => { mensajeError.textContent = msg; });

// Actualización de Concursantes en Lobby
socket.on('actualizar_lista_espera', ({ jugadores }) => {
  listaJugadores.innerHTML = '';
  jugadores.forEach((j) => {
    const li = document.createElement('li');
    li.className = 'jugador-item';
    li.textContent = `🎮 ${j.nickname}`;
    listaJugadores.appendChild(li);
  });
});

// 3. INICIAR CONCURSO (ENVIAR CONFIGURACIÓN COMPLETA AL SERVIDOR)
btnIniciarConcurso.addEventListener('click', () => {
  if (miCodigoSala && esAnfitrion) {
    const config = {
      codigoSala: miCodigoSala,
      nombreConcurso: inputNombreConcurso.value.trim() || 'Concurso de Química',
      duracionSegundos: parseInt(inputDuracion.value, 10) || 120,
      reglas: inputReglas.value.trim() || 'Sin reglas especificadas.',
      numElementos: parseInt(inputNumElementos.value, 10) || 8
    };

    socket.emit('iniciar_concurso', config);
  }
});

// 4. EMPIEZA EL CONCURSO
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
      cronometro.textContent = "¡TIEMPO FINALIZADO!";
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
  leaderboard.innerHTML = '<strong>Tabla de Posiciones:</strong> ';
  const listaOrdenada = Object.values(puntuaciones).sort((a, b) => b.puntos - a.puntos);
  listaOrdenada.forEach((p, idx) => {
    const item = document.createElement('span');
    item.className = 'jugador-score';
    item.textContent = `#${idx + 1} ${p.nickname}: ${p.puntos} pts | `;
    leaderboard.appendChild(item);
  });
}
