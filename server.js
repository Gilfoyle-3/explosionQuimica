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
// Base de Datos Completa de Metales
const DB_ELEMENTOS = [
  // Monovalentes (+1)
  { nombre: 'Litio', simbolo: 'Li', valencia: '+1', categoria: 'Monovalentes' },
  { nombre: 'Sodio', simbolo: 'Na', valencia: '+1', categoria: 'Monovalentes' },
  { nombre: 'Potasio', simbolo: 'K', valencia: '+1', categoria: 'Monovalentes' },
  { nombre: 'Rubidio', simbolo: 'Rb', valencia: '+1', categoria: 'Monovalentes' },
  { nombre: 'Plata', simbolo: 'Ag', valencia: '+1', categoria: 'Monovalentes' },
  { nombre: 'Cesio', simbolo: 'Cs', valencia: '+1', categoria: 'Monovalentes' },
  { nombre: 'Francio', simbolo: 'Fr', valencia: '+1', categoria: 'Monovalentes' },
  { nombre: 'Amonio', simbolo: 'NH₄', valencia: '+1', categoria: 'Monovalentes' },

  // Divalentes (+2)
  { nombre: 'Magnesio', simbolo: 'Mg', valencia: '+2', categoria: 'Divalentes' },
  { nombre: 'Calcio', simbolo: 'Ca', valencia: '+2', categoria: 'Divalentes' },
  { nombre: 'Zinc', simbolo: 'Zn', valencia: '+2', categoria: 'Divalentes' },
  { nombre: 'Bario', simbolo: 'Ba', valencia: '+2', categoria: 'Divalentes' },
  { nombre: 'Berilio', simbolo: 'Be', valencia: '+2', categoria: 'Divalentes' },
  { nombre: 'Cadmio', simbolo: 'Cd', valencia: '+2', categoria: 'Divalentes' },
  { nombre: 'Estroncio', simbolo: 'Sr', valencia: '+2', categoria: 'Divalentes' },
  { nombre: 'Radio', simbolo: 'Ra', valencia: '+2', categoria: 'Divalentes' },

  // Trivalentes (+3)
  { nombre: 'Aluminio', simbolo: 'Al', valencia: '+3', categoria: 'Trivalentes' },
  { nombre: 'Escandio', simbolo: 'Sc', valencia: '+3', categoria: 'Trivalentes' },
  { nombre: 'Galio', simbolo: 'Ga', valencia: '+3', categoria: 'Trivalentes' },
  { nombre: 'Ytrio', simbolo: 'Y', valencia: '+3', categoria: 'Trivalentes' },
  { nombre: 'Indio', simbolo: 'In', valencia: '+3', categoria: 'Trivalentes' },
  { nombre: 'Lantano', simbolo: 'La', valencia: '+3', categoria: 'Trivalentes' },
  { nombre: 'Actinio', simbolo: 'Ac', valencia: '+3', categoria: 'Trivalentes' },
  { nombre: 'Cromo', simbolo: 'Cr', valencia: '+3', categoria: 'Trivalentes' },
  { nombre: 'Lutecio', simbolo: 'Lu', valencia: '+3', categoria: 'Trivalentes' },

  // Mono-divalentes (+1, +2)
  { nombre: 'Cobre', simbolo: 'Cu', valencia: '+1, +2', categoria: 'Mono-divalentes' },
  { nombre: 'Mercurio', simbolo: 'Hg', valencia: '+1, +2', categoria: 'Mono-divalentes' },

  // Mono-trivalentes (+1, +3)
  { nombre: 'Oro', simbolo: 'Au', valencia: '+1, +3', categoria: 'Mono-trivalentes' },
  { nombre: 'Talio', simbolo: 'Tl', valencia: '+1, +3', categoria: 'Mono-trivalentes' },

  // Di-trivalentes (+2, +3)
  { nombre: 'Hierro', simbolo: 'Fe', valencia: '+2, +3', categoria: 'Di-trivalentes' },
  { nombre: 'Cobalto', simbolo: 'Co', valencia: '+2, +3', categoria: 'Di-trivalentes' },
  { nombre: 'Níquel', simbolo: 'Ni', valencia: '+2, +3', categoria: 'Di-trivalentes' },
  { nombre: 'Samario', simbolo: 'Sm', valencia: '+2, +3', categoria: 'Di-trivalentes' },
  { nombre: 'Europio', simbolo: 'Eu', valencia: '+2, +3', categoria: 'Di-trivalentes' },
  { nombre: 'Yterbio', simbolo: 'Yb', valencia: '+2, +3', categoria: 'Di-trivalentes' },
  { nombre: 'Tulio', simbolo: 'Tm', valencia: '+2, +3', categoria: 'Di-trivalentes' },

  // Di-tetravalentes (+2, +4)
  { nombre: 'Plomo', simbolo: 'Pb', valencia: '+2, +4', categoria: 'Di-tetravalentes' },
  { nombre: 'Germanio', simbolo: 'Ge', valencia: '+2, +4', categoria: 'Di-tetravalentes' },
  { nombre: 'Estaño', simbolo: 'Sn', valencia: '+2, +4', categoria: 'Di-tetravalentes' },
  { nombre: 'Platino', simbolo: 'Pt', valencia: '+2, +4', categoria: 'Di-tetravalentes' },
  { nombre: 'Polonio', simbolo: 'Po', valencia: '+2, +4', categoria: 'Di-tetravalentes' },
  { nombre: 'Paladio', simbolo: 'Pd', valencia: '+2, +4', categoria: 'Di-tetravalentes' },

  // Polivalentes
  { nombre: 'Cromo (Anfótero)', simbolo: 'Cr', valencia: '+2, +3, +6', categoria: 'Polivalentes' },
  { nombre: 'Manganeso', simbolo: 'Mn', valencia: '+2, +3, +4, +6, +7', categoria: 'Polivalentes' },
  { nombre: 'Bismuto', simbolo: 'Bi', valencia: '+3, +5', categoria: 'Polivalentes' },
  { nombre: 'Titanio', simbolo: 'Ti', valencia: '+2, +3, +4', categoria: 'Polivalentes' },
  { nombre: 'Vanadio', simbolo: 'V', valencia: '+2, +3, +4, +5', categoria: 'Polivalentes' },
  { nombre: 'Molibdeno', simbolo: 'Mo', valencia: '+2, +3, +4, +5, +6', categoria: 'Polivalentes' },
  { nombre: 'Wolframio', simbolo: 'W', valencia: '+2, +3, +4, +5, +6', categoria: 'Polivalentes' },
  { nombre: 'Renio', simbolo: 'Re', valencia: '+1, +2, +3, +4, +6, +7', categoria: 'Polivalentes' },
  { nombre: 'Osmio', simbolo: 'Os', valencia: '+2, +3, +4, +6, +8', categoria: 'Polivalentes' },
  { nombre: 'Uranio', simbolo: 'U', valencia: '+3, +4, +5, +6', categoria: 'Polivalentes' },
  { nombre: 'Americio', simbolo: 'Am', valencia: '+3, +4, +5, +6', categoria: 'Polivalentes' },
  { nombre: 'Rutenio', simbolo: 'Ru', valencia: '+2, +3, +4', categoria: 'Polivalentes' },
  { nombre: 'Neptunio', simbolo: 'Np', valencia: '+3, +4, +5, +6', categoria: 'Polivalentes' },
  { nombre: 'Iridio', simbolo: 'Ir', valencia: '+2, +3, +4, +6', categoria: 'Polivalentes' }
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
