const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

const rooms = {};

function generarCodigo() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generarMazo(elementos) {
  let deck = [];
  const seleccionados = [...elementos].sort(() => Math.random() - 0.5).slice(0, 5);

  seleccionados.forEach((elem, index) => {
    deck.push({ idElem: index, type: 'symbol', content: elem.symbol, valences: elem.val, matched: false });
    deck.push({ idElem: index, type: 'name', content: elem.name, valences: elem.val, matched: false });
    deck.push({ idElem: index, type: 'valence', content: elem.val, valences: elem.val, matched: false });
  });

  deck.push({ type: 'power_bomb', content: '💣', matched: false });
  deck.push({ type: 'power_tornado', content: '🌪️', matched: false });

  return deck.sort(() => Math.random() - 0.5);
}

io.on('connection', (socket) => {
  socket.on('createRoom', ({ nombre, tiempo }) => {
    const roomId = generarCodigo();
    rooms[roomId] = {
      nombre,
      tiempo: parseInt(tiempo) || 60,
      hostId: socket.id,
      players: [],
      state: 'waiting'
    };
    socket.join(roomId);
    socket.emit('roomCreated', { roomId });
  });

  socket.on('joinRoom', ({ roomId, playerName }) => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit('errorMsg', 'La sala no existe o venció.');
      return;
    }

    const nuevoJugador = { id: socket.id, name: playerName, points: 0 };
    room.players.push(nuevoJugador);
    socket.join(roomId);

    io.to(roomId).emit('playerJoined', { players: room.players });
  });

  socket.on('startGameHost', ({ roomId, elements }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.state = 'playing';
    const deck = generarMazo(elements);

    io.to(roomId).emit('gameStart', { deck, tiempo: room.tiempo });

    let tiempoRestante = room.tiempo;
    room.timer = setInterval(() => {
      tiempoRestante--;
      io.to(roomId).emit('timerUpdate', { tiempoRestante });

      if (tiempoRestante <= 0) {
        clearInterval(room.timer);
        room.state = 'ended';
        io.to(roomId).emit('gameOver', { players: room.players });
      }
    }, 1000);
  });

  socket.on('updateScore', ({ roomId, points }) => {
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.points = points;
      room.players.sort((a, b) => b.points - a.points);
      io.to(roomId).emit('rankingUpdate', { players: room.players });
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const index = room.players.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        room.players.splice(index, 1);
        io.to(roomId).emit('rankingUpdate', { players: room.players });
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor activo en el puerto ${PORT}`));
