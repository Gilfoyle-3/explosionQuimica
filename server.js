const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static('public'));

// ==========================================
// BASE DE DATOS COMPLETA DE ELEMENTOS
// ==========================================
const FAMILIAS_QUIMICA = {
  // ==========================================
  // METALES DE VALENCIA FIJA
  // ==========================================
  monovalentes: [
    { nombre: 'Litio', simbolo: 'Li', valencia: '+1' },
    { nombre: 'Sodio', simbolo: 'Na', valencia: '+1' },
    { nombre: 'Potasio', simbolo: 'K', valencia: '+1' },
    { nombre: 'Rubidio', simbolo: 'Rb', valencia: '+1' },
    { nombre: 'Cesio', simbolo: 'Cs', valencia: '+1' },
    { nombre: 'Francio', simbolo: 'Fr', valencia: '+1' },
    { nombre: 'Plata', simbolo: 'Ag', valencia: '+1' },
    { nombre: 'Amonio', simbolo: 'NH4', valencia: '+1' }
  ],
  divalentes: [
    { nombre: 'Berilio', simbolo: 'Be', valencia: '+2' },
    { nombre: 'Magnesio', simbolo: 'Mg', valencia: '+2' },
    { nombre: 'Calcio', simbolo: 'Ca', valencia: '+2' },
    { nombre: 'Estroncio', simbolo: 'Sr', valencia: '+2' },
    { nombre: 'Bario', simbolo: 'Ba', valencia: '+2' },
    { nombre: 'Radio', simbolo: 'Ra', valencia: '+2' },
    { nombre: 'Zinc', simbolo: 'Zn', valencia: '+2' },
    { nombre: 'Cadmio', simbolo: 'Cd', valencia: '+2' }
  ],
  trivalentes: [
    { nombre: 'Aluminio', simbolo: 'Al', valencia: '+3' },
    { nombre: 'Escandio', simbolo: 'Sc', valencia: '+3' },
    { nombre: 'Galio', simbolo: 'Ga', valencia: '+3' },
    { nombre: 'Indio', simbolo: 'In', valencia: '+3' }
  ],
  tetravalentes: [
    { nombre: 'Zirconio', simbolo: 'Zr', valencia: '+4' },
    { nombre: 'Titanio', simbolo: 'Ti', valencia: '+4' },
    { nombre: 'Osmio', simbolo: 'Os', valencia: '+4' },
    { nombre: 'Iridio', simbolo: 'Ir', valencia: '+4' }
  ],
  hexavalentes: [
    { nombre: 'Uranio', simbolo: 'U', valencia: '+6' },
    { nombre: 'Wolframio', simbolo: 'W', valencia: '+6' },
    { nombre: 'Molibdeno', simbolo: 'Mo', valencia: '+6' }
  ],

  // ==========================================
  // METALES DE VALENCIA VARIABLE
  // ==========================================
  variable_1_2: [
    { nombre: 'Cobre', simbolo: 'Cu', valencia: '+1, +2' },
    { nombre: 'Mercurio', simbolo: 'Hg', valencia: '+1, +2' }
  ],
  variable_1_3: [
    { nombre: 'Oro', simbolo: 'Au', valencia: '+1, +3' },
    { nombre: 'Talio', simbolo: 'Tl', valencia: '+1, +3' }
  ],
  variable_2_3: [
    { nombre: 'Hierro', simbolo: 'Fe', valencia: '+2, +3' },
    { nombre: 'Cobalto', simbolo: 'Co', valencia: '+2, +3' },
    { nombre: 'Níquel', simbolo: 'Ni', valencia: '+2, +3' }
  ],
  variable_2_4: [
    { nombre: 'Plomo', simbolo: 'Pb', valencia: '+2, +4' },
    { nombre: 'Estaño', simbolo: 'Sn', valencia: '+2, +4' },
    { nombre: 'Platino', simbolo: 'Pt', valencia: '+2, +4' }
  ],

  // ==========================================
  // NO METALES
  // ==========================================
  halogenos: [
    { nombre: 'Flúor', simbolo: 'F', valencia: '-1' },
    { nombre: 'Cloro', simbolo: 'Cl', valencia: '-1, +1, +3, +5, +7' },
    { nombre: 'Bromo', simbolo: 'Br', valencia: '-1, +1, +3, +5, +7' },
    { nombre: 'Yodo', simbolo: 'I', valencia: '-1, +1, +3, +5, +7' }
  ],
  anfigenos: [
    { nombre: 'Oxígeno', simbolo: 'O', valencia: '-2' },
    { nombre: 'Azufre', simbolo: 'S', valencia: '-2, +2, +4, +6' },
    { nombre: 'Selenio', simbolo: 'Se', valencia: '-2, +2, +4, +6' },
    { nombre: 'Teluro', simbolo: 'Te', valencia: '-2, +2, +4, +6' }
  ],
  nitrogenoides: [
    { nombre: 'Nitrógeno', simbolo: 'N', valencia: '-3, +1, +3, +5' },
    { nombre: 'Fósforo', simbolo: 'P', valencia: '-3, +1, +3, +5' },
    { nombre: 'Arsénico', simbolo: 'As', valencia: '-3, +3, +5' },
    { nombre: 'Antimonio', simbolo: 'Sb', valencia: '-3, +3, +5' }
  ],
  carbonoides: [
    { nombre: 'Carbono', simbolo: 'C', valencia: '-4, +2, +4' },
    { nombre: 'Silicio', simbolo: 'Si', valencia: '-4, +4' },
    { nombre: 'Germanio', simbolo: 'Ge', valencia: '-4, +4' }
  ],
  boroides: [
    { nombre: 'Boro', simbolo: 'B', valencia: '-3, +3' }
  ],

  // ==========================================
  // ANFÓTEROS Y POLIVALENTES
  // ==========================================
  polivalentes: [
    { nombre: 'Cromo', simbolo: 'Cr', valencia: '+2, +3, +6' },
    { nombre: 'Manganeso', simbolo: 'Mn', valencia: '+2, +3, +4, +6, +7' },
    { nombre: 'Bismuto', simbolo: 'Bi', valencia: '+3, +5' }
  ]
};

