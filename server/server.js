const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve static files from the public directory (React build output)
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict this to your frontend domain
    methods: ["GET", "POST"]
  }
});

const { buildAssignments } = require('./gameLogic');

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

  // Storyteller starts the game — server auto-assigns characters
  socket.on('start_game', ({ roomCode }) => {
    const game = games[roomCode];
    if (!game || game.storytellerId !== socket.id) return;

    const playerIds = Object.keys(game.players);
    const { assignments, error } = buildAssignments(playerIds, game.script.characters || []);

    if (error) {
      socket.emit('error', error);
      return;
    }

    const assignmentsList = assignments.map(({ playerId, character }) => {
      game.players[playerId].character = character;
      io.to(playerId).emit('receive_character', { character });
      return { playerName: game.players[playerId].name, character };
    });

    game.status = 'playing';
    socket.emit('game_started', { assignments: assignmentsList });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // Basic cleanup logic could go here
  });
});

// Fallback route for React SPA - serve index.html for all unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`BotC Server running on http://localhost:${PORT}`);
});
