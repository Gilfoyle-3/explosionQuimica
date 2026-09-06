const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Servir los archivos estáticos (index.html, styles.css, app.js)
app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

// Generar mazo de parejas combinando Elemento + Valencia
function generateDeck(elements) {
  let cards = [];
  elements.forEach((el, index) => {
    cards.push({ matchId: index, content: `${el.symbol}`, sub: el.name });
    cards.push({ matchId: index, content: `${el.val}`, sub: `Valencia: ${el.symbol}` });
  });
  return cards.sort(() => Math.random() - 0.5); // Barajar
}

io.on('connection', (socket) => {
  // Crear Sala (HOST)
  socket.on('createRoom', ({ nombre, tiempo }) => {
    const roomId = Math.floor(1000 + Math.random() * 9000).toString();
    rooms[roomId] = { host: socket.id, nombre, tiempo, players: [] };
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
      socket.emit('errorMsg', 'La sala no existe.');
    }
  });

  // Iniciar Juego (HOST)
  socket.on('startGameHost', ({ roomId, elements }) => {
    if (rooms[roomId]) {
      const deck = generateDeck(elements);
      io.to(roomId).emit('gameStart', { deck });
    }
  });

  // Actualizar Puntaje en Tiempo Real
  socket.on('updateScore', ({ roomId, points }) => {
    if (rooms[roomId]) {
      const player = rooms[roomId].players.find(p => p.id === socket.id);
      if (player) {
        player.points = points;
        // Ordenar ranking de mayor a menor
        rooms[roomId].players.sort((a, b) => b.points - a.points);
        io.to(roomId).emit('rankingUpdate', { players: rooms[roomId].players });
      }
    }
  });
});

// IMPORTANTE: Render asigna el puerto automáticamente mediante process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
