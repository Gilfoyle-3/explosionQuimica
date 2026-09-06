const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static('public'));

// Base de Datos de Elementos Químicos
const DB_ELEMENTOS = [
  { nombre: 'Hidrógeno', simbolo: 'H', valencia: '+1', categoria: 'monovalentes' },
  { nombre: 'Sodio', simbolo: 'Na', valencia: '+1', categoria: 'monovalentes' },
  { nombre: 'Potasio', simbolo: 'K', valencia: '+1', categoria: 'monovalentes' },
  { nombre: 'Calcio', simbolo: 'Ca', valencia: '+2', categoria: 'divalentes' },
  { nombre: 'Magnesio', simbolo: 'Mg', valencia: '+2', categoria: 'divalentes' },
  { nombre: 'Aluminio', simbolo: 'Al', valencia: '+3', categoria: 'trivalentes' },
  { nombre: 'Hierro (II)', simbolo: 'Fe', valencia: '+2', categoria: 'polivalentes' },
  { nombre: 'Hierro (III)', simbolo: 'Fe', valencia: '+3', categoria: 'polivalentes' },
  { nombre: 'Cobre (I)', simbolo: 'Cu', valencia: '+1', categoria: 'polivalentes' },
  { nombre: 'Cobre (II)', simbolo: 'Cu', valencia: '+2', categoria: 'polivalentes' },
  { nombre: 'Oxígeno', simbolo: 'O', valencia: '-2', categoria: 'no_metales' },
  { nombre: 'Cloro', simbolo: 'Cl', valencia: '-1', categoria: 'no_metales' }
];

// Estructura de Salas activas
const salas = {};

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  // 1. CREAR SALA (Anfitrión)
  socket.on('crear_sala', ({ numElementos }) => {
    const codigoSala = Math.floor(100000 + Math.random() * 900000).toString();
    const elementosCount = parseInt(numElementos) || 8;

    salas[codigoSala] = {
      anfitrion: socket.id,
      estado: 'esperando', // 'esperando' o 'jugando'
      numElementos: elementosCount,
      jugadores: [],
      tablero: [],
      puntuaciones: {}
    };

    socket.join(codigoSala);
    socket.emit('sala_creada', { codigoSala, numElementos: elementosCount });
  });

  // 2. UNIRSE A SALA (Jugador)
  socket.on('unirse_sala', ({ codigoSala, nickname }) => {
    const sala = salas[codigoSala];

    if (!sala) {
      return socket.emit('error_login', 'La sala no existe.');
    }

    if (sala.estado !== 'esperando') {
      return socket.emit('error_login', 'El concurso ya ha iniciado.');
    }

    // Validación de nombres duplicados
    const nombreExiste = sala.jugadores.some(
      (j) => j.nickname.toLowerCase() === nickname.trim().toLowerCase()
    );

    if (nombreExiste) {
      return socket.emit('error_login', 'Ese nombre ya está en uso en esta sala. Elige otro.');
    }

    // Agregar jugador a la sala de espera
    const nuevoJugador = { id: socket.id, nickname: nickname.trim(), puntos: 0 };
    sala.jugadores.push(nuevoJugador);
    sala.puntuaciones[socket.id] = { nickname: nickname.trim(), puntos: 0 };

    socket.join(codigoSala);
    socket.emit('unido_exitosamente', { codigoSala, nickname: nickname.trim() });

    // Notificar a todos en la sala la lista actualizada de espera
    io.to(codigoSala).emit('actualizar_lista_espera', { jugadores: sala.jugadores });
  });

  // 3. INICIAR CONCURSO (Solo el anfitrión)
  socket.on('iniciar_concurso', ({ codigoSala }) => {
    const sala = salas[codigoSala];
    if (!sala || sala.anfitrion !== socket.id) return;

    if (sala.jugadores.length === 0) {
      return socket.emit('error_inicio', 'No hay jugadores en la sala de espera.');
    }

    // Generar cartas según la cantidad de elementos elegida
    sala.tablero = generarTablero(sala.numElementos);
    sala.estado = 'jugando';

    // Enviar el inicio del juego a todos los miembros de la sala
    io.to(codigoSala).emit('concurso_iniciado', {
      tablero: sala.tablero,
      puntuaciones: sala.puntuaciones
    });
  });

  // 4. DESCONEXIÓN
  socket.on('disconnect', () => {
    for (const codigo in salas) {
      const sala = salas[codigo];
      const index = sala.jugadores.findIndex((j) => j.id === socket.id);

      if (index !== -1) {
        sala.jugadores.splice(index, 1);
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

// Función para generar las cartas aleatorias según la cantidad de elementos seleccionada
function generarTablero(cantidadElementos) {
  // Mezclar base de datos y seleccionar N elementos
  const shuffledDB = [...DB_ELEMENTOS].sort(() => 0.5 - Math.random());
  const seleccionados = shuffledDB.slice(0, Math.min(cantidadElementos, DB_ELEMENTOS.length));

  let cartas = [];
  let cardId = 1;

  seleccionados.forEach((elem) => {
    const grupoId = elem.nombre;

    cartas.push({ id: cardId++, tipo: 'nombre', contenido: elem.nombre, grupoId, revelada: false, emparejada: false });
    cartas.push({ id: cardId++, tipo: 'simbolo', contenido: elem.simbolo, grupoId, revelada: false, emparejada: false });
    cartas.push({ id: cardId++, tipo: 'valencia', contenido: elem.valencia, grupoId, revelada: false, emparejada: false });
  });

  // Agregar cartas de poder
  cartas.push({ id: cardId++, tipo: 'poder', contenido: 'BOMBA', efecto: 'bomba', revelada: false, emparejada: false });
  cartas.push({ id: cardId++, tipo: 'poder', contenido: 'TORNADO', efecto: 'tornado', revelada: false, emparejada: false });

  // Barajar todo el mazo
  return cartas.sort(() => 0.5 - Math.random());
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor ejecutándose en http://localhost:${PORT}`));
