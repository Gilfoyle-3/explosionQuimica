const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

// FIX IMPORTANTE: antes `rooms` era un objeto plano ({}) y `roomCode` en
// join_room viene directo del cliente sin validar. Un cliente malicioso
// podía mandar roomCode = "__proto__" o "constructor": rooms["__proto__"]
// devuelve Object.prototype (que es "truthy"), pasando el chequeo `if (!room)`,
// y el siguiente acceso (room.players[socket.id] = ...) lanza una excepción
// no controlada que puede tumbar el proceso de Node. Con un Map este
// problema desaparece por completo, porque las claves no tocan el prototipo.
const rooms = new Map();

const TRIO_POINTS = 15;
const MIN_DURATION_MIN = 1;
const MAX_DURATION_MIN = 60;
const MIN_ELEMENTS = 3; // se necesita al menos un trío para poder jugar
const ROOM_CLEANUP_DELAY_MS = 10 * 60 * 1000; // borra salas terminadas tras 10 min

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
  { id: "au", elem: "Oro", sym: "Au", val: "+1, +2", cat: "variable" },
  { id: "tl", elem: "Talio", sym: "Tl", val: "+1, +2", cat: "variable" },

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

const VALID_CATEGORIES = new Set(valenciaDatabase.map(item => item.cat));
const ROOM_CODE_REGEX = /^[0-9]{6}$/;

/* ------------------------- Utilidades ------------------------- */

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toSafeString(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function toSafeInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function generateUniqueCode() {
  // FIX: antes no se comprobaba si el código generado ya pertenecía a una
  // sala existente, así que en teoría (aunque poco probable con 900k
  // combinaciones) se podía sobrescribir silenciosamente una sala activa.
  let code;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(code));
  return code;
}

function getSortedPlayers(room) {
  return Object.entries(room.players).map(([id, p]) => ({
    id,
    name: p.name,
    score: p.score
  })).sort((a, b) => b.score - a.score);
}

function clearRoomTimer(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
}

function scheduleRoomCleanup(roomCode) {
  // Evita que `rooms` crezca indefinidamente con partidas ya terminadas.
  setTimeout(() => {
    rooms.delete(roomCode);
  }, ROOM_CLEANUP_DELAY_MS);
}

function endRoom(roomCode, room) {
  clearRoomTimer(room);
  room.started = true;
  room.finished = true;
  io.to(roomCode).emit('game_over', getSortedPlayers(room));
  scheduleRoomCleanup(roomCode);
}

// Evita que una excepción dentro de un handler tumbe el proceso completo.
function safeHandler(fn) {
  return (...args) => {
    try {
      fn(...args);
    } catch (err) {
      console.error('Error manejando evento de socket:', err);
    }
  };
}

/* ------------------------- Conexión ------------------------- */