const salas = {};

io.on('connection', (socket) => {
  console.log(`⚡ Cliente conectado: ${socket.id}`);

  // 1. CREAR SALA (HOST)
  socket.on('crear_sala', () => {
    const codigoSala = Math.floor(100000 + Math.random() * 900000).toString();

    salas[codigoSala] = {
      anfitrion: socket.id,
      estado: 'esperando',
      jugadores: [],
      tablero: [],
      puntuaciones: {},
      cartasVolteadasPorJugador: {},
      configuracion: {
        nombreConcurso: 'Torneo Química Pro',
        duracionSegundos: 120,
        familiasSeleccionadas: Object.keys(FAMILIAS_QUIMICA)
      }
    };

    socket.join(codigoSala);
    socket.emit('sala_creada', { 
      codigoSala, 
      familiasDisponibles: Object.keys(FAMILIAS_QUIMICA) 
    });
  });

  // 2. UNIRSE A SALA (JUGADOR)
  socket.on('unirse_sala', ({ codigoSala, nickname }) => {
    const sala = salas[codigoSala];
    if (!sala) return socket.emit('error_login', 'La sala no existe.');
    if (sala.estado !== 'esperando') return socket.emit('error_login', 'El concurso ya está en marcha.');

    const nickLimpio = (nickname || '').trim();
    if (!nickLimpio) return socket.emit('error_login', 'Debes ingresar un apodo válido.');

    const existe = sala.jugadores.some(j => j.nickname.toLowerCase() === nickLimpio.toLowerCase());
    if (existe) return socket.emit('error_login', 'Ese apodo ya está en uso en esta sala.');

    sala.jugadores.push({ id: socket.id, nickname: nickLimpio });
    sala.puntuaciones[socket.id] = { nickname: nickLimpio, puntos: 0 };
    sala.cartasVolteadasPorJugador[socket.id] = [];

    socket.join(codigoSala);
    socket.emit('unido_exitosamente', { codigoSala, nickname: nickLimpio });
    io.to(codigoSala).emit('actualizar_lista_espera', { jugadores: sala.jugadores });
  });

  // 3. INICIAR CONCURSO (SOLO HOST)
  socket.on('iniciar_concurso', ({ codigoSala, nombreConcurso, duracionSegundos, familias }) => {
    const sala = salas[codigoSala];
    
    if (!sala) return socket.emit('error_juego', 'La sala especificada no existe.');
    if (sala.anfitrion !== socket.id) return socket.emit('error_juego', 'Solo el anfitrión puede iniciar el juego.');

    const familiasValidas = Array.isArray(familias) && familias.length > 0 
      ? familias 
      : ['monovalentes', 'divalentes'];

    sala.configuracion.nombreConcurso = nombreConcurso || 'Torneo Química Pro';
    sala.configuracion.duracionSegundos = duracionSegundos || 120;
    sala.configuracion.familiasSeleccionadas = familiasValidas;
    
    // Generar las cartas
    sala.tablero = generarTablero(familiasValidas);
    sala.estado = 'jugando';

    io.to(codigoSala).emit('concurso_iniciado', {
      tablero: sala.tablero,
      puntuaciones: sala.puntuaciones,
      nombreConcurso: sala.configuracion.nombreConcurso,
      duracionSegundos: sala.configuracion.duracionSegundos
    });
  });

  // 4. LÓGICA DEL JUEGO: SELECCIONAR CARTA
  socket.on('seleccionar_carta', ({ codigoSala, cartaId }) => {
    const sala = salas[codigoSala];
    if (!sala || sala.estado !== 'jugando') return;

    if (!sala.cartasVolteadasPorJugador[socket.id]) {
      sala.cartasVolteadasPorJugador[socket.id] = [];
    }

    const misVolteadas = sala.cartasVolteadasPorJugador[socket.id];
    if (misVolteadas.length >= 3) return; // Límite de 3 cartas por turno

    const carta = sala.tablero.find(c => c.id === cartaId);
    if (!carta || carta.revelada || carta.emparejada) return;

    // Voltear la carta elegida
    carta.revelada = true;
    misVolteadas.push(carta);

    io.to(codigoSala).emit('actualizar_tablero', { tablero: sala.tablero });

    // EVALUAR TRÍO CUANDO SE TIENEN 3 CARTAS
    if (misVolteadas.length === 3) {
      const [c1, c2, c3] = misVolteadas;

      // Un trío perfecto requiere: Mismo elemento (grupoId) + 3 atributos distintos (nombre, símbolo, valencia)
      const mismoGrupo = (c1.grupoId === c2.grupoId) && (c2.grupoId === c3.grupoId);
      const tiposDiferentes = new Set([c1.tipo, c2.tipo, c3.tipo]).size === 3;

      if (mismoGrupo && tiposDiferentes) {
        // TRÍO CORRECTO: +100 PUNTOS
        c1.emparejada = true;
        c2.emparejada = true;
        c3.emparejada = true;

        if (sala.puntuaciones[socket.id]) {
          sala.puntuaciones[socket.id].puntos += 100;
        }

        sala.cartasVolteadasPorJugador[socket.id] = [];

        io.to(codigoSala).emit('actualizar_tablero', { tablero: sala.tablero });
        io.to(codigoSala).emit('actualizar_puntuaciones', { puntuaciones: sala.puntuaciones });
      } else {
        // ERROR: Voltear de nuevo las cartas tras 1.2 segundos
        setTimeout(() => {
          c1.revelada = false;
          c2.revelada = false;
          c3.revelada = false;
          
          sala.cartasVolteadasPorJugador[socket.id] = [];
          io.to(codigoSala).emit('actualizar_tablero', { tablero: sala.tablero });
        }, 1200);
      }
    }
  });

  // 5. CONTROL DE DESCONEXIONES
  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
    
    Object.keys(salas).forEach(codigoSala => {
      const sala = salas[codigoSala];
      
      // Eliminar al jugador desconectado
      sala.jugadores = sala.jugadores.filter(j => j.id !== socket.id);
      delete sala.puntuaciones[socket.id];
      delete sala.cartasVolteadasPorJugador[socket.id];

      // Notificar a los que se quedan
      io.to(codigoSala).emit('actualizar_lista_espera', { jugadores: sala.jugadores });
      io.to(codigoSala).emit('actualizar_puntuaciones', { puntuaciones: sala.puntuaciones });

      // Si la sala se queda vacía, la borramos de memoria
      if (sala.jugadores.length === 0 && sala.anfitrion !== socket.id) {
        delete salas[codigoSala];
      }
    });
  });
});

