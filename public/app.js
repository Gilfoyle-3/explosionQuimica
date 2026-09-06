const socket = io();
let miCodigoSala = '';
let esAnfitrion = false;

// ==========================================
// ACCIONES DEL JUGADOR
// ==========================================

function crearSala() {
  socket.emit('crear_sala');
}

function unirseSala() {
  const codigoSala = document.getElementById('input-codigo').value.trim();
  const nickname = document.getElementById('input-nickname').value.trim();
  socket.emit('unirse_sala', { codigoSala, nickname });
}

function iniciarConcurso() {
  const nombreConcurso = document.getElementById('cfg-nombre').value;
  const duracionSegundos = document.getElementById('cfg-tiempo').value;
  const cantidadElementos = document.getElementById('cfg-elementos').value;

  const familias = [];
  document.querySelectorAll('.fam-check:checked').forEach(cb => familias.push(cb.value));

  socket.emit('iniciar_concurso', {
    codigoSala: miCodigoSala,
    nombreConcurso,
    duracionSegundos,
    cantidadElementos,
    familias
  });
}

// ==========================================
// LISTENERS DE SOCKET.IO
// ==========================================

socket.on('sala_creada', ({ codigoSala, familiasDisponibles }) => {
  miCodigoSala = codigoSala;
  esAnfitrion = true;
  
  document.getElementById('lbl-codigo').innerText = codigoSala;
  document.getElementById('vista-inicio').classList.add('oculto');
  document.getElementById('vista-lobby').classList.remove('oculto');

  const contFamilias = document.getElementById('lista-familias');
  contFamilias.innerHTML = '';
  familiasDisponibles.forEach(fam => {
    contFamilias.innerHTML += `
      <label class="checkbox-item">
        <input type="checkbox" class="fam-check" value="${fam}" checked> ${fam}
      </label>
    `;
  });

  socket.emit('unirse_sala', { codigoSala, nickname: 'Anfitrión (Host)' });
});

socket.on('unido_exitosamente', ({ codigoSala }) => {
  miCodigoSala = codigoSala;
  document.getElementById('lbl-codigo').innerText = codigoSala;
  document.getElementById('vista-inicio').classList.add('oculto');
  document.getElementById('vista-lobby').classList.remove('oculto');

  if (!esAnfitrion) {
    document.getElementById('panel-configuracion').style.opacity = '0.5';
    document.getElementById('panel-configuracion').style.pointerEvents = 'none';
    document.getElementById('btn-iniciar').classList.add('oculto');
  }
});

socket.on('actualizar_lista_espera', ({ jugadores }) => {
  const cont = document.getElementById('lista-jugadores');
  cont.innerHTML = '';
  jugadores.forEach(j => {
    cont.innerHTML += `
      <div class="player-badge">
        <span>👤 ${j.nickname}</span>
        <span style="color:var(--accent-neon)">Listo</span>
      </div>
    `;
  });
});

socket.on('concurso_iniciado', ({ tablero, puntuaciones, nombreConcurso, duracionSegundos }) => {
  document.getElementById('vista-lobby').classList.add('oculto');
  document.getElementById('vista-juego').classList.remove('oculto');
  document.getElementById('txt-titulo-concurso').innerText = nombreConcurso;

  renderizarTablero(tablero);
  renderizarPuntuaciones(puntuaciones);
  iniciarTemporizador(duracionSegundos);
});

socket.on('actualizar_tablero', ({ tablero }) => renderizarTablero(tablero));

socket.on('actualizar_puntuaciones', ({ puntuaciones }) => renderizarPuntuaciones(puntuaciones));

socket.on('error_login', (msg) => alert(`Error: ${msg}`));
socket.on('error_juego', (msg) => alert(`Atención: ${msg}`));

// ==========================================
// RENDERIZADO DE INTERFAZ (UI)
// ==========================================

function renderizarTablero(tablero) {
  const cont = document.getElementById('tablero-cartas');
  cont.innerHTML = '';

  tablero.forEach(carta => {
    const cardEl = document.createElement('div');
    cardEl.className = `card-3d ${carta.revelada ? 'flipped' : ''} ${carta.emparejada ? 'matched' : ''}`;
    cardEl.onclick = () => socket.emit('seleccionar_carta', { codigoSala: miCodigoSala, cartaId: carta.id });

    cardEl.innerHTML = `
      <div class="card-inner">
        <div class="card-front">🧪</div>
        <div class="card-back">
          <div>${carta.contenido}</div>
          <span class="badge-type">${carta.tipo}</span>
        </div>
      </div>
    `;
    cont.appendChild(cardEl);
  });
}

function renderizarPuntuaciones(puntuaciones) {
  const cont = document.getElementById('tabla-puntuaciones');
  cont.innerHTML = '';
  Object.values(puntuaciones)
    .sort((a,b) => b.puntos - a.puntos)
    .forEach((p, idx) => {
      cont.innerHTML += `
        <div class="player-badge" style="border-color:${idx === 0 ? 'gold' : 'var(--accent-neon)'}">
          <span>${idx + 1}. ${p.nickname}</span>
          <strong>${p.puntos} pts</strong>
        </div>
      `;
    });
}

function iniciarTemporizador(segundos) {
  let t = segundos;
  const el = document.getElementById('txt-cronometro');
  const timer = setInterval(() => {
    t--;
    el.innerText = t;
    if (t <= 0) {
      clearInterval(timer);
      alert('¡Tiempo agotado! Revisa las puntuaciones finales.');
    }
  }, 1000);
}
