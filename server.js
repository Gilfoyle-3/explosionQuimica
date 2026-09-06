const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

const FAMILIAS_QUIMICA = {
  monovalentes: [
    { nombre: 'Litio', simbolo: 'Li', valencia: '+1' },
    { nombre: 'Sodio', simbolo: 'Na', valencia: '+1' },
    { nombre: 'Potasio', simbolo: 'K', valencia: '+1' },
    { nombre: 'Rubidio', simbolo: 'Rb', valencia: '+1' },
    { nombre: 'Cesio', simbolo: 'Cs', valencia: '+1' },
    { nombre: 'Plata', simbolo: 'Ag', valencia: '+1' }
  ],
  divalentes: [
    { nombre: 'Magnesio', simbolo: 'Mg', valencia: '+2' },
    { nombre: 'Calcio', simbolo: 'Ca', valencia: '+2' },
    { nombre: 'Estroncio', simbolo: 'Sr', valencia: '+2' },
    { nombre: 'Bario', simbolo: 'Ba', valencia: '+2' },
    { nombre: 'Zinc', simbolo: 'Zn', valencia: '+2' }
  ],
  trivalentes: [
    { nombre: 'Aluminio', simbolo: 'Al', valencia: '+3' },
    { nombre: 'Escandio', simbolo: 'Sc', valencia: '+3' },
    { nombre: 'Galio', simbolo: 'Ga', valencia: '+3' }
  ],
  variable_1_2: [
    { nombre: 'Cobre', simbolo: 'Cu', valencia: '+1, +2' },
    { nombre: 'Mercurio', simbolo: 'Hg', valencia: '+1, +2' }
  ],
  variable_2_3: [
    { nombre: 'Hierro', simbolo: 'Fe', valencia: '+2, +3' },
    { nombre: 'Cobalto', simbolo: 'Co', valencia: '+2, +3' },
    { nombre: 'Níquel', simbolo: 'Ni', valencia: '+2, +3' }
  ],
  variable_2_4: [
    { nombre: 'Plomo', simbolo: 'Pb', valencia: '+2, +4' },
    { nombre: 'Estaño', simbolo: 'Sn', valencia: '+2, +4' },
    { nombre: 'Platino', simbolo: 'Pt', valencia: '+2, +4' }
  ],
  halogenos: [
    { nombre: 'Cloro', simbolo: 'Cl', valencia: '-1, +1, +3, +5, +7' },
    { nombre: 'Bromo', simbolo: 'Br', valencia: '-1, +1, +3, +5, +7' },
    { nombre: 'Yodo', simbolo: 'I', valencia: '-1, +1, +3, +5, +7' }
  ],
  anfigenos: [
    { nombre: 'Azufre', simbolo: 'S', valencia: '-2, +2, +4, +6' },
    { nombre: 'Selenio', simbolo: 'Se', valencia: '-2, +2, +4, +6' }
  ],
  nitrogenoides: [
    { nombre: 'Nitrógeno', simbolo: 'N', valencia: '-3, +1, +3, +5' },
    { nombre: 'Fósforo', simbolo: 'P', valencia: '-3, +1, +3, +5' }
  ],
  polivalentes: [
    { nombre: 'Cromo', simbolo: 'Cr', valencia: '+2, +3, +6' },
    { nombre: 'Manganeso', simbolo: 'Mn', valencia: '+2, +3, +4, +6, +7' }
  ]
};

const salas = {};

