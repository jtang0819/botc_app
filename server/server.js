const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict this to your frontend domain
    methods: ["GET", "POST"]
  }
});

const games = {}; 

// Generate a random 4-letter room code
const generateRoomCode = () => Math.random().toString(36).substring(2, 6).toUpperCase();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Storyteller creates a room
  socket.on('create_room', (scriptData) => {
    const roomCode = generateRoomCode();
    games[roomCode] = {
      storytellerId: socket.id,
      script: scriptData || [],
      players: {},
      status: 'waiting'
    };
    socket.join(roomCode);
    socket.emit('room_created', { roomCode });
  });

  // Players join the room
  socket.on('join_room', ({ roomCode, playerName }) => {
    const game = games[roomCode];
    if (game && game.status === 'waiting') {
      game.players[socket.id] = { id: socket.id, name: playerName, character: null };
      socket.join(roomCode);
      
      // Notify storyteller
      io.to(game.storytellerId).emit('players_updated', Object.values(game.players));
      socket.emit('join_success', { roomCode, script: game.script });
    } else {
      socket.emit('error', 'Room not found or game already started.');
    }
  });

  // Storyteller distributes tokens
  socket.on('distribute_tokens', ({ roomCode, assignments }) => {
    const game = games[roomCode];
    if (!game || game.storytellerId !== socket.id) return;

    game.status = 'playing';

    for (const [playerId, character] of Object.entries(assignments)) {
      if (game.players[playerId]) {
        game.players[playerId].character = character;
        // Send character securely ONLY to that specific player
        io.to(playerId).emit('receive_character', { character });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // Basic cleanup logic could go here
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`BotC Server running on http://localhost:${PORT}`);
});
