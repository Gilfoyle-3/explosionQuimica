const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

// Normaliza textos de valencia para comparación flexible ("+3", "3", "3+" -> "3")
function normalizeValence(valStr) {
  return valStr.toString().replace(/[^0-9]/g, '');
}

// Genera la baraja filtrando por las categorías seleccionadas por el Host
function generateDeck(elements, categoriasElegidas) {
  let filteredElements = elements;

  if (categoriasElegidas && categoriasElegidas.length > 0) {
    filteredElements = elements.filter(el => categoriasElegidas.includes(el.cat));
  }

  // Si se seleccionaron pocos elementos, usamos todos para no quedar sin cartas
  if (filteredElements.length < 4) {
    filteredElements = elements;
  }

  let cards = [];
  filteredElements.forEach((el) => {
    // Carta de Elemento (Símbolo + Nombre)
    cards.push({
      type: 'element',
      content: el.symbol,
      sub: el.name,
      valences: el.val
    });

    // Carta de Valencia asociada (Tomamos la primera valencia representativa)
    const primeraVal = el.val.split(',')[0].trim();
    cards.push({
      type: 'valence',
      content: primeraVal,
      sub: 'VALENCIA'
    });
  });

  return cards.sort(() => Math.random() - 0.5);
}

io.on('connection', (socket) => {
  // Crear Sala (HOST)
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

  // Unirse a Sala (JUGADOR)
  socket.on('joinRoom', ({ roomId, playerName }) => {
    if (rooms[roomId]) {
      socket.join(roomId);
      rooms[roomId].players.push({ id: socket.id, name: playerName, points: 0 });
      io.to(roomId).emit('playerJoined', { players: rooms[roomId].players });
    } else {
      socket.emit('errorMsg', 'La sala especificada no existe.');
    }
  });

  // Iniciar Concurso (HOST)
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

  // Actualización de Puntaje
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

  // Desconexión limpia
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
  console.log(`Servidor iniciado en puerto ${PORT}`);
});
