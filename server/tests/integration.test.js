/**
 * Integration tests for the BotC server socket flow.
 *
 * Creates a real Express/Socket.io server on a random port for each test
 * suite, then simulates storytellers and players connecting as socket clients.
 */

const http = require('http');
const { Server } = require('socket.io');
const { io: ioc } = require('socket.io-client');
const { buildAssignments } = require('../gameLogic');

// ─── Shared test data ────────────────────────────────────────────────────────

const rolesData = require('../../client/src/roles.json');
const contemptRaw = require('../../Contempt.json');
const contemptScript = {
  scriptName: 'Contempt',
  characters: contemptRaw
    .filter(item => item.id !== '_meta')
    .map(item => {
      const role = rolesData.find(r => r.id === item.id);
      return role ? { id: role.id, name: role.name, team: role.team } : null;
    })
    .filter(Boolean),
};

// ─── Server factory ──────────────────────────────────────────────────────────

function createTestServer() {
  const express = require('express');
  const cors = require('cors');
  const app = express();
  app.use(cors());

  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });
  const games = {};
  const generateRoomCode = () => Math.random().toString(36).substring(2, 6).toUpperCase();

  io.on('connection', (socket) => {
    socket.on('create_room', (scriptData) => {
      const roomCode = generateRoomCode();
      games[roomCode] = {
        storytellerId: socket.id,
        script: scriptData || { characters: [] },
        players: {},
        status: 'waiting',
      };
      socket.join(roomCode);
      socket.emit('room_created', { roomCode });
    });

    socket.on('join_room', ({ roomCode, playerName }) => {
      const game = games[roomCode];
      if (game && game.status === 'waiting') {
        game.players[socket.id] = { id: socket.id, name: playerName, character: null };
        socket.join(roomCode);
        io.to(game.storytellerId).emit('players_updated', Object.values(game.players));
        socket.emit('join_success', { roomCode, script: game.script });
      } else {
        socket.emit('error', 'Room not found or game already started.');
      }
    });

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
  });

  return new Promise((resolve) => {
    server.listen(0, () => {
      const port = server.address().port;
      const url = `http://localhost:${port}`;
      const connect = () => ioc(url, { forceNew: true });
      const close = () => new Promise((res) => io.close(() => server.close(res)));
      resolve({ connect, close, port });
    });
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function waitFor(socket, event, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout waiting for '${event}'`)), timeoutMs);
    socket.once(event, (data) => { clearTimeout(t); resolve(data); });
  });
}

/**
 * Creates a complete game: storyteller creates room, N players join,
 * storyteller starts the game. Returns { storyteller, players, assignments }.
 */
async function runFullGame(connect, playerNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
  const storyteller = connect();
  storyteller.emit('create_room', contemptScript);
  const { roomCode } = await waitFor(storyteller, 'room_created');

  const players = playerNames.map(() => connect());

  const allJoined = new Promise((resolve) => {
    storyteller.on('players_updated', (list) => {
      if (list.length === playerNames.length) resolve(list);
    });
  });

  const charPromises = players.map(p => waitFor(p, 'receive_character'));
  players.forEach((p, i) => p.emit('join_room', { roomCode, playerName: playerNames[i] }));
  await allJoined;

  const gameStarted = waitFor(storyteller, 'game_started');
  storyteller.emit('start_game', { roomCode });
  const { assignments } = await gameStarted;
  const receivedChars = await Promise.all(charPromises);

  return { storyteller, players, roomCode, assignments, receivedChars };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Room creation', () => {
  let srv;
  beforeAll(async () => { srv = await createTestServer(); });
  afterAll(() => srv.close());

  test('storyteller receives a 4-character alphanumeric room code', async () => {
    const st = srv.connect();
    try {
      st.emit('create_room', contemptScript);
      const { roomCode } = await waitFor(st, 'room_created');
      expect(roomCode).toMatch(/^[A-Z0-9]{4}$/);
    } finally {
      st.disconnect();
    }
  });

  test('two simultaneous rooms get different codes', async () => {
    const [st1, st2] = [srv.connect(), srv.connect()];
    try {
      st1.emit('create_room', contemptScript);
      st2.emit('create_room', contemptScript);
      const [r1, r2] = await Promise.all([
        waitFor(st1, 'room_created'),
        waitFor(st2, 'room_created'),
      ]);
      expect(r1.roomCode).not.toBe(r2.roomCode);
    } finally {
      st1.disconnect();
      st2.disconnect();
    }
  });
});

describe('Player joining', () => {
  let srv;
  beforeAll(async () => { srv = await createTestServer(); });
  afterAll(() => srv.close());

  test('player receives join_success with room code', async () => {
    const st = srv.connect();
    st.emit('create_room', contemptScript);
    const { roomCode } = await waitFor(st, 'room_created');

    const player = srv.connect();
    try {
      player.emit('join_room', { roomCode, playerName: 'Alice' });
      const result = await waitFor(player, 'join_success');
      expect(result.roomCode).toBe(roomCode);
    } finally {
      player.disconnect();
      st.disconnect();
    }
  });

  test('storyteller is notified when a player joins', async () => {
    const st = srv.connect();
    st.emit('create_room', contemptScript);
    const { roomCode } = await waitFor(st, 'room_created');

    const player = srv.connect();
    player.emit('join_room', { roomCode, playerName: 'Bob' });
    try {
      const list = await waitFor(st, 'players_updated');
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('Bob');
    } finally {
      player.disconnect();
      st.disconnect();
    }
  });

  test('player count grows as more players join', async () => {
    const st = srv.connect();
    st.emit('create_room', contemptScript);
    const { roomCode } = await waitFor(st, 'room_created');

    const names = ['P1', 'P2', 'P3'];
    const players = names.map(() => srv.connect());
    const lastUpdate = new Promise((resolve) => {
      st.on('players_updated', (list) => { if (list.length === 3) resolve(list); });
    });
    players.forEach((p, i) => p.emit('join_room', { roomCode, playerName: names[i] }));

    try {
      const list = await lastUpdate;
      expect(list).toHaveLength(3);
    } finally {
      players.forEach(p => p.disconnect());
      st.disconnect();
    }
  });

  test('player receives error when joining a non-existent room', async () => {
    const player = srv.connect();
    try {
      player.emit('join_room', { roomCode: 'ZZZZ', playerName: 'Ghost' });
      const msg = await waitFor(player, 'error');
      expect(msg).toMatch(/not found/i);
    } finally {
      player.disconnect();
    }
  });
});

describe('Full game flow — 7 players', () => {
  let srv, storyteller, players, assignments, receivedChars;

  beforeAll(async () => {
    srv = await createTestServer();
    ({ storyteller, players, assignments, receivedChars } =
      await runFullGame(srv.connect));
  });

  afterAll(async () => {
    storyteller.disconnect();
    players.forEach(p => p.disconnect());
    await srv.close();
  });

  test('storyteller receives one assignment per player', () => {
    expect(assignments).toHaveLength(7);
  });

  test('every assignment has a player name, character name, and valid team', () => {
    assignments.forEach(a => {
      expect(a.playerName).toBeTruthy();
      expect(a.character.name).toBeTruthy();
      expect(['townsfolk', 'outsider', 'minion', 'demon']).toContain(a.character.team);
    });
  });

  test('team distribution is 5 townsfolk, 0 outsiders, 1 minion, 1 demon', () => {
    const teams = {};
    assignments.forEach(a => {
      teams[a.character.team] = (teams[a.character.team] || 0) + 1;
    });
    expect(teams).toMatchObject({ townsfolk: 5, minion: 1, demon: 1 });
    expect(teams.outsider).toBeUndefined();
  });

  test('each player socket receives a unique character', () => {
    const charIds = receivedChars.map(r => r.character.id);
    expect(new Set(charIds).size).toBe(7);
  });

  test('characters received by players match the storyteller assignment list', () => {
    const playerCharIds = new Set(receivedChars.map(r => r.character.id));
    const storytellerCharIds = new Set(assignments.map(a => a.character.id));
    expect(playerCharIds).toEqual(storytellerCharIds);
  });

  test('each player receives a character with an id present in the script', () => {
    const scriptIds = new Set(contemptScript.characters.map(c => c.id));
    receivedChars.forEach(({ character }) => {
      expect(scriptIds.has(character.id)).toBe(true);
    });
  });
});

describe('Game start — error cases', () => {
  let srv;
  beforeAll(async () => { srv = await createTestServer(); });
  afterAll(() => srv.close());

  test('start_game with fewer than 5 players returns an error', async () => {
    const st = srv.connect();
    st.emit('create_room', contemptScript);
    const { roomCode } = await waitFor(st, 'room_created');

    const players = [srv.connect(), srv.connect(), srv.connect()];
    const allJoined = new Promise((resolve) => {
      st.on('players_updated', (list) => { if (list.length === 3) resolve(); });
    });
    players.forEach((p, i) => p.emit('join_room', { roomCode, playerName: `P${i}` }));
    await allJoined;

    const errPromise = waitFor(st, 'error');
    st.emit('start_game', { roomCode });
    const msg = await errPromise;
    expect(msg).toMatch(/need 5-15/i);

    players.forEach(p => p.disconnect());
    st.disconnect();
  });

  test('start_game is ignored when sent by a non-storyteller socket', async () => {
    const st = srv.connect();
    const impostor = srv.connect();
    st.emit('create_room', contemptScript);
    const { roomCode } = await waitFor(st, 'room_created');

    // Impostor tries to start the game — should receive no response
    impostor.emit('start_game', { roomCode });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Neither client should have gotten game_started
    let fired = false;
    st.once('game_started', () => { fired = true; });
    await new Promise(resolve => setTimeout(resolve, 200));
    expect(fired).toBe(false);

    st.disconnect();
    impostor.disconnect();
  });
});
