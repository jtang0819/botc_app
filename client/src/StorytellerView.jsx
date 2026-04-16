import React, { useState, useEffect } from 'react';
import rolesData from './roles.json';

const teamColor = (team) => {
  switch (team) {
    case 'townsfolk': return 'text-blue-400';
    case 'outsider':  return 'text-cyan-400';
    case 'minion':    return 'text-yellow-400';
    case 'demon':     return 'text-red-500';
    default:          return 'text-gray-400';
  }
};

export default function StorytellerView({ socket, goBack }) {
  const [roomCode, setRoomCode] = useState(null);
  const [players, setPlayers] = useState([]);
  const [script, setScript] = useState(null);
  const [gameAssignments, setGameAssignments] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    socket.on('room_created', (data) => setRoomCode(data.roomCode));
    socket.on('players_updated', (updatedPlayers) => setPlayers(updatedPlayers));
    socket.on('game_started', (data) => setGameAssignments(data.assignments));
    socket.on('error', (msg) => setError(msg));

    return () => {
      socket.off('room_created');
      socket.off('players_updated');
      socket.off('game_started');
      socket.off('error');
    };
  }, [socket]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const rawJson = JSON.parse(event.target.result);
          let parsedScript = { scriptName: "Custom Script", characters: [] };

          const formatName = (id) => id.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, str => str.toUpperCase()).trim();

          const enrichCharacter = (id) => {
            const role = rolesData.find(r => r.id === id);
            if (role) {
              return { id, name: role.name, team: role.team };
            }
            return { id, name: formatName(id), team: 'Unknown' };
          };

          if (Array.isArray(rawJson)) {
            rawJson.forEach(item => {
              if (item.id === '_meta') {
                parsedScript.scriptName = item.name || "Custom Script";
              } else if (typeof item === 'string') {
                parsedScript.characters.push(enrichCharacter(item));
              } else if (item.id) {
                const enriched = enrichCharacter(item.id);
                parsedScript.characters.push({
                  id: item.id,
                  name: item.name || enriched.name,
                  team: item.team || enriched.team
                });
              }
            });
          } else if (rawJson.characters) {
            parsedScript.characters = rawJson.characters.map(c => {
              const enriched = enrichCharacter(c.id);
              return { id: c.id, name: c.name || enriched.name, team: c.team || enriched.team };
            });
            parsedScript.scriptName = rawJson.scriptName || "Custom Script";
          } else {
            throw new Error("Unrecognized format");
          }

          setScript(parsedScript);
        } catch (err) {
          alert('Invalid Script JSON');
        }
      };
      reader.readAsText(file);
    }
  };

  const createRoom = () => {
    if (script) {
      socket.emit('create_room', script);
    }
  };

  const startGame = () => {
    setError('');
    socket.emit('start_game', { roomCode });
  };

  // Phase 3: Game running — show assignment reference
  if (gameAssignments) {
    return (
      <div className="flex flex-col items-center min-h-screen p-4 w-full max-w-md mx-auto text-white">
        <h2 className="text-2xl font-bold mb-2 text-red-500">Game In Progress</h2>
        <p className="text-gray-400 mb-6 font-mono">Room: {roomCode}</p>

        <div className="w-full flex flex-col gap-2">
          {gameAssignments.map((a, i) => (
            <div key={i} className="bg-gray-800 p-3 rounded flex justify-between items-center border border-gray-700">
              <span className="font-bold">{a.playerName}</span>
              <span className={teamColor(a.character.team)}>
                {a.character.name} <span className="text-xs opacity-70">({a.character.team})</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Phase 1: Upload script and create room
  if (!roomCode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-white">
        <button onClick={goBack} className="mb-4 text-gray-400 absolute top-4 left-4">← Back</button>
        <h2 className="text-2xl mb-4">Upload Script to Start</h2>
        <input type="file" accept=".json" onChange={handleFileUpload} className="mb-4" />

        {script ? (
          <div className="flex flex-col items-center mt-4 w-full max-w-xs">
            <p className="text-green-400 mb-4 font-bold text-lg text-center">Loaded: {script.scriptName}</p>
            <button
              onClick={createRoom}
              className="bg-red-800 hover:bg-red-700 w-full py-3 rounded-lg text-xl font-bold transition-colors shadow-lg"
            >
              Create Room
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500 max-w-md text-center mt-2">
            Upload an official Blood on the Clocktower script JSON.
          </p>
        )}
      </div>
    );
  }

  // Phase 2: Lobby — waiting for players
  return (
    <div className="flex flex-col items-center min-h-screen p-4 w-full max-w-md mx-auto text-white">
      <div className="bg-gray-800 p-4 rounded-lg text-center w-full mb-6 border border-gray-700">
        <h2 className="text-lg text-gray-400">Room Code</h2>
        <p className="text-5xl font-mono tracking-widest text-red-500 font-bold">{roomCode}</p>
      </div>

      <h3 className="text-xl w-full text-left mb-2">
        Players ({players.length} joined — need 5-15)
      </h3>
      <div className="w-full flex flex-col gap-3 mb-8">
        {players.map(p => (
          <div key={p.id} className="bg-gray-800 p-3 rounded border border-gray-700">
            <span>{p.name}</span>
          </div>
        ))}
        {players.length === 0 && <p className="text-gray-500 text-center py-4">Waiting for players...</p>}
      </div>

      {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

      <button
        onClick={startGame}
        disabled={players.length < 5 || players.length > 15}
        className="bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white w-full py-3 rounded-lg text-lg font-bold transition-colors"
      >
        Start Game ({players.length} players)
      </button>
    </div>
  );
}
