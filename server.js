const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

const rooms = {};

const valenciaDatabase = [
  // --- MONOVALENTES (Val. 1 / -1) ---
  { id: "li", elem: "Litio", sym: "Li", val: "+1", cat: "mono" },
  { id: "na", elem: "Sodio", sym: "Na", val: "+1", cat: "mono" },
  { id: "k", elem: "Potasio", sym: "K", val: "+1", cat: "mono" },
  { id: "ag", elem: "Plata", sym: "Ag", val: "+1", cat: "mono" },
  { id: "f", elem: "Flúor", sym: "F", val: "-1", cat: "mono" },
  { id: "h", elem: "Hidrógeno", sym: "H", val: "+1", cat: "mono" },

  // --- DIVALENTES (Val. 2 / -2) ---
  { id: "ca", elem: "Calcio", sym: "Ca", val: "+2", cat: "di" },
  { id: "mg", elem: "Magnesio", sym: "Mg", val: "+2", cat: "di" },
  { id: "zn", elem: "Zinc", sym: "Zn", val: "+2", cat: "di" },
  { id: "ba", elem: "Bario", sym: "Ba", val: "+2", cat: "di" },
  { id: "be", elem: "Berilio", sym: "Be", val: "+2", cat: "di" },
  { id: "o", elem: "Oxígeno", sym: "O", val: "-2", cat: "di" },

  // --- TRIVALENTES (Val. 3 / -3) ---
  { id: "al", elem: "Aluminio", sym: "Al", val: "+3", cat: "tri" },
  { id: "b", elem: "Boro", sym: "B", val: "+3", cat: "tri" },
  { id: "bi", elem: "Bismuto", sym: "Bi", val: "+3", cat: "tri" },
  { id: "n", elem: "Nitrógeno", sym: "N", val: "-3, +3, +5", cat: "tri" },

  // --- TETRAVALENTES (Val. 4) ---
  { id: "c", elem: "Carbono", sym: "C", val: "-4, +2, +4", cat: "tetra" },
  { id: "si", elem: "Silicio", sym: "Si", val: "+4", cat: "tetra" },
  { id: "pt", elem: "Platino", sym: "Pt", val: "+2, +4", cat: "tetra" },

  // --- VARIABLE ---
  { id: "cu", elem: "Cobre", sym: "Cu", val: "+1, +2", cat: "variable" },
  { id: "hg", elem: "Mercurio", sym: "Hg", val: "+1, +2", cat: "variable" },
  { id: "au", elem: "Oro", sym: "Au", val: "+1, +3", cat: "variable" },
  { id: "fe", elem: "Hierro", sym: "Fe", val: "+2, +3", cat: "variable" },
  { id: "co", elem: "Cobalto", sym: "Co", val: "+2, +3", cat: "variable" },
  { id: "ni", elem: "Níquel", sym: "Ni", val: "+2, +3", cat: "variable" },
  { id: "pb", elem: "Plomo", sym: "Pb", val: "+2, +4", cat: "variable" },
  { id: "sn", elem: "Estaño", sym: "Sn", val: "+2, +4", cat: "variable" },

  // --- POLIVALENTES ---
  { id: "s", elem: "Azufre", sym: "S", val: "-2, +2, +4, +6", cat: "polivalente" },
  { id: "cl", elem: "Cloro", sym: "Cl", val: "-1, +1, +3, +5, +7", cat: "polivalente" },
  { id: "br", elem: "Bromo", sym: "Br", val: "-1, +1, +3, +5, +7", cat: "polivalente" },
  { id: "i", elem: "Yodo", sym: "Y", val: "-1, +1, +3, +5, +7", cat: "polivalente" },
  { id: "p", elem: "Fósforo", sym: "P", val: "-3, +3, +5", cat: "polivalente" }
];

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getSortedPlayers(room) {
  return Object.entries(room.players).map(([id, p]) => ({
    id,
    name: p.name,
    score: p.score
  })).sort((a, b) => b.score - a.score);
}

io.on('connection', (socket) => {
  
  socket.on('create_room', ({ title, duration, selectedCategories, elementLimit }) => {
    const roomCode = generateCode();
    
    // Filtrar por categorías seleccionadas y barajar
    let filteredPool = valenciaDatabase.filter(item => selectedCategories.includes(item.cat));
    filteredPool.sort(() => 0.5 - Math.random());

    // Limitar la cantidad de elementos según lo que eligió el usuario
    const pool = filteredPool.slice(0, parseInt(elementLimit));
    
    rooms[roomCode] = {
      title,
      duration: parseInt(duration) * 60,
      pool,
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
    if (!room) return socket.emit('error_message', '⚠️ ACCESO DENEGADO: La sala no existe.');
    if (room.started) return socket.emit('error_message', '⚠️ ACCESO DENEGADO: El desafío ya inició.');

    room.players[socket.id] = { name, score: 0 };
    socket.join(roomCode);

    socket.emit('joined_waiting_room', { title: room.title, name, id: socket.id });
    
    const playerList = getSortedPlayers(room);
    io.to(roomCode).emit('update_player_list', playerList);
    io.to(roomCode).emit('update_leaderboard', playerList);
  });

  socket.on('start_game', (roomCode) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id) return;

    room.started = true;
    let deck = [];

    room.pool.forEach((item, index) => {
      deck.push({ id: `trio_${index}`, text: item.elem, isPower: false });
      deck.push({ id: `trio_${index}`, text: item.sym, isPower: false });
      deck.push({ id: `trio_${index}`, text: item.val, isPower: false });
    });

    // Añadir cartas de poder (Tornado y Bomba)
    deck.push({ id: 'power_tornado_1', text: '🌪️ TORNADO', isPower: true, powerType: 'tornado' });
    deck.push({ id: 'power_bomba_1', text: '💣 BOMBA 3X3', isPower: true, powerType: 'bomba' });

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
        io.to(roomCode).emit('game_over', getSortedPlayers(room));
      }
    }, 1000);
  });

  socket.on('update_score', ({ roomCode, points }) => {
    const room = rooms[roomCode];
    if (room && room.players[socket.id]) {
      room.players[socket.id].score += points;
      io.to(roomCode).emit('update_leaderboard', getSortedPlayers(room));
    }
  });

  socket.on('trigger_global_tornado', (roomCode) => {
    io.to(roomCode).emit('apply_tornado');
  });

  socket.on('disconnect', () => {
    for (const code in rooms) {
      if (rooms[code].players[socket.id]) {
        delete rooms[code].players[socket.id];
        const playerList = getSortedPlayers(rooms[code]);
        io.to(code).emit('update_player_list', playerList);
        io.to(code).emit('update_leaderboard', playerList);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`CyberServer Activo en puerto ${PORT}`));