io.on('connection', (socket) => {
  // 1. EL HOST CREA LA SALA E INMEDIATAMENTE RECIBE CÓDIGO
  socket.on('crear_sala', () => {
    const codigoSala = Math.floor(100000 + Math.random() * 900000).toString();

    salas[codigoSala] = {
      anfitrion: socket.id,
      estado: 'esperando',
      jugadores: [],
      tablero: [],
      puntuaciones: {},
      cartasVolteadasPorJugador: {},
      configuracion: {
        nombreConcurso: 'Torneo Química Pro',
        duracionSegundos: 120,
        cantidadElementos: 8, // Valor por defecto
        familiasSeleccionadas: Object.keys(FAMILIAS_QUIMICA)
      }
    };

    socket.join(codigoSala);
    socket.emit('sala_creada', { 
      codigoSala, 
      familiasDisponibles: Object.keys(FAMILIAS_QUIMICA) 
    });
  });

  // 2. UNIRSE A LA SALA
  socket.on('unirse_sala', ({ codigoSala, nickname }) => {
    const sala = salas[codigoSala];
    if (!sala) return socket.emit('error_login', 'La sala especificada no existe.');
    if (sala.estado !== 'esperando') return socket.emit('error_login', 'El concurso ya está en marcha.');

    const nickLimpio = (nickname || '').trim();
    if (!nickLimpio) return socket.emit('error_login', 'Ingresa un apodo válido.');

    if (sala.jugadores.some(j => j.nickname.toLowerCase() === nickLimpio.toLowerCase())) {
      return socket.emit('error_login', 'Ese apodo ya está ocupado.');
    }

    sala.jugadores.push({ id: socket.id, nickname: nickLimpio });
    sala.puntuaciones[socket.id] = { nickname: nickLimpio, puntos: 0 };
    sala.cartasVolteadasPorJugador[socket.id] = [];

    socket.join(codigoSala);
    socket.emit('unido_exitosamente', { codigoSala, nickname: nickLimpio });

    // Notificar a todos en la sala del nuevo participante
    io.to(codigoSala).emit('actualizar_lista_espera', { jugadores: sala.jugadores });
  });

  // 3. HOST INICIA CON CONFIGURACIÓN COMPLETA
  socket.on('iniciar_concurso', ({ codigoSala, nombreConcurso, duracionSegundos, cantidadElementos, familias }) => {
    const sala = salas[codigoSala];
    if (!sala) return socket.emit('error_juego', 'La sala ya no existe.');
    if (sala.anfitrion !== socket.id) return socket.emit('error_juego', 'Permiso denegado.');

    const familiasValidas = Array.isArray(familias) && familias.length > 0 ? familias : Object.keys(FAMILIAS_QUIMICA);
    const limiteElementos = parseInt(cantidadElementos) || 8;

    sala.configuracion.nombreConcurso = nombreConcurso || 'Torneo Química Pro';
    sala.configuracion.duracionSegundos = parseInt(duracionSegundos) || 120;
    sala.configuracion.cantidadElementos = limiteElementos;
    sala.configuracion.familiasSeleccionadas = familiasValidas;

    sala.tablero = generarTablero(familiasValidas, limiteElementos);
    sala.estado = 'jugando';

    io.to(codigoSala).emit('concurso_iniciado', {
      tablero: sala.tablero,
      puntuaciones: sala.puntuaciones,
      nombreConcurso: sala.configuracion.nombreConcurso,
      duracionSegundos: sala.configuracion.duracionSegundos
    });
  });

  // 4. LÓGICA DE JUEGO (FLIP & TRÍOS)
  socket.on('seleccionar_carta', ({ codigoSala, cartaId }) => {
    const sala = salas[codigoSala];
    if (!sala || sala.estado !== 'jugando') return;

    if (!sala.cartasVolteadasPorJugador[socket.id]) {
      sala.cartasVolteadasPorJugador[socket.id] = [];
    }

    const misVolteadas = sala.cartasVolteadasPorJugador[socket.id];
    if (misVolteadas.length >= 3) return;

    const carta = sala.tablero.find(c => c.id === cartaId);
    if (!carta || carta.revelada || carta.emparejada) return;

    carta.revelada = true;
    misVolteadas.push(carta);

    io.to(codigoSala).emit('actualizar_tablero', { tablero: sala.tablero });

    if (misVolteadas.length === 3) {
      const [c1, c2, c3] = misVolteadas;

      const mismoGrupo = (c1.grupoId === c2.grupoId) && (c2.grupoId === c3.grupoId);
      const tiposDiferentes = new Set([c1.tipo, c2.tipo, c3.tipo]).size === 3;

      if (mismoGrupo && tiposDiferentes) {
        c1.emparejada = true;
        c2.emparejada = true;
        c3.emparejada = true;

        if (sala.puntuaciones[socket.id]) {
          sala.puntuaciones[socket.id].puntos += 100;
        }

        sala.cartasVolteadasPorJugador[socket.id] = [];
        io.to(codigoSala).emit('actualizar_tablero', { tablero: sala.tablero });
        io.to(codigoSala).emit('actualizar_puntuaciones', { puntuaciones: sala.puntuaciones });
      } else {
        setTimeout(() => {
          c1.revelada = false;
          c2.revelada = false;
          c3.revelada = false;
          sala.cartasVolteadasPorJugador[socket.id] = [];
          io.to(codigoSala).emit('actualizar_tablero', { tablero: sala.tablero });
        }, 1200);
      }
    }
  });

  socket.on('disconnect', () => {
    Object.keys(salas).forEach(codigoSala => {
      const sala = salas[codigoSala];
      sala.jugadores = sala.jugadores.filter(j => j.id !== socket.id);
      delete sala.puntuaciones[socket.id];
      delete sala.cartasVolteadasPorJugador[socket.id];

      io.to(codigoSala).emit('actualizar_lista_espera', { jugadores: sala.jugadores });
      io.to(codigoSala).emit('actualizar_puntuaciones', { puntuaciones: sala.puntuaciones });

      if (sala.jugadores.length === 0 && sala.anfitrion !== socket.id) {
        delete salas[codigoSala];
      }
    });
  });
});

function generarTablero(familiasPermitidas, limiteElementos) {
  let poolElementos = [];

  familiasPermitidas.forEach(fam => {
    if (FAMILIAS_QUIMICA[fam]) {
      poolElementos.push(...FAMILIAS_QUIMICA[fam]);
    }
  });

  if (poolElementos.length === 0) poolElementos = FAMILIAS_QUIMICA.monovalentes;

  // Mezclar elementos y tomar únicamente la cantidad seleccionada
  poolElementos.sort(() => Math.random() - 0.5);
  const seleccionados = poolElementos.slice(0, limiteElementos);

  let cartas = [];
  let cardId = 1;

  seleccionados.forEach(elem => {
    const grupoId = elem.nombre;
    cartas.push({ id: cardId++, tipo: 'nombre', contenido: elem.nombre, grupoId, revelada: false, emparejada: false });
    cartas.push({ id: cardId++, tipo: 'simbolo', contenido: elem.simbolo, grupoId, revelada: false, emparejada: false });
    cartas.push({ id: cardId++, tipo: 'valencia', contenido: elem.valencia, grupoId, revelada: false, emparejada: false });
  });

  // Fisher-Yates Shuffle
  for (let i = cartas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cartas[i], cartas[j]] = [cartas[j], cartas[i]];
  }

  return cartas;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Servidor en ejecución: http://localhost:${PORT}`));
