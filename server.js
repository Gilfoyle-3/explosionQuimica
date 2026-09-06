const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

// ==========================================
// DB BASE DE ELEMENTOS POR FAMILIAS
// ==========================================
const FAMILIAS_METALES = {
  monovalentes: [
    { nombre: 'Litio', simbolo: 'Li', valencia: '+1' },
    { nombre: 'Sodio', simbolo: 'Na', valencia: '+1' },
    { nombre: 'Potasio', simbolo: 'K', valencia: '+1' },
    { nombre: 'Plata', simbolo: 'Ag', valencia: '+1' }
  ],
  divalentes: [
    { nombre: 'Magnesio', simbolo: 'Mg', valencia: '+2' },
    { nombre: 'Calcio', simbolo: 'Ca', valencia: '+2' },
    { nombre: 'Zinc', simbolo: 'Zn', valencia: '+2' },
    { nombre: 'Bario', simbolo: 'Ba', valencia: '+2' }
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
  polivalentes: [
    { nombre: 'Cromo', simbolo: 'Cr', valencia: '+2, +3, +6' },
    { nombre: 'Manganeso', simbolo: 'Mn', valencia: '+2, +3, +4, +6, +7' },
    { nombre: 'Bismuto', simbolo: 'Bi', valencia: '+3, +5' }
  ]
};

const salas = {};

io.on('connection', (socket) => {

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
        familiasSeleccionadas: ['monovalentes', 'divalentes', 'trivalentes', 'polivalentes']
      }
    };

    socket.join(codigoSala);
    socket.emit('sala_creada', { codigoSala, familias: Object.keys(FAMILIAS_METALES) });
  });

  socket.on('unirse_sala', ({ codigoSala, nickname }) => {
    const sala = salas[codigoSala];
    if (!sala) return socket.emit('error_login', 'La sala no existe.');
    if (sala.estado !== 'esperando') return socket.emit('error_login', 'El juego ya inició.');

    const existe = sala.jugadores.some(j => j.nickname.toLowerCase() === nickname.trim().toLowerCase());
    if (existe) return socket.emit('error_login', 'Ese apodo ya existe.');

    sala.jugadores.push({ id: socket.id, nickname: nickname.trim() });
    sala.puntuaciones[socket.id] = { nickname: nickname.trim(), puntos: 0 };
    sala.cartasVolteadasPorJugador[socket.id] = [];

    socket.join(codigoSala);
    socket.emit('unido_exitosamente', { codigoSala });
    io.to(codigoSala).emit('actualizar_lista_espera', { jugadores: sala.jugadores });
  });

  socket.on('iniciar_concurso', ({ codigoSala, nombreConcurso, duracionSegundos, familias }) => {
    const sala = salas[codigoSala];
    if (!sala || sala.anfitrion !== socket.id) return;

    sala.configuracion.nombreConcurso = nombreConcurso;
    sala.configuracion.duracionSegundos = duracionSegundos;
    sala.configuracion.familiasSeleccionadas = familias;
    
    sala.tablero = generarTablero(familias);
    sala.estado = 'jugando';

    io.to(codigoSala).emit('concurso_iniciado', {
      tablero: sala.tablero,
      puntuaciones: sala.puntuaciones,
      nombreConcurso,
      duracionSegundos
    });
  });

  socket.on('seleccionar_carta', ({ codigoSala, cartaId }) => {
    const sala = salas[codigoSala];
    if (!sala || sala.estado !== 'jugando') return;

    const misVolteadas = sala.cartasVolteadasPorJugador[socket.id] || [];
    if (misVolteadas.length >= 3) return; // Máximo 3 cartas a la vez

    const carta = sala.tablero.find(c => c.id === cartaId);
    if (!carta || carta.revelada || carta.emparejada) return;

    carta.revelada = true;
    misVolteadas.push(carta);
    sala.cartasVolteadasPorJugador[socket.id] = misVolteadas;

    io.to(codigoSala).emit('actualizar_tablero', { tablero: sala.tablero });

    // EVALUACIÓN AL TENER 3 CARTAS
    if (misVolteadas.length === 3) {
      const [c1, c2, c3] = misVolteadas;

      // Verificar Trío: Mismo elemento (grupoId) y 3 tipos diferentes
      const mismoGrupo = (c1.grupoId === c2.grupoId) && (c2.grupoId === c3.grupoId);
      const tiposUnicos = new Set([c1.tipo, c2.tipo, c3.tipo]).size === 3;

      if (mismoGrupo && tiposUnicos) {
        // TRÍO CORRECTO: +100 PUNTOS
        c1.emparejada = true;
        c2.emparejada = true;
        c3.emparejada = true;

        sala.puntuaciones[socket.id].puntos += 100;
        sala.cartasVolteadasPorJugador[socket.id] = [];

        io.to(codigoSala).emit('actualizar_tablero', { tablero: sala.tablero });
        io.to(codigoSala).emit('actualizar_puntuaciones', { puntuaciones: sala.puntuaciones });
      } else {
        // FALLO: VOLTEAR TRAS 1.5s
        setTimeout(() => {
          c1.revelada = false;
          c2.revelada = false;
          c3.revelada = false;
          sala.cartasVolteadasPorJugador[socket.id] = [];
          io.to(codigoSala).emit('actualizar_tablero', { tablero: sala.tablero });
        }, 1500);
      }
    }
  });
});

function generarTablero(familiasPermitidas) {
  let poolElementos = [];
  familiasPermitidas.forEach(fam => {
    if (FAMILIAS_METALES[fam]) poolElementos.push(...FAMILIAS_METALES[fam]);
  });

  if (poolElementos.length === 0) poolElementos = FAMILIAS_METALES.monovalentes;

  let cartas = [];
  let cardId = 1;

  poolElementos.forEach(elem => {
    const grupoId = elem.nombre;
    cartas.push({ id: cardId++, tipo: 'nombre', contenido: elem.nombre, grupoId, revelada: false, emparejada: false });
    cartas.push({ id: cardId++, tipo: 'simbolo', contenido: elem.simbolo, grupoId, revelada: false, emparejada: false });
    cartas.push({ id: cardId++, tipo: 'valencia', contenido: elem.valencia, grupoId, revelada: false, emparejada: false });
  });

  return cartas.sort(() => 0.5 - Math.random());
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor activo en el puerto ${PORT}`));
