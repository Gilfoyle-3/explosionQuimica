const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

// Genera la baraja con Tríos (Símbolo, Nombre, Valencia) + Poderes (Bomba, Tornado)
function generateDeck(elements, categoriasElegidas) {
  let filteredElements = elements;

  if (categoriasElegidas && categoriasElegidas.length > 0) {
    filteredElements = elements.filter(el => categoriasElegidas.includes(el.cat));
  }

  if (filteredElements.length < 3) {
    filteredElements = elements;
  }

  let cards = [];
  filteredElements.forEach((el) => {
    // 1. Carta Símbolo
    cards.push({
      idElem: el.symbol,
      type: 'symbol',
      content: el.symbol,
      sub: 'SÍMBOLO',
      valences: el.val
    });

    // 2. Carta Nombre
    cards.push({
      idElem: el.symbol,
      type: 'name',
      content: el.name,
      sub: 'NOMBRE',
      valences: el.val
    });

    // 3. Carta Valencia
    const primeraVal = el.val.split(',')[0].trim();
    cards.push({
      idElem: el.symbol,
      type: 'valence',
      content: primeraVal,
      sub: 'VALENCIA',
      valences: el.val
    });
  });

  // Agregar Poderes Especiales
  cards.push({ idElem: 'POWER_BOMB', type: 'power_bomb', content: '💣', sub: 'BOMBA', valences: '' });
  cards.push({ idElem: 'POWER_TORNADO', type: 'power_tornado', content: '🌪️', sub: 'TORNADO', valences: '' });

  return cards.sort(() => Math.random() - 0.5);
}

io.on('connection', (socket) => {
  socket.on('createRoom', ({ nombre, tiempo, categorias }) => {
    const roomId = Math.floor(1000 + Math.random() * 9000).toString();
    rooms[roomId] = {
      host: socket.id,
      nombre: nombre || 'Concurso Química',
      tiempoTotal: parseInt(tiempo) || 60,
      tiempoRestante: parseInt(tiempo) || 60,
      categorias: categorias || [],
      intervalId: null,
      players: []
    };
    socket.join(roomId);
    socket.emit('roomCreated', { roomId });
  });

  socket.on('joinRoom', ({ roomId, playerName }) => {
    if (rooms[roomId]) {
      socket.join(roomId);
      rooms[roomId].players.push({ id: socket.id, name: playerName, points: 0 });
      io.to(roomId).emit('playerJoined', { players: rooms[roomId].players });
    } else {
      socket.emit('errorMsg', 'La sala especificada no existe.');
    }
  });

  socket.on('startGameHost', ({ roomId, elements }) => {
    const room = rooms[roomId];
    if (room && room.host === socket.id) {
      const deck = generateDeck(elements, room.categorias);
      
      room.players.forEach(p => p.points = 0);
      room.tiempoRestante = room.tiempoTotal;

      io.to(roomId).emit('gameStart', { deck, tiempo: room.tiempoRestante });

      if (room.intervalId) clearInterval(room.intervalId);

      room.intervalId = setInterval(() => {
        room.tiempoRestante--;
        io.to(roomId).emit('timerUpdate', { tiempoRestante: room.tiempoRestante });

        if (room.tiempoRestante <= 0) {
          clearInterval(room.intervalId);
          room.intervalId = null;
          io.to(roomId).emit('gameOver', { players: room.players });
        }
      }, 1000);
    }
  });

  socket.on('updateScore', ({ roomId, points }) => {
    const room = rooms[roomId];
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.points = points;
        room.players.sort((a, b) => b.points - a.points);
        io.to(roomId).emit('rankingUpdate', { players: room.players });
      }
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const index = room.players.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        room.players.splice(index, 1);
        io.to(roomId).emit('playerJoined', { players: room.players });
        io.to(roomId).emit('rankingUpdate', { players: room.players });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});
