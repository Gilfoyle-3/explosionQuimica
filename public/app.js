const socket = io();

// Elementos HTML
const seccionLogin = document.getElementById('seccion-login');
const seccionLobby = document.getElementById('seccion-lobby');
const seccionJuego = document.getElementById('seccion-juego');

// Inputs y Botones
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

// Pantalla de Juego
const juegoTituloDisplay = document.getElementById('juego-titulo-display');
const cronometro = document.getElementById('cronometro');
const vistaAnfitrion = document.getElementById('vista-anfitrion');
const vistaJugador = document.getElementById('vista-jugador');
const rankingAnfitrionLista = document.getElementById('ranking-anfitrion-lista');
const leaderboardMini = document.getElementById('leaderboard-mini');
const tableroCartas = document.getElementById('tablero-cartas');

let miCodigoSala = null;
let esAnfitrion = false;

// Actualizar slider dinámicamente
inputNumElementos.addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  const totalCartas = (val * 3) + 2;
  displayNumElementos.textContent = `${val} Elementos (${totalCartas} Cartas)`;
});

// Crear Sala (Anfitrión)
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

// Unirse a una Sala (Participante)
btnUnirse.addEventListener('click', () => {
  const nickname = inputNickname.value.trim();
  const codigoSala = inputCodigo.value.trim().toUpperCase();

  if (!nickname || !codigoSala) {
    mensajeError.textContent = 'Por favor, completa tu apodo y el código de sala.';
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

socket.on('error_login', (msg) => {
  mensajeError.textContent = msg;
});

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

  if (esAnfitrion) {
    // EL CREADOR SOLO VE EL RANKING
    vistaAnfitrion.classList.remove('hidden');
    vistaJugador.classList.add('hidden');
  } else {
    // LOS JUGADORES VEN EL TABLERO INTERACTIVO
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
      cronometro.textContent = "00:00 - ¡CONCURSO FINALIZADO!";
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
    // RANKING GRANDE PARA EL CREADOR
    rankingAnfitrionLista.innerHTML = '';
    listaOrdenada.forEach((p, idx) => {
      const card = document.createElement('div');
      card.className = 'ranking-card';
      card.innerHTML = `
        <span class="ranking-pos">#${idx + 1}</span>
        <span class="ranking-name">${p.nickname}</span>
        <span class="ranking-pts">${p.puntos} PTS</span>
      `;
      rankingAnfitrionLista.appendChild(card);
    });
  } else {
    // MINI LEADERBOARD EN PANTALLA JUGADOR
    leaderboardMini.innerHTML = '<strong>Ranking: </strong> ';
    listaOrdenada.forEach((p, idx) => {
      const item = document.createElement('span');
      item.className = 'jugador-score';
      item.textContent = `#${idx + 1} ${p.nickname}: ${p.puntos} pts | `;
      leaderboardMini.appendChild(item);
    });
  }
}
