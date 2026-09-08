const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

const rooms = {};

const valenciaDatabase = [
  // --- MONOVALENTES (+1) ---
  { id: "li", elem: "Litio", sym: "Li", val: "+1", cat: "mono" },
  { id: "na", elem: "Sodio", sym: "Na", val: "+1", cat: "mono" },
  { id: "k", elem: "Potasio", sym: "K", val: "+1", cat: "mono" },
  { id: "rb", elem: "Rubidio", sym: "Rb", val: "+1", cat: "mono" },
  { id: "ag", elem: "Plata", sym: "Ag", val: "+1", cat: "mono" },
  { id: "cs", elem: "Cesio", sym: "Cs", val: "+1", cat: "mono" },
  { id: "fr", elem: "Francio", sym: "Fr", val: "+1", cat: "mono" },
  { id: "nh4", elem: "Amonio", sym: "NH₄", val: "+1", cat: "mono" },

  // --- DIVALENTES (+2) ---
  { id: "mg", elem: "Magnesio", sym: "Mg", val: "+2", cat: "di" },
  { id: "ca", elem: "Calcio", sym: "Ca", val: "+2", cat: "di" },
  { id: "zn", elem: "Zinc", sym: "Zn", val: "+2", cat: "di" },
  { id: "ba", elem: "Bario", sym: "Ba", val: "+2", cat: "di" },
  { id: "be", elem: "Berilio", sym: "Be", val: "+2", cat: "di" },
  { id: "cd", elem: "Cadmio", sym: "Cd", val: "+2", cat: "di" },
  { id: "sr", elem: "Estroncio", sym: "Sr", val: "+2", cat: "di" },
  { id: "ra", elem: "Radio", sym: "Ra", val: "+2", cat: "di" },

  // --- TRIVALENTES (+3) ---
  { id: "al", elem: "Aluminio", sym: "Al", val: "+3", cat: "tri" },
  { id: "sc", elem: "Escandio", sym: "Sc", val: "+3", cat: "tri" },
  { id: "ga", elem: "Galio", sym: "Ga", val: "+3", cat: "tri" },
  { id: "y", elem: "Ytrio", sym: "Y", val: "+3", cat: "tri" },
  { id: "in", elem: "Indio", sym: "In", val: "+3", cat: "tri" },
  { id: "la", elem: "Lantano", sym: "La", val: "+3", cat: "tri" },
  { id: "ac", elem: "Actinio", sym: "Ac", val: "+3", cat: "tri" },
  { id: "cr3", elem: "Cromo", sym: "Cr", val: "+3", cat: "tri" },
  { id: "lu", elem: "Lutecio", sym: "Lu", val: "+3", cat: "tri" },

  // --- MONO-DIVALENTES ---
  { id: "cu", elem: "Cobre", sym: "Cu", val: "+1, +2", cat: "variable" },
  { id: "hg", elem: "Mercurio", sym: "Hg", val: "+1, +2", cat: "variable" },

  // --- MONO-TRIVALENTES ---
  // CORREGIDO: Au y Tl son mono-trivalentes (+1, +3), no +1,+2 (ese error
  // hacía que la valencia químicamente correcta de Oro/Talio no existiera
  // nunca en el mazo, así que el trío jamás podía "reconocerse").
  { id: "au", elem: "Oro", sym: "Au", val: "+1, +3", cat: "variable" },
  { id: "tl", elem: "Talio", sym: "Tl", val: "+1, +3", cat: "variable" },

  // --- DI-TRIVALENTES ---
  { id: "fe", elem: "Hierro", sym: "Fe", val: "+2, +3", cat: "variable" },
  { id: "co", elem: "Cobalto", sym: "Co", val: "+2, +3", cat: "variable" },
  { id: "ni", elem: "Níquel", sym: "Ni", val: "+2, +3", cat: "variable" },
  { id: "sm", elem: "Samario", sym: "Sm", val: "+2, +3", cat: "variable" },
  { id: "eu", elem: "Europio", sym: "Eu", val: "+2, +3", cat: "variable" },
  { id: "yb", elem: "Yterbio", sym: "Yb", val: "+2, +3", cat: "variable" },
  { id: "tm", elem: "Tulio", sym: "Tm", val: "+2, +3", cat: "variable" },

  // --- DI-TETRAVALENTES ---
  { id: "pb", elem: "Plomo", sym: "Pb", val: "+2, +4", cat: "tetra" },
  { id: "ge", elem: "Germanio", sym: "Ge", val: "+2, +4", cat: "tetra" },
  { id: "sn", elem: "Estaño", sym: "Sn", val: "+2, +4", cat: "tetra" },
  { id: "pt", elem: "Platino", sym: "Pt", val: "+2, +4", cat: "tetra" },
  { id: "po", elem: "Polonio", sym: "Po", val: "+2, +4", cat: "tetra" },
  { id: "pd", elem: "Paladio", sym: "Pd", val: "+2, +4", cat: "tetra" },

  // --- POLIVALENTES ---
  { id: "cr_poly", elem: "Cromo (Polivalente)", sym: "Cr", val: "+2, +3, +6", cat: "polivalente" },
  { id: "mn", elem: "Manganeso", sym: "Mn", val: "+2, +3, +4, +6, +7", cat: "polivalente" },
  { id: "bi", elem: "Bismuto", sym: "Bi", val: "+3, +5", cat: "polivalente" },
  { id: "ti", elem: "Titanio", sym: "Ti", val: "+2, +3, +4", cat: "polivalente" },
  { id: "v", elem: "Vanadio", sym: "V", val: "+2, +3, +4, +5", cat: "polivalente" },
  { id: "mo", elem: "Molibdeno", sym: "Mo", val: "+2, +3, +4, +5, +6", cat: "polivalente" },
  { id: "w", elem: "Wolframio", sym: "W", val: "+2, +3, +4, +5, +6", cat: "polivalente" },
  { id: "re", elem: "Renio", sym: "Re", val: "+1, +2, +3, +4, +6, +7", cat: "polivalente" },
  { id: "os", elem: "Osmio", sym: "Os", val: "+2, +3, +4, +6, +8", cat: "polivalente" },
  { id: "u", elem: "Uranio", sym: "U", val: "+3, +4, +5, +6", cat: "polivalente" },
  { id: "am", elem: "Americio", sym: "Am", val: "+3, +4, +5, +6", cat: "polivalente" },
  { id: "ru", elem: "Rutenio", sym: "Ru", val: "+2, +3, +4", cat: "polivalente" },
  { id: "np", elem: "Neptunio", sym: "Np", val: "+3, +4, +5, +6", cat: "polivalente" },
  { id: "ir", elem: "Iridio", sym: "Ir", val: "+2, +3, +4, +6", cat: "polivalente" }
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

    let filteredPool = valenciaDatabase.filter(item => selectedCategories.includes(item.cat));
    filteredPool.sort(() => 0.5 - Math.random());

    const limit = parseInt(elementLimit) || filteredPool.length;
    const pool = filteredPool.slice(0, limit);

    rooms[roomCode] = {
      title,
      duration: parseInt(duration) * 60,
      pool,
      hostId: socket.id,
      started: false,
      players: {},
      deck: [],
      tornadoUsed: false
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

    socket.emit('joined_waiting_room', { title: room.title, name, id: socket.id, isHost: false });

    const playerList = getSortedPlayers(room);
    io.to(roomCode).emit('update_player_list', playerList);
    io.to(roomCode).emit('update_leaderboard', playerList);
  });

  socket.on('start_game', (roomCode) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id) return;

    room.started = true;
    let deck = [];

    room.pool.forEach((item) => {
      deck.push({ matchKey: item.id, text: item.elem, isPower: false, type: 'name', val: item.val });
      deck.push({ matchKey: item.id, text: item.sym, isPower: false, type: 'symbol', val: item.val });
      deck.push({ matchKey: item.id, text: item.val, isPower: false, type: 'valencia', val: item.val });
    });

    deck.push({ matchKey: 'power_tornado', text: '🌪️ TORNADO', isPower: true, powerType: 'tornado' });
    deck.push({ matchKey: 'power_bomba', text: '💣 BOMBA 3X3', isPower: true, powerType: 'bomba' });

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
    const room = rooms[roomCode];
    // Una sola vez por sala: si algún jugador ya lo usó, se ignora aunque
    // otro jugador todavía tenga su propia copia de la carta sin voltear.
    if (!room || room.tornadoUsed) return;
    room.tornadoUsed = true;
    io.to(roomCode).emit('apply_tornado');
  });

  socket.on('trigger_global_bomb', ({ roomCode, centerIndex }) => {
    io.to(roomCode).emit('apply_bomb', centerIndex);
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
