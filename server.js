const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static('public'));

// Almacenamiento temporal en memoria RAM (Sin base de datos)
const rooms = {};

// TABLA DE VALENCIAS COMPLETA
const valenciaDatabase = [
  // --- METALES ---
  // Monovalentes (+1)
  { elem: "Litio", sym: "Li", val: "+1", cat: "metales" },
  { elem: "Sodio", sym: "Na", val: "+1", cat: "metales" },
  { elem: "Potasio", sym: "K", val: "+1", cat: "metales" },
  { elem: "Rubidio", sym: "Rb", val: "+1", cat: "metales" },
  { elem: "Cesio", sym: "Cs", val: "+1", cat: "metales" },
  { elem: "Francio", sym: "Fr", val: "+1", cat: "metales" },
  { elem: "Plata", sym: "Ag", val: "+1", cat: "metales" },
  { elem: "Amonio", sym: "NH4", val: "+1", cat: "metales" },

  // Divalentes (+2)
  { elem: "Berilio", sym: "Be", val: "+2", cat: "metales" },
  { elem: "Magnesio", sym: "Mg", val: "+2", cat: "metales" },
  { elem: "Calcio", sym: "Ca", val: "+2", cat: "metales" },
  { elem: "Estroncio", sym: "Sr", val: "+2", cat: "metales" },
  { elem: "Bario", sym: "Ba", val: "+2", cat: "metales" },
  { elem: "Radio", sym: "Ra", val: "+2", cat: "metales" },
  { elem: "Zinc", sym: "Zn", val: "+2", cat: "metales" },
  { elem: "Cadmio", sym: "Cd", val: "+2", cat: "metales" },

  // Trivalentes (+3)
  { elem: "Aluminio", sym: "Al", val: "+3", cat: "metales" },
  { elem: "Bismuto", sym: "Bi", val: "+3", cat: "metales" },
  { elem: "Galio", sym: "Ga", val: "+3", cat: "metales" },
  { elem: "Indio", sym: "In", val: "+3", cat: "metales" },

  // Tetravalentes (+4) / Hexavalentes (+6)
  { elem: "Titanio", sym: "Ti", val: "+4", cat: "metales" },
  { elem: "Osmio", sym: "Os", val: "+4", cat: "metales" },
  { elem: "Zirconio", sym: "Zr", val: "+4", cat: "metales" },

  // Valencias Variables (Metales)
  { elem: "Cobre", sym: "Cu", val: "+1, +2", cat: "metales" },
  { elem: "Mercurio", sym: "Hg", val: "+1, +2", cat: "metales" },
  { elem: "Oro", sym: "Au", val: "+1, +3", cat: "metales" },
  { elem: "Talo", sym: "Tl", val: "+1, +3", cat: "metales" },
  { elem: "Hierro", sym: "Fe", val: "+2, +3", cat: "metales" },
  { elem: "Cobalto", sym: "Co", val: "+2, +3", cat: "metales" },
  { elem: "Níquel", sym: "Ni", val: "+2, +3", cat: "metales" },
  { elem: "Plomo", sym: "Pb", val: "+2, +4", cat: "metales" },
  { elem: "Estaño", sym: "Sn", val: "+2, +4", cat: "metales" },
  { elem: "Platino", sym: "Pt", val: "+2, +4", cat: "metales" },
  { elem: "Cromo", sym: "Cr", val: "+2, +3, +6", cat: "metales" },
  { elem: "Manganeso", sym: "Mn", val: "+2, +3, +4, +6, +7", cat: "metales" },

  // --- NO METALES ---
  // Halógenos (-1) / (+1, +3, +5, +7)
  { elem: "Flúor", sym: "F", val: "-1", cat: "nometales" },
  { elem: "Cloro", sym: "Cl", val: "-1, +1, +3, +5, +7", cat: "nometales" },
  { elem: "Bromo", sym: "Br", val: "-1, +1, +3, +5, +7", cat: "nometales" },
  { elem: "Yodo", sym: "I", val: "-1, +1, +3, +5, +7", cat: "nometales" },

  // Anfígenos (-2) / (+2, +4, +6)
  { elem: "Oxígeno", sym: "O", val: "-2", cat: "nometales" },
  { elem: "Azufre", sym: "S", val: "-2, +2, +4, +6", cat: "nometales" },
  { elem: "Selenio", sym: "Se", val: "-2, +2, +4, +6", cat: "nometales" },
  { elem: "Telurio", sym: "Te", val: "-2, +2, +4, +6", cat: "nometales" },

  // Nitrogenoides (-3) / (+1, +2, +3, +4, +5)
  { elem: "Nitrógeno", sym: "N", val: "-3, +1, +2, +3, +4, +5", cat: "nometales" },
  { elem: "Fósforo", sym: "P", val: "-3, +3, +5", cat: "nometales" },
  { elem: "Arsénico", sym: "As", val: "-3, +3, +5", cat: "nometales" },
  { elem: "Antimonio", sym: "Sb", val: "-3, +3, +5", cat: "nometales" },
  { elem: "Boro", sym: "B", val: "-3, +3", cat: "nometales" },

  // Carbonoides (-4) / (+2, +4)
  { elem: "Carbono", sym: "C", val: "-4, +2, +4", cat: "nometales" },
  { elem: "Silicio", sym: "Si", val: "-4, +4", cat: "nometales" },
  { elem: "Germanio", sym: "Ge", val: "-4, +4", cat: "nometales" },

  // Hidrógeno
  { elem: "Hidrógeno", sym: "H", val: "-1, +1", cat: "nometales" }
];

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

