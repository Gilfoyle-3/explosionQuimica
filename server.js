const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

const rooms = {};

// TABLA DE VALENCIAS COMPLETA Y CATEGORIZADA
const valenciaDatabase = [
  // Metales - Valencia Fija
  { elem: "Litio", sym: "Li", val: "+1", cat: "metales_fija" },
  { elem: "Sodio", sym: "Na", val: "+1", cat: "metales_fija" },
  { elem: "Potasio", sym: "K", val: "+1", cat: "metales_fija" },
  { elem: "Plata", sym: "Ag", val: "+1", cat: "metales_fija" },
  { elem: "Calcio", sym: "Ca", val: "+2", cat: "metales_fija" },
  { elem: "Magnesio", sym: "Mg", val: "+2", cat: "metales_fija" },
  { elem: "Zinc", sym: "Zn", val: "+2", cat: "metales_fija" },
  { elem: "Aluminio", sym: "Al", val: "+3", cat: "metales_fija" },

  // Metales - Valencia Variable
  { elem: "Cobre", sym: "Cu", val: "+1, +2", cat: "metales_variable" },
  { elem: "Mercurio", sym: "Hg", val: "+1, +2", cat: "metales_variable" },
  { elem: "Oro", sym: "Au", val: "+1, +3", cat: "metales_variable" },
  { elem: "Hierro", sym: "Fe", val: "+2, +3", cat: "metales_variable" },
  { elem: "Cobalto", sym: "Co", val: "+2, +3", cat: "metales_variable" },
  { elem: "Níquel", sym: "Ni", val: "+2, +3", cat: "metales_variable" },
  { elem: "Plomo", sym: "Pb", val: "+2, +4", cat: "metales_variable" },
  { elem: "Estaño", sym: "Sn", val: "+2, +4", cat: "metales_variable" },
  { elem: "Manganeso", sym: "Mn", val: "+2, +3, +4, +6, +7", cat: "metales_variable" },

  // No Metales - Halógenos
  { elem: "Flúor", sym: "F", val: "-1", cat: "halogenos" },
  { elem: "Cloro", sym: "Cl", val: "-1, +1, +3, +5, +7", cat: "halogenos" },
  { elem: "Bromo", sym: "Br", val: "-1, +1, +3, +5, +7", cat: "halogenos" },
  { elem: "Yodo", sym: "I", val: "-1, +1, +3, +5, +7", cat: "halogenos" },

  // No Metales - Anfígenos
  { elem: "Oxígeno", sym: "O", val: "-2", cat: "anfigenos" },
  { elem: "Azufre", sym: "S", val: "-2, +2, +4, +6", cat: "anfigenos" },
  { elem: "Selenio", sym: "Se", val: "-2, +2, +4, +6", cat: "anfigenos" },
  { elem: "Telurio", sym: "Te", val: "-2, +2, +4, +6", cat: "anfigenos" },

  // No Metales - Nitrogenoides
  { elem: "Nitrógeno", sym: "N", val: "-3, +1, +2, +3, +4, +5", cat: "nitrogenoides" },
  { elem: "Fósforo", sym: "P", val: "-3, +3, +5", cat: "nitrogenoides" },
  { elem: "Arsénico", sym: "As", val: "-3, +3, +5", cat: "nitrogenoides" },

  // No Metales - Carbonoides
  { elem: "Carbono", sym: "C", val: "-4, +2, +4", cat: "carbonoides" },
  { elem: "Silicio", sym: "Si", val: "-4, +4", cat: "carbonoides" }
];

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

io.on('connection', (socket) => {
  
  socket.on('create_room', ({ title, duration, elementCount, categories }) => {
    const roomCode = generateCode();
    rooms[roomCode] = {
      title,
      duration: parseInt(duration) * 60,
      elementCount: parseInt(elementCount),
      categories, // Array con las familias seleccionadas
      hostId: socket.id,
      started: false,
      players: {},
      deck: []
    };
    
    socket.join(roomCode);
    socket.emit('room_created', { roomCode, title });
  });

  socket.on('join_room', ({ name, roomCode }) => {
    const room = rooms[roomCode];

    if (!room) return socket.emit('error_message', 'La sala no existe.');
    if (room.started) return socket.emit('error_message', 'El concurso ya ha iniciado.');

    room.players[socket.id] = { name, score: 0 };
    socket.join(roomCode);

    socket.emit('joined_waiting_room', { title: room.title, name });
    io.to(roomCode).emit('update_player_list', Object.values(room.players));
  });

  socket.on('start_game', (roomCode) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id) return;

    room.started = true;

    // Filtrar elementos según el array de familias seleccionadas
    let pool = valenciaDatabase;
    if (room.categories && !room.categories.includes('todos')) {
      pool = valenciaDatabase.filter(item => room.categories.includes(item.cat));
    }

    // Si la selección dio muy pocos elementos, usar toda la base para evitar fallos
    if (pool.length < room.elementCount) {
      pool = valenciaDatabase;
    }

    const selected = [...pool].sort(() => 0.5 - Math.random()).slice(0, room.elementCount);
    let deck = [];

    // Agregar Tríos de cartas
    selected.forEach((item, index) => {
      deck.push({ id: `trio_${index}`, text: item.elem, isPower: false });
      deck.push({ id: `trio_${index}`, text: item.sym, isPower: false });
      deck.push({ id: `trio_${index}`, text: item.val, isPower: false });
    });

    // Agregar cartas de poder mezcladas en el tablero (2 Tornados, 2 Bombas)
    deck.push({ id: 'power_tornado_1', text: '🌪️ Tornado', isPower: true, powerType: 'tornado' });
    deck.push({ id: 'power_tornado_2', text: '🌪️ Tornado', isPower: true, powerType: 'tornado' });
    deck.push({ id: 'power_bomba_1', text: '💣 Bomba', isPower: true, powerType: 'bomba' });
    deck.push({ id: 'power_bomba_2', text: '💣 Bomba', isPower: true, powerType: 'bomba' });

    // Mezclar el mazo completo
    room.deck = deck.sort(() => 0.5 - Math.random());

    io.to(roomCode).emit('game_started', {
      deck: room.deck,
      duration: room.duration
    });

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

  socket.on('update_score', ({ roomCode, points }) => {
    const room = rooms[roomCode];
    if (room && room.players[socket.id]) {
      room.players[socket.id].score += points;
      io.to(roomCode).emit('update_leaderboard', Object.values(room.players).sort((a,b) => b.score - a.score));
    }
  });

  socket.on('trigger_global_tornado', (roomCode) => {
    io.to(roomCode).emit('apply_tornado');
  });

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
server.listen(PORT, () => console.log(`Servidor iniciado en puerto ${PORT}`));