// ==========================================
// FUNCIÓN GENERADORA DEL TABLERO
// ==========================================
function generarTablero(familiasPermitidas) {
  let poolElementos = [];

  familiasPermitidas.forEach(fam => {
    if (FAMILIAS_QUIMICA[fam]) {
      poolElementos.push(...FAMILIAS_QUIMICA[fam]);
    }
  });

  // Respaldo de seguridad en caso de recibir familias vacías
  if (poolElementos.length === 0) {
    poolElementos = FAMILIAS_QUIMICA.monovalentes;
  }

  let cartas = [];
  let cardId = 1;

  poolElementos.forEach(elem => {
    const grupoId = elem.nombre;
    // Generamos las 3 cartas del trío
    cartas.push({ id: cardId++, tipo: 'nombre', contenido: elem.nombre, grupoId, revelada: false, emparejada: false });
    cartas.push({ id: cardId++, tipo: 'simbolo', contenido: elem.simbolo, grupoId, revelada: false, emparejada: false });
    cartas.push({ id: cardId++, tipo: 'valencia', contenido: elem.valencia, grupoId, revelada: false, emparejada: false });
  });

  // Mezclador de cartas (Algoritmo Fisher-Yates)
  for (let i = cartas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cartas[i], cartas[j]] = [cartas[j], cartas[i]];
  }

  return cartas;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor Química Pro corriendo en http://localhost:${PORT}`);
});