io.on('connection', (socket) => {
  
  // Crear sala (Creador/Admin)
  socket.on('create_room', ({ title, duration, elementCount, category }) => {
    const roomCode = generateCode();
    rooms[roomCode] = {
      title,
      duration: parseInt(duration) * 60,
      elementCount: parseInt(elementCount),
      category, // 'metales', 'nometales' o 'todos'
      hostId: socket.id,
      started: false,
      players: {},
      deck: []
    };
    
    socket.join(roomCode);
    socket.emit('room_created', { roomCode, title });
  });

  // Unirse a sala (Jugador)
  socket.on('join_room', ({ name, roomCode }) => {
    const room = rooms[roomCode];

    if (!room) {
      return socket.emit('error_message', 'La sala no existe.');
    }
    if (room.started) {
      return socket.emit('error_message', 'El concurso ya ha iniciado.');
    }

    room.players[socket.id] = { name, score: 0 };
    socket.join(roomCode);

    socket.emit('joined_waiting_room', { title: room.title, name });
    io.to(roomCode).emit('update_player_list', Object.values(room.players));
  });

  // Iniciar Concurso (Creador)
  socket.on('start_game', (roomCode) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id) return;

    room.started = true;

    // Filtrar base de datos según la categoría elegida
    let pool = valenciaDatabase;
    if (room.category === 'metales') {
      pool = valenciaDatabase.filter(item => item.cat === 'metales');
    } else if (room.category === 'nometales') {
      pool = valenciaDatabase.filter(item => item.cat === 'nometales');
    }

    // Seleccionar la cantidad de elementos pedida
    const selected = [...pool].sort(() => 0.5 - Math.random()).slice(0, room.elementCount);
    let deck = [];

    selected.forEach((item, index) => {
      deck.push({ id: `trio_${index}`, text: item.elem, type: 'elem' });
      deck.push({ id: `trio_${index}`, text: item.sym, type: 'sym' });
      deck.push({ id: `trio_${index}`, text: item.val, type: 'val' });
    });

    // Mezclar cartas
    room.deck = deck.sort(() => 0.5 - Math.random());

    // Transmitir inicio a la sala
    io.to(roomCode).emit('game_started', {
      deck: room.deck,
      duration: room.duration
    });

    // Temporizador
    let timer = room.duration;
    const interval = setInterval(() => {
      timer--;
      io.to(roomCode).emit('timer_tick', timer);

      if (timer <= 0) {
        clearInterval(interval);
        io.to(roomCode).emit('game_over', Object.values(room.players));
      }
    }, 1000);
  });

  // Puntuación
  socket.on('update_score', ({ roomCode, points }) => {
    const room = rooms[roomCode];
    if (room && room.players[socket.id]) {
      room.players[socket.id].score += points;
      io.to(roomCode).emit('update_leaderboard', Object.values(room.players).sort((a,b) => b.score - a.score));
    }
  });

  // Evento Poder Tornado
  socket.on('use_tornado', (roomCode) => {
    io.to(roomCode).emit('apply_tornado');
  });

  // Desconexión
  socket.on('disconnect', () => {
    for (const code in rooms) {
      if (rooms[code].players[socket.id]) {
        delete rooms[code].players[socket.id];
        io.to(code).emit('update_player_list', Object.values(rooms[code].players));
        io.to(code).emit('update_leaderboard', Object.values(rooms[code].players).sort((a,b) => b.score - a.score));
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor activo en el puerto ${PORT}`));