io.on('connection', (socket) => {

  socket.on('create_room', safeHandler(({ title, duration, selectedCategories, elementLimit }) => {
    const safeTitle = toSafeString(title, 40) || "Nodo_Química";

    const durationMin = clamp(toSafeInt(duration, 5), MIN_DURATION_MIN, MAX_DURATION_MIN);

    // FIX: antes se confiaba en que selectedCategories fuera un array de
    // ids válidos. Ahora se filtra contra las categorías reales conocidas.
    const categories = Array.isArray(selectedCategories)
      ? selectedCategories.filter(c => VALID_CATEGORIES.has(c))
      : [];

    if (categories.length === 0) {
      return socket.emit('error_message', '⚠️ Debes seleccionar al menos una categoría válida.');
    }

    let filteredPool = valenciaDatabase.filter(item => categories.includes(item.cat));
    filteredPool.sort(() => 0.5 - Math.random());

    // FIX: si no hay suficientes elementos para formar ni un solo trío,
    // antes se creaba igual una sala "rota" que nunca podría jugarse.
    if (filteredPool.length < MIN_ELEMENTS) {
      return socket.emit('error_message', '⚠️ No hay suficientes elementos en las categorías elegidas.');
    }

    const limit = clamp(toSafeInt(elementLimit, filteredPool.length), MIN_ELEMENTS, filteredPool.length);
    const pool = filteredPool.slice(0, limit);

    const roomCode = generateUniqueCode();

    rooms.set(roomCode, {
      title: safeTitle,
      duration: durationMin * 60,
      pool,
      hostId: socket.id,
      started: false,
      finished: false,
      players: {},
      deck: [],
      timerInterval: null
    });

    socket.data.roomCode = roomCode;
    socket.data.isHost = true;

    socket.join(roomCode);
    socket.emit('room_created', { roomCode, title: safeTitle });
  }));

  socket.on('join_room', safeHandler(({ name, roomCode }) => {
    const code = toSafeString(roomCode, 6).toUpperCase();
    if (!ROOM_CODE_REGEX.test(code)) {
      return socket.emit('error_message', '⚠️ Código de sala inválido.');
    }

    const room = rooms.get(code);
    if (!room) return socket.emit('error_message', '⚠️ ACCESO DENEGADO: La sala no existe.');
    if (room.started) return socket.emit('error_message', '⚠️ ACCESO DENEGADO: El desafío ya inició.');

    const safeName = toSafeString(name, 20) || `Jugador_${socket.id.slice(0, 4)}`;

    room.players[socket.id] = { name: safeName, score: 0 };
    socket.data.roomCode = code;
    socket.data.isHost = false;
    socket.join(code);

    socket.emit('joined_waiting_room', { title: room.title, name: safeName, id: socket.id, isHost: false });

    const playerList = getSortedPlayers(room);
    io.to(code).emit('update_player_list', playerList);
    io.to(code).emit('update_leaderboard', playerList);
  }));

  socket.on('start_game', safeHandler((roomCode) => {
    const code = toSafeString(roomCode, 6).toUpperCase();
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;

    // FIX: antes no había guardia contra iniciar la partida dos veces.
    // Un doble clic (o un cliente malicioso) podía crear varios
    // setInterval simultáneos para la misma sala, duplicando timer_tick
    // y disparando game_over más de una vez.
    if (room.started) return;

    room.started = true;
    let deck = [];

    room.pool.forEach((item, index) => {
      deck.push({ id: `trio_${index}`, text: item.elem, isPower: false });
      deck.push({ id: `trio_${index}`, text: item.sym, isPower: false });
      deck.push({ id: `trio_${index}`, text: item.val, isPower: false });
    });

    deck.push({ id: 'power_tornado_1', text: '🌪️ TORNADO', isPower: true, powerType: 'tornado' });
    deck.push({ id: 'power_bomba_1', text: '💣 BOMBA 3X3', isPower: true, powerType: 'bomba' });

    room.deck = deck.sort(() => 0.5 - Math.random());

    io.to(code).emit('game_started', {
      deck: room.deck,
      duration: room.duration
    });

    let timer = room.duration;
    room.timerInterval = setInterval(() => {
      timer--;
      io.to(code).emit('timer_tick', Math.max(timer, 0));

      if (timer <= 0) {
        endRoom(code, room);
      }
    }, 1000);
  }));

  socket.on('update_score', safeHandler(({ roomCode }) => {
    const code = toSafeString(roomCode, 6).toUpperCase();
    const room = rooms.get(code);

    // FIX DE SEGURIDAD IMPORTANTE: antes el servidor sumaba directamente
    // el campo `points` que mandaba el cliente. Cualquiera podía abrir la
    // consola del navegador y hacer socket.emit('update_score', { roomCode,
    // points: 999999 }) para ganar sin jugar. Ahora el servidor ignora ese
    // valor y siempre suma su propia constante (TRIO_POINTS), y además
    // valida que la partida esté realmente en curso y que el jugador exista.
    if (!room || !room.started || room.finished) return;
    if (!room.players[socket.id]) return;

    room.players[socket.id].score += TRIO_POINTS;
    io.to(code).emit('update_leaderboard', getSortedPlayers(room));
  }));

  socket.on('trigger_global_tornado', safeHandler((roomCode) => {
    const code = toSafeString(roomCode, 6).toUpperCase();
    const room = rooms.get(code);

    // FIX: antes cualquier socket podía emitir este evento con cualquier
    // roomCode y forzar un tornado en salas ajenas a las que ni pertenecía.
    if (!room || !room.started || room.finished) return;
    if (room.hostId !== socket.id && !room.players[socket.id]) return;

    io.to(code).emit('apply_tornado');
  }));

  socket.on('trigger_global_bomb', safeHandler(({ roomCode, centerIndex }) => {
    const code = toSafeString(roomCode, 6).toUpperCase();
    const room = rooms.get(code);

    if (!room || !room.started || room.finished) return;
    if (room.hostId !== socket.id && !room.players[socket.id]) return;

    const index = toSafeInt(centerIndex, -1);
    if (index < 0 || index >= room.deck.length) return;

    io.to(code).emit('apply_bomb', index);
  }));

  socket.on('disconnect', safeHandler(() => {
    // FIX: antes se recorrían TODAS las salas existentes en cada
    // desconexión para encontrar en cuál estaba el socket (O(n) salas).
    // Ahora se guarda el roomCode en socket.data al unirse/crear, así la
    // búsqueda es O(1). También se maneja explícitamente la desconexión
    // del host, que antes dejaba la sala huérfana sin avisar a nadie.
    const code = socket.data.roomCode;
    if (!code) return;

    const room = rooms.get(code);
    if (!room) return;

    if (room.hostId === socket.id) {
      // El host se fue: la sala ya no tiene sentido, avisamos y cerramos.
      clearRoomTimer(room);
      io.to(code).emit('error_message', '⚠️ El creador del concurso se ha desconectado. La sala se cerró.');
      rooms.delete(code);
      return;
    }

    if (room.players[socket.id]) {
      delete room.players[socket.id];
      const playerList = getSortedPlayers(room);
      io.to(code).emit('update_player_list', playerList);
      io.to(code).emit('update_leaderboard', playerList);
    }
  }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`CyberServer Activo en puerto ${PORT}`));
