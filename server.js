const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Servir la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

// Generar mazo de parejas combinando Elemento y Valencia
function generateDeck(elements) {
  let cards = [];
  elements.forEach((el, index) => {
    cards.push({ matchId: index, content: `${el.symbol}`, sub: el.name });
    cards.push({ matchId: index, content: `${el.val}`, sub: `Val: ${el.symbol}` });
  });
  return cards.sort(() => Math.random() - 0.5);
}

io.on('connection', (socket) => {
  // Crear Sala (HOST)
  socket.on('createRoom', ({ nombre, tiempo }) => {
    const roomId = Math.floor(1000 + Math.random() * 9000).toString();
    rooms[roomId] = {
      host: socket.id,
      nombre: nombre || 'Concurso Química',
      tiempoTotal: parseInt(tiempo) || 60,
      tiempoRestante: parseInt(tiempo) || 60,
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
      const deck = generateDeck(elements);
      
      // Reiniciar puntajes y tiempo
      room.players.forEach(p => p.points = 0);
      room.tiempoRestante = room.tiempoTotal;

      // Avisar a los jugadores que el juego comenzó
      io.to(roomId).emit('gameStart', { deck, tiempo: room.tiempoRestante });

      // Iniciar el temporizador sincronizado en el servidor
      if (room.intervalId) clearInterval(room.intervalId);

      room.intervalId = setInterval(() => {
        room.tiempoRestante--;
        io.to(roomId).emit('timerUpdate', { tiempoRestante: room.tiempoRestante });

        if (room.tiempoRestante <= 0) {
          clearInterval(room.intervalId);
          room.intervalId = null;
          // Notificar fin de partida
          io.to(roomId).emit('gameOver', { players: room.players });
        }
      }, 1000);
    }
  });

  // Actualización de Puntajes en Tiempo Real
  socket.on('updateScore', ({ roomId, points }) => {
    const room = rooms[roomId];
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.points = points;
        // Ordenar ranking de mayor a menor
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
  console.log(`Servidor CyberChem corriendo en el puerto ${PORT}`);
});
