const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

const DB_ELEMENTOS = [
  { nombre: 'Litio', simbolo: 'Li', valencia: '+1' },
  { nombre: 'Sodio', simbolo: 'Na', valencia: '+1' },
  { nombre: 'Potasio', simbolo: 'K', valencia: '+1' },
  { nombre: 'Plata', simbolo: 'Ag', valencia: '+1' },
  { nombre: 'Magnesio', simbolo: 'Mg', valencia: '+2' },
  { nombre: 'Calcio', simbolo: 'Ca', valencia: '+2' },
  { nombre: 'Zinc', simbolo: 'Zn', valencia: '+2' },
  { nombre: 'Bario', simbolo: 'Ba', valencia: '+2' },
  { nombre: 'Aluminio', simbolo: 'Al', valencia: '+3' },
  { nombre: 'Cobre', simbolo: 'Cu', valencia: '+1, +2' },
  { nombre: 'Oro', simbolo: 'Au', valencia: '+1, +3' },
  { nombre: 'Hierro', simbolo: 'Fe', valencia: '+2, +3' },
  { nombre: 'Plomo', simbolo: 'Pb', valencia: '+2, +4' },
  { nombre: 'Cromo', simbolo: 'Cr', valencia: '+2, +3, +6' },
  { nombre: 'Manganeso', simbolo: 'Mn', valencia: '+2, +3, +4, +6, +7' },
  { nombre: 'Bismuto', simbolo: 'Bi', valencia: '+3, +5' }
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
        reglas: '1. Forma trios. 2. Evita bombas. 3. Gana el puntaje más alto.'
      }
    };

    socket.join(codigoSala);
    socket.emit('sala_creada', { codigoSala });
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
    socket.emit('unido_exitosamente', { codigoSala, configuracion: sala.configuracion });
    io.to(codigoSala).emit('actualizar_lista_espera', { jugadores: sala.jugadores });
  });

  socket.on('iniciar_concurso', ({ codigoSala, nombreConcurso, duracionSegundos, reglas, numElementos }) => {
    const sala = salas[codigoSala];
    if (!sala || sala.anfitrion !== socket.id) return;

    // Guardar configuración establecida por el anfitrión
    sala.configuracion = { nombreConcurso, duracionSegundos, reglas };
    sala.tablero = generarTablero(numElementos);
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
  const seleccion = mezclados.slice(0, Math.min(cantidad, DB_ELEMENTOS.length));

  let cartas = [];
  let cardId = 1;

  seleccion.forEach(elem => {
    const grupoId = elem.nombre;
    cartas.push({ id: cardId++, tipo: 'nombre', contenido: elem.nombre, grupoId, revelada: false, emparejada: false });
    cartas.push({ id: cardId++, tipo: 'simbolo', contenido: elem.simbolo, grupoId, revelada: false, emparejada: false });
    cartas.push({ id: cardId++, tipo: 'valencia', contenido: elem.valencia, grupoId, revelada: false, emparejada: false });
  });

  cartas.push({ id: cardId++, tipo: 'poder', contenido: 'BOMBA', efecto: 'bomba', revelada: false, emparejada: false });
  cartas.push({ id: cardId++, tipo: 'poder', contenido: 'TORNADO', efecto: 'tornado', revelada: false, emparejada: false });

  return cartas.sort(() => 0.5 - Math.random());
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
