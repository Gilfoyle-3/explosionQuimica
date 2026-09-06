const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

// ==========================================
// TABLA COMPLETA DE METALES (42 ELEMENTOS)
// ==========================================
const DB_ELEMENTOS = [
  // Monovalentes (+1)
  { nombre: 'Litio', simbolo: 'Li', valencia: '+1' },
  { nombre: 'Sodio', simbolo: 'Na', valencia: '+1' },
  { nombre: 'Potasio', simbolo: 'K', valencia: '+1' },
  { nombre: 'Rubidio', simbolo: 'Rb', valencia: '+1' },
  { nombre: 'Plata', simbolo: 'Ag', valencia: '+1' },
  { nombre: 'Cesio', simbolo: 'Cs', valencia: '+1' },
  { nombre: 'Francio', simbolo: 'Fr', valencia: '+1' },
  { nombre: 'Amonio', simbolo: 'NH₄', valencia: '+1' },

  // Divalentes (+2)
  { nombre: 'Magnesio', simbolo: 'Mg', valencia: '+2' },
  { nombre: 'Calcio', simbolo: 'Ca', valencia: '+2' },
  { nombre: 'Zinc', simbolo: 'Zn', valencia: '+2' },
  { nombre: 'Bario', simbolo: 'Ba', valencia: '+2' },
  { nombre: 'Berilio', simbolo: 'Be', valencia: '+2' },
  { nombre: 'Cadmio', simbolo: 'Cd', valencia: '+2' },
  { nombre: 'Estroncio', simbolo: 'Sr', valencia: '+2' },
  { nombre: 'Radio', simbolo: 'Ra', valencia: '+2' },

  // Trivalentes (+3)
  { nombre: 'Aluminio', simbolo: 'Al', valencia: '+3' },
  { nombre: 'Escandio', simbolo: 'Sc', valencia: '+3' },
  { nombre: 'Galio', simbolo: 'Ga', valencia: '+3' },
  { nombre: 'Ytrio', simbolo: 'Y', valencia: '+3' },
  { nombre: 'Indio', simbolo: 'In', valencia: '+3' },
  { nombre: 'Lantano', simbolo: 'La', valencia: '+3' },
  { nombre: 'Actinio', simbolo: 'Ac', valencia: '+3' },
  { nombre: 'Lutecio', simbolo: 'Lu', valencia: '+3' },

  // Mono-divalentes (+1, +2)
  { nombre: 'Cobre', simbolo: 'Cu', valencia: '+1, +2' },
  { nombre: 'Mercurio', simbolo: 'Hg', valencia: '+1, +2' },

  // Mono-trivalentes (+1, +3)
  { nombre: 'Oro', simbolo: 'Au', valencia: '+1, +3' },
  { nombre: 'Talio', simbolo: 'Tl', valencia: '+1, +3' },

  // Di-trivalentes (+2, +3)
  { nombre: 'Hierro', simbolo: 'Fe', valencia: '+2, +3' },
  { nombre: 'Cobalto', simbolo: 'Co', valencia: '+2, +3' },
  { nombre: 'Níquel', simbolo: 'Ni', valencia: '+2, +3' },
  { nombre: 'Samario', simbolo: 'Sm', valencia: '+2, +3' },
  { nombre: 'Europio', simbolo: 'Eu', valencia: '+2, +3' },
  { nombre: 'Yterbio', simbolo: 'Yb', valencia: '+2, +3' },
  { nombre: 'Tulio', simbolo: 'Tm', valencia: '+2, +3' },

  // Di-tetravalentes (+2, +4)
  { nombre: 'Plomo', simbolo: 'Pb', valencia: '+2, +4' },
  { nombre: 'Germanio', simbolo: 'Ge', valencia: '+2, +4' },
  { nombre: 'Estaño', simbolo: 'Sn', valencia: '+2, +4' },
  { nombre: 'Platino', simbolo: 'Pt', valencia: '+2, +4' },
  { nombre: 'Polonio', simbolo: 'Po', valencia: '+2, +4' },
  { nombre: 'Paladio', simbolo: 'Pd', valencia: '+2, +4' },

  // Polivalentes
  { nombre: 'Cromo', simbolo: 'Cr', valencia: '+2, +3, +6' },
  { nombre: 'Manganeso', simbolo: 'Mn', valencia: '+2, +3, +4, +6, +7' },
  { nombre: 'Bismuto', simbolo: 'Bi', valencia: '+3, +5' },
  { nombre: 'Titanio', simbolo: 'Ti', valencia: '+2, +3, +4' },
  { nombre: 'Vanadio', simbolo: 'V', valencia: '+2, +3, +4, +5' },
  { nombre: 'Molibdeno', simbolo: 'Mo', valencia: '+2, +3, +4, +5, +6' },
  { nombre: 'Wolframio', simbolo: 'W', valencia: '+2, +3, +4, +5, +6' },
  { nombre: 'Renio', simbolo: 'Re', valencia: '+1, +2, +3, +4, +6, +7' },
  { nombre: 'Osmio', simbolo: 'Os', valencia: '+2, +3, +4, +6, +8' },
  { nombre: 'Uranio', simbolo: 'U', valencia: '+3, +4, +5, +6' },
  { nombre: 'Americio', simbolo: 'Am', valencia: '+3, +4, +5, +6' },
  { nombre: 'Rutenio', simbolo: 'Ru', valencia: '+2, +3, +4' },
  { nombre: 'Neptunio', simbolo: 'Np', valencia: '+3, +4, +5, +6' },
  { nombre: 'Iridio', simbolo: 'Ir', valencia: '+2, +3, +4, +6' }
];

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
      configuracion: {
        nombreConcurso: 'Torneo de Valencias Química',
        duracionSegundos: 120,
        maxElementosDisponibles: DB_ELEMENTOS.length
      }
    };

    socket.join(codigoSala);
    socket.emit('sala_creada', { codigoSala, maxElementos: DB_ELEMENTOS.length });
  });

  socket.on('unirse_sala', ({ codigoSala, nickname }) => {
    const sala = salas[codigoSala];

    if (!sala) return socket.emit('error_login', 'La sala no existe.');
    if (sala.estado !== 'esperando') return socket.emit('error_login', 'El concurso ya inició.');

    const existe = sala.jugadores.some(j => j.nickname.toLowerCase() === nickname.trim().toLowerCase());
    if (existe) return socket.emit('error_login', 'Ese apodo ya está en uso.');

    const nuevoJugador = { id: socket.id, nickname: nickname.trim(), puntos: 0 };
    sala.jugadores.push(nuevoJugador);
    sala.puntuaciones[socket.id] = { nickname: nickname.trim(), puntos: 0 };

    socket.join(codigoSala);
    socket.emit('unido_exitosamente', { codigoSala });
    io.to(codigoSala).emit('actualizar_lista_espera', { jugadores: sala.jugadores });
  });

  socket.on('iniciar_concurso', ({ codigoSala, nombreConcurso, duracionSegundos, numElementos }) => {
    const sala = salas[codigoSala];
    if (!sala || sala.anfitrion !== socket.id) return;

    const cantidad = Math.min(Math.max(4, parseInt(numElementos, 10) || 8), DB_ELEMENTOS.length);
    sala.configuracion.nombreConcurso = nombreConcurso;
    sala.configuracion.duracionSegundos = duracionSegundos;
    sala.tablero = generarTablero(cantidad);
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

    const carta = sala.tablero.find(c => c.id === cartaId);
    if (!carta || carta.revelada || carta.emparejada) return;

    carta.revelada = true;
    io.to(codigoSala).emit('actualizar_tablero', { tablero: sala.tablero });
  });

  socket.on('disconnect', () => {
    for (const codigo in salas) {
      const sala = salas[codigo];
      const idx = sala.jugadores.findIndex(j => j.id === socket.id);
      if (idx !== -1) {
        sala.jugadores.splice(idx, 1);
        delete sala.puntuaciones[socket.id];

        if (sala.estado === 'esperando') {
          io.to(codigo).emit('actualizar_lista_espera', { jugadores: sala.jugadores });
        } else {
          io.to(codigo).emit('actualizar_puntuaciones', { puntuaciones: sala.puntuaciones });
        }
        break;
      }
    }
  });
});

function generarTablero(cantidad) {
  const mezclados = [...DB_ELEMENTOS].sort(() => 0.5 - Math.random());
  const seleccion = mezclados.slice(0, cantidad);

  let cartas = [];
  let cardId = 1;

  seleccion.forEach(elem => {
    const grupoId = elem.nombre;
    cartas.push({ id: cardId++, tipo: 'nombre', contenido: elem.nombre, grupoId, revelada: false, emparejada: false });
    cartas.push({ id: cardId++, tipo: 'simbolo', contenido: elem.simbolo, grupoId, revelada: false, emparejada: false });
    cartas.push({ id: cardId++, tipo: 'valencia', contenido: elem.valencia, grupoId, revelada: false, emparejada: false });
  });

  cartas.push({ id: cardId++, tipo: 'poder', contenido: '💣 BOMBA', efecto: 'bomba', revelada: false, emparejada: false });
  cartas.push({ id: cardId++, tipo: 'poder', contenido: '🌪️ TORNADO', efecto: 'tornado', revelada: false, emparejada: false });

  return cartas.sort(() => 0.5 - Math.random());
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor activo en el puerto ${PORT}`));
