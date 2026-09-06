const socket = io();

// DOM
const seccionLogin = document.getElementById('seccion-login');
const seccionLobby = document.getElementById('seccion-lobby');
const seccionJuego = document.getElementById('seccion-juego');

// Inputs & Buttons
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
const btnIniciarConcurso = document.getElementById('btn-iniciar-concurso');
const pantallaEsperaConcursante = document.getElementById('pantalla-espera-concursante');
const listaJugadores = document.getElementById('lista-jugadores');

// Juego
const juegoTituloDisplay = document.getElementById('juego-titulo-display');
const cronometro = document.getElementById('cronometro');
const vistaAnfitrion = document.getElementById('vista-anfitrion');
const vistaJugador = document.getElementById('vista-jugador');
const rankingAnfitrionLista = document.getElementById('ranking-anfitrion-lista');
const leaderboardMini = document.getElementById('leaderboard-mini');
const tableroCartas = document.getElementById('tablero-cartas');

let miCodigoSala = null;
let esAnfitrion = false;

// Crear Sala
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
  pantallaEsperaConcursante.classList.add('hidden');
});

// Unirse
btnUnirse.addEventListener('click', () => {
  const nickname = inputNickname.value.trim();
  const codigoSala = inputCodigo.value.trim().toUpperCase();

  if (!nickname || !codigoSala) {
    mensajeError.textContent = 'Ingresa tu apodo y el código.';
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

// Iniciar Partida
btnIniciarConcurso.addEventListener('click', () => {
  if (miCodigoSala && esAnfitrion) {
    const familiasChecks = document.querySelectorAll('#contenedor-familias input:checked');
    const familias = Array.from(familiasChecks).map(c => c.value);

    socket.emit('iniciar_concurso', {
      codigoSala: miCodigoSala,
      nombreConcurso: inputNombreConcurso.value.trim() || 'Torneo Química Pro',
      duracionSegundos: parseInt(inputDuracion.value, 10) || 120,
      familias
    });
  }
});

socket.on('concurso_iniciado', ({ tablero, puntuaciones, nombreConcurso, duracionSegundos }) => {
  seccionLobby.classList.add('hidden');
  seccionJuego.classList.remove('hidden');
  
  juegoTituloDisplay.textContent = nombreConcurso;
  iniciarCronometroVisual(duracionSegundos);

  if (esAnfitrion) {
    vistaAnfitrion.classList.remove('hidden');
    vistaJugador.classList.add('hidden');
  } else {
    vistaJugador.classList.remove('hidden');
    vistaAnfitrion.classList.add('hidden');
    renderizarTablero(tablero);
  }

  actualizarRanking(puntuaciones);
});

function iniciarCronometroVisual(segundos) {
  let tiempoRestante = segundos;
  const timer = setInterval(() => {
    const min = Math.floor(tiempoRestante / 60);
    const seg = tiempoRestante % 60;
    cronometro.textContent = `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;

    if (tiempoRestante <= 0) {
      clearInterval(timer);
      cronometro.textContent = "00:00 - ¡TIEMPO!";
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

socket.on('actualizar_tablero', ({ tablero }) => {
  if (!esAnfitrion) renderizarTablero(tablero);
});

socket.on('actualizar_puntuaciones', ({ puntuaciones }) => {
  actualizarRanking(puntuaciones);
});

function actualizarRanking(puntuaciones) {
  const listaOrdenada = Object.values(puntuaciones).sort((a, b) => b.puntos - a.puntos);

  if (esAnfitrion) {
    rankingAnfitrionLista.innerHTML = '';
    listaOrdenada.forEach((p, idx) => {
      const card = document.createElement('div');
      card.className = 'ranking-card';
      card.innerHTML = `
        <span class="ranking-pos">#${idx + 1}</span>
        <span class="ranking-name">${p.nickname}</span>
        <span class="ranking-pts">+${p.puntos} PTS</span>
      `;
      rankingAnfitrionLista.appendChild(card);
    });
  } else {
    leaderboardMini.innerHTML = '<strong>Leaderboard: </strong>';
    listaOrdenada.forEach((p, idx) => {
      const item = document.createElement('span');
      item.className = 'jugador-score';
      item.textContent = `#${idx + 1} ${p.nickname}: ${p.puntos} pts | `;
      leaderboardMini.appendChild(item);
    });
  }
}
